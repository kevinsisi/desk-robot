import type { DeskRobotState } from '../api/client';

interface RobotFaceProps {
  state: DeskRobotState['robot'];
}

export function RobotFace({ state }: RobotFaceProps) {
  return (
    <section className="panel robot-panel" aria-label="機器人狀態">
      <div className="panel-kicker">ROBOT CORE</div>
      <div className="robot-face" aria-hidden="true">
        <div className="antenna" />
        <div className="visor">
          <span className="eye left" />
          <span className="eye right" />
        </div>
        <div className="mouth" />
      </div>
      <div className="robot-state-row">
        <span className="pulse-dot" />
        <strong>{state.label}</strong>
      </div>
      <p className="muted">狀態只來自 runtime event，不補假台詞。</p>
      <div className="domain-chip">{state.domain}</div>
    </section>
  );
}
