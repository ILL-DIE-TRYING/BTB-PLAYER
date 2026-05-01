/* ============================================================
   BURD PLAYER FX — NEON RIOT
   ============================================================ */

(function () {
  let bars = [];
  let sparks = [];
  const SPARK_COUNT = 150;

  function createSpark(x, y, h, s) {
    return {
      x, y,
      vx: (Math.random() - 0.5) * 1.5,
      vy: (Math.random() - 0.8) * 2.0,
      h, s,
      life: 1.0,
      decay: Math.random() * 0.05 + 0.02
    };
  }

  window.BTBPlugins = window.BTBPlugins || [];
  window.BTBPlugins.push({
    name: 'neon_riot',
    label: 'Neon Riot',
    sens: 1.2,
    brt: 1.0,
    mirror: true,

    init(ctx) {
      bars = Array.from({ length: ctx.COLS }, () => ({
        height: 0,
        targetHeight: 0,
        peak: 0,
        peakTimer: 0
      }));
      sparks = [];
    },

    draw(ctx, state) {
      const { COLS, ROWS, freq, setLED, palHSL } = ctx;
      const { beat, sens } = state;

      if (!freq) return;

      // 1. Process Bars
      const binStep = Math.floor(freq.length / 2 / COLS);
      
      for (let x = 0; x < COLS; x++) {
        const b = bars[x];
        // Sample frequency for this column
        let val = 0;
        for (let j = 0; j < binStep; j++) {
          val += freq[x * binStep + j] || 0;
        }
        val = (val / binStep / 255) * sens;

        b.targetHeight = val * ROWS;
        
        // Smoothing logic
        if (b.targetHeight > b.height) {
          b.height = b.targetHeight;
          // Trigger sparks if the hit is violent enough
          if (val > 0.7 && sparks.length < SPARK_COUNT) {
            const [h, s] = palHSL(x / COLS);
            for(let i=0; i<3; i++) sparks.push(createSpark(x, ROWS - b.height, h, s));
          }
        } else {
          b.height *= 0.85; // Rapid falloff
        }

        // Draw the vertical bar
        const [h, s] = palHSL(x / COLS);
        for (let y = 0; y < b.height; y++) {
          const lum = (y / b.height) * 80 * state.brt;
          setLED(x, ROWS - 1 - y, h, s, lum);
        }

        // Draw a "cap" pixel at the peak
        if (b.height > 1) {
          setLED(x, Math.round(ROWS - 1 - b.height), h, s, 100 * state.brt);
        }
      }

      // 2. Process Sparks (Physics)
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.x += s.vx;
        s.y += s.vy;
        s.vy += 0.15; // Gravity
        s.life -= s.decay;

        if (s.life <= 0 || s.x < 0 || s.x >= COLS || s.y >= ROWS) {
          sparks.splice(i, 1);
          continue;
        }

        const lum = s.life * 100 * state.brt;
        setLED(Math.round(s.x), Math.round(s.y), s.h, s.s, lum);
      }

      // 3. Kick Flash (Background Reactive Glow)
      if (beat.b > 0.4) {
        const [kh, ks] = palHSL(0.1);
        for (let i = 0; i < COLS; i += 4) {
          for (let j = 0; j < ROWS; j += 4) {
             setLED(i, j, kh, ks, beat.b * 15);
          }
        }
      }
    }
  });
})();
