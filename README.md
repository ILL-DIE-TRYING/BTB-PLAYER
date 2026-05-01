# Burd Player — JavaScript Widget

A self-contained floating music player with LED disco visualizer.
Drop it into any website with two lines of HTML.

---

## File Structure

```
burd-player/
  burd-player.js    ← The player (all logic)
  burd-player.css   ← Styles (theme variables at the top)
  tracks.json       ← Your playlist
audio/
  yoursong.mp3      ← Your audio files (put them anywhere)
example.html        ← Working example page
README.md           ← This file
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

Before your `</body>`:
```html
<script src="/burd-player/burd-player.js"></script>
```

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

Upload your MP3s to your server (same domain required for
disco mode frequency analysis). Point `url` at them.

---

## Configuration

Open `burd-player.js`. Everything user-configurable is in the
`CFG` block at the top of the file. Each setting is documented
inline. You never need to touch anything below the
`END CONFIGURATION` comment.

### Key settings:

| Setting | What it does |
|---------|-------------|
| `tracksUrl` | Path to your tracks.json |
| `playerLabel` | Text in the mini player header |
| `bandName` | Shown under the track title |
| `defaultVolume` | Starting volume (0–1) |
| `defaultOpacity` | Panel transparency (0.08–1) |
| `defaultMirror` | Mirror LED visualization |
| `pageWrapId` | ID of your page wrapper for FG fade |
| `randomPreset` | Random color palette on load |
| `randomFX` | Random LED effect on load |
| `ledSize` | LED dot size (smaller = more dots = heavier) |
| `colorPresets` | Your color palette options |
| `fx` | Sensitivity/brightness per effect |
| `availableFX` | Which effects show as buttons |

---

## Theming

Open `burd-player.css`. The `:root` block at the top contains
all color and font variables. Edit those — do not touch
anything below the `INTERNALS` comment.

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

This makes the LED canvas sit behind your content, and enables
the FG/BG fade when the user toggles full-screen mode.

Set `pageWrapId: null` in `burd-player.js` to disable this.

---

## Audio Requirements

- Audio must be served from the **same domain** as the page
  for the Web Audio API (disco frequency analysis) to work.
- Basic playback works from any URL.
- Supported formats: MP3, OGG, WAV (MP3 recommended).

---

## Keyboard Shortcuts

| Key   | Action               |
|-------|----------------------|
| Space | Play / Pause         |
| N     | Next track           |
| P     | Previous track       |
| D     | Toggle Disco         |
| M     | Toggle expanded panel|
