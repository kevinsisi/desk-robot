import { existsSync } from 'node:fs';
import { join } from 'node:path';
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

interface OpenCodeResponsePart {
  type: string;
  text?: string;
}

const bootTime = new Date().toISOString();
const openCodeBaseUrl = process.env.OPENCODE_BASE_URL ?? 'http://100.73.52.37:4096';
const openCodeProviderID = process.env.OPENCODE_PROVIDER_ID ?? 'openai';
const openCodeModelID = process.env.OPENCODE_MODEL ?? 'gpt-5.5';
const openCodeVariant = process.env.OPENCODE_VARIANT ?? 'medium';
let openCodeSessionID: string | null = null;

const runtimeEvents: RuntimeEvent[] = [
  { id: 'evt-1', type: 'system.boot', safeSummary: '系統規劃已建立，等待第一個實作任務。', createdAt: bootTime },
  { id: 'evt-2', type: 'domain.ready', safeSummary: 'robot.sisihome.org 已由 Caddy 反向代理到 RPi 服務。', createdAt: bootTime },
  { id: 'evt-3', type: 'media.permission', safeSummary: '相機與麥克風只會在你手動確認後啟用。', createdAt: bootTime },
];
const messages: ChatMessage[] = [
  { id: 'msg-1', role: 'assistant', content: '我在線上。按「夥伴模式」後，我可以聽你說話、看前鏡頭、讀懂指令，並用文字與語音回覆。', createdAt: bootTime },
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

async function getOpenCodeSession() {
  if (openCodeSessionID) return openCodeSessionID;
  const session = await fetchJsonWithTimeout(`${openCodeBaseUrl}/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'desk-robot-runtime',
      agent: 'general',
      model: { providerID: openCodeProviderID, id: openCodeModelID, variant: openCodeVariant },
    }),
  }, 20000);
  openCodeSessionID = String(session.id);
  return openCodeSessionID;
}

function extractAssistantText(response: Record<string, unknown>) {
  const parts = Array.isArray(response.parts) ? response.parts as OpenCodeResponsePart[] : [];
  const text = parts.filter((part) => part.type === 'text' && part.text).map((part) => part.text).join('\n').trim();
  return text || '我收到指令了，但這次沒有取得模型文字回覆。';
}

async function askAgent(text: string, imageDataUrl?: string) {
  if (process.env.NODE_ENV === 'test') {
    return imageDataUrl ? `測試模式已辨識影像指令：${text}` : `測試模式已收到指令：${text}`;
  }

  const sessionID = await getOpenCodeSession();
  const parts: Array<Record<string, string>> = [{ type: 'text', text }];
  if (imageDataUrl) {
    const mime = imageDataUrl.match(/^data:([^;]+);/)?.[1] ?? 'image/jpeg';
    const extension = mime.split('/')[1] ?? 'jpg';
    parts.push({ type: 'file', mime, url: imageDataUrl, filename: `desk-robot-camera.${extension}` });
  }
  const response = await fetchJsonWithTimeout(`${openCodeBaseUrl}/session/${sessionID}/message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: { providerID: openCodeProviderID, modelID: openCodeModelID },
      agent: 'general',
      variant: openCodeVariant,
      system: '你是 Desk Robot 的即時助理。只用繁體中文（台灣）回覆。簡潔、直接、可執行。若收到影像，先描述你看到的重點，再回答使用者指令。不要假裝有看不到的內容。',
      parts,
    }),
  });
  return extractAssistantText(response);
}

export function buildApp() {
  const app = Fastify({ logger: false, bodyLimit: 10 * 1024 * 1024 });

  app.register(cors, { origin: true });

  app.get('/health', async () => ({ ok: true, version: SERVER_VERSION }));

  app.get('/api/state', async () => ({
    robot: {
      name: 'Desk Robot',
      state: messages.length > 1 ? 'thinking' : 'idle',
      label: messages.length > 1 ? '收到指令' : '待命中',
      domain: 'https://robot.sisihome.org',
      secureContextRequired: true,
    },
    activeTask: {
      id: 'runtime-agent',
      objective: '完整桌面夥伴：鏡頭辨識、語音辨識、指令理解、文字與語音回覆互動',
      status: 'in_progress',
      currentStep: '夥伴模式可開啟前鏡頭與即時語音；視覺問題會送目前畫面給模型，回覆同步顯示並可朗讀。',
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

  app.post<{ Body: { content?: string } }>('/api/messages', async (request, reply) => {
    try {
      const userMessage = appendUserMessage(String(request.body?.content ?? ''));
      appendEvent('agent.thinking', 'Desk Robot 正在理解指令並產生回覆。');
      try {
        const answer = await askAgent(userMessage.content);
        const assistant = appendMessage('assistant', answer);
        appendEvent('agent.replied', `Desk Robot 已回覆：${answer.slice(0, 80)}`);
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
    app.register(fastifyStatic, { root: staticRoot, prefix: '/', wildcard: false });
    app.setNotFoundHandler(async (request, reply) => {
      if (request.url.startsWith('/api/') || request.url === '/health') return reply.status(404).send({ error: 'not_found' });
      return reply.sendFile('index.html');
    });
  }

  return app;
}

export function resolveClientDistFromCwd() {
  return join(process.cwd(), 'packages/client/dist');
}
