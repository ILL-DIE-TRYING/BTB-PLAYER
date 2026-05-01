/* ============================================================
   BURD PLAYER FX — WAVEFORM
   Audio waveform displayed as a center-line pulse.
   Load this file to add the Waveform effect.

   <script src="/burd-player/fx/fx-waveform.js"></script>
   <script src="/burd-player/burd-player.js"></script>
   ============================================================ */

window.BTBPlugins = window.BTBPlugins || [];
window.BTBPlugins.push({
  name:  'waveform',
  label: 'Waveform',
  sens:  1.2,
  brt:   0.90,

  init(ctx) {},

  draw(ctx, state) {
    const { COLS, ROWS, waveD, phase, colT } = ctx;
    const { beat, sens } = state;
    const BL = waveD ? waveD.length : 0;
    const mid   = Math.floor(ROWS / 2);
    const punch = 1 + beat.b * 2.5 + beat.m;

    for (let c = 0; c < COLS; c++) {
      const idx = Math.floor(c / COLS * BL);
      let acc = 0;
      const W = Math.max(1, Math.floor(BL / COLS));
      for (let k = 0; k < W && idx + k < BL; k++) acc += waveD[idx + k];

      const v = (acc / W / 128 - 1) * sens * punch;
      const h = Math.min(Math.abs(v) * (ROWS * 0.48), ROWS / 2 - 1) | 0;
      const t = colT(c);

      for (let i = 0; i <= h; i++) {
        const lum = 16 + (i / Math.max(h, 1)) * 58;
        if (v >= 0) ctx.setLED(c, mid - i, 0, 0, lum, t);
        else        ctx.setLED(c, mid + i, 0, 0, lum, t);
      }

      if (h > 1) {
        if (v >= 0) ctx.setLED(c, mid - h, 0, 0, 76, t);
        else        ctx.setLED(c, mid + h, 0, 0, 76, t);
      }

      if (beat.p > 0.1) {
        ctx.setLED(c, mid, 0, 0, Math.round(beat.p * 42), (phase * 0.08) % 1);
      }
    }
  }
});
