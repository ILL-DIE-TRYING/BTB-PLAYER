# BTB Player — JavaScript Widget

A self-contained floating music player with LED disco visualizer.
Drop it into any website with two lines of HTML.

---

## File Structure

```
burd-player/
  burd-player.js      ← The player (all logic)
  burd-player.css     ← Styles (theme variables at the top)
  tracks.json         ← Your playlist
  fx/
    fx-spectrum.js        ← Built-in: frequency spectrum bars
    fx-rain.js            ← Built-in: falling dot rain
    fx-waveform.js        ← Built-in: audio waveform
    fx-starfield.js       ← Built-in: starfield flythrough
    fx-ripple.js          ← Ripple rings from beat impacts
    fx-plasma.js          ← Flowing plasma colour field
    fx-fireflies.js       ← Drifting glowing fireflies
    fx-rings.js           ← Expanding concentric rings
    fx-lavalamp.js        ← Slow rising lava blob blobs
    fx-neonriot.js        ← Chaotic neon splatter
    fx-hyperspacevortex.js← Hyperspace tunnel vortex
    fx-koipond.js         ← Koi pond ripples
    fx-nebuladrift.js     ← Drifting nebula clouds
    fx-fractalbeyond.js   ← Fractal depth tunnel
    fx-theghostinthemachine.js ← Glitchy ghost static
    fx-controltest.js     ← Developer test: all control types
audio/
  yoursong.mp3        ← Your audio files (put them anywhere)
example.html          ← Working example page
README.md             ← This file
```

---

## Installation — 3 Steps

### Step 1 — Copy the `burd-player` folder to your server

Put it anywhere. The path just needs to be web-accessible.
Recommended: `/burd-player/` in your web root.

### Step 2 — Add to your HTML

In your `<head>`:
```html
<link rel="stylesheet" href="/burd-player/burd-player.css">
```

Before your `</body>`, load FX plugins first, then the player last:
```html
<!-- Load whichever fx plugins you want -->
<script src="/burd-player/fx/fx-spectrum.js"></script>
<script src="/burd-player/fx/fx-rain.js"></script>
<script src="/burd-player/fx/fx-waveform.js"></script>
<script src="/burd-player/fx/fx-starfield.js"></script>
<script src="/burd-player/fx/fx-ripple.js"></script>
<script src="/burd-player/fx/fx-plasma.js"></script>
<script src="/burd-player/fx/fx-fireflies.js"></script>
<script src="/burd-player/fx/fx-rings.js"></script>
<script src="/burd-player/fx/fx-lavalamp.js"></script>
<script src="/burd-player/fx/fx-neonriot.js"></script>
<script src="/burd-player/fx/fx-hyperspacevortex.js"></script>
<script src="/burd-player/fx/fx-koipond.js"></script>
<script src="/burd-player/fx/fx-nebuladrift.js"></script>
<script src="/burd-player/fx/fx-fractalbeyond.js"></script>
<script src="/burd-player/fx/fx-theghostinthemachine.js"></script>

<!-- Player ALWAYS loads last -->
<script src="/burd-player/burd-player.js"></script>
```

> **Important:** The player script must always be the last script loaded.
> FX plugins must be loaded before it. Order within the plugin list doesn't matter.

### Step 3 — Edit `tracks.json`

```json
[
  {
    "title":    "Song Name",
    "album":    "Album Name",
    "url":      "/audio/mysong.mp3",
    "duration": "3:42"
  }
]
```

Upload your MP3s to your server (same domain required for disco mode
frequency analysis). Point `url` at them.

---

## Configuration

Open `burd-player.js`. Everything user-configurable is in the `CFG`
block at the top of the file. Each setting is documented inline.
You never need to touch anything below the `END CONFIGURATION` comment.

### Key settings:

| Setting | What it does |
|---|---|
| `tracksUrl` | Path to your tracks.json |
| `playerLabel` | Text in the mini player header |
| `bandName` | Shown under the track title |
| `defaultVolume` | Starting volume (0–1) |
| `defaultOpacity` | Panel transparency (0.08–1) |
| `defaultMirror` | Mirror LED visualization left/right |
| `pageWrapId` | ID of your page wrapper for FG fade |
| `randomPreset` | Pick a random color palette on load |
| `randomFX` | Pick a random LED effect on load |
| `ledSize` | LED dot size in pixels (smaller = more dots = heavier on CPU) |
| `ledSizeMobile` | LED dot size on screens under 500px wide |
| `colorPresets` | Array of 3-stop color palette options |
| `defaultPreset` | Which palette to use if randomPreset is false |
| `fx` | Default sensitivity/brightness per built-in effect key |
| `defaultFX` | Which effect to use if randomFX is false |

---

## Theming

Open `burd-player.css`. The `:root` block at the top contains all
color and font variables. Edit those — do not touch anything below
the `INTERNALS` comment.

| Variable | What it controls |
|---|---|
| `--burdplayer-orange` | Primary accent color |
| `--burdplayer-orange-dim` | Hover/active accent |
| `--burdplayer-pink` | Disco / secondary accent |
| `--burdplayer-panel` | Panel background (rgba) |
| `--burdplayer-border` | Panel border color |
| `--burdplayer-text` | Primary text color |
| `--burdplayer-text-dim` | Secondary text color |
| `--burdplayer-text-mute` | Muted/inactive text |
| `--burdplayer-font` | Monospace UI font stack |
| `--burdplayer-serif` | Serif font for track title |
| `--burdplayer-radius` | Border radius on all elements |

---

## Page Wrap (optional but recommended)

Add `id="btb-page-wrap"` to the div that wraps your page content:

```html
<div id="btb-page-wrap">
  ... your page ...
</div>
```

And add to your CSS:

```css
#btb-page-wrap {
  position: relative;
  z-index: 2;
  min-height: 100vh;
}
```

This makes the LED canvas sit behind your content, and enables the
FG/BG fade when the user toggles full-screen LED mode.
Set `pageWrapId: null` in CFG to disable this entirely.

---

## Audio Requirements

- Audio must be served from the **same domain** as the page for the
  Web Audio API (disco frequency analysis) to work.
- Basic playback (play/pause/seek) works from any URL.
- Supported formats: MP3, OGG, WAV — MP3 recommended.

---

## Keyboard Shortcuts

| Key | Action |
|---|---|
| `Space` | Play / Pause |
| `N` | Next track |
| `P` | Previous track |
| `D` | Toggle Disco mode |
| `M` | Toggle expanded panel |

---

## Writing a Plugin

Plugins are plain JavaScript files that register an effect with the
player before it boots. Each plugin gets its own entry in the FX
dropdown and can define its own custom controls that appear in the
disco panel.

### Minimal plugin

```js
window.BTBPlugins = window.BTBPlugins || [];
window.BTBPlugins.push({

  name:  'myeffect',   // unique key, lowercase, no spaces
  label: 'My Effect',  // shown in the FX dropdown
  sens:  1.1,          // default sensitivity (0.1–1.5)
  brt:   0.90,         // default brightness  (0.3–1.0)

  init(ctx) {
    // Called once when this FX is selected.
    // Use this to reset any internal state.
  },

  draw(ctx, state) {
    // Called every animation frame while disco is running.
    // Use ctx to light up LEDs.
    // Use state for audio/beat data and control values.
  },

});
```

Load it before `burd-player.js`:
```html
<script src="/burd-player/fx/fx-myeffect.js"></script>
<script src="/burd-player/burd-player.js"></script>
```

---

### The `ctx` object (LED API)

| Property / Method | Type | Description |
|---|---|---|
| `ctx.setLED(col, row, h, s, l, palT)` | function | Light up one LED cell |
| `ctx.COLS` | number | Total LED columns |
| `ctx.ROWS` | number | Total LED rows |
| `ctx.CELL` | number | Pixel size of one cell |
| `ctx.phase` | number | Ever-incrementing float — use for animation timing |
| `ctx.colT(c)` | function | Normalize column index to 0–1 palette position |
| `ctx.canvas` | HTMLCanvasElement | The raw canvas element |
| `ctx.gc` | CanvasRenderingContext2D | Raw 2D context — use for advanced drawing |
| `ctx.freq` | Uint8Array | Raw FFT frequency bin data |
| `ctx.waveD` | Uint8Array | Raw waveform data |
| `ctx.palSample(t)` | function | Returns `[r, g, b]` for palette position t (0–1) |
| `ctx.palHSL(t)` | function | Returns `[h, s, l]` for palette position t (0–1) |

#### `ctx.setLED(col, row, h, s, l, palT)`

| Param | Type | Description |
|---|---|---|
| `col` | number | Column index (0 to COLS-1) |
| `row` | number | Row index (0 to ROWS-1) |
| `h` | number | Hue (0–360) |
| `s` | number | Saturation (0–100) |
| `l` | number | Lightness (0–100) — controls brightness |
| `palT` | number | Optional. If provided (0–1), hue/sat are overridden by the current palette. `l` still controls brightness. |

Mirror mode is handled automatically — if the user has mirror enabled,
`setLED` will fold your column to both sides. You never need to think
about it.

---

### The `state` object (audio data)

| Property | Type | Description |
|---|---|---|
| `state.beat.b` | number | Bass beat energy (0–1+) |
| `state.beat.m` | number | Mid beat energy (0–1+) |
| `state.beat.h` | number | High beat energy (0–1+) |
| `state.beat.p` | number | Presence energy (0–1+) |
| `state.sens` | number | Current sensitivity slider value |
| `state.brt` | number | Current brightness slider value |
| `state.controls` | object | Your plugin's custom control values (see below) |

---

### Custom controls

Plugins can define their own controls that appear in the disco panel
below the standard Sens / Bright / Mirror row. Three control types
are supported: `range`, `toggle`, and `select`.

Values are remembered per-plugin for the session. When the user
switches to a different FX and comes back, their settings are restored.

```js
window.BTBPlugins.push({
  name:  'myeffect',
  label: 'My Effect',
  sens:  1.1,
  brt:   0.90,

  controls: [

    // Range slider
    {
      id:      'speed',    // key used in state.controls
      label:   'Speed',    // label shown in the UI
      type:    'range',
      min:     0.1,
      max:     3.0,
      step:    0.05,
      default: 1.0,
    },

    // Toggle button (on/off)
    {
      id:      'invert',
      label:   'Invert',
      type:    'toggle',
      default: false,
    },

    // Dropdown select
    {
      id:      'mode',
      label:   'Mode',
      type:    'select',
      default: 'bounce',
      options: [
        { value: 'bounce', label: 'Bounce' },
        { value: 'sweep',  label: 'Sweep'  },
        { value: 'pulse',  label: 'Pulse'  },
      ],
    },

  ],

  init(ctx) { },

  draw(ctx, state) {
    const speed  = state.controls.speed;   // number
    const invert = state.controls.invert;  // boolean
    const mode   = state.controls.mode;    // string

    // use ctx.setLED() to draw your effect
  },
});
```

---

### Plugin tips

- **Keep `init` cheap.** It is called every time the user switches to
  your effect, not just on page load. Reset state, don't allocate huge
  buffers you then have to tear down.

- **Use `ctx.phase` for time.** It increments by ~0.016 per frame
  (roughly 60fps). Don't use `Date.now()` — phase is already there
  and stays in sync with the animation loop.

- **Use `palT` in `setLED`.** Passing a palette position as the 6th
  argument lets the user's color palette choice automatically apply to
  your effect. Your effect will look great with every preset.

- **Beat values go above 1.0 on strong hits.** Clamp with
  `Math.min(beat.b, 1)` if you need a strict 0–1 range, or let it
  run hot for more dramatic reactions.

- **`ctx.gc` is the raw canvas context.** You can use it for anything
  the LED grid can't express — gradients, arcs, text. Just be aware
  the engine clears the canvas with a black fill at the start of every
  frame (unless trails mode is active in your plugin).

- **Mirror is automatic.** Don't write mirrored columns yourself.
  `setLED` handles it based on the user's mirror toggle.

- **Register optional `mirror` default.** If your effect only makes
  sense with mirror off or on, set `mirror: false` or `mirror: true`
  in your plugin descriptor and the player will set it automatically
  when your effect is selected.

---

### Runtime registration

If you need to register a plugin after the player has already booted
(e.g. loaded dynamically), use the public API:

```js
BTBPlayer.registerFX({
  name:  'lateloaded',
  label: 'Late Loaded',
  // ... same descriptor as above
});
```

---

## Public API

After boot, `window.BTBPlayer` exposes:

| Property / Method | Description |
|---|---|
| `BTBPlayer.registerFX(plug)` | Register a plugin at any time |
| `BTBPlayer.plugins` | Array of registered plugin keys |
| `BTBPlayer.palSample(t)` | Sample current palette → `[r, g, b]` |
| `BTBPlayer.palHSL(t)` | Sample current palette → `[h, s, l]` |

---

## Included FX Reference

| File | Label | Description |
|---|---|---|
| `fx-spectrum.js` | Spectrum | Classic frequency spectrum bars with peak dots |
| `fx-rain.js` | Rain | Beat-triggered falling dot rain |
| `fx-waveform.js` | Waveform | Live audio waveform centered on the grid |
| `fx-starfield.js` | Starfield | Stars flying toward the viewer |
| `fx-ripple.js` | Ripple | Expanding rings triggered by beats |
| `fx-plasma.js` | Plasma | Flowing sine-wave plasma colour field |
| `fx-fireflies.js` | Fireflies | Drifting glowing particles with beat bursts |
| `fx-rings.js` | Rings | Concentric expanding rings from centre |
| `fx-lavalamp.js` | Lava Lamp | Slow rising and falling blob shapes |
| `fx-neonriot.js` | Neon Riot | Chaotic beat-reactive neon splatter |
| `fx-hyperspacevortex.js` | Vortex | Hyperspace tunnel pulling inward |
| `fx-koipond.js` | Koi Pond | Gentle ripple rings across a calm surface |
| `fx-nebuladrift.js` | Nebula | Slow drifting nebula cloud shapes |
| `fx-fractalbeyond.js` | Fractal | Recursive fractal depth tunnel |
| `fx-theghostinthemachine.js` | Ghost | Glitchy digital ghost static |
| `fx-controltest.js` | Ctrl Test | Developer test — exercises all control types |
