import { useMemo, useRef, useState } from 'react';
import { recordMediaEvent } from '../api/client';

type PermissionState = 'idle' | 'unsupported' | 'checking' | 'granted' | 'denied' | 'error' | 'previewing' | 'recording';

export function MediaPermissionPanel() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const [state, setState] = useState<PermissionState>('idle');
  const [message, setMessage] = useState('尚未測試。相機與麥克風只會在你按下按鈕後請求權限。');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const secureLabel = useMemo(() => {
    if (typeof window === 'undefined') return '等待瀏覽器';
    return window.isSecureContext ? 'HTTPS secure context OK' : '需要 HTTPS 或 localhost';
  }, []);

  function unsupported() {
    setState('unsupported');
    setMessage('這個來源無法使用 mediaDevices；請用 https://robot.sisihome.org 或 localhost 開啟。');
  }

  async function checkMedia() {
    if (!navigator.mediaDevices?.getUserMedia) return unsupported();
    setState('checking');
    setMessage('正在請求瀏覽器權限；不會保存音訊或影像。');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      stream.getTracks().forEach((track) => track.stop());
      setState('granted');
      setMessage('瀏覽器已允許相機與麥克風；測試完成後已立刻停止 tracks。');
      void recordMediaEvent('camera.started', '相機與麥克風權限測試成功，tracks 已停止。');
    } catch (error) {
      const name = error instanceof DOMException ? error.name : 'UnknownError';
      setState(name === 'NotAllowedError' ? 'denied' : 'error');
      setMessage(name === 'NotAllowedError' ? '你拒絕了相機或麥克風權限。' : `權限測試失敗：${name}`);
    }
  }

  async function startCamera() {
    if (!navigator.mediaDevices?.getUserMedia) return unsupported();
    stopCamera(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
      cameraStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setState('previewing');
      setMessage('前鏡頭預覽中。畫面只在本機瀏覽器顯示，沒有上傳。');
      void recordMediaEvent('camera.started', '使用者開啟前鏡頭本機預覽。');
    } catch (error) {
      const name = error instanceof DOMException ? error.name : 'UnknownError';
      setState(name === 'NotAllowedError' ? 'denied' : 'error');
      setMessage(name === 'NotAllowedError' ? '你拒絕了相機權限。' : `前鏡頭啟動失敗：${name}`);
    }
  }

  function stopCamera(record = true) {
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    cameraStreamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    if (state === 'previewing') {
      setState('granted');
      setMessage('前鏡頭已關閉。');
      if (record) void recordMediaEvent('camera.stopped', '使用者關閉前鏡頭本機預覽。');
    }
  }

  async function startRecording() {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') return unsupported();
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    chunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        setAudioUrl(URL.createObjectURL(blob));
        setState('granted');
        setMessage(`錄音完成：${Math.round(blob.size / 1024)} KB。音檔只留在本機瀏覽器，尚未上傳或轉文字。`);
        void recordMediaEvent('audio.recorded', `使用者完成一段本機錄音，大小約 ${Math.round(blob.size / 1024)} KB。`);
      };
      recorder.start();
      setState('recording');
      setMessage('錄音中。按「停止錄音」會產生本機音檔預覽。');
    } catch (error) {
      const name = error instanceof DOMException ? error.name : 'UnknownError';
      setState(name === 'NotAllowedError' ? 'denied' : 'error');
      setMessage(name === 'NotAllowedError' ? '你拒絕了麥克風權限。' : `錄音啟動失敗：${name}`);
    }
  }

  function stopRecording() {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') recorderRef.current.stop();
  }

  return (
    <section className="panel media-panel" aria-label="相機與麥克風權限">
      <div className="panel-kicker">MEDIA GATE</div>
      <h2>相機 / 麥克風</h2>
      <div className={`media-state media-${state}`}>{secureLabel}</div>
      <p>{message}</p>
      <video ref={videoRef} className="camera-preview" playsInline muted autoPlay />
      {audioUrl ? <audio className="audio-preview" controls src={audioUrl}>錄音預覽</audio> : null}
      <div className="media-actions">
        <button type="button" onClick={checkMedia} disabled={state === 'checking' || state === 'recording'}>
          {state === 'checking' ? '測試中…' : '測試權限'}
        </button>
        <button type="button" onClick={state === 'previewing' ? () => stopCamera() : startCamera} disabled={state === 'recording'}>
          {state === 'previewing' ? '關閉前鏡頭' : '開前鏡頭'}
        </button>
        <button type="button" onClick={state === 'recording' ? stopRecording : startRecording}>
          {state === 'recording' ? '停止錄音' : '錄一句話'}
        </button>
      </div>
    </section>
  );
}
