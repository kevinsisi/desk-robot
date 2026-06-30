import { useEffect, useRef, useState } from 'react';
import type { ChatMessage } from '../api/client';
import { classifyCompanionCommand } from '../companion';

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
  onVisionCommand: (content: string) => Promise<void>;
  onStartCompanion?: () => Promise<void>;
}

function cleanForSpeech(text: string) {
  return text.replace(/`{1,3}/g, '').replace(/https?:\/\/\S+/g, '網址').slice(0, 420);
}

export function ChatPanel({ messages, onSend, onVisionCommand, onStartCompanion }: ChatPanelProps) {
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const keepListeningRef = useRef(false);
  const sendingRef = useRef(false);
  const lastFinalRef = useRef('');
  const hydratedRef = useRef(false);
  const lastSpokenAssistantIDRef = useRef<string | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceReplyEnabled, setVoiceReplyEnabled] = useState(true);
  const [speechStatus, setSpeechStatus] = useState('夥伴模式會開啟鏡頭、即時聽寫與語音回覆；視覺問題會自動抓目前畫面。');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const latest = messages[0];
    if (!latest || latest.role !== 'assistant') return;
    if (!hydratedRef.current) {
      hydratedRef.current = true;
      lastSpokenAssistantIDRef.current = latest.id;
      return;
    }
    if (!voiceReplyEnabled || lastSpokenAssistantIDRef.current === latest.id || !('speechSynthesis' in window)) return;
    lastSpokenAssistantIDRef.current = latest.id;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(cleanForSpeech(latest.content));
    utterance.lang = 'zh-TW';
    utterance.rate = 1.04;
    utterance.pitch = 1.02;
    window.speechSynthesis.speak(utterance);
  }, [messages, voiceReplyEnabled]);

  async function submit(contentOverride?: string) {
    const content = (contentOverride ?? draft).trim();
    if (!content || sendingRef.current) return;
    sendingRef.current = true;
    setSending(true);
    setError(null);
    try {
      if (classifyCompanionCommand(content) === 'vision') {
        await onVisionCommand(content);
        setSpeechStatus(`已送出視覺指令：${content}`);
      } else {
        await onSend(content);
        setSpeechStatus(contentOverride ? `已送出：${content}` : '已送出文字指令。');
      }
      setDraft('');
    } catch (err) {
      setError(err instanceof Error ? err.message : '送出失敗');
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  }

  function createRecognition() {
    const SpeechRecognitionImpl = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SpeechRecognitionImpl) {
      setError('這個瀏覽器不支援 Web Speech 即時語音辨識；請先用文字輸入。');
      return null;
    }

    const recognition = new SpeechRecognitionImpl();
    recognition.lang = 'zh-TW';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      let interim = '';
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const transcript = result[0].transcript.trim();
        if (!transcript) continue;
        if (result.isFinal) {
          if (transcript !== lastFinalRef.current) {
            lastFinalRef.current = transcript;
            setDraft('');
            void submit(transcript);
          }
        } else {
          interim += transcript;
        }
      }
      if (interim) {
        setDraft(interim);
        setSpeechStatus(`即時聽寫：${interim}`);
      }
    };
    recognition.onerror = (event) => {
      if (event.error === 'no-speech' && keepListeningRef.current) {
        setSpeechStatus('還在聽，等你講話…');
        return;
      }
      setError(`語音辨識失敗：${event.error ?? 'unknown'}`);
    };
    recognition.onend = () => {
      if (keepListeningRef.current) {
        try {
          recognition.start();
          setListening(true);
          setSpeechStatus('夥伴模式持續中：可以直接說話，或問「你看到什麼」。');
        } catch {
          setListening(false);
        }
        return;
      }
      setListening(false);
    };
    return recognition;
  }

  function startSpeech() {
    recognitionRef.current?.stop();
    const recognition = createRecognition();
    if (!recognition) return;
    recognitionRef.current = recognition;
    keepListeningRef.current = true;
    lastFinalRef.current = '';
    setError(null);
    setListening(true);
    setSpeechStatus('即時語音模式啟動，直接說話。');
    recognition.start();
  }

  function stopSpeech() {
    keepListeningRef.current = false;
    recognitionRef.current?.stop();
    setListening(false);
    setSpeechStatus('已停止即時語音。');
  }

  async function startCompanionMode() {
    setVoiceReplyEnabled(true);
    setError(null);
    try {
      await onStartCompanion?.();
      startSpeech();
      setSpeechStatus('夥伴模式啟動：我會聽你說、看前鏡頭、用文字與語音回覆。');
    } catch (err) {
      setError(err instanceof Error ? err.message : '夥伴模式啟動失敗');
    }
  }

  return (
    <section className="panel chat-panel" aria-label="訊息輸入">
      <div className="panel-kicker">COMMAND INPUT</div>
      <h2>對 Desk Robot 說話</h2>
      <div className="companion-toolbar" aria-label="夥伴模式控制">
        <button type="button" onClick={startCompanionMode} disabled={sending || listening}>
          夥伴模式
        </button>
        <button type="button" className={voiceReplyEnabled ? '' : 'secondary'} onClick={() => setVoiceReplyEnabled((enabled) => !enabled)}>
          {voiceReplyEnabled ? '語音回覆開' : '語音回覆關'}
        </button>
      </div>
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
          placeholder="輸入指令、問「你看到什麼」，或按夥伴模式直接說"
          rows={3}
        />
        <div className="chat-actions">
          <button type="button" className={listening ? '' : 'secondary'} onClick={listening ? stopSpeech : startSpeech} disabled={sending}>
            {listening ? '停止即時語音' : '即時語音'}
          </button>
          <button type="submit" disabled={sending || draft.trim().length === 0}>
            {sending ? '送出中…' : '送出'}
          </button>
        </div>
      </form>
      {error ? <p className="error-text">{error}</p> : <p className={listening ? 'live-text' : 'muted'}>{speechStatus}</p>}
    </section>
  );
}
