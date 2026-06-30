export type CompanionCommandKind = 'chat' | 'vision';

const visionIntentPattern = /(看到什麼|看見什麼|你看到|看一下|幫我看|辨識畫面|鏡頭|畫面|桌上|前面有什麼|這是什麼)/;

export function classifyCompanionCommand(command: string): CompanionCommandKind {
  return visionIntentPattern.test(command.replace(/\s+/g, '')) ? 'vision' : 'chat';
}

export function getProductCapabilities() {
  return ['鏡頭辨識', '語音辨識', '指令理解', '文字回覆', '語音回覆', '夥伴模式'];
}
