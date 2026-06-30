import { expect, it } from 'vitest';
import { buildApp } from './app.js';

it('returns health with version', async () => {
  const app = buildApp();
  const response = await app.inject({ method: 'GET', url: '/health' });
  expect(response.statusCode).toBe(200);
  expect(response.json()).toEqual({ ok: true, version: '0.1.0' });
});

it('returns evidence-backed state projection', async () => {
  const app = buildApp();
  const response = await app.inject({ method: 'GET', url: '/api/state' });
  expect(response.statusCode).toBe(200);
  const body = response.json();
  expect(body.robot.domain).toBe('https://robot.sisihome.org');
  expect(body.activeTask.objective).toContain('互動');
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
  expect(body.messages[0]).toMatchObject({ role: 'user', content: '繼續做 runtime' });
  expect(body.events[0].type).toBe('message.received');
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
