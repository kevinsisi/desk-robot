import { existsSync } from 'node:fs';
import { join } from 'node:path';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import { SERVER_VERSION } from './config.js';

const now = new Date().toISOString();

const runtimeEvents = [
  { id: 'evt-1', type: 'system.boot', safeSummary: '系統規劃已建立，等待第一個實作任務。', createdAt: now },
  { id: 'evt-2', type: 'domain.ready', safeSummary: 'robot.sisihome.org 已預留；目前 Caddy 尚未接到服務。', createdAt: now },
  { id: 'evt-3', type: 'media.permission', safeSummary: '相機與麥克風只會在你手動確認後啟用。', createdAt: now },
];

export function buildApp() {
  const app = Fastify({ logger: false });

  app.register(cors, { origin: true });

  app.get('/health', async () => ({ ok: true, version: SERVER_VERSION }));

  app.get('/api/state', async () => ({
    robot: {
      name: 'Desk Robot',
      state: 'idle',
      label: '待命中',
      domain: 'https://robot.sisihome.org',
      secureContextRequired: true,
    },
    activeTask: {
      id: 'bootstrap-ui',
      objective: '建立第一版控制台 UI',
      status: 'in_progress',
      currentStep: '本機預覽與截圖',
      updatedAt: now,
    },
    approvals: [
      {
        id: 'approval-demo-media',
        toolName: 'browser.mediaDevices.getUserMedia',
        summary: '測試相機與麥克風權限，不會背景錄音錄影。',
        riskLevel: 'medium',
        status: 'pending',
        createdAt: now,
      },
    ],
    events: runtimeEvents,
  }));

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
