import type { DeskRobotState } from '../api/client';
import { getRobotExpression, getRobotExpressionHeadline, type RobotExpression } from '../companion';

interface RobotFaceProps {
  state: DeskRobotState['robot'];
  lastLine?: string;
  emotion?: RobotExpression;
  onStartCompanion?: () => Promise<void>;
}

export function RobotFace({ state, lastLine, emotion, onStartCompanion }: RobotFaceProps) {
  const expression = emotion ?? getRobotExpression({ state: state.state, label: state.label, lastLine });
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
        <div className="bot-mood">手機終端・{state.label === '待命中' ? '等你叫我' : state.label}</div>
        <h2>{getRobotExpressionHeadline(expression)}</h2>
        <p className="phone-terminal-note">手機就是 Desk Bot 的眼睛跟耳朵。</p>
        <p>{lastLine || '按一下開始陪我，就能直接說話、讓我看畫面、聽我回覆。'}</p>
        <button type="button" className="primary-companion-button" onClick={() => void onStartCompanion?.()}>
          開始陪我
        </button>
      </div>
    </section>
  );
}
