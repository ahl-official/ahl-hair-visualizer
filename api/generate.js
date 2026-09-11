// api/generate.js
// Hair Patch & Transplant Consultation — Hairstyle Visualizer
//
// Anti-hallucination architecture:
//   Fix 1 — Two-pass: text spec locked BEFORE any image generation
//   Fix 2 — Sequential generation: front first, then back/side/top with front result as visual reference
//   Fix 3 — Hairstyle fingerprint injected into every prompt from the locked spec

const MODEL_IMAGE = 'google/gemini-3.1-flash-image-preview';
const MODEL_TEXT = 'google/gemini-2.5-flash';   // cheaper, text-only for spec locking

// ─────────────────────────────────────────────
// PASS 1 — Lock a precise hairstyle spec in text
// before any image is generated.
// This eliminates per-angle interpretation drift.
// ─────────────────────────────────────────────
async function lockHairstyleSpec(analysis, apiKey, site) {
  const { hairstyle_name, description, length } = analysis;

  const prompt = `You are a senior hairstylist writing a clinical technical brief for a hair restoration (hair patch / hair transplant) clinic.

The client is a bald or partially bald adult male.

Hairstyle requested : ${hairstyle_name}
Style description   : ${description}
Desired length      : ${length}

Write a highly precise hairstyle specification that will be used as the SINGLE SOURCE OF TRUTH 
for an AI image editor applying this hairstyle from 4 different camera angles:
  1. Front view
  2. Back of head view
  3. Side profile view
  4. Top-down crown view

Your spec MUST include all of the following, stated as exact values (not ranges where possible):

1. Top zone length         — in inches
2. Side zone length        — in inches
3. Back zone length        — in inches
4. Nape finish             — how the hair ends at the nape of the neck
5. Parting style           — e.g. natural centre, natural left, no part
6. Hair texture descriptor — e.g. straight, lightly wavy, softly textured
7. Density level           — MUST be LOW or LOW-MODERATE. Never thick or voluminous.
8. Crown shape             — e.g. soft rounded top, flat, slight lift
9. Forehead coverage       — how much of the forehead/hairline the hair covers
10. How the style looks from each of the 4 camera angles — one sentence each

STRICT RULES:
- Density must always be LOW. This is a hair restoration preview — not a full-hair photo shoot.
- Do NOT describe buzz cuts, skin fades, undercuts, or any style requiring shaved sides.No hair on the forehead at all.
- The spec must describe ONE consistent hairstyle that looks like the same head of hair from all 4 angles.
- Be clinical and specific. No vague adjectives like "neat" or "stylish" without a concrete descriptor.
- Plain text only. No markdown, no bullet symbols, no headers with # or *.
- Number each item exactly as listed above.`;

  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': site,
        'X-Title': 'Hair Restoration Visualizer - Spec Lock',
      },
      body: JSON.stringify({
        model: MODEL_TEXT,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 700,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.warn('[spec] Lock failed:', err?.error?.message || `HTTP ${res.status}`);
      return null;
    }

    const data = await res.json();
    const spec = data?.choices?.[0]?.message?.content?.trim() || null;
    console.log('[spec] Locked hairstyle spec:\n', spec);
    return spec;

  } catch (e) {
    console.warn('[spec] Lock threw:', e.message);
    return null;
  }
}


// ─────────────────────────────────────────────
// PROMPT BUILDER
// Injects the locked spec + angle-specific task
// ─────────────────────────────────────────────
function buildPrompt(angle, analysis, lockedSpec) {
  const {
    hairstyle_name,
    description,
    length,
    front_notes,
    back_notes,
    side_notes,
    top_notes,
  } = analysis;

  const angleMap = {
    front: {
      view: 'FRONT VIEW',
      lock: 'The person faces directly toward the camera. Output MUST show a front-facing person. Do NOT rotate and dont cover the forehead.',
      task: 'Add natural hair to the top and sides of the head. Hair should not come over the forehead.',
      notes: front_notes || '',
    },
    back: {
      view: 'BACK OF HEAD VIEW',
      lock: 'The person has their back to the camera. Output MUST show the back of the head — face NOT visible.',
      task: 'Add natural hair to the back and crown. Show a clean nape finish consistent with the locked spec, natural back volume, and realistic hair length from behind.',
      notes: back_notes || '',
    },
    side: {
      view: 'SIDE PROFILE VIEW',
      lock: 'The person is turned 90 degrees. Output MUST be a strict side profile — one ear visible, nose seen from the side. Do NOT rotate or repose the person.',
      task: 'Add hair along the top of the head and temple area as seen from the side. Hair must follow the natural curve of the head and match the length specified in the locked spec.',
      notes: side_notes || '',
    },
    top: {
      view: 'TOP-DOWN CROWN VIEW',
      lock: "Camera looks straight down at the top of the person's head. Output MUST show the crown from above.",
      task: 'Add hair across the entire crown as seen from above. Show the parting direction and density level as specified in the locked spec.',
      notes: top_notes || '',
    },
  };

  const a = angleMap[angle];

  return `
===================================================
HAIR PATCH & TRANSPLANT CONSULTATION — VISUALIZER
===================================================
You are a photorealistic hairstyle visualizer for a professional hair restoration clinic.
The goal is to show a bald or partially bald male client what a recommended hairstyle 
would look like on HIM — so he can make an informed decision about a hair patch or transplant.

This is NOT creative image generation.
This is a STRICT, CLINICAL, PHOTOREALISTIC preview tool.

======================
IDENTITY LOCK (ABSOLUTE)
======================
This is a REAL person's consultation photo. Preserve his identity EXACTLY.

DO NOT change any of the following:
  - Face shape or structure
  - Skin tone or complexion
  - Eyes, nose, lips, or expression
  - Existing beard, moustache, or stubble
  - Piercings, scars, or any existing features

If the person is clean-shaven → keep him clean-shaven.
If the person has a beard or stubble → keep the EXACT SAME beard, same shape, same density, same trim.
NEVER add features that do not exist in the original photo.
NEVER remove features that do exist in the original photo.

======================
ANGLE LOCK (CRITICAL)
======================
This photo is the ${a.view}.
${a.lock}

DO NOT rotate, reframe, zoom, or alter the camera angle in any way.
The output must match the EXACT same viewpoint as the input photo.

======================
CLIENT CONTEXT: BALD OR PARTIALLY BALD
======================
The client may have:
  - A fully bald scalp
  - A receding hairline
  - Thinning patches at the crown or temples
  - Partial hair remaining on sides or back

Add hair ONLY to areas where it is sparse or absent.
If the client has existing hair in a zone, blend the new hair naturally into it.
Preserve and match existing hair texture, colour, and growth direction where it exists.

======================
LOCKED HAIRSTYLE SPECIFICATION (MASTER REFERENCE)
======================
The following spec was defined ONCE before any image generation.
It is the SINGLE SOURCE OF TRUTH for this hairstyle.
You MUST apply it exactly as written. Do NOT interpret, improvise, or deviate.

${lockedSpec ? lockedSpec : `Hairstyle: ${hairstyle_name}\nDescription: ${description}\nLength: ${length}`}

======================
HAIRSTYLE CONSISTENCY RULE (CRITICAL)
======================
This is ONE hairstyle being shown from FOUR different camera positions.
The hairstyle MUST be IDENTICAL across all 4 angles:
  - Same length in every zone
  - Same density and volume
  - Same parting direction
  - Same texture and colour
  - Same nape finish
  - Same crown shape

You are NOT creating a new hairstyle.
You are showing the SAME hairstyle from this specific angle: ${a.view}

======================
ANGLE-SPECIFIC TASK
======================
Current angle: ${a.view}
Task: ${a.task}
${a.notes ? `Additional notes for this angle: ${a.notes}` : ''}

======================
HAIR ADDITION RULES
======================
- ONLY add hair. Change NOTHING else in the image.
- Match the client's natural hair colour EXACTLY.
- Match the client's natural hair texture EXACTLY.
- Hair must look like it is growing from the scalp — not placed on top of it.
- Blend new hair seamlessly with any existing hair.

DENSITY RULE (STRICTLY ENFORCED):
  - Hair density must remain LOW TO MODERATE but there should be no bald spots or empty areas.
  - This is a hair restoration preview — not a fashion shoot.
  - Do NOT add thick, voluminous, or artificially full hair.
  - Slight scalp visibility in sparse zones is realistic and acceptable.

======================
FORBIDDEN STYLES
======================
  ✗ Buzz cuts
  ✗ Skin fades or hard side fades
  ✗ Undercuts
  ✗ Dramatic volume or puffed-up styles
  ✗ Any style that exposes or shaves the sides

======================
REALISM REQUIREMENTS
======================
- Hair must be 100% photorealistic — individual strands, natural shadows, correct lighting.
- Hair must respond to the lighting conditions already in the photo.
- The result must look like a genuine clinical before/after preview photograph.

======================
FINAL OUTPUT RULES
======================
  ✓ SAME person — identity unchanged
  ✓ SAME camera angle — viewpoint unchanged
  ✓ SAME background and clothing — environment unchanged
  ✓ ONLY hair added or modified
  ✓ Hairstyle matches the locked spec exactly
  ✓ Hairstyle matches all other angles
  ✓ Density is LOW TO MODERATE — clinically realistic
`;
}


// ─────────────────────────────────────────────
// IMAGE URL EXTRACTOR
// ─────────────────────────────────────────────
function extractImageUrl(msg) {
  if (!msg) return null;

  if (Array.isArray(msg.images) && msg.images.length > 0) {
    const i = msg.images[0];
    if (typeof i === 'string') return i;
    if (i?.imageUrl?.url) return i.imageUrl.url;
    if (i?.image_url?.url) return i.image_url.url;
    if (i?.url) return i.url;
  }

  if (Array.isArray(msg.content)) {
    for (const b of msg.content) {
      if (b?.type === 'image_url' && b?.image_url?.url) return b.image_url.url;
      if (b?.type === 'image' && b?.source?.data)
        return `data:${b.source.media_type || 'image/png'};base64,${b.source.data}`;
    }
  }

  if (typeof msg.content === 'string') {
    const c = msg.content.trim();
    if (c.startsWith('data:image') || c.startsWith('http')) return c;
  }

  return null;
}


// ─────────────────────────────────────────────
// PASS 2 — Generate one angle
// referenceImageUrl = the already-generated front
// result, injected as a visual anchor for all
// subsequent angles.
// ─────────────────────────────────────────────
async function generateOne(id, sourceImage, analysis, apiKey, site, lockedSpec, referenceImageUrl = null) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 160_000);

  const content = [];

  // Inject the front-view result as a visual reference for non-front angles
  if (referenceImageUrl) {
    content.push({
      type: 'text',
      text: `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VISUAL HAIRSTYLE REFERENCE — REQUIRED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
The image immediately below is the ALREADY APPROVED front-view result for this exact client.
It shows the correct hairstyle that has been applied to his front-facing photo.

You MUST match this hairstyle EXACTLY in your output:
  - Same hair length (top, sides, back)
  - Same density — do NOT make it thicker or thinner
  - Same texture and colour
  - Same parting direction
  - Same volume and crown shape
  - Same nape style

This is the VISUAL GROUND TRUTH. Your output is the SAME HAIRSTYLE from a different angle.
Do NOT deviate from what you see in this reference image.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    });
    content.push({ type: 'image_url', image_url: { url: referenceImageUrl } });
    content.push({
      type: 'text',
      text: `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CLIENT PHOTO — THIS IS THE PHOTO TO EDIT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
The image below is the client's ${id.toUpperCase()} VIEW photo.
Apply the EXACT hairstyle shown in the reference image above to this photo.
Do NOT change the camera angle. Do NOT change anything except the hair.`,
    });
  } else {
    // Front view — no reference available yet, relies entirely on the locked spec
    content.push({
      type: 'text',
      text: `This is the FRONT VIEW photo of a hair restoration consultation client.
Apply the hairstyle described in the locked specification below.
This output will become the VISUAL REFERENCE for all other angles — so be precise.`,
    });
  }

  content.push({ type: 'image_url', image_url: { url: sourceImage } });
  content.push({ type: 'text', text: buildPrompt(id, analysis, lockedSpec) });

  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      signal: ctrl.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': site,
        'X-Title': 'Hair Restoration Visualizer',
      },
      body: JSON.stringify({
        model: MODEL_IMAGE,
        modalities: ['image', 'text'],
        messages: [{ role: 'user', content }],
        max_tokens: 1024,
      }),
    });

    clearTimeout(timer);

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const msg = err?.error?.message || `HTTP ${res.status}`;
      console.error(`[gen] ${id} ✗ API error: ${msg}`);
      return { id, url: null, error: msg };
    }

    const data = await res.json();
    const url = extractImageUrl(data?.choices?.[0]?.message);
    console.log(`[gen] ${id} ${url ? '✓ image received' : '✗ no image in response'}`);
    return { id, url: url || null, error: url ? null : 'No image returned by model' };

  } catch (e) {
    clearTimeout(timer);
    const msg = e.name === 'AbortError' ? 'Timed out after 160s' : e.message;
    console.error(`[gen] ${id} threw: ${msg}`);
    return { id, url: null, error: msg };
  }
}


// ─────────────────────────────────────────────
// MAIN HANDLER
// ─────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Safe body parsing
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (_) { /* ignore */ }
  }

  const { front, back, side, top, analysis } = body || {};

  if (!front || !back || !side || !top)
    return res.status(400).json({ error: 'Missing one or more angle photos (front, back, side, top required)' });

  if (!analysis?.hairstyle_name)
    return res.status(400).json({ error: 'Missing analysis object or hairstyle_name field' });

  if (!process.env.OPENROUTER_API_KEY)
    return res.status(500).json({ error: 'OPENROUTER_API_KEY is not configured on the server' });

  const SITE = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000';
  const KEY = process.env.OPENROUTER_API_KEY;

  const t0 = Date.now();
  console.log(`\n[start] Consultation preview for hairstyle: "${analysis.hairstyle_name}"`);

  // ── PASS 1: Lock the hairstyle spec in text ──────────────────────────────
  console.log('[pass1] Locking hairstyle spec...');
  const lockedSpec = await lockHairstyleSpec(analysis, KEY, SITE);
  console.log(`[pass1] Spec ${lockedSpec ? 'locked ✓' : 'failed — falling back to analysis fields'}`);

  // ── PASS 2a: Generate front view first ───────────────────────────────────
  console.log('[pass2] Generating front view (will be used as visual reference)...');
  const frontResult = await generateOne('front', front, analysis, KEY, SITE, lockedSpec, null);
  console.log(`[pass2] Front: ${frontResult.url ? '✓' : `✗ ${frontResult.error}`}`);

  // ── PASS 2b: Generate remaining 3 angles with front as visual anchor ─────
  // Even if front failed (url is null), the locked spec still provides text guidance.
  // Pass null gracefully — generateOne handles a null referenceImageUrl.
  const referenceUrl = frontResult.url || null;
  if (!referenceUrl) {
    console.warn('[pass2] Front view failed — back/side/top will rely on locked spec only (no visual reference)');
  }

  console.log('[pass2] Generating back, side, top in parallel...');
  const [backResult, sideResult, topResult] = await Promise.all([
    generateOne('back', back, analysis, KEY, SITE, lockedSpec, referenceUrl),
    generateOne('side', side, analysis, KEY, SITE, lockedSpec, referenceUrl),
    generateOne('top', top, analysis, KEY, SITE, lockedSpec, referenceUrl),
  ]);

  const results = [frontResult, backResult, sideResult, topResult];
  const successCount = results.filter(r => r.url).length;

  console.log(`[done] ${successCount}/4 angles succeeded in ${((Date.now() - t0) / 1000).toFixed(1)}s\n`);

  return res.status(200).json({
    results,
    hairstyle: analysis.hairstyle_name,
    success_count: successCount,
    spec_locked: !!lockedSpec,
    locked_spec: lockedSpec || null,   // useful for debugging / logging on the client
  });
}