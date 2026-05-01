/* ============================================================
   BURD PLAYER FX — FRACTAL BEYOND
   ============================================================ */

(function () {
  let time = 0;

  window.BTBPlugins = window.BTBPlugins || [];
  window.BTBPlugins.push({
    name: 'fractal_beyond',
    label: 'Fractal Beyond',
    sens: 1.5,
    brt: 1.0,
    mirror: false,

    init(ctx) {
      time = 0;
    },

    draw(ctx, state) {
      const { COLS, ROWS, setLED, palHSL } = ctx;
      const { beat, sens } = state;

      if (!ctx.freq) return;

      // 1. DYNAMIC COORDINATE WARPING
      // The whole coordinate space "breaths" with the bass
      time += 0.02 + (beat.b * 0.08);
      
      const zoom = 0.5 + (beat.b * 0.1);
      const cx = -0.745 + (Math.sin(time * 0.5) * 0.01);
      const cy = 0.113 + (beat.h * 0.05);

      const maxIter = 32; // Higher iterations for better smoke resolution
      const centerX = COLS / 2;
      const centerY = ROWS / 2;

      for (let x = 0; x < COLS; x++) {
        for (let y = 0; y < ROWS; y++) {
          // 2. STRETCH TO SCREEN
          let zx = (x - centerX) / (COLS * zoom);
          let zy = (y - centerY) / (ROWS * zoom);

          // Audio-reactive distortion inside the loop
          const dist = (beat.m * 0.5);
          zx += Math.sin(zy * 2.0 + time) * dist;
          zy += Math.cos(zx * 2.0 - time) * dist;

          let i = 0;
          let zx2 = zx * zx;
          let zy2 = zy * zy;

          while (zx2 + zy2 < 4 && i < maxIter) {
            zy = 2 * zx * zy + cy;
            zx = zx2 - zy2 + cx;
            zx2 = zx * zx;
            zy2 = zy * zy;
            i++;
          }

          // 3. SMOKE TEXTURE LOGIC
          if (i > 0) {
            // Using a smooth iteration count to prevent flat color blobs
            const logIter = i + 1 - Math.log(Math.log(zx2 + zy2) / Math.log(2)) / Math.log(2);
            const norm = logIter / maxIter;

            // Density map: Interior moves like smoke
            const smoke = Math.sin(norm * 10 + time * 2) * 0.5 + 0.5;
            
            // Brightness tied to audio energy + smoke density
            let lum = (smoke * 60 + (beat.b * 40)) * state.brt * sens;
            
            // Threshold to keep it from becoming a solid block
            if (i < maxIter && lum > 10) {
              const huePos = (norm + (beat.h * 0.4) + (time * 0.1)) % 1.0;
              const [h, s] = palHSL(huePos);
              
              // High-frequency "sparkle"
              if (beat.h > 0.7 && smoke > 0.8) lum = 100;

              setLED(x, y, h, s, Math.min(lum, 100));
            }
          }
        }
      }
    }
  });
})();
