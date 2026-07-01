export type CompanionCommandKind = 'chat' | 'vision';
export type RobotRuntimeState = 'idle' | 'thinking' | 'acting' | 'blocked';
export type RobotExpression = 'curious' | 'thinking' | 'happy' | 'worried' | 'sad' | 'seeing' | 'listening' | 'playful';

export interface RobotExpressionContext {
  state: RobotRuntimeState;
  label?: string;
  lastLine?: string;
}

const visionIntentPattern = /(看到什麼|看見什麼|你看到|看一下|幫我看|辨識畫面|鏡頭|畫面|桌上|前面有什麼|這是什麼|我在幹嘛|在幹嘛|在做什麼|我現在在幹嘛|我現在在做什麼)/;
const blockedPattern = /(卡住|失敗|錯誤|抱歉|不能|無法|權限|拒絕|denied|error|failed)/i;
const sadPattern = /(難過|傷心|嗚嗚|哭|淚|眼淚|寂寞|沮喪|委屈|失落|低落|不開心|心情不好|小機器人燈都變藍|變藍了|QQ|;´ω`)/;
const playfulPattern = /(可愛|啾|嘟|撒嬌|笑一下|眨眼|歪一邊|表情)/;
const seeingPattern = /(看到|看見|鏡頭|畫面|眼睛|正面|桌上|前面|辨識|觀察|看著)/;
const normalModePattern = /(恢復正常模式|正常模式|待命|先不用|停止即時語音)/;
const listeningPattern = /(正在聽|聽你說|說話|語音|麥克風|耳朵|陪我)/;

export function classifyCompanionCommand(command: string): CompanionCommandKind {
  return visionIntentPattern.test(command.replace(/\s+/g, '')) ? 'vision' : 'chat';
}

export function getProductCapabilities() {
  return ['鏡頭辨識', '語音辨識', '指令理解', '文字回覆', '語音回覆', '夥伴模式'];
}

export function getPrimaryActions() {
  return ['開始陪我'];
}

export function getRobotExpression(input: RobotRuntimeState | RobotExpressionContext): RobotExpression {
  const context = typeof input === 'string' ? { state: input } : input;
  const signal = `${context.label ?? ''} ${context.lastLine ?? ''}`;

  if (context.state === 'blocked' || blockedPattern.test(signal)) return 'worried';
  if (normalModePattern.test(signal)) return 'curious';
  if (sadPattern.test(signal)) return 'sad';
  if (playfulPattern.test(signal)) return 'playful';
  if (seeingPattern.test(signal)) return 'seeing';
  if (listeningPattern.test(signal)) return 'listening';
  if (context.state === 'thinking') return 'thinking';
  if (context.state === 'acting') return 'happy';
  return 'curious';
}

export function getRobotExpressionHeadline(expression: RobotExpression) {
  if (expression === 'happy') return '好，我在！';
  if (expression === 'thinking') return '我正在想…';
  if (expression === 'worried') return '我卡住了';
  if (expression === 'sad') return '我有點難過';
  if (expression === 'seeing') return '我有看到喔';
  if (expression === 'listening') return '我在聽你說';
  if (expression === 'playful') return '啾一下～';
  return '嗨，我在這裡';
}
