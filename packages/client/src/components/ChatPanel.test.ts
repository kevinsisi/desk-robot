// @vitest-environment jsdom
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { ChatPanel } from './ChatPanel';

class FakeSpeechRecognition {
  static instances: FakeSpeechRecognition[] = [];
  lang = '';
  continuous = false;
  interimResults = false;
  onresult: ((event: unknown) => void) | null = null;
  onerror: ((event: { error?: string }) => void) | null = null;
  onend: (() => void) | null = null;
  start = vi.fn();
  stop = vi.fn();

  constructor() {
    FakeSpeechRecognition.instances.push(this);
  }
}

let root: Root | null = null;

afterEach(() => {
  act(() => root?.unmount());
  root = null;
  document.body.innerHTML = '';
  FakeSpeechRecognition.instances = [];
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it('plays assistant replies through the server AI TTS endpoint instead of browser speech synthesis', async () => {
  const fetchMock = vi.fn(async () => new Response(new Uint8Array([9, 8, 7]), { headers: { 'content-type': 'audio/mpeg' } }));
  vi.stubGlobal('fetch', fetchMock);
  const play = vi.spyOn(window.HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
  vi.spyOn(window.HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
  const objectUrls: string[] = [];
  vi.spyOn(URL, 'createObjectURL').mockImplementation(() => {
    const url = `blob:tts-${objectUrls.length + 1}`;
    objectUrls.push(url);
    return url;
  });
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
  vi.stubGlobal('speechSynthesis', { speak: vi.fn(), cancel: vi.fn() });
  vi.stubGlobal('SpeechSynthesisUtterance', vi.fn());

  const host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);

  await act(async () => {
    root?.render(createElement(ChatPanel, {
      messages: [{ id: 'old', role: 'assistant', content: '舊訊息', createdAt: new Date().toISOString() }],
      onSend: vi.fn(async () => undefined),
      onVisionCommand: vi.fn(async () => undefined),
    }));
  });
  await act(async () => {
    root?.render(createElement(ChatPanel, {
      messages: [{ id: 'new', role: 'assistant', content: '我準備好了', createdAt: new Date().toISOString() }],
      onSend: vi.fn(async () => undefined),
      onVisionCommand: vi.fn(async () => undefined),
    }));
    await Promise.resolve();
    await Promise.resolve();
  });

  expect(fetchMock).toHaveBeenCalledWith('/api/tts', expect.objectContaining({
    method: 'POST',
    body: JSON.stringify({ text: '我準備好了' }),
  }));
  expect(play).toHaveBeenCalled();
  expect((window.speechSynthesis as unknown as { speak: ReturnType<typeof vi.fn> }).speak).not.toHaveBeenCalled();
});

it('treats mobile speech aborted events as transient while continuous listening is active', async () => {
  vi.stubGlobal('SpeechRecognition', FakeSpeechRecognition);
  const host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);

  await act(async () => {
    root?.render(createElement(ChatPanel, {
      messages: [],
      onSend: vi.fn(async () => undefined),
      onVisionCommand: vi.fn(async () => undefined),
    }));
  });

  const speechButton = [...document.querySelectorAll('button')].find((button) => button.textContent === '即時語音');
  expect(speechButton).toBeTruthy();
  await act(async () => {
    speechButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });

  const recognition = FakeSpeechRecognition.instances[0];
  expect(recognition.continuous).toBe(true);
  await act(async () => {
    recognition.onerror?.({ error: 'aborted' });
  });

  expect(document.body.textContent).not.toContain('語音辨識失敗：aborted');
  expect(document.body.textContent).toContain('語音辨識被手機瀏覽器暫停，正在重新接續');
});
