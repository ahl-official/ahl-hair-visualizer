// api/test.js — Diagnostic endpoint for Hair Restoration Visualizer
// Hit GET /api/test to run a full health check before going live
//
// Checks:
//   1. Is OPENROUTER_API_KEY set and correctly formatted?
//   2. Can we reach OpenRouter?
//   3. Is the image generation model available on this account?
//   4. Is the vision/analysis model available on this account?
//   5. Does a minimal text-only call work? (checks billing/quota)
//   6. Does a minimal image generation call work? (end-to-end smoke test)

const IMAGE_MODEL = 'google/gemini-3.1-flash-image-preview';
const VISION_MODEL = 'google/gemini-2.5-flash';
const TEXT_MODEL = 'google/gemini-2.5-flash';

// Tiny 1×1 white pixel PNG — used for image gen smoke test without needing a real photo
const TINY_PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwADhQGAWjR9awAAAABJRU5ErkJggg==';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const key = process.env.OPENROUTER_API_KEY;

  const report = {
    timestamp: new Date().toISOString(),
    service: 'Hair Restoration Visualizer — Diagnostic',
    models: {
      image_generation: IMAGE_MODEL,
      vision_analysis: VISION_MODEL,
      spec_lock_text: TEXT_MODEL,
    },
    key_set: !!key,
    key_prefix: key ? `${key.slice(0, 10)}...` : null,
    steps: {},
  };

  // ── Step 1: API key present and plausibly formatted ──────────────────────
  if (!key) {
    report.steps.key_check = {
      ok: false,
      error: 'OPENROUTER_API_KEY is not set in environment variables.',
      fix: 'Add OPENROUTER_API_KEY=sk-or-... to your .env file or Vercel environment settings.',
    };
    report.verdict = '❌ Cannot proceed — API key missing.';
    return res.status(200).json(report);
  }

  if (!key.startsWith('sk-or-')) {
    report.steps.key_check = {
      ok: false,
      error: `Key does not start with "sk-or-" — may be invalid. Got prefix: ${key.slice(0, 8)}`,
      fix: 'Verify you are using an OpenRouter API key, not an OpenAI or other provider key.',
    };
  } else {
    report.steps.key_check = { ok: true, note: 'Key format looks correct.' };
  }

  // ── Step 2: Fetch available models from OpenRouter ───────────────────────
  try {
    const modelsRes = await fetch('https://openrouter.ai/api/v1/models', {
      headers: { Authorization: `Bearer ${key}` },
    });

    if (!modelsRes.ok) {
      report.steps.models_list = {
        ok: false,
        http_status: modelsRes.status,
        error: 'Could not fetch models list — key may be invalid or account suspended.',
      };
    } else {
      const modelsData = await modelsRes.json();
      const allIds = modelsData?.data?.map(m => m.id) || [];

      const imageModelAvailable = allIds.includes(IMAGE_MODEL);
      const visionModelAvailable = allIds.includes(VISION_MODEL);
      const textModelAvailable = allIds.includes(TEXT_MODEL);

      report.steps.models_list = {
        ok: imageModelAvailable && visionModelAvailable && textModelAvailable,
        total_models_available: allIds.length,
        image_generation_model: { id: IMAGE_MODEL, available: imageModelAvailable },
        vision_analysis_model: { id: VISION_MODEL, available: visionModelAvailable },
        spec_lock_text_model: { id: TEXT_MODEL, available: textModelAvailable },
        fix: (!imageModelAvailable || !visionModelAvailable || !textModelAvailable)
          ? 'One or more required models are not available on your plan. Check your OpenRouter credits and model access.'
          : null,
      };
    }
  } catch (e) {
    report.steps.models_list = {
      ok: false,
      error: `Network error fetching models: ${e.message}`,
    };
  }

  // ── Step 3: Text-only smoke test (billing / quota check) ─────────────────
  try {
    const textRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'Hair Restoration Visualizer - Test',
      },
      body: JSON.stringify({
        model: TEXT_MODEL,
        messages: [{ role: 'user', content: 'Reply with one word: ready' }],
        max_tokens: 10,
      }),
    });

    const textData = await textRes.json().catch(() => ({}));
    const textReply = textData?.choices?.[0]?.message?.content?.trim() || '';

    report.steps.text_call = {
      ok: textRes.ok && textReply.length > 0,
      http_status: textRes.status,
      model_replied: textReply.length > 0,
      reply_preview: textReply.slice(0, 40) || null,
      error: !textRes.ok ? (textData?.error?.message || `HTTP ${textRes.status}`) : null,
      fix: !textRes.ok
        ? 'Text call failed. Check your OpenRouter credits — account may be out of funds.'
        : null,
    };
  } catch (e) {
    report.steps.text_call = {
      ok: false,
      error: `Network error: ${e.message}`,
    };
  }

  // ── Step 4: Vision model smoke test (analyze.js path) ────────────────────
  try {
    const visionRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'Hair Restoration Visualizer - Test',
      },
      body: JSON.stringify({
        model: VISION_MODEL,
        messages: [{
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: TINY_PNG } },
            { type: 'text', text: 'Describe this image in 5 words or fewer.' },
          ],
        }],
        max_tokens: 20,
      }),
    });

    const visionData = await visionRes.json().catch(() => ({}));
    const visionReply = visionData?.choices?.[0]?.message?.content?.trim() || '';

    report.steps.vision_call = {
      ok: visionRes.ok && visionReply.length > 0,
      http_status: visionRes.status,
      model: VISION_MODEL,
      model_replied: visionReply.length > 0,
      reply_preview: visionReply.slice(0, 60) || null,
      error: !visionRes.ok ? (visionData?.error?.message || `HTTP ${visionRes.status}`) : null,
      fix: !visionRes.ok
        ? `Vision model call failed. Verify ${VISION_MODEL} is accessible on your account.`
        : null,
    };
  } catch (e) {
    report.steps.vision_call = {
      ok: false,
      error: `Network error: ${e.message}`,
    };
  }

  // ── Step 5: Image generation smoke test (generate.js path) ───────────────
  try {
    const genRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'Hair Restoration Visualizer - Test',
      },
      body: JSON.stringify({
        model: IMAGE_MODEL,
        modalities: ['image', 'text'],
        messages: [{
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: TINY_PNG } },
            { type: 'text', text: 'Add a small red dot to the centre of this image.' },
          ],
        }],
        max_tokens: 512,
      }),
    });

    const genStatus = genRes.status;
    const genData = await genRes.json().catch(() => ({}));
    const msg = genData?.choices?.[0]?.message;

    // Check all possible image return locations
    const gotImageInImages = Array.isArray(msg?.images) && msg.images.length > 0;
    const gotImageInContent =
      Array.isArray(msg?.content) &&
      msg.content.some(b => b?.type === 'image_url' || (b?.type === 'image' && b?.source?.data));
    const gotImageInString =
      typeof msg?.content === 'string' &&
      (msg.content.startsWith('data:image') || msg.content.startsWith('http'));
    const gotImage = gotImageInImages || gotImageInContent || gotImageInString;

    report.steps.image_generation_call = {
      ok: genRes.ok && gotImage,
      http_status: genStatus,
      model: IMAGE_MODEL,
      got_image: gotImage,
      image_locations_checked: {
        msg_images_array: gotImageInImages,
        msg_content_array: gotImageInContent,
        msg_content_string: gotImageInString,
      },
      message_keys: msg ? Object.keys(msg) : null,
      images_count: msg?.images?.length ?? 0,
      content_preview: typeof msg?.content === 'string' ? msg.content.slice(0, 80) : null,
      error: !genRes.ok ? (genData?.error?.message || `HTTP ${genStatus}`) : null,
      fix: !genRes.ok
        ? `Image generation model failed. Check if ${IMAGE_MODEL} is available and your account has sufficient credits.`
        : !gotImage
          ? 'API call succeeded but returned no image. The model may have responded with text only. Check OpenRouter modalities support.'
          : null,
    };
  } catch (e) {
    report.steps.image_generation_call = {
      ok: false,
      error: `Network error: ${e.message}`,
    };
  }

  // ── Final verdict ─────────────────────────────────────────────────────────
  const allSteps = Object.values(report.steps);
  const allOk = allSteps.every(s => s.ok);
  const failedStep = allSteps.find(s => !s.ok);

  report.verdict = allOk
    ? '✅ All checks passed — Hair Restoration Visualizer is ready to use'
    : `❌ One or more checks failed — see "steps" for details and "fix" fields for resolution`;

  report.summary = {
    total_checks: allSteps.length,
    passed: allSteps.filter(s => s.ok).length,
    failed: allSteps.filter(s => !s.ok).length,
    first_failure: failedStep
      ? Object.keys(report.steps).find(k => !report.steps[k].ok)
      : null,
  };

  return res.status(200).json(report);
}