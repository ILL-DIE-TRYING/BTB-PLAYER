/* ============================================================
   fx-controltest.js  —  Burd Player FX Plugin
   Tests all three custom control types: range, toggle, select.

   Drop this in your burd-player/fx/ folder and add:
     <script src="burd-player/fx/fx-controltest.js"></script>
   before burd-player.js in your HTML.
   ============================================================ */

window.BTBPlugins = window.BTBPlugins || [];
window.BTBPlugins.push({

  name:  'controltest',
  label: 'Ctrl Test',
  sens:  1.0,
  brt:   0.85,

  controls: [
    {
      id:      'speed',
      label:   'Speed',
      type:    'range',
      min:     0.1,
      max:     4.0,
      step:    0.05,
      default: 1.0,
    },
    {
      id:      'size',
      label:   'Size',
      type:    'range',
      min:     1,
      max:     8,
      step:    0.5,
      default: 3,
    },
    {
      id:      'pulse',
      label:   'Pulse',
      type:    'toggle',
      default: true,
    },
    {
      id:      'trails',
      label:   'Trails',
      type:    'toggle',
      default: false,
    },
    {
      id:      'mode',
      label:   'Mode',
      type:    'select',
      default: 'bounce',
      options: [
        { value: 'bounce',  label: 'Bounce'  },
        { value: 'spiral',  label: 'Spiral'  },
        { value: 'ping',    label: 'Ping'    },
        { value: 'rain',    label: 'Rain'    },
      ],
    },
    {
      id:      'color',
      label:   'Color',
      type:    'select',
      default: 'palette',
      options: [
        { value: 'palette', label: 'Palette' },
        { value: 'hot',     label: 'Hot'     },
        { value: 'ice',     label: 'Ice'     },
        { value: 'mono',    label: 'Mono'    },
      ],
    },
  ],

  // -- internal state -----------------------------------------
  _balls: [],
  _spiralAngle: 0,

  init(ctx) {
    // Spawn a handful of balls to bounce around
    this._balls = Array.from({ length: 12 }, (_, i) => ({
      x:   Math.random() * ctx.COLS,
      y:   Math.random() * ctx.ROWS,
      vx:  (Math.random() - 0.5) * 1.2,
      vy:  (Math.random() - 0.5) * 1.2,
      hue: (i / 12) * 360,
      t:   i / 12,          // palette position
    }));
    this._spiralAngle = 0;
  },

  draw(ctx, state) {
    const { COLS, ROWS, phase } = ctx;
    const speed  = state.controls.speed;
    const size   = state.controls.size;
    const pulse  = state.controls.pulse;
    const trails = state.controls.trails;
    const mode   = state.controls.mode;
    const color  = state.controls.color;

    const beat = state.beat.b + state.beat.m * 0.5;

    // Helper: pick hue/sat/lum based on color mode and palette position t
    const getHSL = (t, baseLum) => {
      switch (color) {
        case 'hot':  return [t * 60, 100, baseLum];           // red → yellow
        case 'ice':  return [180 + t * 60, 90, baseLum];      // cyan → blue
        case 'mono': return [0, 0, baseLum];                   // white
        default:     return [null, null, baseLum];             // palette (palT)
      }
    };

    // Pulse multiplier — beat-reactive size boost when toggled on
    const pulseMult = pulse ? 1 + beat * 1.8 : 1;
    const r = Math.max(1, Math.round(size * pulseMult));

    // Trail fade: if trails off, clear is handled by the engine already.
    // If trails on, we overdraw a dim black rect to leave fading ghosts.
    if (trails) {
      const gc = ctx.gc;
      gc.fillStyle = 'rgba(0,0,0,0.35)';
      gc.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    }

    switch (mode) {

      // ── BOUNCE: balls ricochet around the grid ──────────────
      case 'bounce': {
        this._balls.forEach(ball => {
          ball.x += ball.vx * speed;
          ball.y += ball.vy * speed;
          if (ball.x < 0)        { ball.x = 0;        ball.vx *= -1; }
          if (ball.x >= COLS)    { ball.x = COLS - 1;  ball.vx *= -1; }
          if (ball.y < 0)        { ball.y = 0;         ball.vy *= -1; }
          if (ball.y >= ROWS)    { ball.y = ROWS - 1;  ball.vy *= -1; }

          // Beat kick: randomise velocity on strong beat
          if (state.beat.b > 0.6 && Math.random() < 0.3) {
            ball.vx = (Math.random() - 0.5) * 2 * speed;
            ball.vy = (Math.random() - 0.5) * 2 * speed;
          }

          const lum = 55 + beat * 25;
          const [h, s, l] = getHSL(ball.t, lum);
          for (let dr = -r + 1; dr < r; dr++) {
            for (let dc = -r + 1; dc < r; dc++) {
              const dist = Math.sqrt(dr * dr + dc * dc);
              if (dist < r) {
                const ll = l * (1 - dist / r * 0.6);
                if (h === null) {
                  ctx.setLED(Math.round(ball.x) + dc, Math.round(ball.y) + dr, 0, 0, ll, ball.t);
                } else {
                  ctx.setLED(Math.round(ball.x) + dc, Math.round(ball.y) + dr, h, s, ll);
                }
              }
            }
          }
        });
        break;
      }

      // ── SPIRAL: dots spin outward from centre ───────────────
      case 'spiral': {
        this._spiralAngle += 0.04 * speed * (1 + beat);
        const cx = COLS / 2, cy = ROWS / 2;
        const arms = 4;
        const dotsPerArm = 14;
        for (let arm = 0; arm < arms; arm++) {
          const armOffset = (arm / arms) * Math.PI * 2;
          for (let d = 0; d < dotsPerArm; d++) {
            const t2  = d / dotsPerArm;
            const rad = t2 * Math.min(COLS, ROWS) * 0.48;
            const ang = this._spiralAngle + armOffset + t2 * Math.PI * 3;
            const x   = Math.round(cx + Math.cos(ang) * rad);
            const y   = Math.round(cy + Math.sin(ang) * rad * 0.55);
            const palT = ((arm / arms) + t2 * 0.5 + phase * 0.03) % 1;
            const lum  = 30 + t2 * 45 + beat * 20;
            const [h, s, l] = getHSL(palT, lum);
            for (let dr = -r + 1; dr < r; dr++) {
              for (let dc = -r + 1; dc < r; dc++) {
                if (Math.sqrt(dr*dr+dc*dc) < r) {
                  if (h === null) ctx.setLED(x+dc, y+dr, 0, 0, l, palT);
                  else            ctx.setLED(x+dc, y+dr, h, s, l);
                }
              }
            }
          }
        }
        break;
      }

      // ── PING: single dot pings wall-to-wall ─────────────────
      case 'ping': {
        const t2 = (Math.sin(phase * speed) + 1) / 2;
        const x  = Math.round(t2 * (COLS - 1));
        const t3 = (Math.sin(phase * speed * 0.7 + 1.2) + 1) / 2;
        const y  = Math.round(t3 * (ROWS - 1));
        const palT = t2;
        const lum  = 50 + beat * 30;
        const [h, s, l] = getHSL(palT, lum);
        for (let dr = -r; dr <= r; dr++) {
          for (let dc = -r; dc <= r; dc++) {
            const dist = Math.sqrt(dr*dr + dc*dc);
            if (dist <= r) {
              const ll = l * (1 - dist / (r + 1) * 0.5);
              if (h === null) ctx.setLED(x+dc, y+dr, 0, 0, ll, palT);
              else            ctx.setLED(x+dc, y+dr, h, s, ll);
            }
          }
        }
        break;
      }

      // ── RAIN: columns of falling dots ───────────────────────
      case 'rain': {
        // Re-use the ball array as column drop positions
        this._balls.forEach((ball, i) => {
          ball.y += speed * (0.3 + ball.vx * 0.5);
          if (ball.y >= ROWS) {
            ball.y = 0;
            ball.x = Math.floor(Math.random() * COLS);
            ball.t = Math.random();
          }
          const lum = 40 + beat * 35;
          const [h, s, l] = getHSL(ball.t, lum);
          // Draw a short tail
          for (let tail = 0; tail < 6; tail++) {
            const ty  = Math.round(ball.y) - tail;
            const tl  = l * Math.pow(1 - tail / 6, 1.5);
            if (h === null) ctx.setLED(Math.round(ball.x), ty, 0, 0, tl, ball.t);
            else            ctx.setLED(Math.round(ball.x), ty, h, s, tl);
          }
        });
        break;
      }
    }
  },
});
