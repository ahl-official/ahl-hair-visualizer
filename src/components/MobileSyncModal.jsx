import { useState, useEffect, useRef } from 'react';
import Peer from 'peerjs';
import QRCode from 'qrcode';

const ANGLE_SEQ = [
  { id: 'front', label: 'Front Face' },
  { id: 'back', label: 'Back of Head' },
  { id: 'side', label: 'Side Profile' },
  { id: 'top', label: 'Top / Crown' },
];

function playSyncChime() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;
    
    // Note 1: E5 (659Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now);
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.2, now + 0.02);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.3);

    // Note 2: B5 (987Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(987.77, now + 0.08);
    gain2.gain.setValueAtTime(0, now + 0.08);
    gain2.gain.linearRampToValueAtTime(0.22, now + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.08);
    osc2.stop(now + 0.45);
  } catch (e) {}
}

export default function MobileSyncModal({ images, onImage, onClose }) {
  const [peerId, setPeerId] = useState(null);
  const [qrDataUrl, setQrDataUrl] = useState(null);
  const [mobileUrl, setMobileUrl] = useState('');
  const [deviceInfo, setDeviceInfo] = useState(null);
  const [copied, setCopied] = useState(false);
  const [receivedAngles, setReceivedAngles] = useState({});
  const peerRef = useRef(null);
  const connRef = useRef(null);

  useEffect(() => {
    // Generate clean unique session ID
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const sessionPeerId = `ahl-tv-${randomSuffix}`;

    const peer = new Peer(sessionPeerId, {
      debug: 1
    });
    peerRef.current = peer;

    peer.on('open', (id) => {
      setPeerId(id);
      const url = `${window.location.origin}${window.location.pathname}?sync=${encodeURIComponent(id)}`;
      setMobileUrl(url);

      QRCode.toDataURL(url, {
        width: 360,
        margin: 2,
        color: {
          dark: '#1A2540',
          light: '#FFFFFF'
        }
      }).then(dataUrl => setQrDataUrl(dataUrl)).catch(console.error);
    });

    peer.on('connection', (conn) => {
      connRef.current = conn;

      conn.on('open', () => {
        conn.on('data', (data) => {
          if (!data) return;

          if (data.type === 'HANDSHAKE') {
            setDeviceInfo(data.device || 'Mobile Phone');
          } else if (data.type === 'ANGLE_PHOTO') {
            playSyncChime();
            const { angle, dataUrl } = data;
            if (angle && dataUrl) {
              onImage(angle, dataUrl);
              setReceivedAngles(prev => {
                const next = { ...prev, [angle]: dataUrl };
                // Send confirmation back to mobile phone
                conn.send({ type: 'ANGLE_CONFIRMED', angle });
                return next;
              });
            }
          }
        });
      });

      conn.on('close', () => {
        setDeviceInfo(null);
      });
    });

    peer.on('error', (err) => {
      console.warn('[PeerJS Sync] connection error:', err);
    });

    return () => {
      try {
        peer.destroy();
      } catch (e) {}
    };
  }, [onImage]);

  const copyUrl = async () => {
    if (!mobileUrl) return;
    try {
      await navigator.clipboard.writeText(mobileUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {}
  };

  // Track combined filled status (either already in images or newly received)
  const currentSlots = {
    front: receivedAngles.front || images.front,
    back: receivedAngles.back || images.back,
    side: receivedAngles.side || images.side,
    top: receivedAngles.top || images.top,
  };
  const filledCount = Object.values(currentSlots).filter(Boolean).length;
  const isAllFilled = filledCount === 4;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(26, 37, 64, 0.85)',
      backdropFilter: 'blur(6px)',
      zIndex: 950,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      animation: 'fadeIn .2s ease'
    }}>
      <div style={{
        background: 'var(--ivory)',
        width: '100%',
        maxWidth: '520px',
        borderRadius: '8px',
        overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.45)',
        border: '1px solid var(--linen)',
        maxHeight: '94vh',
        overflowY: 'auto'
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 24px 14px',
          borderBottom: '1px solid var(--linen)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'var(--sky)'
        }}>
          <div>
            <div style={{
              fontFamily: 'var(--serif)',
              fontSize: '20px',
              fontWeight: 600,
              color: 'var(--ink)'
            }}>
              Sync from Mobile Camera
            </div>
            <div style={{
              fontFamily: 'var(--sans)',
              fontSize: '11px',
              color: 'var(--cobalt)',
              marginTop: '2px',
              letterSpacing: '.05em'
            }}>
              Instant Real-Time Optical Capture
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              fontSize: '20px',
              color: 'var(--ink3)',
              padding: '4px 8px',
              lineHeight: 1
            }}
          >
            ✕
          </button>
        </div>

        {/* 4 Angle Progress Bar */}
        <div style={{ padding: '16px 24px 8px' }}>
          <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
            {ANGLE_SEQ.map((a) => {
              const hasPhoto = Boolean(currentSlots[a.id]);
              return (
                <div
                  key={a.id}
                  style={{
                    flex: 1,
                    height: '4px',
                    borderRadius: '2px',
                    background: hasPhoto ? 'var(--cobalt)' : 'var(--cobalt-mist)',
                    transition: 'background .35s ease'
                  }}
                />
              );
            })}
          </div>

          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontFamily: 'var(--sans)',
            fontSize: '11px',
            color: 'var(--ink3)'
          }}>
            <span>{filledCount} of 4 angles captured</span>
            <span style={{ color: isAllFilled ? 'var(--cobalt)' : 'var(--ink4)', fontWeight: isAllFilled ? 600 : 400 }}>
              {isAllFilled ? '✓ All 4 Received' : 'Awaiting mobile beam'}
            </span>
          </div>
        </div>

        {/* Main QR Pairing Card */}
        <div style={{ padding: '12px 24px 20px', textAlign: 'center' }}>
          <div style={{
            display: 'inline-flex',
            padding: '12px',
            background: 'white',
            borderRadius: '12px',
            border: '1.5px solid var(--cobalt-pale)',
            boxShadow: '0 4px 20px rgba(58, 107, 196, 0.08)',
            marginBottom: '14px',
            width: '210px',
            height: '210px',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="Scan to pair mobile phone"
                style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
              />
            ) : (
              <div style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--cobalt-light)' }}>
                Generating QR...
              </div>
            )}
          </div>

          <p style={{
            fontFamily: 'var(--sans)',
            fontSize: '13px',
            color: 'var(--ink)',
            fontWeight: 400,
            lineHeight: 1.5,
            maxWidth: '380px',
            margin: '0 auto 12px'
          }}>
            Point your smartphone camera at this code.
            No app install or login required.
          </p>

          {/* Connection Status Pill */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 14px',
            borderRadius: '20px',
            background: deviceInfo ? 'var(--cobalt-mist)' : 'var(--cream)',
            border: `1px solid ${deviceInfo ? 'var(--cobalt-pale)' : 'var(--sand)'}`,
            marginBottom: '18px'
          }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: deviceInfo ? 'var(--cobalt)' : '#F59E0B',
              boxShadow: deviceInfo ? '0 0 8px var(--cobalt)' : 'none'
            }} />
            <span style={{
              fontFamily: 'var(--sans)',
              fontSize: '11px',
              fontWeight: 500,
              color: deviceInfo ? 'var(--cobalt-dark)' : 'var(--ink3)'
            }}>
              {deviceInfo ? `🟢 Phone Connected (${deviceInfo})` : 'Awaiting camera scan...'}
            </span>
          </div>

          {/* Angle Thumbnails / Checklist */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '8px',
            marginBottom: '18px'
          }}>
            {ANGLE_SEQ.map(a => {
              const photo = currentSlots[a.id];
              return (
                <div
                  key={a.id}
                  style={{
                    background: photo ? 'var(--sky)' : 'white',
                    border: `1px solid ${photo ? 'var(--cobalt-mid)' : 'var(--cobalt-pale)'}`,
                    borderRadius: '6px',
                    padding: '8px 4px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                    position: 'relative'
                  }}
                >
                  <div style={{
                    width: '38px',
                    height: '48px',
                    borderRadius: '4px',
                    background: photo ? 'transparent' : 'var(--cobalt-mist)',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {photo ? (
                      <img
                        src={photo}
                        alt={a.label}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--cobalt-light)" strokeWidth="1.5">
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                        <circle cx="12" cy="13" r="4" />
                      </svg>
                    )}
                  </div>
                  <span style={{
                    fontFamily: 'var(--sans)',
                    fontSize: '9px',
                    fontWeight: 500,
                    color: photo ? 'var(--cobalt-dark)' : 'var(--ink4)',
                    textAlign: 'center',
                    lineHeight: 1.2
                  }}>
                    {a.label}
                  </span>
                  {photo && (
                    <div style={{
                      position: 'absolute',
                      top: '4px',
                      right: '4px',
                      background: 'var(--cobalt)',
                      borderRadius: '50%',
                      width: '14px',
                      height: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <svg width="8" height="8" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Action Row */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button
              onClick={copyUrl}
              style={{
                fontFamily: 'var(--sans)',
                fontSize: '11px',
                color: 'var(--cobalt)',
                background: 'white',
                border: '1px solid var(--cobalt-pale)',
                padding: '8px 16px',
                borderRadius: '4px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              {copied ? 'Copied Link ✓' : 'Copy Mobile Link'}
            </button>

            {isAllFilled && (
              <button
                onClick={onClose}
                style={{
                  fontFamily: 'var(--serif)',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'white',
                  background: 'var(--cobalt)',
                  border: 'none',
                  padding: '8px 20px',
                  borderRadius: '4px',
                  boxShadow: '0 2px 10px rgba(58, 107, 196, 0.3)'
                }}
              >
                Done — Return to Consultation
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
