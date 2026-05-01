/* ============================================================
   BURD PLAYER FX — LAVA LAMP
   Slow rising blobs of color, beat-reactive size and speed.
   Load this file to add the Lava Lamp effect.

   <script src="/burd-player/fx/fx-lavalamp.js"></script>
   <script src="/burd-player/burd-player.js"></script>
   ============================================================ */

(function () {
  const BLOB_COUNT = 6;
  let blobs = [];

  function makeBlob(ctx) {
    return {
      x:   Math.random() * ctx.COLS,
      y:   ctx.ROWS + Math.random() * 4,
      vy:  -(0.05 + Math.random() * 0.08),
      r:   2.5 + Math.random() * 3,
      t:   Math.random(),
      wob: Math.random() * Math.PI * 2,
    };
  }

  window.BTBPlugins = window.BTBPlugins || [];
  window.BTBPlugins.push({
    name:  'lavalamp',
    label: 'Lava Lamp',
    sens:  0.9,
    brt:   0.85,

    init(ctx) {
      blobs = [];
      for (let i = 0; i < BLOB_COUNT; i++) {
        const b = makeBlob(ctx);
        b.y = Math.random() * ctx.ROWS; // scatter on first load
        blobs.push(b);
      }
    },

    draw(ctx, state) {
      const { COLS, ROWS } = ctx;
      const { beat } = state;

      for (let i = 0; i < blobs.length; i++) {
        const b = blobs[i];

        b.wob += 0.04;
        b.y   += b.vy - beat.b * 0.15;
        b.x   += Math.sin(b.wob + i) * 0.12;

        if (b.x < 0)     b.x = 0;
        if (b.x >= COLS) b.x = COLS - 1;

        // Reset when off top
        if (b.y < -b.r * 2) Object.assign(b, makeBlob(ctx));

        // Draw soft circular blob
        const br = b.r + beat.m * 1.5;
        for (let dc = Math.ceil(-br); dc <= Math.ceil(br); dc++) {
          for (let dr = Math.ceil(-br); dr <= Math.ceil(br); dr++) {
            const d = Math.sqrt(dc * dc + dr * dr);
            if (d > br) continue;
            const fade = 1 - d / br;
            const lum  = fade * fade * 65;
            ctx.setLED(Math.round(b.x + dc), Math.round(b.y + dr), 0, 0, lum, b.t);
          }
        }
      }
    }
  });
})();
