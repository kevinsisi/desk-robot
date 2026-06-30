import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchState, sendMessage, analyzeVision, type DeskRobotState } from './api/client';
import { ActivityStream } from './components/ActivityStream';
import { ApprovalQueue } from './components/ApprovalQueue';
import { ChatPanel } from './components/ChatPanel';
import { MediaPermissionPanel, type CompanionStarter, type VisionAnalyzer } from './components/MediaPermissionPanel';
import { RobotFace } from './components/RobotFace';
import { TaskPanel } from './components/TaskPanel';
import { getProductCapabilities } from './companion';
import { APP_VERSION } from './version';

const fallbackState: DeskRobotState = {
  robot: {
    name: 'Desk Robot',
    state: 'idle',
    label: '本機預覽',
    domain: 'https://robot.sisihome.org',
    secureContextRequired: true,
  },
  activeTask: {
    id: 'local-ui-preview',
    objective: '呈現第一版控制台外觀',
    status: 'in_progress',
    currentStep: 'server 還沒啟動時，先用本機 fallback projection。',
    updatedAt: new Date().toISOString(),
  },
  approvals: [
    {
      id: 'local-media-gate',
      toolName: 'browser.mediaDevices.getUserMedia',
      summary: '相機 / 麥克風權限測試，只在你按下按鈕後觸發。',
      riskLevel: 'medium',
      status: 'pending',
      createdAt: new Date().toISOString(),
    },
  ],
  events: [
    { id: 'local-1', type: 'ui.render', safeSummary: '第一版 UI 已用本機資料渲染。', createdAt: new Date().toISOString() },
    { id: 'local-2', type: 'guardrail.media', safeSummary: '沒有背景錄音錄影；只支援手動測試權限。', createdAt: new Date().toISOString() },
  ],
  messages: [
    { id: 'local-msg-1', role: 'assistant', content: '嗨，我準備好了。', createdAt: new Date().toISOString() },
  ],
};

export function App() {
  const [state, setState] = useState<DeskRobotState>(fallbackState);
  const [loadStatus, setLoadStatus] = useState<'loading' | 'live' | 'fallback'>('loading');
  const visionAnalyzerRef = useRef<VisionAnalyzer | null>(null);
  const companionStarterRef = useRef<CompanionStarter | null>(null);
  const speechStarterRef = useRef<(() => void) | null>(null);

  async function refreshState() {
    const nextState = await fetchState();
    setState(nextState);
    setLoadStatus('live');
  }

  useEffect(() => {
    let cancelled = false;
    fetchState()
      .then((nextState) => {
        if (!cancelled) {
          setState(nextState);
          setLoadStatus('live');
        }
      })
      .catch(() => {
        if (!cancelled) setLoadStatus('fallback');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSendMessage(content: string) {
    await sendMessage(content);
    await refreshState();
  }

  async function handleAnalyzeVision(imageDataUrl: string, prompt?: string) {
    await analyzeVision(imageDataUrl, prompt ?? '請辨識前鏡頭畫面，描述你看到的重點，並用 Desk Robot 的口吻回覆下一步建議。');
    await refreshState();
  }

  async function handleVisionCommand(content: string) {
    const analyzer = visionAnalyzerRef.current;
    if (!analyzer) throw new Error('視覺模組還沒準備好，請重新整理頁面。');
    await analyzer(`使用者問：「${content}」。請根據目前前鏡頭畫面回答，先講你實際看到的重點，再回答指令。`);
  }

  async function handleStartCompanion() {
    const starter = companionStarterRef.current;
    if (!starter) throw new Error('夥伴模式還沒準備好，請重新整理頁面。');
    await starter();
    speechStarterRef.current?.();
  }

  const registerVisionAnalyzer = useCallback((analyzer: VisionAnalyzer | null) => {
    visionAnalyzerRef.current = analyzer;
  }, []);

  const registerCompanionStarter = useCallback((starter: CompanionStarter | null) => {
    companionStarterRef.current = starter;
  }, []);

  const registerSpeechStarter = useCallback((starter: (() => void) | null) => {
    speechStarterRef.current = starter;
  }, []);

  const latestAssistantLine = state.messages.find((message) => message.role === 'assistant')?.content;

  return (
    <main className="app-shell companion-shell">
      <header className="minimal-topbar">
        <span>Desk Bot</span>
        <span className={`load-pill load-${loadStatus}`}>{loadStatus === 'live' ? '在線' : loadStatus === 'fallback' ? '預覽' : '讀取中'}</span>
      </header>

      <RobotFace state={state.robot} lastLine={latestAssistantLine} onStartCompanion={handleStartCompanion} />

      <ChatPanel messages={state.messages} onSend={handleSendMessage} onVisionCommand={handleVisionCommand} onRegisterSpeechStarter={registerSpeechStarter} />

      <details className="technical-drawer">
        <summary>相機、權限與紀錄</summary>
        <div className="dashboard-grid compact-grid">
          <MediaPermissionPanel
            onAnalyzeVision={handleAnalyzeVision}
            onRegisterVisionAnalyzer={registerVisionAnalyzer}
            onRegisterCompanionStarter={registerCompanionStarter}
          />
          <TaskPanel task={state.activeTask} />
          <ApprovalQueue approvals={state.approvals} />
          <ActivityStream events={state.events} />
        </div>
      </details>

      <footer>
        <span>v{APP_VERSION}</span>
        <span>{getProductCapabilities().join(' / ')}</span>
      </footer>
    </main>
  );
}
