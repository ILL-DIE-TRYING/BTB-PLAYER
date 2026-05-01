/* ============================================================
   BURD PLAYER FX — NEBULA DRIFT
   ============================================================ */

(function () {
  let clouds = [];
  const CLOUD_COUNT = 8; // Fewer, larger "masses" for a gaseous look

  function createCloud(COLS, ROWS) {
    return {
      x: Math.random() * COLS,
      y: Math.random() * ROWS,
      // Slow, drifting velocities
      vx: (Math.random() - 0.5) * 0.1,
      vy: (Math.random() - 0.5) * 0.1,
      size: Math.random() * 10 + 15, // Large radius
      huePtr: Math.random(),
      pulseOffset: Math.random() * Math.PI * 2
    };
  }

  window.BTBPlugins = window.BTBPlugins || [];
  window.BTBPlugins.push({
    name: 'nebula_drift',
    label: 'Nebula Drift',
    sens: 1.0,
    brt: 0.9,
    mirror: false,

    init(ctx) {
      clouds = Array.from({ length: CLOUD_COUNT }, () => createCloud(ctx.COLS, ctx.ROWS));
    },

    draw(ctx, state) {
      const { COLS, ROWS, freq, setLED, palHSL } = ctx;
      const { beat, sens } = state;

      if (!freq) return;

      // 1. UPDATE CLOUD POSITIONS
      for (let c of clouds) {
        // Drift is influenced by the "wind" of the music
        c.x += c.vx + (beat.m * 0.05);
        c.y += c.vy + (beat.b * 0.05);

        // Gentle wrapping
        if (c.x < -c.size) c.x = COLS + c.size;
        if (c.x > COLS + c.size) c.x = -c.size;
        if (c.y < -c.size) c.y = ROWS + c.size;
        if (c.y > ROWS + c.size) c.y = -c.size;
      }

      // 2. RENDER THE GASEOUS LAYER
      for (let x = 0; x < COLS; x++) {
        for (let y = 0; y < ROWS; y++) {
          let totalLum = 0;
          let rH = 0, rS = 0;

          // Each pixel calculates its "density" based on proximity to cloud centers
          for (let i = 0; i < clouds.length; i++) {
            const c = clouds[i];
            const dx = x - c.x;
            const dy = y - c.y;
            const distSq = dx * dx + dy * dy;
            
            // Dynamic radius swells with bass
            const dynamicSize = c.size * (1 + beat.b * 0.5);
            const radiusSq = dynamicSize * dynamicSize;

            if (distSq < radiusSq) {
              // Gaussian-style falloff for soft edges
              const strength = Math.pow(1 - Math.sqrt(distSq) / dynamicSize, 2);
              
              // High frequencies "ionize" the gas (brightness boost)
              const ionization = beat.h * 0.4;
              totalLum += strength * (40 + ionization * 100);
              
              // Take the hue from the most dominant cloud at this pixel
              if (strength > 0.4) {
                [rH, rS] = palHSL((c.huePtr + beat.h * 0.2) % 1.0);
              }
            }
          }

          // Apply final brightness and a subtle "starry" grain
          if (totalLum > 1) {
            const finalLum = Math.min(totalLum * state.brt, 100);
            setLED(x, y, rH, rS, finalLum);
          }
        }
      }
    }
  });
})();
