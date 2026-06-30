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

const bootTime = new Date().toISOString();
const runtimeEvents: RuntimeEvent[] = [
  { id: 'evt-1', type: 'system.boot', safeSummary: '系統規劃已建立，等待第一個實作任務。', createdAt: bootTime },
  { id: 'evt-2', type: 'domain.ready', safeSummary: 'robot.sisihome.org 已由 Caddy 反向代理到 RPi 服務。', createdAt: bootTime },
  { id: 'evt-3', type: 'media.permission', safeSummary: '相機與麥克風只會在你手動確認後啟用。', createdAt: bootTime },
];
const messages: ChatMessage[] = [
  { id: 'msg-1', role: 'assistant', content: '我在線上。先把你的指令寫進事件紀錄，下一步再接真正 agent runtime。', createdAt: bootTime },
];

function appendUserMessage(content: string) {
  const trimmed = content.trim();
  if (!trimmed) {
    throw new Error('empty_message');
  }

  const createdAt = new Date().toISOString();
  const message: ChatMessage = {
    id: `msg-${Date.now()}`,
    role: 'user',
    content: trimmed.slice(0, 2000),
    createdAt,
  };
  messages.unshift(message);
  runtimeEvents.unshift({
    id: `evt-${Date.now()}`,
    type: 'message.received',
    safeSummary: `收到使用者訊息：${message.content.slice(0, 80)}`,
    createdAt,
  });
  return message;
}

export function buildApp() {
  const app = Fastify({ logger: false });

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
      id: 'bootstrap-runtime',
      objective: '建立可互動的訊息 runtime',
      status: 'in_progress',
      currentStep: messages.length > 1 ? '已能接收訊息並寫入事件紀錄。' : '已部署到 RPi，等待使用者輸入第一則訊息。',
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
      const message = appendUserMessage(String(request.body?.content ?? ''));
      return reply.status(201).send({ message, stateUpdated: true });
    } catch {
      return reply.status(400).send({ error: 'empty_message', message: '訊息不能是空白。' });
    }
  });

  app.post<{ Body: { kind?: string; safeSummary?: string } }>('/api/events', async (request, reply) => {
    const kind = String(request.body?.kind ?? '').slice(0, 80);
    const safeSummary = String(request.body?.safeSummary ?? '').trim().slice(0, 200);
    if (!kind || !safeSummary) {
      return reply.status(400).send({ error: 'invalid_event' });
    }
    const event = {
      id: `evt-${Date.now()}`,
      type: kind,
      safeSummary,
      createdAt: new Date().toISOString(),
    };
    runtimeEvents.unshift(event);
    return reply.status(201).send({ event });
  });

  const staticRoot = process.env.STATIC_ROOT;
  if (staticRoot && existsSync(staticRoot)) {
    app.register(fastifyStatic, {
      root: staticRoot,
      prefix: '/',
      wildcard: false,
    });

    app.setNotFoundHandler(async (request, reply) => {
      if (request.url.startsWith('/api/') || request.url === '/health') {
        return reply.status(404).send({ error: 'not_found' });
      }
      return reply.sendFile('index.html');
    });
  }

  return app;
}

export function resolveClientDistFromCwd() {
  return join(process.cwd(), 'packages/client/dist');
}
