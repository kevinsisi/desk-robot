import type { ApprovalRequest } from '../api/client';

interface ApprovalQueueProps {
  approvals: ApprovalRequest[];
}

export function ApprovalQueue({ approvals }: ApprovalQueueProps) {
  return (
    <section className="panel" aria-label="待確認操作">
      <div className="panel-kicker">APPROVAL QUEUE</div>
      <h2>待確認操作</h2>
      {approvals.length === 0 ? (
        <p className="muted">目前沒有待確認操作。</p>
      ) : (
        <div className="approval-list">
          {approvals.map((approval) => (
            <article className="approval-card" key={approval.id}>
              <div className="status-line">
                <span className={`risk risk-${approval.riskLevel}`}>風險：{riskLabel[approval.riskLevel]}</span>
                <span>{approval.status === 'pending' ? '等待中' : approval.status}</span>
              </div>
              <strong>{approval.toolName}</strong>
              <p>{approval.summary}</p>
              <div className="button-row">
                <button type="button" disabled>允許</button>
                <button type="button" disabled className="secondary">拒絕</button>
              </div>
              <small>按鈕先鎖定：要等 runtime approval API 落地。</small>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

const riskLabel = {
  low: '低',
  medium: '中',
  high: '高',
} satisfies Record<ApprovalRequest['riskLevel'], string>;
