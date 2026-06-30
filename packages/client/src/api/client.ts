export interface RuntimeEvent {
  id: string;
  type: string;
  safeSummary: string;
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
}

export async function fetchState(): Promise<DeskRobotState> {
  const response = await fetch('/api/state');
  if (!response.ok) {
    throw new Error(`讀取狀態失敗：${response.status}`);
  }
  return response.json() as Promise<DeskRobotState>;
}
