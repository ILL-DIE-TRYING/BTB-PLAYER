/* ============================================================
   BURD PLAYER FX — FIREFLIES
   ============================================================ */

(function () {

  const COUNT      = 110;
  const TRACER_LEN = 8;

  let flies = [];
  let prevB = 0, prevM = 0, prevH = 0;

  // Bin ranges tuned to actual track analysis:
  // Bass: sub-bass only (43-65Hz, bins 2-3) — below guitar low E (82Hz)
  // Mid:  guitar body and lower harmonics (172-861Hz, bins 8-40)
  // High: upper harmonics and air (2150-10767Hz, bins 100-500)
  const BASS_LO = 2,   BASS_HI = 4;
  const MID_LO  = 8,   MID_HI  = 40;
  const HIGH_LO = 100, HIGH_HI = 500;

  function rand(lo, hi) { return lo + Math.random() * (hi - lo); }
  function randi(lo, hi) { return Math.floor(rand(lo, hi)); }

  function makeFly(COLS, ROWS) {
    const r    = Math.random();
    const band = r < 0.30 ? 0 : r < 0.65 ? 1 : 2;
    const bin  = band === 0 ? randi(BASS_LO, BASS_HI)
               : band === 1 ? randi(MID_LO,  MID_HI)
               :              randi(HIGH_LO, HIGH_HI);
    const x = rand(0, COLS);
    const y = rand(0, ROWS);
    return {
      x, y,
      angle:      rand(0, Math.PI * 2),
      speed:      rand(0.05, 0.18),
      turnBias:   rand(-0.05, 0.05),
      turnNoise:  rand(0.03, 0.12),
      vx: 0, vy: 0,
      band, bin,
      reactivity: rand(0.4, 1.0),
      size:       band === 0 ? rand(1.0, 1.7) : band === 1 ? rand(0.7, 1.1) : rand(0.45, 0.9),
      trail: Array.from({ length: TRACER_LEN }, () => ({ x, y })),
      trailIdx: 0,
    };
  }

  window.BTBPlugins = window.BTBPlugins || [];
  window.BTBPlugins.push({
    name:   'fireflies',
    label:  'Fireflies',
    sens:   1.1,
    brt:    0.90,
    mirror: false,

    init(ctx) {
      flies = Array.from({ length: COUNT }, () => makeFly(ctx.COLS, ctx.ROWS));
      prevB = prevM = prevH = 0;
    },

    draw(ctx, state) {
      const { COLS, ROWS, freq } = ctx;
      const { beat, sens } = state;

      const bassHit = beat.b > 0.28 && prevB < 0.28;
      const midHit  = beat.m > 0.25 && prevM < 0.25;
      const highHit = beat.h > 0.18 && prevH < 0.18;
      prevB = beat.b; prevM = beat.m; prevH = beat.h;

      // Hard silence gate
      let totalEnergy = 0;
      if (freq) for (let i = 1; i < 300; i++) totalEnergy += freq[i];
      totalEnergy = totalEnergy / 300 / 255;
      if (totalEnergy < 0.01) return;

      // Exact palette colors per band — A=bass B=mid C=high
      const [bH, bS] = ctx.palHSL(0.0);
      const [mH, mS] = ctx.palHSL(0.5);
      const [hH, hS] = ctx.palHSL(1.0);

      for (let i = 0; i < flies.length; i++) {
        const f = flies[i];

        // ── Steer — random walk, each fly independent ───────
        f.angle += f.turnBias + (Math.random() - 0.5) * f.turnNoise;

        // Beat: random direction, can fly off edge
        if (f.band === 0 && bassHit) {
          const a = Math.random() * Math.PI * 2;
          f.vx += Math.cos(a) * beat.b * rand(2.0, 5.0) * f.reactivity;
          f.vy += Math.sin(a) * beat.b * rand(2.0, 5.0) * f.reactivity;
          f.angle = a;
        } else if (f.band === 1 && midHit) {
          const a = Math.random() * Math.PI * 2;
          f.vx += Math.cos(a) * beat.m * rand(1.5, 4.0) * f.reactivity;
          f.vy += Math.sin(a) * beat.m * rand(1.5, 4.0) * f.reactivity;
          f.angle = a;
        } else if (f.band === 2 && highHit) {
          const a = Math.random() * Math.PI * 2;
          f.vx += Math.cos(a) * beat.h * rand(6.0, 14.0) * f.reactivity;
          f.vy += Math.sin(a) * beat.h * rand(6.0, 14.0) * f.reactivity;
          f.angle = a;
        }

        if (f.band === 2 && beat.h > 0.18) {
          f.vx += (Math.random() - 0.5) * beat.h * 0.6 * f.reactivity;
          f.vy += (Math.random() - 0.5) * beat.h * 0.6 * f.reactivity;
        }

        const drag = f.band === 0 ? 0.91 : f.band === 1 ? 0.87 : 0.79;
        const prevX = f.x, prevY = f.y;

        f.x += Math.cos(f.angle) * f.speed + f.vx;
        f.y += Math.sin(f.angle) * f.speed + f.vy;
        f.vx *= drag;
        f.vy *= drag;

        // Wrap — but allow drifting off and wrapping naturally
        if (f.x < -COLS)  f.x += COLS * 2;
        if (f.x > COLS*2) f.x -= COLS * 2;
        if (f.y < -ROWS)  f.y += ROWS * 2;
        if (f.y > ROWS*2) f.y -= ROWS * 2;
        // Gentle wrap back into view
        if (f.x < 0)     f.x += COLS;
        if (f.x >= COLS) f.x -= COLS;
        if (f.y < 0)     f.y += ROWS;
        if (f.y >= ROWS) f.y -= ROWS;

        f.trail[f.trailIdx] = { x: prevX, y: prevY };
        f.trailIdx = (f.trailIdx + 1) % TRACER_LEN;

        // ── BRIGHTNESS — this is everything ─────────────────
        // Read the fly's own FFT bin directly — no smoothing, raw value
        let binEnergy = 0;
        if (freq && f.bin < freq.length) {
          // Tiny window for slight stability but still very snappy
          const lo = Math.max(0, f.bin - 1);
          const hi = Math.min(freq.length - 1, f.bin + 1);
          for (let b = lo; b <= hi; b++) binEnergy += freq[b];
          binEnergy = (binEnergy / ((hi - lo + 1) * 255)) * sens;
        }

        // Cube it — brutal falloff. Loud = blazing. Quiet = nothing.
        // 0.8 energy → 0.51.  0.5 energy → 0.125.  0.3 energy → 0.027.
        binEnergy = Math.pow(binEnergy, 3) * 4.0;

        if (binEnergy < 0.008) continue;

        // Highs get extra multiplier — they should absolutely pop
        const lumMult = f.band === 2 ? 220 : f.band === 1 ? 110 : 95;
        const lumCap  = f.band === 2 ? 100 : 82;
        const lum = Math.min(binEnergy * f.size * lumMult, lumCap);

        if (lum < 1) continue;

        const [fH, fS] = f.band === 0 ? [bH, bS] : f.band === 1 ? [mH, mS] : [hH, hS];

        // ── Tracers ─────────────────────────────────────────
        for (let t = 0; t < TRACER_LEN; t++) {
          const idx  = (f.trailIdx - 1 - t + TRACER_LEN) % TRACER_LEN;
          const tp   = f.trail[idx];
          const fade = Math.pow(1 - (t + 1) / (TRACER_LEN + 1), 3);
          const tLum = lum * fade * 0.55;
          if (tLum < 1) break;
          const tx = Math.round(tp.x), ty = Math.round(tp.y);
          if (tx >= 0 && tx < COLS && ty >= 0 && ty < ROWS)
            ctx.setLED(tx, ty, fH, fS, tLum);
        }

        ctx.setLED(Math.round(f.x), Math.round(f.y), fH, fS, lum);
      }
    }
  });

})();
