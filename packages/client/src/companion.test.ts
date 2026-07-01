import { describe, expect, it } from 'vitest';
import { classifyCompanionCommand, getProductCapabilities, getPrimaryActions, getRobotExpression } from './companion';

describe('companion command routing', () => {
  it('routes visual questions to camera analysis', () => {
    expect(classifyCompanionCommand('你現在看到什麼？')).toBe('vision');
    expect(classifyCompanionCommand('看一下桌上有什麼')).toBe('vision');
    expect(classifyCompanionCommand('辨識畫面')).toBe('vision');
    expect(classifyCompanionCommand('我在幹嘛')).toBe('vision');
    expect(classifyCompanionCommand('你知道我現在在幹嘛嗎')).toBe('vision');
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

  it('keeps the main UI focused on one obvious action', () => {
    expect(getPrimaryActions()).toEqual(['開始陪我']);
  });
});

describe('robot expression model', () => {
  it('maps runtime state to lively expressions', () => {
    expect(getRobotExpression('idle')).toBe('curious');
    expect(getRobotExpression('thinking')).toBe('thinking');
    expect(getRobotExpression('acting')).toBe('happy');
    expect(getRobotExpression('blocked')).toBe('worried');
  });
});
