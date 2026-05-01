/* ============================================================
   BURD PLAYER FX — RINGS
   Frequency bands arranged as concentric rotating circles.
   Load this file to add the Rings effect.

   <script src="/burd-player/fx/fx-rings.js"></script>
   <script src="/burd-player/burd-player.js"></script>
   ============================================================ */

window.BTBPlugins = window.BTBPlugins || [];
window.BTBPlugins.push({
  name:  'rings',
  label: 'Rings',
  sens:  1.1,
  brt:   0.90,

  init(ctx) {},

  draw(ctx, state) {
    const { COLS, ROWS, freq, phase, colT } = ctx;
    const { beat, sens } = state;
    const cx    = COLS / 2;
    const cy    = ROWS / 2;
    const maxR  = Math.min(cx, cy) - 0.5;
    const RINGS = 5;

    for (let ring = 0; ring < RINGS; ring++) {
      const radius = ((ring + 1) / RINGS) * maxR;
      const binLo  = Math.floor(ring / RINGS * 60);
      const binHi  = Math.floor((ring + 1) / RINGS * 60);

      let energy = 0;
      if (freq) {
        for (let b = binLo; b < binHi && b < freq.length; b++) energy += freq[b];
      }
      energy = Math.min((energy / Math.max(1, binHi - binLo)) / 255 * sens, 1);

      const circumference = Math.ceil(2 * Math.PI * radius);
      const dir = ring % 2 === 0 ? 0.3 : -0.3;

      for (let a = 0; a < circumference; a++) {
        const angle = (a / circumference) * Math.PI * 2 + phase * dir;
        const c = Math.round(cx + Math.cos(angle) * radius * energy);
        const r = Math.round(cy + Math.sin(angle) * radius * energy * (ROWS / COLS));
        const t = colT(((angle / (Math.PI * 2) + 1) % 1) * COLS);
        const lum = 20 + energy * 55 + (ring === 0 ? beat.b * 20 : 0);
        ctx.setLED(c, r, 0, 0, lum, t);
      }
    }
  }
});
