import React, { useState, useRef } from 'react';
import { Scan, Upload, Camera, AlertCircle, FileImage } from 'lucide-react';
import CameraScanner from './CameraScanner';
import { decodeQRFromPixels, parseScannedQRData } from '../utils/qrScanner';

export default function QRScanner({ onScanResult, onCancel }) {
  const [scanMode, setScanMode] = useState('camera'); // 'camera' or 'file'
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleCameraScan = (token) => {
    setError(null);
    onScanResult(token);
  };

  const handleCameraError = (errMsg) => {
    setError(errMsg);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setError(null);
    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        try {
          const imgData = ctx.getImageData(0, 0, img.width, img.height);
          const decoded = decodeQRFromPixels(imgData.data, img.width, img.height);
          if (decoded) {
            const cleanToken = parseScannedQRData(decoded);
            if (cleanToken) {
              onScanResult(cleanToken);
            } else {
              setError('Scanned data format not recognized.');
            }
          } else {
            setError('Could not decode QR code from the selected image. Please try another.');
          }
        } catch (err) {
          setError('Error reading image pixels.');
        }
      };
      img.onerror = () => {
        setError('Failed to load image file.');
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div style={{ padding: '1.5rem', background: '#FFFDF9', border: '3px solid #111827', borderRadius: '8px', boxShadow: '4px 4px 0 #111827' }}>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '2px solid #111827', paddingBottom: '0.75rem' }}>
        <button
          type="button"
          className={`btn ${scanMode === 'camera' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ flex: 1, padding: '0.45rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
          onClick={() => { setScanMode('camera'); setError(null); }}
        >
          <Camera size={16} /> Live Scanner
        </button>
        <button
          type="button"
          className={`btn ${scanMode === 'file' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ flex: 1, padding: '0.45rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
          onClick={() => { setScanMode('file'); setError(null); }}
        >
          <Upload size={16} /> Upload Image
        </button>
      </div>

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', border: '2px solid var(--color-danger)', background: 'rgba(239,68,68,0.08)', padding: '0.6rem', borderRadius: '6px', marginBottom: '1rem', color: 'var(--color-danger)', fontSize: '0.8rem' }}>
          <AlertCircle size={16} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {scanMode === 'camera' ? (
        <CameraScanner onScan={handleCameraScan} onError={handleCameraError} />
      ) : (
        <div style={{ textAlign: 'center', padding: '2rem 1rem', border: '3px dashed #111827', borderRadius: '8px', background: '#FFFDFC', cursor: 'pointer' }} onClick={() => fileInputRef.current?.click()}>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/*"
            style={{ display: 'none' }}
          />
          <FileImage size={48} style={{ color: 'var(--text-secondary)', marginBottom: '0.75rem' }} />
          <h4 style={{ margin: '0 0 0.25rem 0', fontWeight: 'bold' }}>Choose QR Code Image</h4>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>Click to browse and upload QR code image file</p>
        </div>
      )}

      <button
        type="button"
        className="btn btn-secondary"
        style={{ width: '100%', padding: '0.5rem', marginTop: '1.25rem', border: '2px solid #111827' }}
        onClick={onCancel}
      >
        Cancel Scanning
      </button>
    </div>
  );
}
