import { describe, expect, it } from 'vitest';
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
  expect(body.activeTask.objective).toContain('控制台');
  expect(body.approvals[0].toolName).toBe('browser.mediaDevices.getUserMedia');
});
