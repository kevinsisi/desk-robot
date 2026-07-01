// @vitest-environment jsdom
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';
import { App } from './App';
import { APP_VERSION } from './version';

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

it('exposes app version', () => {
  expect(APP_VERSION).toBe('0.2.0');
});

it('presents the product as a phone terminal instead of a desktop console', async () => {
  vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('offline preview'))));
  const host = document.createElement('div');
  document.body.appendChild(host);

  createRoot(host).render(createElement(App));
  await vi.waitFor(() => expect(document.body.textContent).toContain('手機終端'));

  expect(document.body.textContent).toContain('手機就是 Desk Bot 的眼睛跟耳朵');
  expect(document.querySelector('.phone-terminal-shell')).not.toBeNull();
  expect(document.body.textContent).not.toContain('桌面夥伴');
  expect(document.body.textContent).not.toContain('控制台外觀');
});

it('drives the face from the newest assistant reply, not the old boot greeting', async () => {
  vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response(JSON.stringify({
    robot: {
      name: 'Desk Bot',
      state: 'thinking',
      label: '收到指令',
      domain: 'https://robot.sisihome.org',
      secureContextRequired: true,
    },
    activeTask: null,
    approvals: [],
    events: [],
    messages: [
      { id: 'new-assistant', role: 'assistant', content: '可以做可愛表情：嘴巴微微嘟起，像啾一下。', createdAt: new Date().toISOString() },
      { id: 'user', role: 'user', content: '我在幹嘛', createdAt: new Date().toISOString() },
      { id: 'old-assistant', role: 'assistant', content: '嗨，我準備好了。', createdAt: new Date().toISOString() },
    ],
  }), { status: 200, headers: { 'Content-Type': 'application/json' } }))));

  const host = document.createElement('div');
  document.body.appendChild(host);
  createRoot(host).render(createElement(App));

  await vi.waitFor(() => expect(document.body.textContent).toContain('啾一下～'));
  expect(document.body.textContent).toContain('可以做可愛表情');
});
