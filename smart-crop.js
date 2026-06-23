/* =========================================================================
   THE CONTRIBUTOR — Smart Image Cropping (face-detection + subject fallback)
   ─────────────────────────────────────────────────────────────────────────
   Uses pico.js — a tiny (~200KB), classical face-detection library by
   Nenad Markuš. Runs entirely in the browser, no model downloads, no
   neural-net inference, no skin-tone heuristics. Loaded from jsDelivr.

   On each <img> we monitor:
     1) Load image into a 320×320 canvas (preserving aspect ratio).
     2) Run pico's cascade. If a face is detected, set object-position to
        center on the face's vertical center.
     3) Fall back to a variance-based subject crop if pico finds no faces.

   Results are cached per src in sessionStorage to make navigation snappy.

   This module attaches itself to window.SmartCrop with:
     - SmartCrop.apply(img)         — crop a single img
     - SmartCrop.applyAll(root)     — crop all .feature .img + article.story img inside root
     - SmartCrop.watch(root)        — applyAll + MutationObserver
   ========================================================================= */
(function () {
  'use strict';

  const CACHE_KEY = 'crop10:';
  let picoLoaded = null;       // promise resolving to the loaded pico cascade
  let detectFn = null;          // wrapped pico.run_cascade closure

  /* -------- load pico.js + face cascade -------- */
  function loadPico() {
    if (picoLoaded) return picoLoaded;

    picoLoaded = (async () => {
      if (!window.pico || !window.pico.unpack_cascade) {
        throw new Error('pico.js script tag missing — add <script src="assets/pico.js"></script> before smart-crop.js');
      }
      // Fetch the local face cascade
      const res = await fetch('assets/facefinder');
      if (!res.ok) throw new Error('cascade fetch failed: ' + res.status);
      const buf = await res.arrayBuffer();
      const bytes = new Int8Array(buf);
      detectFn = window.pico.unpack_cascade(bytes);
      console.log('[smart-crop] pico ready, cascade loaded:', buf.byteLength, 'bytes');
      return detectFn;
    })().catch(err => {
      console.warn('[smart-crop] face detection unavailable, falling back to variance:', err);
      return null;
    });

    return picoLoaded;
  }

  /* -------- subject fallback (no face) -------- */
  function detectSubject(data, w, h) {
    const rowScore = new Array(h);
    for (let y = 0; y < h; y++) {
      let lumSum = 0, lumSq = 0, satSum = 0;
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const r = data[i], g = data[i + 1], b = data[i + 2];
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        lumSum += lum; lumSq += lum * lum;
        const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
        satSum += mx === 0 ? 0 : (mx - mn) / mx;
      }
      const mean = lumSum / w;
      rowScore[y] = (lumSq / w - mean * mean) * 0.6 + (satSum / w) * 150;
    }
    // smooth + mid-bias
    const half = Math.min(7, Math.floor(h / 14));
    let bestY = h / 2, bestScore = -1;
    for (let y = 0; y < h; y++) {
      let s = 0, n = 0;
      for (let k = Math.max(0, y - half); k <= Math.min(h - 1, y + half); k++) { s += rowScore[k]; n++; }
      const smooth = s / n;
      const dist = Math.abs(y - h / 2) / (h / 2);
      const score = smooth * (1 - dist * 0.15);
      if (score > bestScore) { bestScore = score; bestY = y; }
    }
    return Math.max(10, Math.min(85, Math.round((bestY / h) * 100)));
  }

  /* -------- core: analyze one image, compute crop position -------- */
  async function analyzeImage(img) {
    const SAMPLE = 320;
    const naturalW = img.naturalWidth, naturalH = img.naturalHeight;
    if (!naturalW || !naturalH) return null;

    // Preserve aspect ratio when sampling into the analysis canvas
    let cw, ch;
    if (naturalW >= naturalH) { cw = SAMPLE; ch = Math.max(1, Math.round(SAMPLE * naturalH / naturalW)); }
    else                       { ch = SAMPLE; cw = Math.max(1, Math.round(SAMPLE * naturalW / naturalH)); }

    const canvas = document.createElement('canvas');
    canvas.width = cw; canvas.height = ch;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    try {
      ctx.drawImage(img, 0, 0, cw, ch);
    } catch (e) { return null; }

    let rgba;
    try { rgba = ctx.getImageData(0, 0, cw, ch).data; }
    catch (e) {
      // Cross-origin tainted — best we can do is center
      return { x: 50, y: 50 };
    }

    // Try face detection first
    const detector = await loadPico();
    if (detector && window.pico) {
      try {
        // pico needs a grayscale buffer
        const gray = new Uint8Array(cw * ch);
        for (let i = 0, p = 0; i < rgba.length; i += 4, p++) {
          gray[p] = (rgba[i] * 0.299 + rgba[i + 1] * 0.587 + rgba[i + 2] * 0.114) | 0;
        }

        const params = {
          shiftfactor: 0.05,    // finer sliding window — finds smaller/subtler faces
          minsize: Math.max(20, Math.floor(Math.min(cw, ch) * 0.06)),
          maxsize: 1000,
          scalefactor: 1.05     // smaller scale step — catches faces between sizes
        };

        const image = { pixels: gray, nrows: ch, ncols: cw, ldim: cw };
        let detections = window.pico.run_cascade(image, detector, params);
        detections = window.pico.cluster_detections(detections, 0.2);
        // Use a LOW confidence floor (1.5) so subtle real faces survive, but
        // PICK by area-weighted score — large detections beat tiny ones.
        // This stops cartoon eyes / pattern artifacts (which score high but
        // are small) from outranking the actual face in the photo.
        const faces = detections.filter(d => d[3] > 1.5);

        if (faces.length) {
          // Rank by area-weighted score so the real subject beats tiny pattern
          // artifacts (cartoon eyes, background texture).
          faces.sort((a, b) => (b[2] * b[2] * b[3]) - (a[2] * a[2] * a[3]));
          const [, , bsize, bscore] = faces[0];

          // Frame the GROUP: average qualifying faces (those comparable to the
          // strongest) weighted by size²·score, so a row of people is centered
          // between them instead of snapping to one face. A lone face collapses
          // to a single point. This also gives us a horizontal center, not just
          // vertical — so off-center subjects are actually centered now.
          let wSum = 0, rSum = 0, cSum = 0, sSum = 0, used = 0;
          for (const [r, c, size, score] of faces) {
            if (size < bsize * 0.45 || score < bscore * 0.4) continue;
            const w = size * size * score;
            wSum += w; rSum += r * w; cSum += c * w; sSum += size * w; used++;
          }
          const cr = wSum ? rSum / wSum : faces[0][0];
          const cc = wSum ? cSum / wSum : faces[0][1];
          const cs = wSum ? sSum / wSum : bsize;

          // Pull up ~25% of face height so eyes/forehead land near the upper
          // rule-of-thirds line; center horizontally on the face(s).
          const focusY = cr - cs * 0.25;
          const yPercent = Math.max(10, Math.min(85, Math.round((focusY / ch) * 100)));
          const xPercent = Math.max(12, Math.min(88, Math.round((cc / cw) * 100)));
          console.log('[smart-crop] faces=' + faces.length + ' used=' + used +
                      ' center=(' + Math.round(cc) + ',' + Math.round(cr) + ')/' +
                      cw + 'x' + ch + ' → ' + xPercent + '% ' + yPercent + '%');
          return { x: xPercent, y: yPercent };
        }
      } catch (e) {
        console.warn('[smart-crop] pico run failed:', e);
      }
    }

    // No face → subject fallback (vertical only; horizontal stays centered)
    return { x: 50, y: detectSubject(rgba, cw, ch) };
  }

  /* -------- public API -------- */
  async function apply(img) {
    if (!img || !img.src || img.dataset.cropApplied === '1') return;
    // Cover-story scans are cropped centred on purpose (masthead clipped) — never
    // let face-detection move the frame back toward "The Contributor" masthead.
    if (img.hasAttribute('data-no-smartcrop') || img.classList.contains('is-cover')) return;
    img.dataset.cropApplied = '1';

    const cached = sessionStorage.getItem(CACHE_KEY + img.src);
    if (cached) { img.style.objectPosition = cached; return; }

    const run = async () => {
      try {
        const res = await analyzeImage(img);
        if (res == null) return;
        // Back-compat: a bare number means "vertical only, center horizontally".
        const pos = (typeof res === 'number') ? `50% ${res}%` : `${res.x}% ${res.y}%`;
        img.style.objectPosition = pos;
        try { sessionStorage.setItem(CACHE_KEY + img.src, pos); } catch (e) {}
      } catch (e) { /* swallow */ }
    };

    if (img.complete && img.naturalWidth) run();
    else img.addEventListener('load', run, { once: true });
  }

  function applyAll(root) {
    // Crop story cards, both feature images (hero + second feature now both use
    // object-fit:cover), and article images so faces stay centred in the frame.
    (root || document).querySelectorAll('.feature .img, article.story img, .article-prose img, .featured img, .related-thumb img, .team-photo img, .mm-media img').forEach(apply);
  }

  function watch(root) {
    const target = root || document.body;
    applyAll(target);
    new MutationObserver(() => applyAll(target)).observe(target, { childList: true, subtree: true });
  }

  window.SmartCrop = { apply, applyAll, watch };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => watch(document.body));
  } else {
    watch(document.body);
  }
})();
