import React, { useRef, useEffect, useState } from 'react';
import { Camera, AlertTriangle } from 'lucide-react';
import { decodeQRFromPixels, parseScannedQRData } from '../utils/qrScanner';

export default function CameraScanner({ onScan, onError }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [streamActive, setStreamActive] = useState(false);

  useEffect(() => {
    let activeStream = null;
    let animId = null;

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 640 } }
        });
        activeStream = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute('playsinline', true);
          videoRef.current.play();
          setStreamActive(true);
        }
        
        // Start scanning loop
        animId = requestAnimationFrame(scanFrame);
      } catch (err) {
        console.error('Camera stream access failed:', err);
        const errMsg = 'Camera access blocked or unsupported. Please check permissions.';
        setErrorMsg(errMsg);
        if (onError) onError(errMsg);
      }
    }

    function scanFrame() {
      if (!videoRef.current || !canvasRef.current) {
        animId = requestAnimationFrame(scanFrame);
        return;
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        const width = video.videoWidth;
        const height = video.videoHeight;

        canvas.width = width;
        canvas.height = height;

        ctx.drawImage(video, 0, 0, width, height);
        const imgData = ctx.getImageData(0, 0, width, height);
        
        // Decode
        const token = decodeQRFromPixels(imgData.data, width, height);
        if (token) {
          const cleanToken = parseScannedQRData(token);
          if (cleanToken) {
            onScan(cleanToken);
            // Stop scanning and camera
            stopCamera();
            return;
          }
        }
      }

      animId = requestAnimationFrame(scanFrame);
    }

    function stopCamera() {
      if (animId) cancelAnimationFrame(animId);
      if (activeStream) {
        activeStream.getTracks().forEach(track => track.stop());
      }
      setStreamActive(false);
    }

    startCamera();

    return () => {
      stopCamera();
    };
  }, [onScan, onError]);

  return (
    <div style={{ textAlign: 'center' }}>
      <div className="scanner-viewport">
        {errorMsg ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '2rem', background: '#FEF2F2', color: 'var(--color-danger)' }}>
            <AlertTriangle size={36} style={{ marginBottom: '0.5rem' }} />
            <p style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>{errorMsg}</p>
          </div>
        ) : (
          <>
            <video ref={videoRef} className="scanner-video-preview" muted />
            <canvas ref={canvasRef} style={{ display: 'none' }} />
            <div className="scanner-overlay-guideline"></div>
          </>
        )}
      </div>
      
      {streamActive && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', color: 'var(--text-secondary)', fontSize: '0.85rem', fontFamily: 'var(--font-mono)' }}>
          <Camera size={16} />
          Align QR Code within the active frame
        </div>
      )}
    </div>
  );
}
