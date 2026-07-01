import { afterEach, expect, it, vi } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

vi.mock('@andresaya/edge-tts', () => {
  class MockEdgeTTS {
    synthesize = vi.fn(async () => undefined);
    toBuffer = vi.fn(() => Buffer.from([5, 6, 7]));
  }
  return {
    EdgeTTS: vi.fn(function EdgeTTSMock() { return new MockEdgeTTS(); }),
    Constants: { OUTPUT_FORMAT: { AUDIO_24KHZ_48KBITRATE_MONO_MP3: 'audio-24khz-48kbitrate-mono-mp3' } },
  };
});

import { EdgeTTS } from '@andresaya/edge-tts';
import { buildApp } from './app.js';

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.OPENAI_API_KEY;
  delete process.env.DESK_BOT_TTS_MODEL;
  delete process.env.DESK_BOT_TTS_VOICE;
});

it('returns health with version', async () => {
  const app = buildApp();
  const response = await app.inject({ method: 'GET', url: '/health' });
  expect(response.statusCode).toBe(200);
  expect(response.json()).toEqual({ ok: true, version: '0.2.0' });
});

it('returns evidence-backed state projection', async () => {
  const app = buildApp();
  const response = await app.inject({ method: 'GET', url: '/api/state' });
  expect(response.statusCode).toBe(200);
  const body = response.json();
  expect(body.robot.domain).toBe('https://robot.sisihome.org');
  expect(body.activeTask.objective).toContain('手機終端');
  expect(body.activeTask.objective).toContain('眼睛、耳朵');
  expect(body.approvals[0].toolName).toBe('browser.mediaDevices.getUserMedia');
  expect(body.messages[0].role).toBe('assistant');
});

it('accepts a user message and appends a runtime event', async () => {
  const app = buildApp();
  const create = await app.inject({
    method: 'POST',
    url: '/api/messages',
    payload: { content: '繼續做 runtime' },
  });
  expect(create.statusCode).toBe(201);

  const state = await app.inject({ method: 'GET', url: '/api/state' });
  const body = state.json();
  expect(body.messages[0]).toMatchObject({ role: 'assistant', content: '測試模式已收到指令：繼續做 runtime' });
  expect(body.messages[1]).toMatchObject({ role: 'user', content: '繼續做 runtime' });
  expect(body.events[0].type).toBe('agent.replied');
  expect(body.robot.label).toBe('收到指令');
});

it('accepts a media event and exposes it in state', async () => {
  const app = buildApp();
  const create = await app.inject({
    method: 'POST',
    url: '/api/events',
    payload: { kind: 'camera.started', safeSummary: '使用者開啟前鏡頭本機預覽。' },
  });
  expect(create.statusCode).toBe(201);

  const state = await app.inject({ method: 'GET', url: '/api/state' });
  const body = state.json();
  expect(body.events[0]).toMatchObject({ type: 'camera.started', safeSummary: '使用者開啟前鏡頭本機預覽。' });
});

it('rejects blank messages', async () => {
  const app = buildApp();
  const response = await app.inject({ method: 'POST', url: '/api/messages', payload: { content: '   ' } });
  expect(response.statusCode).toBe(400);
});

it('synthesizes assistant speech through real AI TTS instead of browser speech synthesis', async () => {
  process.env.OPENAI_API_KEY = 'test-openai-key';
  const audioBytes = new Uint8Array([1, 2, 3, 4]);
  const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(audioBytes, {
    status: 200,
    headers: { 'content-type': 'audio/mpeg' },
  }));

  const app = buildApp();
  const response = await app.inject({ method: 'POST', url: '/api/tts', payload: { text: '我準備好了' } });

  expect(response.statusCode).toBe(200);
  expect(response.headers['content-type']).toContain('audio/mpeg');
  expect(response.headers['x-tts-provider']).toBe('openai');
  expect(response.rawPayload).toEqual(Buffer.from(audioBytes));
  expect(fetchSpy).toHaveBeenCalledWith('https://api.openai.com/v1/audio/speech', expect.objectContaining({
    method: 'POST',
    headers: expect.objectContaining({ Authorization: 'Bearer test-openai-key' }),
  }));
  const body = JSON.parse(String(fetchSpy.mock.calls[0][1]?.body));
  expect(body).toMatchObject({ model: 'gpt-4o-mini-tts', voice: 'coral', input: '我準備好了' });
  expect(body.instructions).toContain('台灣華語');
});

it('uses Taiwanese Edge neural TTS when OpenAI credentials are not configured', async () => {
  const app = buildApp();
  const response = await app.inject({ method: 'POST', url: '/api/tts', payload: { text: '測試台灣腔' } });
  expect(response.statusCode, response.payload).toBe(200);
  expect(response.headers['content-type']).toContain('audio/mpeg');
  expect(response.headers['x-tts-provider']).toBe('edge-tts');
  expect(response.rawPayload).toEqual(Buffer.from([5, 6, 7]));
  const edgeInstance = vi.mocked(EdgeTTS).mock.results[0].value as { synthesize: ReturnType<typeof vi.fn> };
  expect(edgeInstance.synthesize).toHaveBeenCalledWith('測試台灣腔', 'zh-TW-HsiaoChenNeural', expect.objectContaining({
    outputFormat: 'audio-24khz-48kbitrate-mono-mp3',
  }));
});

it('rejects blank TTS text', async () => {
  const app = buildApp();
  const response = await app.inject({ method: 'POST', url: '/api/tts', payload: { text: '   ' } });
  expect(response.statusCode).toBe(400);
  expect(response.json().error).toBe('empty_text');
});

it('serves the phone terminal shell without browser caching old app bundles', async () => {
  const previousStaticRoot = process.env.STATIC_ROOT;
  const staticRoot = mkdtempSync(join(tmpdir(), 'desk-robot-static-'));
  writeFileSync(join(staticRoot, 'index.html'), '<html><body>phone shell</body></html>');
  process.env.STATIC_ROOT = staticRoot;
  try {
    const app = buildApp();
    const response = await app.inject({ method: 'GET', url: '/' });
    expect(response.statusCode).toBe(200);
    expect(response.headers['cache-control']).toContain('no-store');
  } finally {
    if (previousStaticRoot === undefined) delete process.env.STATIC_ROOT;
    else process.env.STATIC_ROOT = previousStaticRoot;
    rmSync(staticRoot, { recursive: true, force: true });
  }
});
