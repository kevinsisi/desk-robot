import type { DeskRobotState } from '../api/client';

interface TaskPanelProps {
  task: DeskRobotState['activeTask'];
}

export function TaskPanel({ task }: TaskPanelProps) {
  return (
    <section className="panel" aria-label="目前任務">
      <div className="panel-kicker">ACTIVE TASK</div>
      <h2>目前任務</h2>
      {task ? (
        <div className="task-box">
          <div className="status-line">
            <span className="status-pill">{task.status === 'in_progress' ? '進行中' : task.status}</span>
            <time>{new Date(task.updatedAt).toLocaleString('zh-TW', { hour12: false })}</time>
          </div>
          <h3>{task.objective}</h3>
          <p>{task.currentStep}</p>
        </div>
      ) : (
        <p className="muted">沒有任務。待命不代表背景偷偷工作。</p>
      )}
    </section>
  );
}
