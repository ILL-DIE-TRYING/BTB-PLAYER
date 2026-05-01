/* ============================================================
   BURD PLAYER FX — PLASMA
   Smooth animated colour waves that morph with the music.
   Load this file to add the Plasma effect.

   <script src="/burd-player/fx/fx-plasma.js"></script>
   <script src="/burd-player/burd-player.js"></script>
   ============================================================ */

window.BTBPlugins = window.BTBPlugins || [];
window.BTBPlugins.push({
  name:  'plasma',
  label: 'Plasma',
  sens:  1.0,
  brt:   0.85,

  init(ctx) {},

  draw(ctx, state) {
    const { COLS, ROWS, phase } = ctx;
    const { beat } = state;
    const speed = 1 + beat.b * 3 + beat.m * 1.5;

    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < ROWS; r++) {
        const nx = c / COLS;
        const ny = r / ROWS;

        const v =
          Math.sin(nx * 6 + phase * speed) +
          Math.sin(ny * 5 + phase * speed * 0.7) +
          Math.sin((nx + ny) * 4 + phase * speed * 0.5) +
          Math.sin(Math.sqrt(
            (nx - 0.5 + Math.sin(phase * 0.4) * 0.3) ** 2 +
            (ny - 0.5 + Math.cos(phase * 0.3) * 0.3) ** 2
          ) * 8);

        const t   = (v / 4 + 1) / 2;
        const lum = 15 + t * 60 + beat.b * 12;
        ctx.setLED(c, r, 0, 0, Math.min(lum, 78), t);
      }
    }
  }
});
