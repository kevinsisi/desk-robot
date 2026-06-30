import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { recordMediaEvent } from '../api/client';

type PermissionState = 'idle' | 'unsupported' | 'checking' | 'granted' | 'denied' | 'error' | 'previewing' | 'recording' | 'analyzing';

export type VisionAnalyzer = (prompt?: string) => Promise<void>;
export type CompanionStarter = () => Promise<void>;

interface MediaPermissionPanelProps {
  onAnalyzeVision: (imageDataUrl: string, prompt?: string) => Promise<void>;
  onRegisterVisionAnalyzer?: (analyzer: VisionAnalyzer | null) => void;
  onRegisterCompanionStarter?: (starter: CompanionStarter | null) => void;
}

export function MediaPermissionPanel({ onAnalyzeVision, onRegisterVisionAnalyzer, onRegisterCompanionStarter }: MediaPermissionPanelProps) {
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

  const startCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      unsupported();
      throw new Error('這個瀏覽器不支援相機。');
    }
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    cameraStreamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
      cameraStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setState('previewing');
      setMessage('前鏡頭預覽中。畫面只在本機瀏覽器顯示；只有辨識時才會送出單張截圖。');
      void recordMediaEvent('camera.started', '使用者開啟前鏡頭本機預覽。');
    } catch (error) {
      const name = error instanceof DOMException ? error.name : 'UnknownError';
      setState(name === 'NotAllowedError' ? 'denied' : 'error');
      const text = name === 'NotAllowedError' ? '你拒絕了相機權限。' : `前鏡頭啟動失敗：${name}`;
      setMessage(text);
      throw new Error(text);
    }
  }, []);

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

  const analyzeCurrentFrame = useCallback(async (prompt?: string) => {
    if (!cameraStreamRef.current) await startCamera();
    const video = videoRef.current;
    if (!video || !cameraStreamRef.current || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      throw new Error('請先開前鏡頭，等畫面出現後再辨識。');
    }

    const previousState = state;
    setState('analyzing');
    setMessage('正在截取目前前鏡頭畫面並送給模型辨識。');
    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('canvas_unavailable');
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageDataUrl = canvas.toDataURL('image/jpeg', 0.82);
      await onAnalyzeVision(imageDataUrl, prompt);
      setState(cameraStreamRef.current ? 'previewing' : 'granted');
      setMessage('已完成畫面辨識，回覆已出現在對話區。前鏡頭仍只在你手動開啟時運作。');
    } catch (error) {
      setState(previousState === 'previewing' ? 'previewing' : 'error');
      const text = error instanceof Error ? `畫面辨識失敗：${error.message}` : '畫面辨識失敗。';
      setMessage(text);
      throw new Error(text);
    }
  }, [onAnalyzeVision, startCamera, state]);

  const startCompanion = useCallback(async () => {
    await startCamera();
    await recordMediaEvent('companion.started', '使用者啟動夥伴模式：前鏡頭、即時語音與語音回覆。');
    setMessage('夥伴模式已開：你可以直接說話，問「你看到什麼」會自動抓目前畫面辨識。');
  }, [startCamera]);

  useEffect(() => {
    onRegisterVisionAnalyzer?.(analyzeCurrentFrame);
    return () => onRegisterVisionAnalyzer?.(null);
  }, [analyzeCurrentFrame, onRegisterVisionAnalyzer]);

  useEffect(() => {
    onRegisterCompanionStarter?.(startCompanion);
    return () => onRegisterCompanionStarter?.(null);
  }, [onRegisterCompanionStarter, startCompanion]);

  return (
    <section className="panel media-panel" aria-label="相機與麥克風權限">
      <div className="panel-kicker">MEDIA GATE</div>
      <h2>相機 / 麥克風</h2>
      <div className={`media-state media-${state}`}>{secureLabel}</div>
      <p>{message}</p>
      <video ref={videoRef} className="camera-preview" playsInline muted autoPlay />
      {audioUrl ? <audio className="audio-preview" controls src={audioUrl}>錄音預覽</audio> : null}
      <div className="media-actions">
        <button type="button" onClick={checkMedia} disabled={state === 'checking' || state === 'recording' || state === 'analyzing'}>
          {state === 'checking' ? '測試中…' : '測試權限'}
        </button>
        <button type="button" onClick={state === 'previewing' ? () => stopCamera() : startCamera} disabled={state === 'recording' || state === 'analyzing'}>
          {state === 'previewing' ? '關閉前鏡頭' : '開前鏡頭'}
        </button>
        <button type="button" onClick={() => void analyzeCurrentFrame()} disabled={state === 'recording' || state === 'analyzing'}>
          {state === 'analyzing' ? '辨識中…' : '辨識畫面'}
        </button>
        <button type="button" onClick={state === 'recording' ? stopRecording : startRecording} disabled={state === 'analyzing'}>
          {state === 'recording' ? '停止錄音' : '錄一句話'}
        </button>
      </div>
    </section>
  );
}
