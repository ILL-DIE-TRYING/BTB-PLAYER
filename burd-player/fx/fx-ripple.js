/* ============================================================
   BURD PLAYER FX — NEBULA RIPPLE (MID-BOOST)
   Center: 24 Bass Spikes - Full Gradient
   Rings 1: Mids (400Hz-2.5kHz) - Expanded Range
   Rings 2: Highs (5.5kHz+) - Blue Shimmer
   ============================================================ */

(function () {
  let ripplesMids = [];
  let ripplesHighs = [];
  let peakBass = 1;
  let midRollingAvg = 0;
  let highRollingAvg = 0;
  let spikes = []; 
  const MAX_SPIKES = 24; 

  window.BTBPlugins = window.BTBPlugins || [];
  window.BTBPlugins.push({
    name:  'ripple',
    label: 'Ripple',
    sens:  1.1,
    brt:   0.90,

    init(ctx) {
      ripplesMids = [];
      ripplesHighs = [];
      peakBass = 1;
      midRollingAvg = 0;
      highRollingAvg = 0;
      spikes = [];
    },

    draw(ctx, state) {
      const { COLS, ROWS, phase, setLED, palHSL, freq } = ctx;
      const cx = (COLS - 1) / 2, cy = (ROWS - 1) / 2;

      if (!freq || freq.length < 64) return;

      // 1. BASS SPIKES
      const currentBass = (freq[0] + freq[1]) / 2; 
      if (currentBass > peakBass && currentBass > 20) {
        peakBass = currentBass;
        const toAdd = MAX_SPIKES - spikes.length;
        for(let n = 0; n < toAdd; n++) {
          const angle = Math.random() * Math.PI * 2;
          spikes.push({
            vx: Math.cos(angle), vy: Math.sin(angle),
            maxLen: (Math.random() * 55 + 5) * state.sens,
            progress: 0, speed: 0.12 + Math.random() * 0.1, seed: Math.random() * 100
          });
        }
      } else {
        peakBass = Math.max(60, peakBass * 0.96);
      }

      for (let i = spikes.length - 1; i >= 0; i--) {
        let s = spikes[i];
        s.progress += s.speed;
        if (s.progress >= Math.PI) { spikes.splice(i, 1); continue; }
        const currentLen = s.maxLen * Math.sin(s.progress);
        const lifeIntensity = Math.sin(s.progress);

        for (let c = 0; c < COLS; c++) {
          for (let r = 0; r < ROWS; r++) {
            const dx = c - cx, dy = r - cy;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 0.4 || dist > currentLen) continue;
            const proj = (dx * s.vx + dy * s.vy);
            if (proj < 0) continue;
            const perpDist = Math.sqrt(Math.pow(dx - proj * s.vx, 2) + Math.pow(dy - proj * s.vy, 2));
            const thickness = 0.5 + Math.sin(proj * 0.5 + phase * 20 + s.seed) * 0.1;
            if (perpDist < thickness) {
              const intensity = (1.0 - perpDist / thickness) * (1.0 - dist / currentLen) * lifeIntensity;
              const [h, s_val] = palHSL((phase * 0.1 + dist / s.maxLen) % 1.0);
              setLED(c, r, h, s_val, 195 * intensity * state.brt);
            }
          }
        }
      }

      // 2. FREQUENCY ANALYSIS (RECALIBRATED)
      // Mids: 400Hz - 2.5kHz (Approx bins 3-16) - Expanded for better pickup
      let midEnergy = 0;
      for (let i = 3; i <= 16; i++) midEnergy += freq[i];
      
      // Highs: 5.5kHz+ (Bins 35+)
      let highEnergy = 0;
      for (let i = 35; i < freq.length; i++) highEnergy += freq[i];

      // Mids Trigger - Faster decay (0.6) and lower threshold
      const mDiff = midEnergy - midRollingAvg;
      midRollingAvg = (midRollingAvg * 0.6) + (midEnergy * 0.4);
      if (mDiff > (45 / state.sens) && (ripplesMids.length === 0 || ripplesMids[ripplesMids.length-1].r > 5)) {
        ripplesMids.push({ r: 1.0, speed: 1.8, energy: Math.min(1.0, mDiff / 250) });
      }

      // Highs Trigger
      const hDiff = highEnergy - highRollingAvg;
      highRollingAvg = (highRollingAvg * 0.7) + (highEnergy * 0.3);
      if (hDiff > (25 / state.sens) && (ripplesHighs.length === 0 || ripplesHighs[ripplesHighs.length-1].r > 4)) {
        ripplesHighs.push({ r: 1.0, speed: 3.2, energy: Math.min(1.0, hDiff / 120) });
      }

      // 3. RENDER RINGS
      const drawRing = (rp, colorPos, thickness, jitterFreq) => {
        rp.r += rp.speed;
        const [h, s_val] = palHSL(colorPos); 
        for (let c = 0; c < COLS; c++) {
          for (let r = 0; r < ROWS; r++) {
            const dx = c - cx, dy = r - cy;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const ringPos = rp.r + Math.sin(Math.atan2(dy, dx) * jitterFreq + phase * 25) * 0.25;
            const dRing = Math.abs(dist - ringPos);

            if (dRing < thickness) {
              const fade = 1 - dRing / thickness;
              setLED(c, r, h, s_val, fade * rp.energy * 160 * state.brt);
            }
          }
        }
      };

      for (let i = ripplesMids.length - 1; i >= 0; i--) {
        drawRing(ripplesMids[i], 0.5, 0.25, 10); 
        if (ripplesMids[i].r > COLS) ripplesMids.splice(i, 1);
      }
      for (let i = ripplesHighs.length - 1; i >= 0; i--) {
        drawRing(ripplesHighs[i], 0.99, 0.15, 32); 
        if (ripplesHighs[i].r > COLS) ripplesHighs.splice(i, 1);
      }
    }
  });
})();
