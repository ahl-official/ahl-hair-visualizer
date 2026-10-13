import { useState, useEffect, useRef } from 'react';
import Peer from 'peerjs';
import logo from '../assets/logo.png';

const ANGLE_SEQ = [
  { id: 'front', label: 'Front Face', hint: 'Look straight at the camera. Head level.' },
  { id: 'back', label: 'Back of Head', hint: 'Turn fully away. Neck straight.' },
  { id: 'side', label: 'Side Profile', hint: 'Turn 90° to your left. Chin level.' },
  { id: 'top', label: 'Top / Crown', hint: 'Hold camera above head pointing down.' },
];

const LOGO_FILTER = 'brightness(0) saturate(100%) invert(30%) sepia(70%) saturate(500%) hue-rotate(195deg)';

// Helper to compress camera photo to clean 1280px high-detail JPEG before beaming over WebRTC
function compressForBeam(file, maxPx = 1280, quality = 0.88) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => resolve(e.target.result);
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function detectPhoneModel() {
  const ua = navigator.userAgent;
  if (/iPhone/i.test(ua)) return 'iPhone';
  if (/iPad/i.test(ua)) return 'iPad';
  if (/Samsung/i.test(ua) || /SM-/i.test(ua)) return 'Samsung Galaxy';
  if (/Pixel/i.test(ua)) return 'Google Pixel';
  if (/Android/i.test(ua)) return 'Android Device';
  return 'Mobile Phone';
}

export default function MobileCaptureView({ targetPeerId }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [connStatus, setConnStatus] = useState('connecting'); // 'connecting' | 'connected' | 'disconnected'
  const [captured, setCaptured] = useState({});
  const [uploading, setUploading] = useState(false);
  const [lastDeliveredAngle, setLastDeliveredAngle] = useState(null);

  const fileInputRef = useRef(null);
  const libraryInputRef = useRef(null);
  const peerRef = useRef(null);
  const connRef = useRef(null);

  const currentAngle = ANGLE_SEQ[stepIndex];
  const capturedCount = Object.keys(captured).length;
  const isAllCaptured = capturedCount === 4;

  useEffect(() => {
    if (!targetPeerId) return;

    const peer = new Peer({
      debug: 1
    });
    peerRef.current = peer;

    peer.on('open', () => {
      const conn = peer.connect(targetPeerId, { reliable: true });
      connRef.current = conn;

      conn.on('open', () => {
        setConnStatus('connected');
        conn.send({
          type: 'HANDSHAKE',
          device: detectPhoneModel()
        });
      });

      conn.on('data', (data) => {
        if (data?.type === 'ANGLE_CONFIRMED') {
          setLastDeliveredAngle(data.angle);
        }
      });

      conn.on('close', () => {
        setConnStatus('disconnected');
      });

      conn.on('error', () => {
        setConnStatus('disconnected');
      });
    });

    peer.on('error', (err) => {
      console.warn('[PeerJS Mobile] Error:', err);
      setConnStatus('disconnected');
    });

    return () => {
      try { peer.destroy(); } catch (e) {}
    };
  }, [targetPeerId]);

  const handleCaptureFile = async (file) => {
    if (!file) return;
    setUploading(true);

    try {
      const dataUrl = await compressForBeam(file);
      const angleId = currentAngle.id;

      // Send over WebRTC Data Channel to TV
      if (connRef.current && connRef.current.open) {
        connRef.current.send({
          type: 'ANGLE_PHOTO',
          angle: angleId,
          dataUrl
        });
      }

      // Haptic feedback
      if (navigator.vibrate) {
        try { navigator.vibrate([40, 60]); } catch (e) {}
      }

      setCaptured(prev => ({ ...prev, [angleId]: dataUrl }));

      // Automatically advance to next uncaptured angle
      setTimeout(() => {
        setUploading(false);
        if (stepIndex < ANGLE_SEQ.length - 1) {
          setStepIndex(prev => prev + 1);
        }
      }, 350);
    } catch (err) {
      console.error('Error handling capture:', err);
      setUploading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--ivory)',
      color: 'var(--ink)',
      fontFamily: 'var(--sans)',
      display: 'flex',
      flexDirection: 'column',
      padding: '16px',
      boxSizing: 'border-box'
    }}>
      {/* Hidden File Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleCaptureFile(e.target.files[0]);
          }
        }}
      />
      <input
        ref={libraryInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleCaptureFile(e.target.files[0]);
          }
        }}
      />

      {/* Top Header */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: '14px',
        borderBottom: '1px solid var(--linen)',
        marginBottom: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <img src={logo} alt="American Hairline" style={{ height: '22px', objectFit: 'contain', filter: LOGO_FILTER }} />
          <span style={{ fontFamily: 'var(--serif)', fontSize: '15px', fontWeight: 600, color: 'var(--ink)' }}>
            CamSync
          </span>
        </div>

        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 10px',
          borderRadius: '16px',
          background: connStatus === 'connected' ? 'var(--cobalt-mist)' : '#FEF3C7',
          border: `1px solid ${connStatus === 'connected' ? 'var(--cobalt-pale)' : '#FCD34D'}`
        }}>
          <span style={{
            width: '7px',
            height: '7px',
            borderRadius: '50%',
            background: connStatus === 'connected' ? 'var(--cobalt)' : '#F59E0B'
          }} />
          <span style={{
            fontSize: '10px',
            fontWeight: 600,
            color: connStatus === 'connected' ? 'var(--cobalt-dark)' : '#B45309',
            fontFamily: 'var(--sans)'
          }}>
            {connStatus === 'connected' ? 'Screen Synced' : 'Connecting to Screen...'}
          </span>
        </div>
      </header>

      {/* Angle Selector Tabs */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '6px',
        marginBottom: '20px'
      }}>
        {ANGLE_SEQ.map((a, idx) => {
          const isDone = Boolean(captured[a.id]);
          const isActive = idx === stepIndex;
          return (
            <button
              key={a.id}
              onClick={() => setStepIndex(idx)}
              style={{
                padding: '8px 4px',
                borderRadius: '6px',
                border: `1.5px solid ${isActive ? 'var(--cobalt)' : isDone ? 'var(--cobalt-pale)' : 'var(--linen)'}`,
                background: isActive ? 'var(--sky)' : isDone ? 'white' : 'var(--cream)',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all .2s'
              }}
            >
              <div style={{
                fontSize: '8px',
                fontFamily: 'var(--mono)',
                color: isActive ? 'var(--cobalt)' : 'var(--ink4)',
                marginBottom: '2px'
              }}>
                {idx + 1}/4
              </div>
              <div style={{
                fontSize: '10px',
                fontFamily: 'var(--sans)',
                fontWeight: isActive ? 600 : 500,
                color: isActive ? 'var(--cobalt-dark)' : isDone ? 'var(--ink)' : 'var(--ink4)',
                lineHeight: 1.2
              }}>
                {a.label.split(' ')[0]}
              </div>
              {isDone && (
                <div style={{ fontSize: '9px', color: 'var(--cobalt)', marginTop: '2px' }}>✓</div>
              )}
            </button>
          );
        })}
      </div>

      {/* Main Viewfinder Stage */}
      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        background: 'white',
        border: '1.5px solid var(--cobalt-pale)',
        borderRadius: '12px',
        padding: '24px 16px',
        position: 'relative',
        boxShadow: '0 4px 20px rgba(58, 107, 196, 0.05)',
        marginBottom: '20px'
      }}>
        {/* Step Badge */}
        <div style={{
          fontFamily: 'var(--mono)',
          fontSize: '11px',
          letterSpacing: '.15em',
          textTransform: 'uppercase',
          color: 'var(--cobalt)',
          marginBottom: '6px'
        }}>
          Angle {stepIndex + 1} of 4
        </div>

        {/* Current Angle Title */}
        <h2 style={{
          fontFamily: 'var(--serif)',
          fontSize: '26px',
          fontWeight: 600,
          color: 'var(--ink)',
          marginBottom: '8px'
        }}>
          {currentAngle.label}
        </h2>

        {/* Guidance Hint */}
        <div style={{
          background: 'var(--cobalt-mist)',
          padding: '8px 16px',
          borderRadius: '20px',
          fontSize: '12px',
          color: 'var(--ink3)',
          maxWidth: '300px',
          marginBottom: '24px'
        }}>
          {currentAngle.hint}
        </div>

        {/* Preview of captured photo if already taken for this angle */}
        {captured[currentAngle.id] ? (
          <div style={{
            position: 'relative',
            width: '160px',
            height: '210px',
            borderRadius: '8px',
            overflow: 'hidden',
            border: '2px solid var(--cobalt)',
            boxShadow: '0 4px 16px rgba(58, 107, 196, 0.2)',
            marginBottom: '16px'
          }}>
            <img
              src={captured[currentAngle.id]}
              alt={currentAngle.label}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            <div style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              background: 'rgba(26, 37, 64, 0.8)',
              color: 'white',
              fontSize: '10px',
              padding: '4px',
              fontFamily: 'var(--sans)'
            }}>
              ✓ Delivered to Screen
            </div>
          </div>
        ) : (
          /* Camera Lens Visual */
          <div style={{
            width: '130px',
            height: '130px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, var(--sky) 0%, var(--cobalt-mist) 100%)',
            border: '2px dashed var(--cobalt-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '24px'
          }}>
            <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="var(--cobalt)" strokeWidth="1.6">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          </div>
        )}

        {/* Shutter Button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
            background: 'none',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          <div style={{
            width: '74px',
            height: '74px',
            borderRadius: '50%',
            border: '3px solid var(--cobalt)',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(58, 107, 196, 0.25)',
            transition: 'transform .1s'
          }}>
            <div style={{
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              background: uploading ? 'var(--sand)' : 'var(--cobalt)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            </div>
          </div>
          <span style={{
            fontFamily: 'var(--sans)',
            fontSize: '11px',
            fontWeight: 600,
            letterSpacing: '.14em',
            textTransform: 'uppercase',
            color: 'var(--cobalt)'
          }}>
            {uploading ? 'Beaming Photo...' : captured[currentAngle.id] ? 'Retake Photo' : 'Snap Photo'}
          </span>
        </button>
      </main>

      {/* Footer Controls */}
      <footer style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: '8px'
      }}>
        <button
          onClick={() => libraryInputRef.current?.click()}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontFamily: 'var(--sans)',
            fontSize: '11px',
            color: 'var(--ink3)',
            background: 'white',
            border: '1px solid var(--linen)',
            padding: '8px 14px',
            borderRadius: '4px'
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
          Choose from Photos
        </button>

        <div style={{
          fontSize: '11px',
          fontFamily: 'var(--sans)',
          color: isAllCaptured ? 'var(--cobalt)' : 'var(--ink4)',
          fontWeight: isAllCaptured ? 600 : 400
        }}>
          {isAllCaptured ? '✓ All 4 Complete' : `${4 - capturedCount} remaining`}
        </div>
      </footer>
    </div>
  );
}
