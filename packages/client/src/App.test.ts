import { describe, expect, it } from 'vitest';
import { APP_VERSION } from './version';

it('exposes app version', () => {
  expect(APP_VERSION).toBe('0.1.0');
});
