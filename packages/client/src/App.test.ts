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
  expect(APP_VERSION).toBe('0.1.0');
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
