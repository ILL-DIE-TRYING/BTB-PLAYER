/* ============================================================
   BURD PLAYER FX — HYPERSPACE VORTEX (PURE)
   ============================================================ */

(function () {
  let angleOffset = 0;
  let ringBuffer = [];
  const MAX_RINGS = 26; // Increased depth for a smoother tunnel

  window.BTBPlugins = window.BTBPlugins || [];
  window.BTBPlugins.push({
    name: 'hyperspace_vortex',
    label: 'Hyperspace Vortex',
    sens: 1.3,
    brt: 1.1,
    mirror: false,

    init(ctx) {
      ringBuffer = Array.from({ length: MAX_RINGS }, () => new Float32Array(ctx.COLS));
      angleOffset = 0;
    },

    draw(ctx, state) {
      const { COLS, ROWS, freq, setLED, palHSL } = ctx;
      const { beat, sens } = state;

      if (!freq) return;

      // 1. ROTATIONAL MOMENTUM
      // Spin responds primarily to mids and highs for a "winding" feel
      angleOffset += 0.015 + (beat.m * 0.12) + (beat.h * 0.05);
      
      const currentFrame = new Float32Array(COLS);
      const binStep = Math.floor(freq.length / 2 / COLS);
      for (let i = 0; i < COLS; i++) {
        let val = 0;
        for (let j = 0; j < binStep; j++) val += freq[i * binStep + j] || 0;
        currentFrame[i] = (val / binStep / 255) * sens;
      }
      
      ringBuffer.unshift(currentFrame);
      if (ringBuffer.length > MAX_RINGS) ringBuffer.pop();

      const centerX = COLS / 2;
      const centerY = ROWS / 2;
      const maxRadius = Math.sqrt(centerX * centerX + centerY * centerY);

      // 2. RENDER THE TUNNEL
      for (let x = 0; x < COLS; x++) {
        for (let y = 0; y < ROWS; y++) {
          const dx = x - centerX;
          const dy = y - centerY;
          const radius = Math.sqrt(dx * dx + dy * dy);
          const angle = Math.atan2(dy, dx) + angleOffset;

          const normRadius = radius / maxRadius;
          
          // Logarithmic depth sampling (creates the 3D speed perspective)
          const ringIdx = Math.floor(Math.pow(1 - normRadius, 1.8) * (MAX_RINGS - 1));
          
          if (ringIdx < 0 || ringIdx >= ringBuffer.length) continue;

          // Map the angle to the frequency spectrum
          const angleNorm = (angle + Math.PI) / (Math.PI * 2);
          const freqIdx = Math.floor(angleNorm * (COLS - 1)) % COLS;
          const energy = ringBuffer[ringIdx][freqIdx];

          // Psychedelic color mapping based on distance from center
          const [h, s] = palHSL((normRadius + (beat.h * 0.15)) % 1.0);
          
          let lum = energy * 115 * state.brt;
          
          // Bass adds a physical "push" to the brightness from the center
          if (beat.b > 0.4) {
             lum += (1 - normRadius) * beat.b * 60;
          }

          if (lum > 1.5) {
            // Dark center "Void" effect
            const vignette = Math.min(1.0, normRadius * 3.0);
            setLED(x, y, h, s, lum * vignette);
          }
        }
      }
    }
  });
})();
