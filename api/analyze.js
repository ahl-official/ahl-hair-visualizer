// api/analyze.js
// Hair Patch & Transplant Consultation — Hairstyle Analyser
// Accepts 4 angle photos of a bald/partially bald male client
// Returns a structured JSON hairstyle recommendation

const VISION_MODELS = [
  'google/gemini-2.5-flash',
  'qwen/qwen2.5-vl-72b-instruct',
  'meta-llama/llama-4-maverick',
  'google/gemini-2.5-flash-lite',
];

const SYSTEM_PROMPT = `You are a senior trichologist and master barber with 20+ years of experience 
working at a specialist hair restoration clinic.

Your role is to analyse photos of male clients who are bald or partially bald, 
and recommend the most suitable hairstyle for a hair patch or hair transplant procedure.

Your recommendations must be:
  - Clinically realistic for a hair restoration outcome
  - Suited to the client's face shape, skin tone, and existing hair pattern
  - Conservative in density — hair patch and transplant results are natural, not thick and not covering the forehead. 
  - Consistent across all 4 viewing angles — you are describing ONE hairstyle on ONE person

Respond ONLY with valid JSON. No markdown, no explanation, no preamble.`;

const USER_PROMPT = `HAIR RESTORATION CONSULTATION — HAIRSTYLE ANALYSIS TASK

You are reviewing 4 consultation photos of the SAME male client.
He is bald or partially bald and is considering a hair patch or hair transplant.
Your job is to study his face shape, existing hair (if any), and scalp condition,
then recommend ONE hairstyle that would suit him best after the procedure.

========================
IDENTITY OBSERVATION RULES
========================
- All 4 photos show the SAME person. Treat them as one subject.
- Observe and preserve:
  - Face shape (oval, round, square, oblong, etc.)
  - Skin tone
  - Any existing hair — colour, texture, growth pattern, density
  - Existing beard, stubble, or moustache
  - Any visible scalp conditions or hairline shape

DO NOT recommend changes to:
  - Beard or facial hair
  - Skin tone or features
  - Anything other than scalp hair

========================
CLIENT CONTEXT
========================
The client may have:
  - A fully bald scalp
  - A receding hairline (frontal or temporal)
  - Crown thinning or vertex baldness
  - Partial hair remaining on sides or back

Base your hairstyle recommendation on what would look NATURAL and REALISTIC 
for this specific person post hair-patch or post-transplant.

========================
HAIRSTYLE RECOMMENDATION RULES
========================
Recommend ONE hairstyle only. It must be:

LENGTH:
  - Short to medium-short ONLY
  - Long enough to cover the scalp naturally but dont cover the forehead at all
  - Short enough to look realistic post-transplant

DENSITY:
  - LOW — this is the most critical constraint
  - Hair restoration does NOT produce thick, full, youthful hair
  - The result must look like naturally grown-in hair at realistic post-procedure density nut dont keep any bald spots or empty areas.

STYLE RESTRICTIONS (FORBIDDEN):
  ✗ Buzz cuts — exposes scalp, defeats purpose of restoration
  ✗ Skin fades or hard side fades — requires shaving, not a transplant outcome
  ✗ Undercuts — requires shaved sides, not applicable
  ✗ Dramatic volume or puffed-up styles — unrealistic density
  ✗ Extremely long styles — not achievable post-transplant

PERMITTED STYLES (examples):
  ✓ Soft textured crop
  ✓ Natural side-swept style
  ✓ Classic gentleman's cut
  ✓ Ivy league / short back and sides (no fade)
  ✓ Layered natural flow
  ✓ Caesar cut (soft, no harsh lines)

HAIRLINE COVERAGE:
  - The recommended style MUST naturally cover the frontal hairline
  - Coverage should look grown-in and natural, NOT dense or heavy

========================
CONSISTENCY RULE (CRITICAL)
========================
You are recommending ONE hairstyle that will be applied to all 4 angles.
Your notes for each angle must describe the SAME hairstyle — just from different viewpoints.
Length, density, texture, and shape must be identical across all views.

========================
PRECISION REQUIREMENT
========================
Your length and density fields must be specific enough to be used as an image generation brief.
Include exact approximate lengths in inches where possible.
Avoid vague adjectives — be clinical and precise.

========================
OUTPUT FORMAT — STRICT JSON ONLY
========================
Return ONLY this JSON object. No markdown. No explanation. No code fences.

{
  "hairstyle_name": "Short descriptive name of the recommended hairstyle",
  "length": "Short / Medium-short / Medium",
  "top_length": "Approximate length on top in inches, e.g. 2 inches",
  "side_length": "Approximate length on sides in inches, e.g. 1 inch",
  "back_length": "Approximate length at back in inches, e.g. 1 inch",
  "parting": "Natural left / Natural right / Centre / No parting",
  "texture": "Straight / Lightly wavy / Wavy / Softly textured — match client's natural texture",
  "density": "Low / Low-moderate — never use Medium, High, or Thick",
  "crown_shape": "Brief description, e.g. soft rounded, flat, slight natural lift",
  "nape": "How the hair ends at the nape, e.g. natural taper, clean natural finish",
  "description": "2-3 sentences explaining why this specific style suits this client's face shape and restoration context",
  "front_notes": "What the hairstyle looks like from the front — hairline coverage, forehead framing, density",
  "back_notes": "What the hairstyle looks like from behind — nape finish, back length, volume",
  "side_notes": "What the hairstyle looks like from the side — temple area, no fades, natural transition",
  "top_notes": "What the hairstyle looks like from above — crown coverage, parting, density distribution",
  "styling_tip": "One practical, realistic tip for daily styling and maintenance post hair-patch or transplant"
}`;

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

  const { front, back, side, top } = body || {};

  if (!front || !back || !side || !top)
    return res.status(400).json({ error: 'All 4 angle photos are required: front, back, side, top' });

  if (!process.env.OPENROUTER_API_KEY)
    return res.status(500).json({ error: 'OPENROUTER_API_KEY is not configured on the server' });

  const SITE = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000';

  const errors = [];

  for (const model of VISION_MODELS) {
    console.log(`[analyze] Trying model: ${model}...`);

    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': SITE,
          'X-Title': 'Hair Restoration Visualizer',
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'system',
              content: SYSTEM_PROMPT,
            },
            {
              role: 'user',
              content: [
                { type: 'text', text: USER_PROMPT },
                { type: 'text', text: '─── CONSULTATION PHOTO 1 — FRONT VIEW ───' },
                { type: 'image_url', image_url: { url: front } },
                { type: 'text', text: '─── CONSULTATION PHOTO 2 — BACK VIEW ───' },
                { type: 'image_url', image_url: { url: back } },
                { type: 'text', text: '─── CONSULTATION PHOTO 3 — SIDE PROFILE VIEW ───' },
                { type: 'image_url', image_url: { url: side } },
                { type: 'text', text: '─── CONSULTATION PHOTO 4 — TOP-DOWN CROWN VIEW ───' },
                { type: 'image_url', image_url: { url: top } },
              ],
            },
          ],
          max_tokens: 1000,
          temperature: 0.3, // Lower temperature = more consistent, less creative
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        const msg = err?.error?.message || `HTTP ${response.status}`;
        console.warn(`[analyze] ${model} rejected: ${msg}`);
        errors.push(`${model}: ${msg}`);
        continue;
      }

      const data = await response.json();
      let raw = data?.choices?.[0]?.message?.content || '';

      if (!raw) {
        errors.push(`${model}: empty response`);
        continue;
      }

      // Strip markdown fences if present
      const cleaned = raw
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/, '')
        .trim();

      // Attempt JSON parse, with regex fallback
      let parsed = null;
      try {
        parsed = JSON.parse(cleaned);
      } catch {
        const match = cleaned.match(/\{[\s\S]*\}/);
        if (match) {
          try { parsed = JSON.parse(match[0]); } catch { /* fall through */ }
        }
      }

      // Validate required fields
      if (!parsed?.hairstyle_name) {
        console.warn(`[analyze] ${model}: JSON parsed but missing hairstyle_name`);
        errors.push(`${model}: could not parse valid hairstyle JSON`);
        continue;
      }

      // Validate density field — reject if model ignored the low-density rule
      const densityRaw = (parsed.density || '').toLowerCase();
      if (densityRaw.includes('high') || densityRaw.includes('thick') || densityRaw.includes('full')) {
        console.warn(`[analyze] ${model}: density field "${parsed.density}" violates low-moderate rule — correcting`);
        parsed.density = 'Low-moderate';
      }

      console.log(`[analyze] ✓ ${model} → "${parsed.hairstyle_name}" (${parsed.length}, density: ${parsed.density})`);
      return res.status(200).json({ analysis: parsed, model_used: model });

    } catch (e) {
      console.warn(`[analyze] ${model} threw: ${e.message}`);
      errors.push(`${model}: ${e.message}`);
    }
  }

  // All models failed
  console.error('[analyze] All models failed:', errors);
  return res.status(500).json({
    error: 'Hairstyle analysis failed across all available models.',
    details: errors,
  });
}