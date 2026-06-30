import { describe, expect, it } from 'vitest';
import { classifyCompanionCommand, getProductCapabilities } from './companion';

describe('companion command routing', () => {
  it('routes visual questions to camera analysis', () => {
    expect(classifyCompanionCommand('你現在看到什麼？')).toBe('vision');
    expect(classifyCompanionCommand('看一下桌上有什麼')).toBe('vision');
    expect(classifyCompanionCommand('辨識畫面')).toBe('vision');
  });

  it('keeps ordinary commands on the chat path', () => {
    expect(classifyCompanionCommand('幫我整理今天要做的事')).toBe('chat');
  });
});

describe('product capability copy', () => {
  it('describes the finished desk bot surface', () => {
    expect(getProductCapabilities()).toEqual([
      '鏡頭辨識',
      '語音辨識',
      '指令理解',
      '文字回覆',
      '語音回覆',
      '夥伴模式',
    ]);
  });
});
