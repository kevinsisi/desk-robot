import { useRef, useState } from 'react';
import type { ChatMessage } from '../api/client';

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<{
    isFinal: boolean;
    0: { transcript: string };
  }>;
}

interface ChatPanelProps {
  messages: ChatMessage[];
  onSend: (content: string) => Promise<void>;
}

export function ChatPanel({ messages, onSend }: ChatPanelProps) {
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [listening, setListening] = useState(false);
  const [speechStatus, setSpeechStatus] = useState('語音輸入會使用瀏覽器內建聽寫，辨識後自動送出。');
  const [error, setError] = useState<string | null>(null);

  async function submit(contentOverride?: string) {
    const content = (contentOverride ?? draft).trim();
    if (!content || sending) return;
    setSending(true);
    setError(null);
    try {
      await onSend(content);
      setDraft('');
      setSpeechStatus(contentOverride ? `已送出語音辨識：${content}` : speechStatus);
    } catch (err) {
      setError(err instanceof Error ? err.message : '送出失敗');
    } finally {
      setSending(false);
    }
  }

  function startSpeech() {
    const SpeechRecognitionImpl = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SpeechRecognitionImpl) {
      setError('這個瀏覽器不支援 Web Speech 語音辨識；請先用文字輸入。');
      return;
    }

    recognitionRef.current?.stop();
    const recognition = new SpeechRecognitionImpl();
    recognition.lang = 'zh-TW';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      let interim = '';
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const transcript = result[0].transcript.trim();
        if (result.isFinal) {
          setDraft(transcript);
          void submit(transcript);
        } else {
          interim += transcript;
        }
      }
      if (interim) {
        setDraft(interim);
        setSpeechStatus(`聽寫中：${interim}`);
      }
    };
    recognition.onerror = (event) => {
      setListening(false);
      setError(`語音辨識失敗：${event.error ?? 'unknown'}`);
    };
    recognition.onend = () => {
      setListening(false);
    };
    recognitionRef.current = recognition;
    setError(null);
    setListening(true);
    setSpeechStatus('正在聽你說話…');
    recognition.start();
  }

  function stopSpeech() {
    recognitionRef.current?.stop();
    setListening(false);
    setSpeechStatus('已停止聽寫。');
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
          placeholder="輸入指令，或按語音輸入直接說"
          rows={3}
        />
        <div className="chat-actions">
          <button type="button" className="secondary" onClick={listening ? stopSpeech : startSpeech} disabled={sending}>
            {listening ? '停止聽寫' : '語音輸入'}
          </button>
          <button type="submit" disabled={sending || draft.trim().length === 0}>
            {sending ? '送出中…' : '送出'}
          </button>
        </div>
      </form>
      {error ? <p className="error-text">{error}</p> : <p className="muted">{speechStatus}</p>}
    </section>
  );
}
