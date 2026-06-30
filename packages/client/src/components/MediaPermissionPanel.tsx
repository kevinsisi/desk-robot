import { useMemo, useState } from 'react';

type PermissionState = 'idle' | 'unsupported' | 'checking' | 'granted' | 'denied' | 'error';

export function MediaPermissionPanel() {
  const [state, setState] = useState<PermissionState>('idle');
  const [message, setMessage] = useState('尚未測試。相機與麥克風只會在你按下按鈕後請求權限。');

  const secureLabel = useMemo(() => {
    if (typeof window === 'undefined') return '等待瀏覽器';
    return window.isSecureContext ? 'HTTPS secure context OK' : '需要 HTTPS 或 localhost';
  }, []);

  async function checkMedia() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setState('unsupported');
      setMessage('這個來源無法使用 mediaDevices；請用 https://robot.sisihome.org 或 localhost 開啟。');
      return;
    }

    setState('checking');
    setMessage('正在請求瀏覽器權限；不會保存音訊或影像。');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      stream.getTracks().forEach((track) => track.stop());
      setState('granted');
      setMessage('瀏覽器已允許相機與麥克風；測試完成後已立刻停止 tracks。');
    } catch (error) {
      const name = error instanceof DOMException ? error.name : 'UnknownError';
      setState(name === 'NotAllowedError' ? 'denied' : 'error');
      setMessage(name === 'NotAllowedError' ? '你拒絕了相機或麥克風權限。' : `權限測試失敗：${name}`);
    }
  }

  return (
    <section className="panel media-panel" aria-label="相機與麥克風權限">
      <div className="panel-kicker">MEDIA GATE</div>
      <h2>相機 / 麥克風</h2>
      <div className={`media-state media-${state}`}>{secureLabel}</div>
      <p>{message}</p>
      <button type="button" onClick={checkMedia} disabled={state === 'checking'}>
        {state === 'checking' ? '測試中…' : '手動測試權限'}
      </button>
    </section>
  );
}
