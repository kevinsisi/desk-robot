export type CompanionCommandKind = 'chat' | 'vision';
export type RobotRuntimeState = 'idle' | 'thinking' | 'acting' | 'blocked';
export type RobotExpression = 'curious' | 'thinking' | 'happy' | 'worried';

const visionIntentPattern = /(看到什麼|看見什麼|你看到|看一下|幫我看|辨識畫面|鏡頭|畫面|桌上|前面有什麼|這是什麼|我在幹嘛|在幹嘛|在做什麼|我現在在幹嘛|我現在在做什麼)/;

export function classifyCompanionCommand(command: string): CompanionCommandKind {
  return visionIntentPattern.test(command.replace(/\s+/g, '')) ? 'vision' : 'chat';
}

export function getProductCapabilities() {
  return ['鏡頭辨識', '語音辨識', '指令理解', '文字回覆', '語音回覆', '夥伴模式'];
}

export function getPrimaryActions() {
  return ['開始陪我'];
}

export function getRobotExpression(state: RobotRuntimeState): RobotExpression {
  if (state === 'thinking') return 'thinking';
  if (state === 'acting') return 'happy';
  if (state === 'blocked') return 'worried';
  return 'curious';
}
