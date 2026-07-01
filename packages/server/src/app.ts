import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { EdgeTTS, Constants } from '@andresaya/edge-tts';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import { SERVER_VERSION } from './config.js';

interface RuntimeEvent {
  id: string;
  type: string;
  safeSummary: string;
  createdAt: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

interface HermesChatMessage {
  role: string;
  content?: string;
}

const bootTime = new Date().toISOString();
function hermesBaseUrl() {
  return (process.env.HERMES_API_BASE_URL ?? 'http://127.0.0.1:8642').replace(/\/$/, '');
}
function hermesApiKey() {
  return process.env.HERMES_API_KEY ?? process.env.API_SERVER_KEY ?? '';
}
function hermesSessionID() {
  return process.env.HERMES_SESSION_ID ?? 'desk-robot-runtime';
}

const runtimeEvents: RuntimeEvent[] = [
  { id: 'evt-1', type: 'system.boot', safeSummary: '系統規劃已建立，等待第一個實作任務。', createdAt: bootTime },
  { id: 'evt-2', type: 'domain.ready', safeSummary: 'robot.sisihome.org 已由 Caddy 反向代理到 RPi 服務。', createdAt: bootTime },
  { id: 'evt-3', type: 'media.permission', safeSummary: '相機與麥克風只會在你手動確認後啟用。', createdAt: bootTime },
];
const messages: ChatMessage[] = [
  { id: 'msg-1', role: 'assistant', content: '嗨，我準備好了。', createdAt: bootTime },
];

function appendEvent(type: string, safeSummary: string) {
  const event = {
    id: `evt-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    type,
    safeSummary: safeSummary.slice(0, 200),
    createdAt: new Date().toISOString(),
  };
  runtimeEvents.unshift(event);
  return event;
}

function appendMessage(role: ChatMessage['role'], content: string) {
  const message: ChatMessage = {
    id: `msg-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    role,
    content: content.trim().slice(0, 4000),
    createdAt: new Date().toISOString(),
  };
  messages.unshift(message);
  return message;
}

function appendUserMessage(content: string) {
  const trimmed = content.trim();
  if (!trimmed) throw new Error('empty_message');
  const message = appendMessage('user', trimmed);
  appendEvent('message.received', `收到使用者訊息：${message.content.slice(0, 80)}`);
  return message;
}

async function fetchJsonWithTimeout(url: string, init: RequestInit, timeoutMs = 90000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    const text = await response.text();
    if (!response.ok) {
      throw new Error(`${response.status} ${text.slice(0, 300)}`);
    }
    return JSON.parse(text) as Record<string, unknown>;
  } finally {
    clearTimeout(timeout);
  }
}

function hermesHeaders() {
  if (!hermesApiKey()) throw new Error('hermes_api_key_not_configured');
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${hermesApiKey()}`,
    'X-Hermes-Session-Key': hermesSessionID(),
  };
}

async function ensureHermesSession() {
  const response = await fetch(`${hermesBaseUrl()}/api/sessions/${encodeURIComponent(hermesSessionID())}`, {
    method: 'GET',
    headers: hermesHeaders(),
  });
  if (response.status === 404) {
    await fetchJsonWithTimeout(`${hermesBaseUrl()}/api/sessions`, {
      method: 'POST',
      headers: hermesHeaders(),
      body: JSON.stringify({
        id: hermesSessionID(),
        title: 'Desk Robot Runtime',
        system_prompt: '你是 Desk Robot 的即時助理。只用繁體中文（台灣）回覆。簡潔、直接、可執行。若收到影像，先描述你看到的重點，再回答使用者指令。不要假裝有看不到的內容。',
      }),
    }, 20000);
    return;
  }
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${response.status} ${text.slice(0, 300)}`);
  }
}

function extractHermesAssistantText(response: Record<string, unknown>) {
  const message = response.message as HermesChatMessage | undefined;
  return message?.content?.trim() || '我收到指令了，但這次沒有取得模型文字回覆。';
}

function cleanTtsInput(text: string) {
  return text.replace(/`{1,3}/g, '').replace(/https?:\/\/\S+/g, '網址').trim().slice(0, 900);
}

async function synthesizeWithOpenAI(text: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('tts_not_configured');

  const response = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.DESK_BOT_TTS_MODEL ?? 'gpt-4o-mini-tts',
      voice: process.env.DESK_BOT_TTS_VOICE ?? 'coral',
      input: cleanTtsInput(text),
      response_format: 'mp3',
      instructions: '請用自然、年輕、溫暖的台灣華語口吻朗讀；語速略快但清楚，不要中國腔，不要播報腔，不要機械感。',
    }),
  });
  const audio = Buffer.from(await response.arrayBuffer());
  if (!response.ok) {
    throw new Error(`${response.status} ${audio.toString('utf8').slice(0, 300)}`);
  }
  return { audio, contentType: response.headers.get('content-type') ?? 'audio/mpeg', provider: 'openai' };
}

async function synthesizeTts(text: string) {
  if (process.env.OPENAI_API_KEY) return synthesizeWithOpenAI(text);

  const edge = new EdgeTTS();
  await edge.synthesize(text, process.env.DESK_BOT_EDGE_TTS_VOICE ?? 'zh-TW-HsiaoChenNeural', {
    rate: process.env.DESK_BOT_EDGE_TTS_RATE ?? '+8%',
    pitch: process.env.DESK_BOT_EDGE_TTS_PITCH ?? '+0Hz',
    outputFormat: Constants.OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3,
  });
  return { audio: edge.toBuffer(), contentType: 'audio/mpeg', provider: 'edge-tts' };
}

async function askAgent(text: string, imageDataUrl?: string) {
  if (process.env.NODE_ENV === 'test') {
    return imageDataUrl ? `測試模式已辨識影像指令：${text}` : `測試模式已收到指令：${text}`;
  }

  await ensureHermesSession();
  const message: string | Array<Record<string, string | Record<string, string>>> = imageDataUrl
    ? [
        { type: 'text', text },
        { type: 'image_url', image_url: { url: imageDataUrl } },
      ]
    : text;
  const response = await fetchJsonWithTimeout(`${hermesBaseUrl()}/api/sessions/${encodeURIComponent(hermesSessionID())}/chat`, {
    method: 'POST',
    headers: hermesHeaders(),
    body: JSON.stringify({
      message,
      instructions: '你是 Desk Robot 的即時助理。只用繁體中文（台灣）回覆。簡潔、直接、可執行。若收到影像，先描述你看到的重點，再回答使用者指令。不要假裝有看不到的內容。',
    }),
  });
  return extractHermesAssistantText(response);
}

export function buildApp() {
  const app = Fastify({ logger: false, bodyLimit: 10 * 1024 * 1024 });

  app.register(cors, { origin: true });

  app.get('/health', async () => ({ ok: true, version: SERVER_VERSION }));

  app.get('/api/state', async () => ({
    robot: {
      name: 'Desk Bot',
      state: messages.length > 1 ? 'thinking' : 'idle',
      label: messages.length > 1 ? '收到指令' : '待命中',
      domain: 'https://robot.sisihome.org',
      secureContextRequired: true,
    },
    activeTask: {
      id: 'runtime-agent',
      objective: '手機終端：用手機當 Desk Bot 的眼睛、耳朵與回覆介面',
      status: 'in_progress',
      currentStep: '手機網頁可開啟前鏡頭與即時語音；視覺問題會送目前畫面給模型，回覆同步顯示並可朗讀。',
      updatedAt: runtimeEvents[0]?.createdAt ?? bootTime,
    },
    approvals: [
      {
        id: 'approval-demo-media',
        toolName: 'browser.mediaDevices.getUserMedia',
        summary: '測試相機與麥克風權限，不會背景錄音錄影。',
        riskLevel: 'medium',
        status: 'pending',
        createdAt: bootTime,
      },
    ],
    events: runtimeEvents.slice(0, 12),
    messages: messages.slice(0, 20),
  }));

  app.post<{ Body: { text?: string } }>('/api/tts', async (request, reply) => {
    const text = cleanTtsInput(String(request.body?.text ?? ''));
    if (!text) return reply.status(400).send({ error: 'empty_text', message: '朗讀文字不能是空白。' });
    try {
      const result = await synthesizeTts(text);
      return reply
        .header('Content-Type', result.contentType)
        .header('Cache-Control', 'no-store')
        .header('X-TTS-Provider', result.provider)
        .send(result.audio);
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'unknown';
      return reply.status(502).send({ error: 'tts_failed', message: detail.slice(0, 300) });
    }
  });

  app.post<{ Body: { content?: string } }>('/api/messages', async (request, reply) => {
    try {
      const userMessage = appendUserMessage(String(request.body?.content ?? ''));
      appendEvent('agent.thinking', 'Desk Bot 正在理解指令並產生回覆。');
      try {
        const answer = await askAgent(userMessage.content);
        const assistant = appendMessage('assistant', answer);
        appendEvent('agent.replied', `Desk Bot 已回覆：${answer.slice(0, 80)}`);
        return reply.status(201).send({ message: userMessage, assistant, stateUpdated: true });
      } catch (error) {
        const detail = error instanceof Error ? error.message : 'unknown';
        const assistant = appendMessage('assistant', `我收到「${userMessage.content}」，但模型回覆暫時失敗：${detail.slice(0, 160)}`);
        appendEvent('agent.failed', `模型回覆失敗：${detail.slice(0, 120)}`);
        return reply.status(201).send({ message: userMessage, assistant, stateUpdated: true, warning: detail });
      }
    } catch {
      return reply.status(400).send({ error: 'empty_message', message: '訊息不能是空白。' });
    }
  });

  app.post<{ Body: { prompt?: string; imageDataUrl?: string } }>('/api/vision/analyze', async (request, reply) => {
    const prompt = String(request.body?.prompt ?? '請辨識目前前鏡頭畫面，描述你看到的重點，並指出下一步可以做什麼。').trim();
    const imageDataUrl = String(request.body?.imageDataUrl ?? '');
    if (!imageDataUrl.startsWith('data:image/')) {
      return reply.status(400).send({ error: 'missing_image' });
    }
    appendMessage('user', `${prompt}\n[前鏡頭截圖]`);
    appendEvent('vision.received', '收到前鏡頭截圖，開始辨識畫面。');
    try {
      const answer = await askAgent(prompt, imageDataUrl);
      const assistant = appendMessage('assistant', answer);
      appendEvent('vision.replied', `影像辨識已回覆：${answer.slice(0, 80)}`);
      return reply.status(201).send({ assistant });
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'unknown';
      const assistant = appendMessage('assistant', `我收到前鏡頭畫面，但影像辨識暫時失敗：${detail.slice(0, 160)}`);
      appendEvent('vision.failed', `影像辨識失敗：${detail.slice(0, 120)}`);
      return reply.status(201).send({ assistant, warning: detail });
    }
  });

  app.post<{ Body: { kind?: string; safeSummary?: string } }>('/api/events', async (request, reply) => {
    const kind = String(request.body?.kind ?? '').slice(0, 80);
    const safeSummary = String(request.body?.safeSummary ?? '').trim().slice(0, 200);
    if (!kind || !safeSummary) return reply.status(400).send({ error: 'invalid_event' });
    return reply.status(201).send({ event: appendEvent(kind, safeSummary) });
  });

  const staticRoot = process.env.STATIC_ROOT;
  if (staticRoot && existsSync(staticRoot)) {
    app.addHook('onSend', async (request, reply, payload) => {
      const contentType = reply.getHeader('content-type');
      if (!request.url.startsWith('/api/') && typeof contentType === 'string' && contentType.includes('text/html')) {
        reply.header('Cache-Control', 'no-store, max-age=0');
      }
      return payload;
    });
    app.register(fastifyStatic, {
      root: staticRoot,
      prefix: '/',
      wildcard: false,
      setHeaders: (response, pathName) => {
        if (pathName.endsWith('index.html')) response.setHeader('Cache-Control', 'no-store, max-age=0');
      },
    });
    app.setNotFoundHandler(async (request, reply) => {
      if (request.url.startsWith('/api/') || request.url === '/health') return reply.status(404).send({ error: 'not_found' });
      return reply.header('Cache-Control', 'no-store, max-age=0').sendFile('index.html');
    });
  }

  return app;
}

export function resolveClientDistFromCwd() {
  return join(process.cwd(), 'packages/client/dist');
}
