import { describe, expect, it } from 'vitest';
import { classifyCompanionCommand, getProductCapabilities, getPrimaryActions, getRobotExpression, getRobotExpressionHeadline } from './companion';

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

  it('derives visible expressions from current Desk Bot context', () => {
    expect(getRobotExpression({ state: 'thinking', label: '收到指令', lastLine: '我看到你正面看著鏡頭。' })).toBe('seeing');
    expect(getRobotExpression({ state: 'idle', label: '正在聽語音' })).toBe('listening');
    expect(getRobotExpression({ state: 'idle', label: '收到指令', lastLine: '已恢復正常模式。' })).toBe('curious');
    expect(getRobotExpression({ state: 'thinking', lastLine: '可以做這個可愛表情：嘴巴微微嘟起，像啾一下。' })).toBe('playful');
    expect(getRobotExpression({ state: 'idle', lastLine: '為什麼機器人不怕感冒？因為它都有防火牆，不會中毒。' })).toBe('laughing');
    expect(getRobotExpression({ state: 'idle', lastLine: '嗚嗚……我難過到小機器人燈都變藍了(;´ω`;)' })).toBe('sad');
    expect(getRobotExpression({ state: 'idle', lastLine: '相機權限被拒絕，暫時無法看畫面。' })).toBe('worried');
  });

  it('uses matching headlines for non-default expressions', () => {
    expect(getRobotExpressionHeadline('seeing')).toBe('我有看到喔');
    expect(getRobotExpressionHeadline('listening')).toBe('我在聽你說');
    expect(getRobotExpressionHeadline('sad')).toBe('我有點難過');
    expect(getRobotExpressionHeadline('playful')).toBe('啾一下～');
    expect(getRobotExpressionHeadline('laughing')).toBe('哈哈～');
  });
});
