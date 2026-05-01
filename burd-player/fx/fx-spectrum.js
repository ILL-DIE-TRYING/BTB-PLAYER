/* ============================================================
   BURD PLAYER FX — SPECTRUM
   Classic frequency bars rising from the bottom.
   Load this file to add the Spectrum effect.

   <script src="/burd-player/fx/fx-spectrum.js"></script>
   <script src="/burd-player/burd-player.js"></script>
   ============================================================ */

(function () {
  const pkH = [];

  window.BTBPlugins = window.BTBPlugins || [];
  window.BTBPlugins.push({
    name:  'spectrum',
    label: 'Spectrum',
    sens:  1.1,
    brt:   0.90,

    init(ctx) {
      pkH.length = 0;
      for (let i = 0; i < ctx.COLS; i++) pkH[i] = 0;
    },

    draw(ctx, state) {
      const { COLS, ROWS, freq, colT } = ctx;
      const { beat, sens } = state;
      const BL = freq ? freq.length : 0;
      const maxBin = Math.floor(BL * 0.72);

      // Ensure pkH is sized for current COLS
      while (pkH.length < COLS) pkH.push(0);

      for (let c = 0; c < COLS; c++) {
        const lo  = Math.floor(c / COLS * maxBin);
        const hi  = Math.floor((c + 1) / COLS * maxBin) + 1;
        let sum = 0;
        const cnt = Math.max(1, hi - lo);
        for (let i = lo; i < hi && i < BL; i++) sum += freq[i];

        const raw    = (sum / cnt) / 255;
        const bBoost = c < COLS * 0.12 ? beat.b * 0.35
                     : c < COLS * 0.4  ? beat.m * 0.20
                     :                   beat.h * 0.12;
        const v = Math.min(raw * sens + bBoost, 1);
        const h = Math.round(v * ROWS);
        const t = colT(c);

        for (let r = ROWS - 1; r >= ROWS - h; r--) {
          const frac = (ROWS - r) / Math.max(h, 1);
          ctx.setLED(c, r, 0, 0, 22 + frac * 52, t);
        }

        pkH[c] = Math.max((pkH[c] || 0) * 0.96, h);
        const pr = ROWS - Math.round(pkH[c]);
        if (pr >= 0 && pr < ROWS && pkH[c] > 2) ctx.setLED(c, pr, 0, 0, 75, t);
      }
    }
  });
})();
