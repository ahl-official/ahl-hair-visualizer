import { useState, useEffect, useRef, useCallback } from "react";
import logo from "./assets/logo.png";
import MobileSyncModal from "./components/MobileSyncModal";
import MobileCaptureView from "./components/MobileCaptureView";

/* ─────────────────────────────────────────────────────────────
   GLOBAL STYLES
───────────────────────────────────────────────────────────── */
const Styles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&family=DM+Mono:wght@300;400&display=swap');

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --cobalt:       #3A6BC4;
      --cobalt-dark:  #2B55A0;
      --cobalt-mid:   #4F81D4;
      --cobalt-light: #7AAAE8;
      --cobalt-pale:  #C8DCFA;
      --cobalt-mist:  #E8F0FC;
      --sky:          #EEF4FF;
      --ivory:        #FDFBF7;
      --cream:        #F6F2EA;
      --sand:         #EDE5D5;
      --linen:        #E2D9C8;
      --warm2:        #A09080;
      --ink:          #1A2540;
      --ink3:         #4A5A80;
      --ink4:         #7A8AAA;
      --serif:        'Cormorant Garamond', Georgia, serif;
      --sans:         'DM Sans', sans-serif;
      --mono:         'DM Mono', monospace;
    }

    html { scroll-behavior: smooth; }
    body { background: var(--ivory); color: var(--ink); font-family: var(--sans); overflow-x: hidden; min-height: 100vh; }

    ::-webkit-scrollbar { width: 3px; }
    ::-webkit-scrollbar-track { background: var(--cream); }
    ::-webkit-scrollbar-thumb { background: var(--cobalt-light); border-radius: 2px; }
    ::selection { background: var(--cobalt-pale); color: var(--ink); }

    button { cursor: pointer; border: none; outline: none; background: none; font-family: inherit; }
    a { cursor: pointer; }

    .rv { opacity: 0; transform: translateY(22px); transition: opacity .85s cubic-bezier(.16,1,.3,1), transform .85s cubic-bezier(.16,1,.3,1); }
    .rv.in { opacity: 1; transform: translateY(0); }

    @keyframes fadeUp   { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
    @keyframes fadeIn   { from{opacity:0} to{opacity:1} }
    @keyframes spin     { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
    @keyframes pulse    { 0%,100%{opacity:1} 50%{opacity:.35} }
    @keyframes scanLine { 0%{top:-2px;opacity:0} 8%{opacity:.9} 92%{opacity:.9} 100%{top:100%;opacity:0} }
    @keyframes shimmer  { 0%{background-position:-400px 0} 100%{background-position:400px 0} }
    @keyframes wave     { 0%,100%{transform:scaleY(1)} 50%{transform:scaleY(.28)} }
    @keyframes strands  { 0%{stroke-dashoffset:200} 100%{stroke-dashoffset:0} }
    @keyframes pop      { 0%{transform:scale(.85);opacity:0} 80%{transform:scale(1.04)} 100%{transform:scale(1);opacity:1} }
    @keyframes orbit    { from{transform:rotate(0deg) translateX(28px) rotate(0deg)} to{transform:rotate(360deg) translateX(28px) rotate(-360deg)} }

    @media print { .no-print { display: none !important; } }
  `}</style>
);

/* ─────────────────────────────────────────────────────────────
   HOOKS
───────────────────────────────────────────────────────────── */
function useIsMobile() {
  const [mob, setMob] = useState(window.innerWidth <= 640);
  useEffect(() => {
    const h = () => setMob(window.innerWidth <= 640);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return mob;
}

function useReveal() {
  const ref = useRef(null);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) e.target.classList.add('in'); }, { threshold: .06 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return ref;
}

/* ─────────────────────────────────────────────────────────────
   LOGO FILTER (blue tint matching --cobalt)
───────────────────────────────────────────────────────────── */
const LOGO_FILTER = 'brightness(0) saturate(100%) invert(30%) sepia(70%) saturate(500%) hue-rotate(195deg)';

/* ─────────────────────────────────────────────────────────────
   NAV
───────────────────────────────────────────────────────────── */
const Nav = ({ onDownload, showDownload }) => {
  const mob = useIsMobile();
  return (
    <nav className="no-print" style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 500,
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: mob ? '0 16px' : '0 48px',
      height: mob ? '54px' : '62px',
      background: 'rgba(253,251,247,.94)',
      backdropFilter: 'blur(20px)',
      borderBottom: '1px solid var(--linen)',
    }}>
      <img src={logo} alt="American Hairline" style={{ height: mob ? '22px' : '28px', objectFit: 'contain', filter: LOGO_FILTER }} />
      <div style={{ display: 'flex', gap: mob ? '10px' : '24px', alignItems: 'center' }}>
        {!mob && ['Upload', 'Results'].map(l => (
          <a key={l} href={`#${l.toLowerCase()}`}
            style={{ fontFamily: 'var(--sans)', fontSize: '12px', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--ink3)', textDecoration: 'none', transition: 'color .2s' }}
            onMouseEnter={e => e.target.style.color = 'var(--cobalt)'}
            onMouseLeave={e => e.target.style.color = 'var(--ink3)'}>{l}</a>
        ))}
        {showDownload && (
          <button onClick={onDownload} style={{
            fontFamily: 'var(--sans)', fontSize: '11px', fontWeight: 500,
            letterSpacing: '.12em', textTransform: 'uppercase',
            color: 'var(--ivory)', background: 'var(--cobalt)',
            padding: mob ? '8px 14px' : '9px 20px', borderRadius: '3px',
            display: 'flex', alignItems: 'center', gap: '6px', transition: 'background .2s',
          }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--cobalt-dark)'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--cobalt)'}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            {mob ? 'Report' : 'Download Report'}
          </button>
        )}
      </div>
    </nav>
  );
};

/* ─────────────────────────────────────────────────────────────
   HERO
───────────────────────────────────────────────────────────── */
const Hero = ({ onBegin }) => {
  const mob = useIsMobile();
  const r1 = useReveal(), r2 = useReveal(), r3 = useReveal(), r4 = useReveal();
  return (
    <section className="no-print" style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center',
      padding: mob ? '80px 20px 60px' : '100px 64px 80px',
      position: 'relative', overflow: 'hidden',
      background: 'linear-gradient(160deg, var(--sky) 0%, var(--ivory) 50%, var(--cream) 100%)',
    }}>
      <div style={{ position: 'absolute', top: '-60px', right: '-80px', width: '480px', height: '480px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(58,107,196,.07), transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-40px', left: '-60px', width: '320px', height: '320px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(200,168,75,.06), transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: 'linear-gradient(var(--cobalt-pale) 1px,transparent 1px),linear-gradient(90deg,var(--cobalt-pale) 1px,transparent 1px)', backgroundSize: '80px 80px', opacity: .22 }} />

      <div style={{ maxWidth: '760px', position: 'relative', zIndex: 1 }}>
        <div ref={r1} className="rv" style={{ transitionDelay: '.05s', marginBottom: mob ? '16px' : '22px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '5px 14px', background: 'var(--cobalt-mist)', border: '1px solid var(--cobalt-pale)', borderRadius: '20px' }}>
            <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--cobalt)', animation: 'pulse 2s infinite' }} />
            <span style={{ fontFamily: 'var(--sans)', fontSize: '10px', fontWeight: 500, letterSpacing: '.22em', textTransform: 'uppercase', color: 'var(--cobalt)' }}>4-Angle AI Hair Analysis</span>
          </div>
        </div>

        <div ref={r2} className="rv" style={{ transitionDelay: '.15s', marginBottom: mob ? '20px' : '28px' }}>
          <img src={logo} alt="American Hairline" style={{ height: mob ? '56px' : '88px', objectFit: 'contain', filter: LOGO_FILTER, display: 'block' }} />
        </div>

        <div ref={r3} className="rv" style={{ transitionDelay: '.28s', marginBottom: mob ? '28px' : '40px' }}>
          <p style={{ fontFamily: 'var(--sans)', fontSize: mob ? '14px' : '16px', fontWeight: 300, color: 'var(--ink3)', lineHeight: 1.85, maxWidth: '440px' }}>
            Upload four photos — front, back, side, and top. Our AI analyses your head geometry and recommends the perfect hairstyle, then generates a professional consultation report.
          </p>
        </div>

        <div ref={r4} className="rv" style={{ transitionDelay: '.4s', display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
          <button onClick={onBegin} style={{
            fontFamily: 'var(--serif)', fontSize: mob ? '15px' : '17px', fontWeight: 500,
            color: 'var(--ivory)', background: 'var(--cobalt)',
            padding: mob ? '14px 32px' : '16px 48px', borderRadius: '3px',
            transition: 'all .25s', boxShadow: '0 4px 24px rgba(58,107,196,.28)',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--cobalt-dark)'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(58,107,196,.38)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--cobalt)'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 24px rgba(58,107,196,.28)'; }}>
            Begin Analysis
          </button>
          <div style={{ display: 'flex', gap: '32px' }}>
            {[['4', 'Angles'], ['AI', 'Powered'], ['1', 'Report']].map(([n, l]) => (
              <div key={n}>
                <div style={{ fontFamily: 'var(--serif)', fontSize: mob ? '26px' : '32px', fontWeight: 600, color: 'var(--cobalt)', lineHeight: 1 }}>{n}</div>
                <div style={{ fontFamily: 'var(--sans)', fontSize: '10px', fontWeight: 400, letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--ink4)', marginTop: '3px' }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

/* ─────────────────────────────────────────────────────────────
   ANGLE SLOT
───────────────────────────────────────────────────────────── */
const SLOT_LABEL = { front: 'Front Face', back: 'Back of Head', side: 'Side Profile', top: 'Top / Crown' };
function AngleSlot({ id, image, onImage }) {
  const inputRef = useRef(null);
  const [drag, setDrag] = useState(false);
  const loadFile = f => { const r = new FileReader(); r.onload = e => onImage(id, e.target.result); r.readAsDataURL(f); };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ fontFamily: 'var(--sans)', fontSize: '9px', fontWeight: 500, color: 'var(--cobalt)', letterSpacing: '.2em', textTransform: 'uppercase', textAlign: 'center' }}>{SLOT_LABEL[id]}</div>
      <div
        onClick={() => !image && inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={e => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f?.type.startsWith('image/')) loadFile(f); }}
        style={{
          aspectRatio: '3/4',
          border: `1.5px ${drag ? 'solid' : 'dashed'} ${image ? 'var(--cobalt-mid)' : drag ? 'var(--cobalt)' : 'var(--cobalt-pale)'}`,
          background: image ? 'var(--sky)' : drag ? 'var(--cobalt-mist)' : 'rgba(232,240,252,.4)',
          position: 'relative', overflow: 'hidden', transition: 'all .2s',
          cursor: image ? 'default' : 'pointer', borderRadius: '5px',
        }}>
        {image ? (
          <>
            <img src={image} alt={id} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(58,107,196,0)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background .2s' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(58,107,196,.5)'; e.currentTarget.querySelector('button').style.opacity = '1'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(58,107,196,0)'; e.currentTarget.querySelector('button').style.opacity = '0'; }}>
              <button onClick={() => inputRef.current?.click()} style={{ fontFamily: 'var(--sans)', fontSize: '10px', letterSpacing: '.15em', textTransform: 'uppercase', color: 'white', opacity: 0, transition: 'opacity .2s', padding: '6px 12px', border: '1px solid rgba(255,255,255,.6)', borderRadius: '3px' }}>Replace</button>
            </div>
            <div style={{ position: 'absolute', bottom: '6px', right: '6px', background: 'var(--cobalt)', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="9" height="9" viewBox="0 0 12 12" fill="none"><path d="M2 6L5 9L10 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
          </>
        ) : (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '12px' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--cobalt-light)" strokeWidth="1.2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <div style={{ fontFamily: 'var(--sans)', fontSize: '8px', color: 'var(--cobalt-light)', letterSpacing: '.1em', textAlign: 'center', lineHeight: 1.6 }}>Drop or tap</div>
          </div>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" hidden onChange={e => { if (e.target.files[0]) loadFile(e.target.files[0]); }} />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   CAMERA FLOW
───────────────────────────────────────────────────────────── */
const ANGLE_SEQ = [
  { id: 'front', label: 'Front Face', hint: 'Look straight at the camera. Head level.' },
  { id: 'back', label: 'Back of Head', hint: 'Turn fully away. Neck straight.' },
  { id: 'side', label: 'Side Profile', hint: 'Turn 90° to your left. Chin level.' },
  { id: 'top', label: 'Top / Crown', hint: 'Hold camera above head pointing down.' },
];

function CameraFlow({ onCaptures, onClose }) {
  const [step, setStep] = useState(0);
  const [captured, setCaptured] = useState({});
  const [camErr, setCamErr] = useState(null);
  const vidRef = useRef(null);
  useEffect(() => {
    let s;
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } } })
      .then(st => { s = st; if (vidRef.current) vidRef.current.srcObject = st; })
      .catch(() => setCamErr('Camera permission denied.'));
    return () => s?.getTracks().forEach(t => t.stop());
  }, []);
  const capture = () => {
    if (!vidRef.current) return;
    const c = document.createElement('canvas'); c.width = vidRef.current.videoWidth; c.height = vidRef.current.videoHeight;
    const ctx = c.getContext('2d'); ctx.translate(c.width, 0); ctx.scale(-1, 1); ctx.drawImage(vidRef.current, 0, 0);
    const url = c.toDataURL('image/jpeg', .92);
    const id = ANGLE_SEQ[step].id;
    const next = { ...captured, [id]: url };
    setCaptured(next);
    if (step < ANGLE_SEQ.length - 1) setStep(s => s + 1); else onCaptures(next);
  };
  const done = Object.keys(captured).length;
  const current = ANGLE_SEQ[step];
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,37,64,.85)', zIndex: 950, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', animation: 'fadeIn .2s ease' }}>
      <div style={{ background: 'var(--ivory)', width: '100%', maxWidth: '480px', borderRadius: '8px', overflow: 'hidden', maxHeight: '96vh', overflowY: 'auto' }}>
        <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid var(--linen)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--sky)' }}>
          <div>
            <div style={{ fontFamily: 'var(--serif)', fontSize: '18px', fontWeight: 600, color: 'var(--ink)' }}>{current.label}</div>
            <div style={{ fontFamily: 'var(--sans)', fontSize: '11px', color: 'var(--cobalt)', marginTop: '2px' }}>Step {step + 1} of 4</div>
          </div>
          <button onClick={onClose} style={{ fontSize: '20px', color: 'var(--ink3)', padding: '4px 8px' }}>✕</button>
        </div>
        <div style={{ display: 'flex', gap: '4px', padding: '12px 22px 0' }}>
          {ANGLE_SEQ.map((a, i) => <div key={a.id} style={{ flex: 1, height: '3px', borderRadius: '2px', background: i < done ? 'var(--cobalt)' : i === step ? 'var(--cobalt-light)' : 'var(--cobalt-mist)', transition: 'background .3s' }} />)}
        </div>
        {camErr ? (
          <div style={{ margin: '16px 22px', padding: '14px', background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '4px', fontFamily: 'var(--mono)', fontSize: '12px', color: '#DC2626' }}>{camErr}</div>
        ) : (
          <>
            <div style={{ position: 'relative', background: 'var(--ink)', aspectRatio: '4/3', overflow: 'hidden', margin: '12px 22px 0', borderRadius: '6px' }}>
              <video ref={vidRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)', display: 'block' }} />
            </div>
            <div style={{ margin: '8px 22px 0', padding: '10px 14px', background: 'var(--cobalt-mist)', borderRadius: '4px' }}>
              <div style={{ fontFamily: 'var(--sans)', fontSize: '11px', color: 'var(--ink3)' }}>{current.hint}</div>
            </div>
            {done > 0 && (
              <div style={{ display: 'flex', gap: '6px', padding: '10px 22px 0' }}>
                {ANGLE_SEQ.slice(0, done).map(a => (
                  <div key={a.id} style={{ width: '44px', height: '44px', overflow: 'hidden', borderRadius: '4px', border: '2px solid var(--cobalt-light)' }}>
                    <img src={captured[a.id]} alt={a.id} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                ))}
              </div>
            )}
            <div style={{ padding: '16px 22px' }}>
              <button onClick={capture} style={{ width: '100%', fontFamily: 'var(--serif)', fontSize: '15px', fontWeight: 500, color: 'var(--ivory)', background: 'var(--cobalt)', padding: '13px', borderRadius: '4px', transition: 'background .2s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--cobalt-dark)'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--cobalt)'}>
                Capture Photo {step + 1}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   UPLOAD
───────────────────────────────────────────────────────────── */
const Upload = ({ images, onImage, uploadRef, onRun, running, patient, onPatientChange }) => {
  const mob = useIsMobile();
  const [camOpen, setCamOpen] = useState(false);
  const [syncOpen, setSyncOpen] = useState(false);
  const r1 = useReveal();
  const keys = ['front', 'back', 'side', 'top'];
  const filled = keys.filter(k => images[k]).length;
  const allFilled = filled === 4;
  const handleCaptures = useCallback(caps => { Object.entries(caps).forEach(([id, url]) => onImage(id, url)); setCamOpen(false); }, [onImage]);
  const inpStyle = { width: '100%', fontFamily: 'var(--sans)', fontSize: '13px', color: 'var(--ink)', background: 'white', border: '1.5px solid var(--cobalt-pale)', padding: '10px 13px', outline: 'none', borderRadius: '4px', transition: 'border-color .2s' };
  return (
    <section id="upload" ref={uploadRef} className="no-print" style={{ padding: mob ? '60px 16px' : '80px 64px', maxWidth: '1080px', margin: '0 auto' }}>
      <div ref={r1} className="rv">
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '6px' }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--cobalt-light)', letterSpacing: '.1em' }}>01</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--linen)' }} />
          <h2 style={{ fontFamily: 'var(--serif)', fontSize: mob ? '28px' : '38px', fontWeight: 400, color: 'var(--ink)' }}>Upload 4 Angles</h2>
        </div>
        <p style={{ fontFamily: 'var(--sans)', fontSize: '13px', fontWeight: 300, color: 'var(--ink3)', lineHeight: 1.75, marginBottom: '32px' }}>All four views are required — front, back, side, and top.</p>

        {/* Client details */}
        <div style={{ marginBottom: '32px', padding: mob ? '18px' : '24px 28px', background: 'linear-gradient(135deg, var(--sky) 0%, var(--cobalt-mist) 100%)', border: '1px solid var(--cobalt-pale)', borderRadius: '8px' }}>
          <div style={{ fontFamily: 'var(--sans)', fontSize: '10px', fontWeight: 500, letterSpacing: '.22em', textTransform: 'uppercase', color: 'var(--cobalt)', marginBottom: '16px' }}>Client Details — for report</div>
          <div style={{ display: 'grid', gridTemplateColumns: mob ? '1fr' : '1fr 1fr 1fr', gap: '14px' }}>
            {[{ key: 'name', label: 'Full Name', placeholder: 'e.g. Arjun Sharma', type: 'text' }, { key: 'age', label: 'Age', placeholder: 'e.g. 28', type: 'number' }, { key: 'phone', label: 'Phone', placeholder: 'e.g. +91 98765 43210', type: 'tel' }].map(({ key, label, placeholder, type }) => (
              <div key={key}>
                <label style={{ display: 'block', fontFamily: 'var(--sans)', fontSize: '10px', fontWeight: 500, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--ink3)', marginBottom: '6px' }}>{label}</label>
                <input type={type} value={patient[key] || ''} onChange={e => onPatientChange(key, e.target.value)} placeholder={placeholder} style={inpStyle}
                  onFocus={e => e.target.style.borderColor = 'var(--cobalt)'}
                  onBlur={e => e.target.style.borderColor = 'var(--cobalt-pale)'} />
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '22px' }}>
          <button onClick={() => setSyncOpen(true)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', width: mob ? '100%' : 'auto', fontFamily: 'var(--sans)', fontSize: '12px', fontWeight: 500, letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--cobalt)', background: 'white', border: '1.5px solid var(--cobalt-pale)', padding: '12px 28px', borderRadius: '4px', transition: 'all .2s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--cobalt)'; e.currentTarget.style.background = 'var(--sky)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--cobalt-pale)'; e.currentTarget.style.background = 'white'; }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--cobalt)" strokeWidth="1.8">
              <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
              <line x1="12" y1="18" x2="12.01" y2="18" />
            </svg>
            Sync from Phone — QR Code
          </button>

          <button onClick={() => setCamOpen(true)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', width: mob ? '100%' : 'auto', fontFamily: 'var(--sans)', fontSize: '12px', fontWeight: 500, letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--ink3)', background: 'white', border: '1.5px solid var(--linen)', padding: '12px 24px', borderRadius: '4px', transition: 'all .2s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--cobalt-pale)'; e.currentTarget.style.background = 'var(--cream)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--linen)'; e.currentTarget.style.background = 'white'; }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ink3)" strokeWidth="1.8">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
            Laptop Camera
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--linen)' }} />
          <span style={{ fontFamily: 'var(--sans)', fontSize: '10px', letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--ink4)' }}>or upload individually</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--linen)' }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: mob ? '8px' : '16px', marginBottom: '24px' }}>
          {keys.map(id => <AngleSlot key={id} id={id} image={images[id]} onImage={onImage} />)}
        </div>

        <div style={{ height: '3px', background: 'var(--cobalt-mist)', borderRadius: '2px', marginBottom: '16px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${filled / 4 * 100}%`, background: 'linear-gradient(90deg, var(--cobalt) 0%, var(--cobalt-light) 100%)', borderRadius: '2px', transition: 'width .5s cubic-bezier(.16,1,.3,1)' }} />
        </div>

        <div style={{ display: 'flex', flexDirection: mob ? 'column' : 'row', alignItems: mob ? 'stretch' : 'center', justifyContent: 'space-between', gap: '12px' }}>
          <div style={{ fontFamily: 'var(--sans)', fontSize: '12px', color: 'var(--ink3)' }}>
            {allFilled ? '✓ All angles loaded — ready to analyse' : `${4 - filled} photo${4 - filled !== 1 ? 's' : ''} remaining`}
          </div>
          <button onClick={onRun} disabled={!allFilled || running} style={{ fontFamily: 'var(--serif)', fontSize: '16px', fontWeight: 500, padding: '13px 44px', borderRadius: '4px', transition: 'all .25s', color: allFilled && !running ? 'var(--ivory)' : 'var(--warm2)', background: allFilled && !running ? 'var(--cobalt)' : 'var(--sand)', boxShadow: allFilled && !running ? '0 4px 20px rgba(58,107,196,.25)' : 'none' }}
            onMouseEnter={e => { if (allFilled && !running) { e.currentTarget.style.background = 'var(--cobalt-dark)'; e.currentTarget.style.transform = 'translateY(-1px)'; } }}
            onMouseLeave={e => { e.currentTarget.style.background = allFilled && !running ? 'var(--cobalt)' : 'var(--sand)'; e.currentTarget.style.transform = 'none'; }}>
            {running ? 'Analysing…' : 'Analyse & Generate'}
          </button>
        </div>
      </div>
      {camOpen && <CameraFlow onCaptures={handleCaptures} onClose={() => setCamOpen(false)} />}
      {syncOpen && <MobileSyncModal images={images} onImage={onImage} onClose={() => setSyncOpen(false)} />}
    </section>
  );
};

/* ─────────────────────────────────────────────────────────────
   ✨ FUN LOADING ANIMATION
───────────────────────────────────────────────────────────── */
const HairStrandSVG = () => (
  <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
    {[0, 1, 2, 3, 4, 5, 6].map(i => (
      <path key={i}
        d={`M ${14 + i * 6} 58 Q ${12 + i * 6 + (i % 2 === 0 ? 7 : -7)} ${34} ${14 + i * 6 + (i % 2 === 0 ? 3 : -3)} 8`}
        stroke={`rgba(58,107,196,${0.28 + i * 0.1})`}
        strokeWidth="2.2" strokeLinecap="round"
        strokeDasharray="60" strokeDashoffset="60"
        style={{ animation: `strands 1.5s cubic-bezier(.4,0,.2,1) ${i * 0.13}s infinite alternate` }}
      />
    ))}
  </svg>
);

const Scanner = ({ images, statusMsg }) => {
  const mob = useIsMobile();
  const STAGES = [
    { emoji: '🧠', text: 'Reading head geometry…' },
    { emoji: '📐', text: 'Mapping facial proportions…' },
    { emoji: '🔍', text: 'Analysing hairline position…' },
    { emoji: '✂️', text: 'Selecting perfect hairstyle…' },
    { emoji: '🎨', text: 'Generating front view…' },
    { emoji: '🔄', text: 'Generating back view…' },
    { emoji: '👤', text: 'Generating side profile…' },
    { emoji: '⬆️', text: 'Rendering crown view…' },
    { emoji: '🪄', text: 'Verifying hairline coverage…' },
    { emoji: '📋', text: 'Preparing report…' },
  ];
  const [idx, setIdx] = useState(0);
  const [done, setDone] = useState([]);
  useEffect(() => {
    const t = setInterval(() => {
      setIdx(i => {
        const next = (i + 1) % STAGES.length;
        setDone(d => d.includes(i) ? d : [...d, i].slice(-3));
        return next;
      });
    }, 1900);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="no-print" style={{ padding: mob ? '28px 16px 60px' : '44px 64px 80px', maxWidth: '720px', margin: '0 auto', animation: 'fadeIn .5s ease' }}>

      {/* Hero card */}
      <div style={{
        background: 'linear-gradient(135deg, var(--sky) 0%, var(--cobalt-mist) 100%)',
        border: '1.5px solid var(--cobalt-pale)', borderRadius: '18px',
        padding: mob ? '28px 20px 24px' : '40px 48px 36px',
        textAlign: 'center', marginBottom: '24px', position: 'relative', overflow: 'hidden',
      }}>
        {/* Glow orb */}
        <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '200px', height: '200px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(58,107,196,.13), transparent 70%)', pointerEvents: 'none' }} />

        {/* Animated circle + strands */}
        <div style={{ position: 'relative', width: '80px', height: '80px', margin: '0 auto 24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '1.5px dashed var(--cobalt-pale)', animation: 'spin 10s linear infinite' }} />
          <div style={{ position: 'absolute', inset: '10px', borderRadius: '50%', border: '1px dashed rgba(58,107,196,.18)', animation: 'spin 6s linear infinite reverse' }} />
          {/* Orbiting dot */}
          <div style={{ position: 'absolute', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--cobalt)', top: 0, left: '50%', transform: 'translateX(-50%)', animation: 'orbit 3s linear infinite' }} />
          <HairStrandSVG />
        </div>

        {/* Stage text — re-mounts on idx change for pop animation */}
        <div key={idx} style={{ animation: 'pop .38s ease' }}>
          <div style={{ fontSize: mob ? '30px' : '38px', marginBottom: '10px', lineHeight: 1 }}>{STAGES[idx].emoji}</div>
          <div style={{ fontFamily: 'var(--serif)', fontSize: mob ? '20px' : '24px', fontWeight: 400, color: 'var(--ink)', fontStyle: 'italic', marginBottom: '4px' }}>
            {statusMsg || STAGES[idx].text}
          </div>
          <div style={{ fontFamily: 'var(--sans)', fontSize: '11px', color: 'var(--ink4)' }}>This may take 30–90 seconds</div>
        </div>

        {/* Audio-style wave bars */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: '4px', height: '32px', marginTop: '22px' }}>
          {[22, 14, 28, 10, 20, 32, 12, 26, 16, 24, 10, 20, 28, 14, 22].map((h, i) => (
            <div key={i} style={{
              width: '4px', borderRadius: '3px', background: `rgba(58,107,196,${0.4 + (i % 3) * 0.2})`,
              height: `${h}px`, animation: 'wave 1s ease-in-out infinite',
              animationDelay: `${i * 0.07}s`, transformOrigin: 'bottom',
            }} />
          ))}
        </div>
      </div>

      {/* Thumbnail scanner grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: mob ? '6px' : '12px', marginBottom: '20px' }}>
        {['front', 'back', 'side', 'top'].map((k, i) => (
          <div key={k} style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <div style={{ position: 'relative', aspectRatio: '3/4', overflow: 'hidden', border: '1.5px solid var(--cobalt-pale)', borderRadius: '6px', background: 'var(--sky)' }}>
              {images[k] && <img src={images[k]} alt={k} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'grayscale(.45) brightness(1.04)', display: 'block' }} />}
              {/* scan line */}
              <div style={{ position: 'absolute', left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg, transparent, var(--cobalt-mid), transparent)', animation: `scanLine 2.2s ease-in-out infinite`, animationDelay: `${i * .38}s` }} />
              {/* shimmer */}
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, transparent 0%, rgba(122,170,232,.13) 50%, transparent 100%)', backgroundSize: '400px 100%', animation: 'shimmer 2.4s linear infinite', animationDelay: `${i * .18}s` }} />
              {/* corner marks */}
              {[{ t: 4, l: 4, br: 'Top', bl: 'Left' }, { t: 4, r: 4, br: 'Top', bl: 'Right' }, { b: 4, l: 4, br: 'Bottom', bl: 'Left' }, { b: 4, r: 4, br: 'Bottom', bl: 'Right' }].map((pos, ci) => (
                <div key={ci} style={{ position: 'absolute', top: pos.t, right: pos.r, bottom: pos.b, left: pos.l, width: '10px', height: '10px', [`border${pos.br}`]: '1.5px solid var(--cobalt)', [`border${pos.bl}`]: '1.5px solid var(--cobalt)', opacity: .7 }} />
              ))}
            </div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: '7px', color: 'var(--cobalt-light)', letterSpacing: '.1em', textAlign: 'center', textTransform: 'uppercase' }}>{k}</div>
          </div>
        ))}
      </div>

      {/* Completed steps trail */}
      {done.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          {[...done].reverse().map((stageIdx, i) => (
            <div key={stageIdx} style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '7px 14px', background: 'white',
              border: '1px solid var(--cobalt-mist)', borderRadius: '6px',
              opacity: 1 - i * 0.28, animation: 'fadeUp .3s ease',
            }}>
              <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: 'var(--cobalt)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="8" height="8" viewBox="0 0 10 10" fill="none"><path d="M1.5 5.5L4 8L8.5 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </div>
              <span style={{ fontFamily: 'var(--sans)', fontSize: '12px', color: 'var(--ink3)' }}>{STAGES[stageIdx].text.replace('…', '')} ✓</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   ERROR
───────────────────────────────────────────────────────────── */
const ErrorBanner = ({ msg, onRetry, onDismiss }) => (
  <div className="no-print" style={{ maxWidth: '960px', margin: '0 auto', padding: '0 16px 24px', animation: 'fadeUp .3s ease' }}>
    <div style={{ padding: '16px 20px', border: '1.5px solid #FCA5A5', background: '#FEF2F2', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
      <div>
        <div style={{ fontFamily: 'var(--sans)', fontSize: '10px', fontWeight: 600, letterSpacing: '.2em', textTransform: 'uppercase', color: '#DC2626', marginBottom: '5px' }}>Error</div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: '#EF4444', lineHeight: 1.7, wordBreak: 'break-word' }}>{msg}</div>
      </div>
      <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
        <button onClick={onRetry} style={{ fontFamily: 'var(--sans)', fontSize: '10px', fontWeight: 500, letterSpacing: '.12em', textTransform: 'uppercase', color: 'white', background: '#DC2626', padding: '7px 14px', borderRadius: '4px' }}>Retry</button>
        <button onClick={onDismiss} style={{ fontFamily: 'var(--sans)', fontSize: '14px', color: 'var(--ink3)', padding: '4px 8px' }}>✕</button>
      </div>
    </div>
  </div>
);

/* ─────────────────────────────────────────────────────────────
   PRINT REPORT
   Layout: 5 pages
     Page 1 — Cover: client info, recommendation, dos/donts, company strip
     Pages 2–5 — One angle per page: large before/after images + notes
───────────────────────────────────────────────────────────── */
function printReport(analysis, results, inputImages, patient, logoSrc) {
  if (!analysis) return;
  const name = (patient?.name || '').trim() || 'Client';
  const age = (patient?.age || '').trim() || '—';
  const phone = (patient?.phone || '').trim() || '—';
  const date = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  const year = new Date().getFullYear();
  const gen = {};
  (results || []).forEach(r => { if (r.url) gen[r.id] = r.url; });

  function parseLists(a) {
    const text = [a.description, a.front_notes, a.back_notes, a.side_notes, a.top_notes, a.styling_tip].filter(Boolean).join(' ').toLowerCase();
    const dos = [], donts = [];
    if (text.includes('volume') || text.includes('fuller')) dos.push('Add volume and lift on top for facial balance');
    if (text.includes('texture')) dos.push('Use texturising products for natural movement');
    if (text.includes('taper') || text.includes('fade')) dos.push('Tapered or faded sides for a clean modern look');
    if (text.includes('matte') || text.includes('pomade')) dos.push('Lightweight matte pomade for flexible daily hold');
    if (text.includes('fringe') || text.includes('forward')) dos.push('Style fringe forward to fully cover the hairline');
    if (text.includes('layered')) dos.push('Layered cuts to add dimension and movement');
    while (dos.length < 4) { const fb = ['Regular trims every 4–6 weeks', 'Protect hair with a quality heat spray', 'Hydrate scalp with a lightweight conditioner']; dos.push(fb[dos.length % 3]); }
    if (text.includes('harsh')) donts.push('Harsh straight cut lines at the front hairline');
    if (text.includes('heavy') || text.includes('weigh')) donts.push('Heavy products that flatten and weigh hair down');
    if (text.includes('scalp') || text.includes('bald')) donts.push('Very short buzz cuts that expose the scalp');
    if (text.includes('slick')) donts.push('Fully slicked-back styles that expose the crown');
    while (donts.length < 4) { const fb = ['Over-washing which strips natural scalp oils', 'Skipping heat protection before blow-drying', 'Neglecting scalp health — it affects density']; donts.push(fb[donts.length % 3]); }
    return { dos: dos.slice(0, 4), donts: donts.slice(0, 4) };
  }
  const { dos, donts } = parseLists(analysis);

  // Shared header
  const hdr = (pg, tot) => `
  <div style="display:flex;justify-content:space-between;align-items:center;padding:13px 32px 11px;border-bottom:2.5px solid #3A6BC4;background:white;flex-shrink:0;">
    <img src="${logoSrc}" alt="American Hairline" style="height:26px;object-fit:contain;filter:brightness(0) saturate(100%) invert(30%) sepia(70%) saturate(500%) hue-rotate(195deg);display:block;-webkit-print-color-adjust:exact;print-color-adjust:exact;"/>
    <span style="font-family:'DM Mono',monospace;font-size:8px;letter-spacing:.14em;color:#A0B0D0;text-transform:uppercase;">Hair Consultation · ${year}</span>
    <span style="font-family:'DM Mono',monospace;font-size:9px;color:#A0B8D8;letter-spacing:.06em;">${pg} / ${tot}</span>
  </div>`;

  // Shared footer
  const ftr = () => `
  <div style="display:flex;justify-content:space-between;align-items:center;padding:9px 32px;border-top:1px solid #EEF4FF;background:white;flex-shrink:0;">
    <img src="${logoSrc}" alt="American Hairline" style="height:16px;object-fit:contain;filter:brightness(0) saturate(100%) invert(30%) sepia(70%) saturate(500%) hue-rotate(195deg);opacity:.4;display:block;-webkit-print-color-adjust:exact;print-color-adjust:exact;"/>
    <span style="font-family:'DM Mono',monospace;font-size:7px;color:#C8D8EE;letter-spacing:.05em;">AI-generated report · For review with a qualified stylist · americanhairline.com</span>
  </div>`;

  /* PAGE 1 — Cover */
  const p1 = `
  <div style="width:210mm;height:297mm;background:white;display:flex;flex-direction:column;page-break-after:always;break-after:page;">
    ${hdr(1, 5)}
    <div style="flex:1;padding:22px 32px 0;display:flex;flex-direction:column;gap:16px;overflow:hidden;">

      <!-- Header title strip -->
      <div style="background:linear-gradient(135deg,#EEF4FF,#F8FBFF);border:1px solid #C8DCFA;border-radius:10px;padding:18px 22px;display:flex;align-items:center;gap:20px;">
        <div style="flex:1;">
          <div style="font-family:'DM Mono',monospace;font-size:7px;letter-spacing:.28em;text-transform:uppercase;color:#A0B8D8;margin-bottom:6px;">HAIR ANALYSIS REPORT · ${date}</div>
          <div style="font-family:'Cormorant Garamond',serif;font-size:40px;font-weight:300;color:#1A2540;line-height:.9;">Hair</div>
          <div style="font-family:'Cormorant Garamond',serif;font-size:40px;font-weight:600;color:#3A6BC4;font-style:italic;line-height:.9;">Analysis</div>
        </div>
        <div style="width:1px;height:80px;background:linear-gradient(to bottom,transparent,#C8DCFA,transparent);flex-shrink:0;"></div>
        <!-- Client card -->
        <div style="background:white;border:1px solid #DDEAFF;border-radius:8px;padding:13px 16px;min-width:190px;box-shadow:0 2px 10px rgba(58,107,196,.06);">
          <div style="font-family:'DM Mono',monospace;font-size:6.5px;letter-spacing:.24em;text-transform:uppercase;color:#A0B8D8;margin-bottom:9px;">CLIENT PROFILE</div>
          ${[['NAME', name], ['AGE', age + ' yrs'], ['PHONE', phone]].map(([l, v]) => `<div style="margin-bottom:6px;"><div style="font-family:'DM Mono',monospace;font-size:5.5px;letter-spacing:.18em;text-transform:uppercase;color:#B8C8E0;margin-bottom:1px;">${l}</div><div style="font-family:'Cormorant Garamond',serif;font-size:15px;font-weight:600;color:#1A2540;">${v}</div></div>`).join('')}
        </div>
      </div>

      <!-- Recommendation + Why -->
      <div style="display:grid;grid-template-columns:1.2fr 1fr;gap:14px;">
        <div style="background:white;border:1.5px solid #DDEAFF;border-radius:10px;padding:14px 16px;box-shadow:0 2px 10px rgba(58,107,196,.05);">
          <div style="font-family:'DM Mono',monospace;font-size:6px;letter-spacing:.24em;text-transform:uppercase;color:#A0B8D8;margin-bottom:6px;">RECOMMENDED HAIRSTYLE</div>
          <div style="font-family:'Cormorant Garamond',serif;font-size:24px;font-weight:600;color:#1A2540;line-height:1.05;margin-bottom:5px;">${analysis.hairstyle_name || '—'}</div>
          <div style="display:inline-block;padding:2px 10px;border-radius:20px;background:#EEF4FF;border:1px solid #DDEAFF;font-family:'DM Mono',monospace;font-size:6.5px;letter-spacing:.1em;color:#3A6BC4;text-transform:uppercase;margin-bottom:8px;">${analysis.length || 'Medium'} Length</div>
          <p style="font-family:'DM Sans',sans-serif;font-size:11.5px;font-weight:300;color:#4A5A80;line-height:1.82;margin:0;">${analysis.description || ''}</p>
          ${analysis.styling_tip ? `<div style="margin-top:8px;padding-top:8px;border-top:1px solid #EEF4FF;font-family:'DM Sans',sans-serif;font-size:11px;font-style:italic;color:#7AAAE8;line-height:1.75;">${analysis.styling_tip}</div>` : ''}
        </div>
        <div style="background:white;border:1px solid #DDEAFF;border-radius:10px;padding:14px 16px;box-shadow:0 1px 8px rgba(58,107,196,.04);">
          <div style="font-family:'DM Mono',monospace;font-size:6px;letter-spacing:.24em;text-transform:uppercase;color:#A0B8D8;margin-bottom:7px;">WHY THIS WORKS FOR YOU</div>
          <p style="font-family:'DM Sans',sans-serif;font-size:11.5px;font-weight:300;color:#4A5A80;line-height:1.88;margin:0;">${analysis.face_shape_analysis || `Based on a 4-angle analysis, the <strong style="color:#3A6BC4;">${analysis.hairstyle_name}</strong> was identified as optimal. It creates volume where needed, balances your proportions, and delivers a clean silhouette from every angle.`}</p>
        </div>
      </div>

      <!-- Dos and Dont's -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
        <div style="background:#F0FDF4;border:1.5px solid #BBF7D0;border-radius:10px;padding:13px 16px;">
          <div style="display:flex;align-items:center;gap:7px;margin-bottom:9px;">
            <div style="width:17px;height:17px;border-radius:50%;background:#22C55E;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
              <svg width="9" height="9" viewBox="0 0 10 10" fill="none"><path d="M1.5 5.5L4 8L8.5 2" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </div>
            <span style="font-family:'DM Sans',sans-serif;font-size:11px;font-weight:600;letter-spacing:.08em;color:#166534;text-transform:uppercase;">What Works</span>
          </div>
          <ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:5px;">
            ${dos.map(d => `<li style="display:flex;gap:6px;align-items:flex-start;"><span style="color:#22C55E;font-size:9px;margin-top:2px;flex-shrink:0;">✓</span><span style="font-family:'DM Sans',sans-serif;font-size:11.5px;font-weight:300;color:#14532D;line-height:1.65;">${d}</span></li>`).join('')}
          </ul>
        </div>
        <div style="background:#FFF1F2;border:1.5px solid #FECDD3;border-radius:10px;padding:13px 16px;">
          <div style="display:flex;align-items:center;gap:7px;margin-bottom:9px;">
            <div style="width:17px;height:17px;border-radius:50%;background:#EF4444;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
              <svg width="9" height="9" viewBox="0 0 10 10" fill="none"><path d="M2.5 2.5L7.5 7.5M7.5 2.5L2.5 7.5" stroke="white" stroke-width="1.5" stroke-linecap="round"/></svg>
            </div>
            <span style="font-family:'DM Sans',sans-serif;font-size:11px;font-weight:600;letter-spacing:.08em;color:#7F1D1D;text-transform:uppercase;">Avoid These</span>
          </div>
          <ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:5px;">
            ${donts.map(d => `<li style="display:flex;gap:6px;align-items:flex-start;"><span style="color:#EF4444;font-size:9px;margin-top:2px;flex-shrink:0;">✗</span><span style="font-family:'DM Sans',sans-serif;font-size:11.5px;font-weight:300;color:#7F1D1D;line-height:1.65;">${d}</span></li>`).join('')}
          </ul>
        </div>
      </div>

      <!-- Company strip -->
      <div style="background:linear-gradient(135deg,#1A2540,#2B55A0);border-radius:10px;padding:14px 20px;display:flex;align-items:center;justify-content:space-between;gap:16px;flex-shrink:0;">
        <div>
          <img src="${logoSrc}" alt="American Hairline" style="height:20px;object-fit:contain;filter:brightness(0) invert(1);margin-bottom:4px;display:block;-webkit-print-color-adjust:exact;print-color-adjust:exact;"/>
          <div style="font-family:'DM Sans',sans-serif;font-size:10.5px;font-weight:300;color:rgba(255,255,255,.6);line-height:1.5;">Professional AI Hair Consultation System</div>
        </div>
        <div style="display:flex;gap:18px;">
          ${[['4', 'Angles'], ['AI', 'Powered'], ['3-Page', 'Report']].map(([n, l]) => `<div style="text-align:center;"><div style="font-family:'Cormorant Garamond',serif;font-size:20px;font-weight:600;color:white;line-height:1;">${n}</div><div style="font-family:'DM Mono',monospace;font-size:6.5px;letter-spacing:.1em;color:rgba(255,255,255,.45);text-transform:uppercase;margin-top:2px;">${l}</div></div>`).join('')}
        </div>
      </div>
    </div>
    ${ftr()}
  </div>`;

  /* Angle pages — 1 per angle, large images */
  const ANGLES_LIST = [
    { key: 'front', title: 'Front View', pg: 2 },
    { key: 'back', title: 'Back View', pg: 3 },
    { key: 'side', title: 'Side Profile', pg: 4 },
    { key: 'top', title: 'Top / Crown', pg: 5 },
  ];

  const anglePgs = ANGLES_LIST.map(({ key, title, pg }) => {
    const notes = analysis[`${key}_notes`] || '';
    const orig = inputImages?.[key] || null;
    const after = gen[key] || null;
    const isLast = pg === 5;
    return `
    <div style="width:210mm;height:297mm;background:white;display:flex;flex-direction:column;${isLast ? '' : 'page-break-after:always;break-after:page;'}">
      ${hdr(pg, 5)}
      <!-- Angle label bar -->
      <div style="padding:14px 32px 10px;background:linear-gradient(90deg,#EEF4FF,white);border-bottom:1px solid #E8F0FC;flex-shrink:0;">
        <div style="font-family:'DM Mono',monospace;font-size:7px;letter-spacing:.28em;color:#A0B8D8;margin-bottom:3px;text-transform:uppercase;">Angle Analysis · Page ${pg} of 5</div>
        <div style="font-family:'Cormorant Garamond',serif;font-size:28px;font-weight:300;color:#1A2540;">${title}</div>
      </div>
      <!-- IMAGES — side by side, fill available height -->
      <div style="flex:1;display:flex;gap:14px;padding:14px 32px;overflow:hidden;min-height:0;">
        <!-- Before -->
        <div style="flex:1;display:flex;flex-direction:column;border:1.5px solid #E2D9C8;border-radius:10px;overflow:hidden;">
          <div style="padding:8px 14px;background:#F6F2EA;border-bottom:1px solid #E2D9C8;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;">
            <span style="font-family:'DM Sans',sans-serif;font-size:10px;font-weight:600;letter-spacing:.2em;text-transform:uppercase;color:#6A5E50;">Before</span>
            <span style="font-family:'DM Mono',monospace;font-size:7px;letter-spacing:.1em;color:#A09080;text-transform:uppercase;">Original</span>
          </div>
          <div style="flex:1;overflow:hidden;min-height:0;background:#F6F2EA;">
            ${orig
        ? `<img src="${orig}" crossorigin="anonymous" style="width:100%;height:100%;object-fit:cover;object-position:center top;display:block;-webkit-print-color-adjust:exact;print-color-adjust:exact;"/>`
        : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#A09080;font-family:'DM Mono',monospace;font-size:10px;">No image</div>`}
          </div>
        </div>
        <!-- After -->
        <div style="flex:1;display:flex;flex-direction:column;border:1.5px solid #DDEAFF;border-radius:10px;overflow:hidden;">
          <div style="padding:8px 14px;background:#3A6BC4;border-bottom:1px solid #2B55A0;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;">
            <span style="font-family:'DM Sans',sans-serif;font-size:10px;font-weight:600;letter-spacing:.2em;text-transform:uppercase;color:white;">After</span>
            <span style="font-family:'DM Mono',monospace;font-size:7px;letter-spacing:.1em;color:rgba(255,255,255,.55);text-transform:uppercase;">AI Generated</span>
          </div>
          <div style="flex:1;overflow:hidden;min-height:0;background:#EEF4FF;">
            ${after
        ? `<img src="${after}" crossorigin="anonymous" style="width:100%;height:100%;object-fit:cover;object-position:center top;display:block;-webkit-print-color-adjust:exact;print-color-adjust:exact;"/>`
        : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#7AAAE8;font-family:'DM Mono',monospace;font-size:10px;">Not generated</div>`}
          </div>
        </div>
      </div>
      <!-- Notes box -->
      ${notes ? `
      <div style="padding:0 32px 14px;flex-shrink:0;">
        <div style="background:#EEF4FF;border:1px solid #C8DCFA;border-radius:8px;padding:11px 15px;">
          <div style="font-family:'DM Mono',monospace;font-size:6px;letter-spacing:.22em;text-transform:uppercase;color:#A0B8D8;margin-bottom:4px;">Stylist Notes</div>
          <p style="font-family:'DM Sans',sans-serif;font-size:12px;font-weight:300;color:#4A5A80;line-height:1.82;margin:0;">${notes}</p>
        </div>
      </div>` : ''}
      ${ftr()}
    </div>`;
  }).join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>Hair Report — ${name}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,400&family=DM+Sans:wght@300;400;600&family=DM+Mono:wght@300;400&display=swap" rel="stylesheet">
<style>
  *,*::before,*::after { box-sizing:border-box; margin:0; padding:0; }
  html, body { background:#E8F0FC; font-family:'DM Sans',sans-serif; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  @media print {
    @page { size:A4 portrait; margin:0; }
    html, body { margin:0; padding:0; background:white; overflow:visible !important; }
    div[style*="page-break-after"] { overflow:visible !important; }
  }
</style>
</head>
<body>
${p1}${anglePgs}
<script>
  function go() { setTimeout(function(){ window.print(); }, 800); }
  window.addEventListener('load', function() {
    var imgs = Array.from(document.querySelectorAll('img'));
    if (!imgs.length) { go(); return; }
    var done = 0, total = imgs.length;
    function tick() { done++; if (done >= total) requestAnimationFrame(function(){ requestAnimationFrame(go); }); }
    imgs.forEach(function(img) {
      if (img.complete && img.naturalWidth > 0) tick();
      else { img.addEventListener('load', tick); img.addEventListener('error', tick); }
    });
  });
<\/script>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (!win) { alert('Please allow pop-ups to print the report.'); return; }
  win.document.open(); win.document.write(html); win.document.close();
}

/* ─────────────────────────────────────────────────────────────
   RESULTS
───────────────────────────────────────────────────────────── */
const ANGLES = ['front', 'back', 'side', 'top'];
const LABEL = { front: 'Front View', back: 'Back View', side: 'Side Profile', top: 'Top / Crown' };

const Results = ({ analysis, results, inputImages, onReset, resultsRef, similarityWarnings }) => {
  const mob = useIsMobile();
  const [activeIdx, setActiveIdx] = useState(0);
  const [lightbox, setLightbox] = useState(null);
  const prev = () => setActiveIdx(i => (i - 1 + 4) % 4);
  const next = () => setActiveIdx(i => (i + 1) % 4);
  const activeKey = ANGLES[activeIdx];
  const activeGen = results?.find(g => g.id === activeKey);
  const warn = similarityWarnings?.[activeKey];

  return (
    <section id="results" ref={resultsRef} style={{ padding: mob ? '60px 0 80px' : '72px 0 100px' }}>
      <div style={{ maxWidth: '1080px', margin: '0 auto', padding: mob ? '0 16px' : '0 64px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '28px', flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--cobalt-light)' }}>02</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--linen)', minWidth: '16px' }} />
          <h2 style={{ fontFamily: 'var(--serif)', fontSize: mob ? '28px' : '38px', fontWeight: 400, color: 'var(--ink)' }}>Your Results</h2>
          <button onClick={onReset} style={{ fontFamily: 'var(--sans)', fontSize: '11px', letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--cobalt)', marginLeft: 'auto' }}>← New Session</button>
        </div>

        <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '2px' }}>
          {ANGLES.map((a, i) => (
            <button key={a} onClick={() => setActiveIdx(i)} style={{ fontFamily: 'var(--sans)', fontSize: mob ? '10px' : '11px', fontWeight: 500, letterSpacing: '.12em', textTransform: 'uppercase', padding: mob ? '7px 12px' : '8px 18px', borderRadius: '4px', border: '1.5px solid', transition: 'all .2s', borderColor: activeIdx === i ? 'var(--cobalt)' : 'var(--cobalt-pale)', background: activeIdx === i ? 'var(--cobalt)' : 'white', color: activeIdx === i ? 'var(--ivory)' : 'var(--ink3)', flexShrink: 0 }}>
              {mob ? a.charAt(0).toUpperCase() + a.slice(1) : LABEL[a]}
            </button>
          ))}
        </div>

        {warn && (
          <div style={{ marginBottom: '14px', padding: '10px 16px', background: '#FFFBEB', border: '1.5px solid #FCD34D', borderRadius: '6px', display: 'flex', gap: '10px', alignItems: 'center', animation: 'fadeUp .3s ease' }}>
            <span>⚠️</span>
            <div style={{ fontFamily: 'var(--sans)', fontSize: '12px', color: '#78350F', lineHeight: 1.6 }}>{warn}</div>
          </div>
        )}

        {/* Main before/after viewer */}
        <div style={{ position: 'relative', marginBottom: '24px' }}>
          <button onClick={prev} style={{ position: 'absolute', left: mob ? '-4px' : '-24px', top: '45%', transform: 'translateY(-50%)', zIndex: 10, width: '36px', height: '36px', background: 'white', border: '1.5px solid var(--cobalt-pale)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(58,107,196,.12)', transition: 'all .15s' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--cobalt)" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <button onClick={next} style={{ position: 'absolute', right: mob ? '-4px' : '-24px', top: '45%', transform: 'translateY(-50%)', zIndex: 10, width: '36px', height: '36px', background: 'white', border: '1.5px solid var(--cobalt-pale)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(58,107,196,.12)', transition: 'all .15s' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--cobalt)" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
          </button>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: mob ? '10px' : '20px', maxWidth: mob ? '100%' : '580px', margin: '0 auto', padding: mob ? '0 36px' : '0 32px' }}>
            {[['BEFORE', inputImages?.[activeKey], false], ['AFTER', activeGen?.url, true]].map(([lbl, src, isAfter]) => (
              <div key={lbl} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontFamily: 'var(--mono)', fontSize: '9px', letterSpacing: '.2em', textAlign: 'center', color: isAfter ? 'var(--cobalt)' : 'var(--ink4)' }}>{lbl}</div>
                <div onClick={() => isAfter && activeGen?.url && setLightbox(activeGen)}
                  style={{ aspectRatio: '3/4', overflow: 'hidden', border: `1.5px solid ${isAfter ? 'var(--cobalt-pale)' : 'var(--linen)'}`, background: isAfter ? 'var(--sky)' : 'var(--cream)', borderRadius: '6px', position: 'relative', cursor: isAfter && activeGen?.url ? 'zoom-in' : 'default', transition: 'border-color .2s' }}>
                  {src ? (
                    <>
                      <img src={src} alt={lbl} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      {isAfter && <div style={{ position: 'absolute', bottom: '6px', right: '6px', background: 'rgba(58,107,196,.85)', borderRadius: '3px', padding: '2px 6px', fontFamily: 'var(--mono)', fontSize: '7px', color: 'white' }}>zoom ↗</div>}
                    </>
                  ) : activeGen?.error ? (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--sans)', fontSize: '10px', color: '#EF4444', textAlign: 'center', padding: '10px' }}>Generation failed</div>
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{ width: '20px', height: '20px', border: '2px solid var(--cobalt-pale)', borderTop: '2px solid var(--cobalt)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center', marginTop: '12px', fontFamily: 'var(--sans)', fontSize: '11px', fontWeight: 500, letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--ink3)' }}>{LABEL[activeKey]}</div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '5px', marginTop: '10px' }}>
            {ANGLES.map((_, i) => (
              <button key={i} onClick={() => setActiveIdx(i)} style={{ width: activeIdx === i ? '20px' : '6px', height: '6px', borderRadius: '4px', background: activeIdx === i ? 'var(--cobalt)' : 'var(--cobalt-pale)', border: 'none', padding: 0, transition: 'all .3s' }} />
            ))}
          </div>
        </div>

        {/* Thumbnail strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: mob ? '6px' : '12px', marginBottom: '36px' }}>
          {ANGLES.map((k, i) => {
            const g = results?.find(r => r.id === k); const isActive = i === activeIdx;
            return (
              <div key={k} onClick={() => setActiveIdx(i)} style={{ cursor: 'pointer' }}>
                <div style={{ fontFamily: 'var(--sans)', fontSize: '8px', fontWeight: 500, color: isActive ? 'var(--cobalt)' : 'var(--ink4)', letterSpacing: '.12em', textAlign: 'center', marginBottom: '5px', textTransform: 'uppercase', transition: 'color .2s' }}>{mob ? k : LABEL[k]}</div>
                <div style={{ aspectRatio: '3/4', overflow: 'hidden', border: `2px solid ${isActive ? 'var(--cobalt)' : 'var(--cobalt-pale)'}`, background: 'var(--sky)', borderRadius: '5px', opacity: isActive ? 1 : .55, transition: 'all .2s', boxShadow: isActive ? '0 4px 14px rgba(58,107,196,.2)' : 'none' }}>
                  {g?.url ? <img src={g.url} alt={k} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ width: '12px', height: '12px', border: '1.5px solid var(--cobalt-pale)', borderTop: '1.5px solid var(--cobalt)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} /></div>}
                </div>
              </div>
            );
          })}
        </div>

        {/* Analysis card */}
        {analysis && (
          <div style={{ background: 'white', border: '1.5px solid var(--cobalt-pale)', borderRadius: '10px', padding: mob ? '20px' : '28px 36px', boxShadow: '0 4px 24px rgba(58,107,196,.08)', animation: 'fadeUp .6s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '14px', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontFamily: 'var(--sans)', fontSize: '9px', fontWeight: 500, letterSpacing: '.26em', textTransform: 'uppercase', color: 'var(--cobalt-light)', marginBottom: '6px' }}>Recommended Hairstyle</div>
                <h3 style={{ fontFamily: 'var(--serif)', fontSize: mob ? '24px' : '32px', fontWeight: 400, color: 'var(--ink)', lineHeight: 1 }}>{analysis.hairstyle_name}</h3>
              </div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--cobalt)', background: 'var(--sky)', padding: '5px 14px', border: '1px solid var(--cobalt-pale)', borderRadius: '20px', flexShrink: 0 }}>{analysis.length}</div>
            </div>
            <p style={{ fontFamily: 'var(--sans)', fontSize: mob ? '13px' : '14px', fontWeight: 300, color: 'var(--ink3)', lineHeight: 1.85, marginBottom: '18px' }}>{analysis.description}</p>
            <div style={{ display: 'grid', gridTemplateColumns: mob ? '1fr 1fr' : 'repeat(4,1fr)', gap: '10px', marginBottom: '18px' }}>
              {[['Front', analysis.front_notes], ['Back', analysis.back_notes], ['Side', analysis.side_notes], ['Top', analysis.top_notes]].map(([label, text]) => text && (
                <div key={label} style={{ background: 'var(--sky)', border: '1px solid var(--cobalt-mist)', padding: '10px 12px', borderRadius: '6px' }}>
                  <div style={{ fontFamily: 'var(--sans)', fontSize: '8px', fontWeight: 600, letterSpacing: '.22em', textTransform: 'uppercase', color: 'var(--cobalt)', marginBottom: '5px' }}>{label}</div>
                  <div style={{ fontFamily: 'var(--sans)', fontSize: '12px', fontWeight: 300, color: 'var(--ink3)', lineHeight: 1.7 }}>{text}</div>
                </div>
              ))}
            </div>
            {analysis.styling_tip && (
              <div style={{ borderTop: '1px solid var(--cobalt-mist)', paddingTop: '14px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <div style={{ width: '18px', height: '18px', background: 'var(--cobalt-mist)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--cobalt)" strokeWidth="2"><path d="M12 2a7 7 0 0 1 7 7c0 3-1.8 5.5-4.5 6.7V18H9.5v-2.3C6.8 14.5 5 12 5 9a7 7 0 0 1 7-7z" /><path d="M9.5 22h5" /></svg>
                </div>
                <div style={{ fontFamily: 'var(--sans)', fontSize: '13px', fontWeight: 300, color: 'var(--ink3)', lineHeight: 1.8, fontStyle: 'italic' }}>{analysis.styling_tip}</div>
              </div>
            )}
          </div>
        )}
      </div>

      {lightbox && (
        <div onClick={() => setLightbox(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(26,37,64,.9)', zIndex: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: mob ? '16px' : '40px', animation: 'fadeIn .2s ease' }}>
          <div style={{ maxWidth: '440px', width: '100%', animation: 'fadeUp .22s ease' }}>
            <img src={lightbox.url} alt={lightbox.id} style={{ width: '100%', display: 'block', borderRadius: '8px', border: '2px solid var(--cobalt-pale)' }} />
            <div style={{ marginTop: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontFamily: 'var(--serif)', fontSize: '22px', fontWeight: 400, color: 'white' }}>{LABEL[lightbox.id]}</div>
              <div style={{ fontFamily: 'var(--sans)', fontSize: '10px', letterSpacing: '.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,.5)' }}>tap to close</div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

/* ─────────────────────────────────────────────────────────────
   UTILS
───────────────────────────────────────────────────────────── */
function compressImage(dataUrl, maxPx = 900, quality = 0.82) {
  return new Promise(resolve => {
    const img = new Image(); img.onload = () => {
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      c.getContext('2d').drawImage(img, 0, 0, w, h);
      resolve(c.toDataURL('image/jpeg', quality));
    }; img.onerror = () => resolve(dataUrl); img.src = dataUrl;
  });
}

async function post(path, body, timeoutMs = 200000) {
  const ctrl = new AbortController(); const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(path, { method: 'POST', signal: ctrl.signal, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    clearTimeout(timer); const data = await res.json();
    if (!res.ok) throw new Error(data?.error || data?.message || `HTTP ${res.status}`);
    return data;
  } catch (e) { clearTimeout(timer); throw new Error(e.name === 'AbortError' ? 'Request timed out' : e.message); }
}

async function computeSimilarity(url1, url2, size = 32) {
  const load = u => new Promise((res, rej) => { const img = new Image(); img.crossOrigin = 'anonymous'; img.onload = () => res(img); img.onerror = rej; img.src = u; });
  try {
    const [i1, i2] = await Promise.all([load(url1), load(url2)]);
    const c = document.createElement('canvas'); c.width = size; c.height = size;
    const ctx = c.getContext('2d');
    ctx.drawImage(i1, 0, 0, size, size); const d1 = ctx.getImageData(0, 0, size, size).data;
    ctx.clearRect(0, 0, size, size);
    ctx.drawImage(i2, 0, 0, size, size); const d2 = ctx.getImageData(0, 0, size, size).data;
    let diff = 0;
    for (let i = 0; i < d1.length; i += 4) diff += Math.abs(d1[i] - d2[i]) + Math.abs(d1[i + 1] - d2[i + 1]) + Math.abs(d1[i + 2] - d2[i + 2]);
    return 1 - diff / (size * size * 3 * 255);
  } catch { return null; }
}

/* ─────────────────────────────────────────────────────────────
   APP ROOT
───────────────────────────────────────────────────────────── */
export default function App() {
  const syncTarget = typeof window !== 'undefined'
    ? (new URLSearchParams(window.location.search).get('sync') || (window.location.hash.startsWith('#sync=') ? window.location.hash.replace('#sync=', '') : null))
    : null;

  if (syncTarget) {
    return (
      <>
        <Styles />
        <MobileCaptureView targetPeerId={syncTarget} />
      </>
    );
  }

  const [images, setImages] = useState({ front: null, back: null, side: null, top: null });
  const [phase, setPhase] = useState('idle');
  const [analysis, setAnalysis] = useState(null);
  const [results, setResults] = useState([]);
  const [err, setErr] = useState(null);
  const [patient, setPatient] = useState({ name: '', age: '', phone: '' });
  const [statusMsg, setStatusMsg] = useState('');
  const [simWarns, setSimWarns] = useState({});

  const handlePatientChange = useCallback((key, val) => setPatient(p => ({ ...p, [key]: val })), []);
  const uploadRef = useRef(null);
  const resultsRef = useRef(null);
  const savedImgs = useRef(null);
  const scrollTo = ref => ref?.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const handleImage = useCallback((id, val) => setImages(p => ({ ...p, [id]: val })), []);

  const run = async () => {
    savedImgs.current = { ...images };
    setPhase('running'); setErr(null); setAnalysis(null); setResults([]); setSimWarns({});
    setStatusMsg('Compressing photos…');

    const [cf, cb, cs, ct] = await Promise.all([
      compressImage(images.front), compressImage(images.back),
      compressImage(images.side), compressImage(images.top),
    ]);
    const compressed = { front: cf, back: cb, side: cs, top: ct };

    let analysisData;
    try {
      setStatusMsg('Analysing head geometry with AI…');
      const r = await post('/api/analyze', compressed);
      analysisData = r.analysis; setAnalysis(analysisData);
    } catch (e) { setErr(e.message); setPhase('idle'); return; }

    setStatusMsg('Generating hairstyle visuals…');
    let genResults = [];
    try {
      const r = await post('/api/generate', { ...compressed, analysis: analysisData }, 240000);
      genResults = r.results || []; setResults([...genResults]);
    } catch (e) { console.warn('[App] gen error:', e.message); setResults([]); setPhase('done'); setTimeout(() => scrollTo(resultsRef), 400); return; }

    setStatusMsg('Verifying hairline coverage…');
    const warnings = {}; const regenIds = [];
    await Promise.all(genResults.map(async g => {
      const orig = compressed[g.id]; if (!g.url || !orig) return;
      const score = await computeSimilarity(orig, g.url);
      if (score !== null && score > 0.88) { regenIds.push(g.id); warnings[g.id] = `${LABEL[g.id]}: Too similar to input — regenerating…`; }
    }));

    if (regenIds.length > 0) {
      setSimWarns(warnings); setStatusMsg(`Re-generating ${regenIds.length} angle${regenIds.length > 1 ? 's' : ''}…`);
      const retryBody = {}; regenIds.forEach(id => { retryBody[id] = compressed[id]; });
      try {
        const retryR = await post('/api/generate', { ...retryBody, analysis: analysisData, angles: regenIds }, 180000);
        const retried = retryR.results || [];
        const updated = genResults.map(g => { const n = retried.find(r => r.id === g.id); return n?.url ? n : g; });
        genResults = updated; setResults([...updated]);
      } catch (e) { console.warn('[App] retry error:', e.message); }
      const finalWarns = {};
      genResults.forEach(g => { if (regenIds.includes(g.id) && !g.url) finalWarns[g.id] = `${LABEL[g.id]}: Generation failed after retry.`; });
      setSimWarns(finalWarns);
    }

    setPhase('done'); setStatusMsg('');
    setTimeout(() => scrollTo(resultsRef), 400);
  };

  const reset = () => {
    setImages({ front: null, back: null, side: null, top: null });
    setPhase('idle'); setAnalysis(null); setResults([]); setErr(null);
    setPatient({ name: '', age: '', phone: '' }); setSimWarns({});
    setTimeout(() => scrollTo(uploadRef), 200);
  };

  const openReport = () => printReport(analysis, results, savedImgs.current, patient, logo);

  return (
    <>
      <Styles />
      <Nav onDownload={openReport} showDownload={phase === 'done'} />
      <div style={{ height: '62px' }} className="no-print" />

      <Hero onBegin={() => scrollTo(uploadRef)} />
      <div style={{ height: '1px', background: 'var(--linen)', margin: '0 32px' }} className="no-print" />

      {phase !== 'done' && (
        <Upload images={images} onImage={handleImage} uploadRef={uploadRef} onRun={run} running={phase === 'running'} patient={patient} onPatientChange={handlePatientChange} />
      )}
      {phase === 'running' && <Scanner images={images} statusMsg={statusMsg} />}
      {err && <ErrorBanner msg={err} onRetry={run} onDismiss={() => setErr(null)} />}
      {phase === 'done' && (
        <Results analysis={analysis} results={results} inputImages={savedImgs.current} onReset={reset} resultsRef={resultsRef} similarityWarnings={simWarns} />
      )}

      <footer className="no-print" style={{
        borderTop: '1px solid var(--linen)', padding: '24px 48px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: '16px',
        background: 'linear-gradient(to bottom, var(--ivory), var(--cream))',
      }}>
        <img src={logo} alt="American Hairline" style={{ height: '26px', objectFit: 'contain', filter: LOGO_FILTER }} />
        <div style={{ fontFamily: 'var(--sans)', fontSize: '11px', fontWeight: 300, color: 'var(--ink3)' }}>Professional AI Hair Consultation</div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--ink4)' }}>© {new Date().getFullYear()} · For Consultation Purposes Only</div>
      </footer>
    </>
  );
}