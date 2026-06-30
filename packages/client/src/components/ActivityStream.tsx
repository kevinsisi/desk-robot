import type { RuntimeEvent } from '../api/client';

interface ActivityStreamProps {
  events: RuntimeEvent[];
}

export function ActivityStream({ events }: ActivityStreamProps) {
  return (
    <section className="panel activity-panel" aria-label="活動紀錄">
      <div className="panel-kicker">EVENT LOG</div>
      <h2>活動紀錄</h2>
      <ol className="event-list">
        {events.map((event) => (
          <li key={event.id}>
            <span className="event-type">{event.type}</span>
            <p>{event.safeSummary}</p>
            <time>{new Date(event.createdAt).toLocaleTimeString('zh-TW', { hour12: false })}</time>
          </li>
        ))}
      </ol>
    </section>
  );
}
