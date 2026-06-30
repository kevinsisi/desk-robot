import { useState } from 'react';
import type { ChatMessage } from '../api/client';

interface ChatPanelProps {
  messages: ChatMessage[];
  onSend: (content: string) => Promise<void>;
}

export function ChatPanel({ messages, onSend }: ChatPanelProps) {
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const content = draft.trim();
    if (!content || sending) return;
    setSending(true);
    setError(null);
    try {
      await onSend(content);
      setDraft('');
    } catch (err) {
      setError(err instanceof Error ? err.message : '送出失敗');
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="panel chat-panel" aria-label="訊息輸入">
      <div className="panel-kicker">COMMAND INPUT</div>
      <h2>對 Desk Robot 說話</h2>
      <div className="message-list">
        {messages.map((message) => (
          <article key={message.id} className={`message message-${message.role}`}>
            <div className="status-line">
              <span>{message.role === 'user' ? '你' : 'Desk Robot'}</span>
              <time>{new Date(message.createdAt).toLocaleTimeString('zh-TW', { hour12: false })}</time>
            </div>
            <p>{message.content}</p>
          </article>
        ))}
      </div>
      <form
        className="chat-form"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="輸入指令，例如：幫我看一下現在狀態"
          rows={3}
        />
        <button type="submit" disabled={sending || draft.trim().length === 0}>
          {sending ? '送出中…' : '送出'}
        </button>
      </form>
      {error ? <p className="error-text">{error}</p> : <p className="muted">目前先寫入訊息與事件紀錄；下一步接 agent 執行。</p>}
    </section>
  );
}
