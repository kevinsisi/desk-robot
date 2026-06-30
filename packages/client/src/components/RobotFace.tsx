import type { DeskRobotState } from '../api/client';
import { getRobotExpression } from '../companion';

interface RobotFaceProps {
  state: DeskRobotState['robot'];
  lastLine?: string;
  onStartCompanion?: () => Promise<void>;
}

export function RobotFace({ state, lastLine, onStartCompanion }: RobotFaceProps) {
  const expression = getRobotExpression(state.state);
  return (
    <section className={`robot-stage expression-${expression}`} aria-label="Desk Bot">
      <div className="ambient-orb orb-a" />
      <div className="ambient-orb orb-b" />
      <div className="bot-body" aria-hidden="true">
        <div className="status-led" />
        <div className="bot-ear bot-ear-left" />
        <div className="bot-ear bot-ear-right" />
        <div className="bot-face">
          <div className="bot-blush blush-left" />
          <div className="bot-blush blush-right" />
          <div className="bot-eyes">
            <span className="bot-eye bot-eye-left" />
            <span className="bot-eye bot-eye-right" />
          </div>
          <div className="bot-mouth" />
        </div>
        <div className="bot-shadow" />
      </div>
      <div className="bot-copy">
        <div className="bot-mood">{state.label === '待命中' ? '等你叫我' : state.label}</div>
        <h2>{expression === 'happy' ? '好，我在！' : expression === 'thinking' ? '我正在想…' : expression === 'worried' ? '我卡住了' : '嗨，我在這裡'}</h2>
        <p>{lastLine || '按一下開始陪我，就能直接說話、讓我看畫面、聽我回覆。'}</p>
        <button type="button" className="primary-companion-button" onClick={() => void onStartCompanion?.()}>
          開始陪我
        </button>
      </div>
    </section>
  );
}
