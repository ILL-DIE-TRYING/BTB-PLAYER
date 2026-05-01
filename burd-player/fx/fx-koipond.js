/* ============================================================
   BURD PLAYER FX — KOI POND
   ============================================================ */

(function () {
  let paths = [];
  const PATH_COUNT = 12; // Fewer, more meaningful "tendrils"
  const STEPS = 15;      // Length of each tendril

  function createPath(COLS, ROWS) {
    return {
      x: Math.random() * COLS,
      y: Math.random() * ROWS,
      angle: Math.random() * Math.PI * 2,
      v: Math.random() * 0.5 + 0.2,
      hueOffset: Math.random()
    };
  }

  window.BTBPlugins = window.BTBPlugins || [];
  window.BTBPlugins.push({
    name: 'koi_pond',
    label: 'Koi Pond',
    sens: 1.0,
    brt: 1.0,
    mirror: false,

    init(ctx) {
      paths = Array.from({ length: PATH_COUNT }, () => createPath(ctx.COLS, ctx.ROWS));
    },

    draw(ctx, state) {
      const { COLS, ROWS, freq, setLED, palHSL } = ctx;
      const { beat, sens } = state;

      if (!freq) return;

      // 1. DYNAMIC COLOR BASE
      // The high-end energy shifts the entire palette's starting point
      const globalHueShift = beat.h * 0.3;

      for (let i = 0; i < paths.length; i++) {
        let p = paths[i];

        // 2. PHYSICS DRIVEN BY AUDIO
        // Mids drive the rotation/turbulence of the paths
        p.angle += (Math.random() - 0.5) * 0.5 * beat.m;
        
        // Bass drives the velocity
        const speed = p.v + (beat.b * 1.5);
        p.x += Math.cos(p.angle) * speed;
        p.y += Math.sin(p.angle) * speed;

        // Wrap around screen
        if (p.x < 0) p.x = COLS - 1; if (p.x >= COLS) p.x = 0;
        if (p.y < 0) p.y = ROWS - 1; if (p.y >= ROWS) p.y = 0;

        // 3. RENDER TENDRILLS
        // Instead of 1 pixel, we draw a trailing "ribbon"
        let currX = p.x;
        let currY = p.y;
        let currA = p.angle;

        for (let s = 0; s < STEPS; s++) {
          // Ribbon tapers and fades
          const progress = s / STEPS;
          const lum = Math.max(0, (beat.b + beat.m) * 60 * (1 - progress) * state.brt);
          
          if (lum < 1) break;

          // Color shifts along the length of the ribbon
          const [h, sat] = palHSL((p.hueOffset + globalHueShift + (progress * 0.2)) % 1.0);
          
          // Draw the main point
          setLED(Math.round(currX), Math.round(currY), h, sat, lum);
          
          // Draw a "glow" around the head of the path for extra thickness
          if (s === 0 && lum > 20) {
            setLED(Math.round(currX + 1), Math.round(currY), h, sat, lum * 0.3);
            setLED(Math.round(currX - 1), Math.round(currY), h, sat, lum * 0.3);
            setLED(Math.round(currX), Math.round(currY + 1), h, sat, lum * 0.3);
            setLED(Math.round(currX), Math.round(currY - 1), h, sat, lum * 0.3);
          }

          // Move shadow-point backwards for the tail
          currX -= Math.cos(currA) * 0.8;
          currY -= Math.sin(currA) * 0.8;
          currA += Math.sin(s + Date.now() * 0.001) * 0.1; // Add "sine-wave" wiggle to tails
        }
      }

      // 4. SUB-BASS PULSE (Subtle background glow, no flashing)
      if (beat.b > 0.6) {
        const [bgH, bgS] = palHSL((globalHueShift + 0.5) % 1.0);
        const bgLum = beat.b * 10;
        // Sample 10% of pixels for a soft "ambient" shimmer rather than a hard flash
        for (let n = 0; n < (COLS * ROWS) / 10; n++) {
          setLED(Math.floor(Math.random() * COLS), Math.floor(Math.random() * ROWS), bgH, bgS, bgLum);
        }
      }
    }
  });
})();
