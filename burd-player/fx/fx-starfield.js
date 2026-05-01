/* ============================================================
   BURD PLAYER FX — STARFIELD
   Stars fly toward you, speed up on bass hits.
   Load this file to add the Starfield effect.

   <script src="/burd-player/fx/fx-starfield.js"></script>
   <script src="/burd-player/burd-player.js"></script>
   ============================================================ */

(function () {
  let stars = [];

  window.BTBPlugins = window.BTBPlugins || [];
  window.BTBPlugins.push({
    name:  'starfield',
    label: 'Starfield',
    sens:  1.5,
    brt:   0.90,

    init(ctx) {
      stars = Array.from({ length: 280 }, () => ({
        x:  (Math.random() - 0.5) * 2,
        y:  (Math.random() - 0.5) * 2,
        z:  Math.random(),
        pz: 0,
      }));
    },

    draw(ctx, state) {
      const { COLS, ROWS, phase } = ctx;
      const { beat } = state;
      const spd = 0.003 + beat.b * 0.055 + beat.m * 0.012;
      const cx  = COLS / 2, cy = ROWS / 2;

      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        s.pz = s.z;
        s.z -= spd;
        if (s.z <= 0) {
          s.x = (Math.random() - 0.5) * 2;
          s.y = (Math.random() - 0.5) * 2;
          s.z = 1; s.pz = 1;
        }

        const sx = Math.round(cx + (s.x / s.z) * (COLS * 0.5));
        const sy = Math.round(cy + (s.y / s.z) * (ROWS * 0.5));

        if (sx < 0 || sx >= COLS || sy < 0 || sy >= ROWS) {
          s.z = Math.max(0.01, s.z - spd * 2);
          continue;
        }

        const brt = Math.pow(1 - s.z, 1.8);
        const lum = Math.min(10 + brt * 72, 75);
        const t   = ((i * 0.618) + phase * 0.05) % 1;

        if (spd > 0.015) {
          const opx = Math.round(cx + (s.x / s.pz) * (COLS * 0.5));
          const opy = Math.round(cy + (s.y / s.pz) * (ROWS * 0.5));
          if (opx >= 0 && opx < COLS && opy >= 0 && opy < ROWS) {
            ctx.setLED(opx, opy, 0, 0, lum * 0.35, t);
          }
        }

        ctx.setLED(sx, sy, 0, 0, lum, t);
      }
    }
  });
})();
