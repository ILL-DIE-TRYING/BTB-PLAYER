/* ============================================================
   BURD PLAYER FX — RAIN
   Glowing droplets fall from the top, triggered by beats.
   Load this file to add the Rain effect.

   <script src="/burd-player/fx/fx-rain.js"></script>
   <script src="/burd-player/burd-player.js"></script>
   ============================================================ */

(function () {
  let rain = [];

  window.BTBPlugins = window.BTBPlugins || [];
  window.BTBPlugins.push({
    name:  'rain',
    label: 'Rain',
    sens:  1.1,
    brt:   0.90,

    init(ctx) {
      rain = Array.from({ length: ctx.COLS }, () => ({
        y: -10, speed: 0, active: false, bright: 0, t: 0
      }));
    },

    draw(ctx, state) {
      const { COLS, ROWS, colT } = ctx;
      const { beat } = state;

      // Ensure rain array matches current COLS
      while (rain.length < COLS) rain.push({ y: -10, speed: 0, active: false, bright: 0, t: 0 });

      // Beat-triggered drops
      if (beat.b > 0.3) {
        const n = Math.max(1, Math.round(beat.b * COLS * 0.18));
        for (let i = 0; i < n; i++) {
          const c = Math.floor(Math.random() * COLS);
          if (!rain[c].active) {
            rain[c] = { active: true, y: 0, speed: 0.4 + beat.b * 1.8, bright: 0.6 + beat.b * 0.4, t: colT(c) };
          }
        }
      }

      // Ambient random drops
      if (Math.random() < 0.04) {
        const c = Math.floor(Math.random() * COLS);
        if (!rain[c].active) {
          rain[c] = { active: true, y: 0, speed: 0.3 + Math.random() * 0.4, bright: 0.4, t: colT(c) };
        }
      }

      for (let c = 0; c < COLS; c++) {
        if (!rain[c].active) continue;
        rain[c].y += rain[c].speed + beat.m * 0.6;
        const r = Math.floor(rain[c].y);
        if (r >= ROWS) { rain[c].active = false; continue; }
        for (let t2 = 0; t2 < 12; t2++) {
          const tr = r - t2;
          if (tr < 0) continue;
          const a = Math.pow(1 - t2 / 12, 1.4);
          ctx.setLED(c, tr, 0, 0, Math.max(3, a * rain[c].bright * 70), rain[c].t);
        }
      }
    }
  });
})();
