/* ============================================================
   BURD PLAYER FX — GHOST IN THE MACHINE (STABLE DENSITY)
   ============================================================ */

(function () {
  let signals = [];
  const BASE_MAX = 45;

  window.BTBPlugins = window.BTBPlugins || [];
  window.BTBPlugins.push({
    name: 'ghost_machine',
    label: 'Ghost Machine',
    sens: 1.5,
    brt: 1.0,
    mirror: false,

    init(ctx) {
      signals = [];
    },

    draw(ctx, state) {
      const { COLS, ROWS, setLED, palHSL, freq } = ctx;
      const { beat, sens } = state;

      if (!freq || freq.length < 16) return;

      // 1. CALCULATE ENERGY FLOOR
      let sum = 0;
      for (let f = 0; f < freq.length; f++) sum += freq[f];
      const avgFloor = Math.sqrt(sum / freq.length / 255); 

      // 2. SILENCE GATE
      // If the song is paused or silent, purge all signals and exit
      if (avgFloor < 0.05) {
        signals = [];
        return;
      }

      // 3. DYNAMIC POPULATION
      const targetCount = Math.floor(1 + (avgFloor * BASE_MAX) * sens);

      if (signals.length < targetCount) {
        const spawnCount = Math.min(3, targetCount - signals.length);
        for(let i = 0; i < spawnCount; i++) {
          signals.push({
            x: Math.floor(Math.random() * COLS),
            y: Math.floor(Math.random() * ROWS),
            vx: Math.random() > 0.5 ? 1 : -1,
            vy: 0,
            hue: (Math.random() * 0.3) + (avgFloor * 0.7),
            history: []
          });
        }
      } 
      else if (signals.length > targetCount) {
        signals.shift(); 
      }

      const highPower = (freq[14] / 255);
      const bassPower = (freq[2] / 255);

      signals.forEach((s) => {
        // 4. MOTION & SHATTER
        if (highPower > 0.6 && Math.random() > 0.85) {
          const isHorizontal = s.vx !== 0;
          if (isHorizontal) {
            s.vx = 0;
            s.vy = Math.random() > 0.5 ? 1 : -1;
          } else {
            s.vy = 0;
            s.vx = Math.random() > 0.5 ? 1 : -1;
          }
          s.hue = (s.hue + 0.05) % 1.0;
        }

        const moveChance = 0.7 + (bassPower * 0.3);
        if (Math.random() < moveChance) {
          s.history.unshift({ x: s.x, y: s.y });
          if (s.history.length > 18) s.history.pop();
          s.x = (s.x + s.vx + COLS) % COLS;
          s.y = (s.y + s.vy + ROWS) % ROWS;
        }

        // 5. RENDERING
        s.history.forEach((pos, t) => {
          const [h, s_val] = palHSL(s.hue);
          let lum = (100 - (t * 5.5)) * state.brt * sens;
          lum *= (0.3 + (bassPower * 0.7));

          if (lum > 12) {
            setLED(Math.floor(pos.x), Math.floor(pos.y), h, s_val, Math.min(lum, 100));
          }
        });

        if (highPower > 0.8) {
          setLED(Math.floor(s.x), Math.floor(s.y), 0, 0, 100);
        }
      });
    }
  });
})();
