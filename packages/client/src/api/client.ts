export interface RuntimeEvent {
  id: string;
  type: string;
  safeSummary: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export interface ApprovalRequest {
  id: string;
  toolName: string;
  summary: string;
  riskLevel: 'low' | 'medium' | 'high';
  status: 'pending' | 'approved' | 'denied';
  createdAt: string;
}

export interface DeskRobotState {
  robot: {
    name: string;
    state: 'idle' | 'thinking' | 'acting' | 'blocked';
    label: string;
    domain: string;
    secureContextRequired: boolean;
  };
  activeTask: {
    id: string;
    objective: string;
    status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
    currentStep: string;
    updatedAt: string;
  } | null;
  approvals: ApprovalRequest[];
  events: RuntimeEvent[];
  messages: ChatMessage[];
}

export interface AgentResponse {
  assistant?: ChatMessage;
  warning?: string;
  stateUpdated?: boolean;
}

export async function synthesizeSpeech(text: string): Promise<Blob> {
  const response = await fetch('/api/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!response.ok) {
    throw new Error(`語音產生失敗：${response.status}`);
  }
  return response.blob();
}

export async function fetchState(): Promise<DeskRobotState> {
  const response = await fetch('/api/state');
  if (!response.ok) {
    throw new Error(`讀取狀態失敗：${response.status}`);
  }
  return response.json() as Promise<DeskRobotState>;
}

export async function sendMessage(content: string): Promise<AgentResponse> {
  const response = await fetch('/api/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
  if (!response.ok) {
    throw new Error(`送出失敗：${response.status}`);
  }
  return response.json() as Promise<AgentResponse>;
}

export async function recordMediaEvent(kind: 'camera.started' | 'camera.stopped' | 'audio.recorded' | 'companion.started', safeSummary: string): Promise<void> {
  await fetch('/api/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind, safeSummary }),
  });
}

export async function analyzeVision(imageDataUrl: string, prompt?: string): Promise<AgentResponse> {
  const response = await fetch('/api/vision/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageDataUrl, prompt }),
  });
  if (!response.ok) {
    throw new Error(`影像辨識失敗：${response.status}`);
  }
  return response.json() as Promise<AgentResponse>;
}
