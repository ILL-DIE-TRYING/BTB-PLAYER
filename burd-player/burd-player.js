/* ============================================================
   BURD PLAYER - burd-player.js
   Drop-in music player with LED disco visualizer.

   HOW TO USE:
   1. Add to your <head>:
        <link rel="stylesheet" href="/burd-player/burd-player.css">
   2. Add before </body>:
        <script src="/burd-player/burd-player.js"></script>
   3. Edit tracks.json with your audio files.
   4. (Optional) Load FX plugins before this script:
        <script src="/burd-player/my-fx.js"></script>
   5. Done.

   ─────────────────────────────────────────────────────────────
   FX PLUGIN API
   ─────────────────────────────────────────────────────────────
   Register a custom effect BEFORE this script runs, or any
   time after — the system checks window.BTBPlugins on boot
   and exposes window.BTBPlayer.registerFX() at runtime.

   OPTION A — Pre-boot (simplest):
     window.BTBPlugins = window.BTBPlugins || [];
     window.BTBPlugins.push({
       name: 'myeffect',          // unique key, lowercase
       label: 'My Effect',        // shown in FX dropdown
       sens: 1.1,                 // default sensitivity (0.1–1.5)
       brt:  0.90,                // default brightness  (0.3–1.0)

       // Optional custom controls rendered below sens/brt/mirror
       controls: [
         { id: 'speed',  label: 'Speed',  type: 'range',  min: 0.1, max: 3, step: 0.05, default: 1.0 },
         { id: 'invert', label: 'Invert', type: 'toggle', default: false },
         { id: 'mode',   label: 'Mode',   type: 'select', default: 'bounce',
           options: [
             { value: 'bounce', label: 'Bounce' },
             { value: 'sweep',  label: 'Sweep'  },
           ]
         },
       ],

       init(ctx) {},              // called once when FX is selected
       draw(ctx, state) {         // called every animation frame
         // ctx   — the LED helper API (see below)
         // state — live audio/beat data + custom control values
         //   state.beat.b / .m / .h / .p  — beat energies
         //   state.sens                    — sensitivity slider
         //   state.brt                     — brightness slider
         //   state.controls.speed          — your custom controls
         //   state.controls.invert
         //   state.controls.mode
       }
     });

   OPTION B — Post-boot (dynamic):
     BTBPlayer.registerFX({ name:'myeffect', label:'My Effect', ... });

   ─────────────────────────────────────────────────────────────
   LED HELPER API  (the `ctx` object passed to draw/init)
   ─────────────────────────────────────────────────────────────
     ctx.setLED(col, row, h, s, l, paletteT)
     ctx.COLS / ctx.ROWS / ctx.CELL / ctx.phase
     ctx.colT(c)   — normalize column to 0-1
     ctx.canvas / ctx.gc / ctx.freq / ctx.waveD

   ─────────────────────────────────────────────────────────────
   AUDIO STATE  (the `state` object passed to draw)
   ─────────────────────────────────────────────────────────────
     state.beat.b / .m / .h / .p
     state.sens / state.brt
     state.controls   — your plugin's custom control values
   ============================================================ */

(function () {

/* ============================================================
   ##  CONFIGURATION
   ============================================================ */

const CFG = {
  tracksUrl: '/burd-player/tracks.json',
  playerLabel: '&#x266B; Burd',
  bandName: 'Burd The Band',
  defaultVolume: 0.85,
  defaultOpacity: 0.45,
  defaultMirror: true,
  pageWrapId: 'btb-page-wrap',
  fgFadeDuration: '2s',
  randomPreset: true,
  randomFX: true,
  showTip: true,
  ledSize: 17,
  ledSizeMobile: 13,
  colorPresets: [
    { name: 'Cyan->Blue->Pink',   colors: [[0,255,204],[0,68,255],[255,0,170]] },
    { name: 'Fire',               colors: [[180,0,0],[255,100,0],[255,220,0]] },
    { name: 'Purple->Red->Gold',  colors: [[120,0,200],[220,0,60],[255,180,0]] },
    { name: 'Rainbow',            colors: [[255,0,0],[0,255,0],[0,0,255]] },
  ],
  defaultPreset: 0,
  fx: {
    spectrum:  { sens: 1.1, brt: 0.90 },
    rain:      { sens: 1.1, brt: 0.90 },
    waveform:  { sens: 1.2, brt: 0.90 },
    starfield: { sens: 1.5, brt: 0.90 },
  },
  defaultFX: 'spectrum',
  availableFX: ['spectrum', 'rain', 'waveform', 'starfield'],
};

/* ============================================================
   END CONFIGURATION
   ============================================================ */

// -- Plugin registry ------------------------------------------
const _plugins = new Map();

function _registerPlugin(plug) {
  if (!plug || !plug.name) { console.warn('[BTBPlayer] Plugin missing name:', plug); return; }
  const key = plug.name.toLowerCase();
  _plugins.set(key, {
    name:     key,
    label:    plug.label  || (plug.name.charAt(0).toUpperCase() + plug.name.slice(1)),
    sens:     plug.sens   !== undefined ? plug.sens   : 1.1,
    brt:      plug.brt    !== undefined ? plug.brt    : 0.90,
    mirror:   plug.mirror !== undefined ? plug.mirror : null,
    controls: Array.isArray(plug.controls) ? plug.controls : [],
    init:     typeof plug.init === 'function' ? plug.init : () => {},
    draw:     typeof plug.draw === 'function' ? plug.draw : () => {},
  });
  if (_booted) _appendPluginButton(key);
}

function _drainPluginQueue() {
  const q = window.BTBPlugins;
  if (Array.isArray(q)) q.forEach(_registerPlugin);
}

let _booted = false;

function _appendPluginButton(key) {
  const plug = _plugins.get(key);
  if (!plug) { console.warn('[BTBPlayer] _appendPluginButton: no plug for key', key); return; }
  const sel = document.getElementById('btb-fx-select');
  if (!sel) { console.warn('[BTBPlayer] _appendPluginButton: btb-fx-select not found'); return; }
  if (sel.querySelector(`option[value="${key}"]`)) return;
  const opt = document.createElement('option');
  opt.value = key;
  opt.textContent = plug.label;
  sel.appendChild(opt);
  if (!CFG.fx[key]) CFG.fx[key] = { sens: plug.sens, brt: plug.brt };
}

// -- State ----------------------------------------------------
let TRACKS = [];
let curIdx = -1, discoOn = false, curFX = CFG.defaultFX;
let raf = null, phase = 0;
let doMirror = CFG.defaultMirror;
let expanded = false;
let autoplayPending = false, autoplayStarted = false;
let discoFading = false;
let cvFront = false;
let PAL = CFG.colorPresets[CFG.defaultPreset].colors.map(c=>[...c]);

// Session storage for plugin custom control values
// key: "pluginName.controlId" -> current value
const _pluginControlValues = new Map();

// -- Inject HTML ----------------------------------------------
function _buildHTML() {
  const presetBtns = CFG.colorPresets.map((_,i) =>
    `<button class="btb-pp" id="btb-pp${i}" title="${CFG.colorPresets[i].name}" onclick="btbApplyPreset(${i})"></button>`
  ).join('');

  const html = `
<div id="btb-wo" class="btb-h" role="dialog" aria-modal="true" aria-labelledby="btb-wt">
  <div id="btb-wb">
    <span id="btb-wi">&#x26A1;</span>
    <h2 id="btb-wt">Photosensitivity Warning</h2>
    <p id="btb-wbd">Disco mode displays a flashing LED animation synced to music. This may trigger discomfort or seizures in people with photosensitive epilepsy. If flashing lights affect you, please skip this feature.</p>
    <div id="btb-wnv"><input type="checkbox" id="btb-wcb"><label for="btb-wcb">Don't show this warning again</label></div>
    <div class="btb-wbts">
      <button class="btb-wbtn" onclick="btbWCancel()">Cancel</button>
      <button class="btb-wbtn" id="btb-wgo" onclick="btbWConfirm()">Enable Disco</button>
    </div>
  </div>
</div>

<canvas id="btb-cv"></canvas>

<div id="btb-mini">
  <div id="btb-mini-header">
    <span id="btb-mini-label">${CFG.playerLabel}</span>
    <span id="btb-mini-title">Loading...</span>
    <button id="btb-mini-expand" onclick="btbExpand()">&#x25B2; Open</button>
  </div>
  <div id="btb-mini-prog-wrap" onclick="btbMiniSeek(event)">
    <div id="btb-mini-prog-fill"></div>
  </div>
  <div id="btb-mini-controls">
    <button class="btb-mbtn" onclick="btbPrevT()" aria-label="Previous">&#x23EE;</button>
    <button class="btb-mbtn" id="btb-mini-play" onclick="btbTogglePlay()" aria-label="Play/Pause">&#x25B6;</button>
    <button class="btb-mbtn" onclick="btbNextT()" aria-label="Next">&#x23ED;</button>
    <button id="btb-disco-mini" onclick="btbReqDisco()" aria-label="Disco mode">&#x2605; Disco</button>
    <button id="btb-cv-front" onclick="btbTogFront()" title="Bring LED to front">&#x2B1B; FG</button>
  </div>
</div>

<div id="btb-tip" role="tooltip">
  &#x2728; Try out<br><strong>Disco Mode!</strong>
  <button id="btb-tip-close" onclick="btbCloseTip()">Got it!</button>
  <label id="btb-tip-never">
    <input type="checkbox" id="btb-tip-cb"> Don't show again
  </label>
</div>

<div id="btb-expanded">
  <div id="btb-exp-header">
    <div style="flex:1;min-width:0">
      <div id="btb-exp-title">Select a track</div>
      <div id="btb-exp-meta">${CFG.bandName}</div>
    </div>
    <button id="btb-cv-front-exp" onclick="btbTogFront()" title="Bring LED to front" style="background:none;border:1px solid var(--btb-bdr);color:var(--btb-tdim);font-family:var(--btb-font);font-size:9px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;padding:4px 8px;cursor:pointer;border-radius:var(--btb-r);transition:all .15s;margin-right:4px;flex-shrink:0">&#x2B1B; FG</button>
    <button id="btb-collapse" onclick="btbCollapse()">&#x25BC; Close</button>
  </div>
  <div class="btb-prog-row">
    <span class="btb-time" id="btb-tc">0:00</span>
    <div class="btb-prog-bar" onclick="btbSeekTo(event)"><div class="btb-prog-fill" id="btb-prog-fill"></div></div>
    <span class="btb-time" id="btb-tt">0:00</span>
  </div>
  <div class="btb-xport">
    <button class="btb-btn" onclick="btbPrevT()">&#x23EE; Prev</button>
    <button class="btb-btn" id="btb-btn-play" onclick="btbTogglePlay()">&#x25B6; Play</button>
    <button class="btb-btn" onclick="btbNextT()">Next &#x23ED;</button>
    <button class="btb-btn" id="btb-btn-disco" onclick="btbReqDisco()">&#x2605; Disco</button>
  </div>
  <div class="btb-ctrl-row">
    <span class="btb-rl">Vol</span>
    <input type="range" id="btb-vol-sl" min="0" max="1" step="0.02" value="${CFG.defaultVolume}" oninput="btbSetVol(this.value)">
    <span class="btb-rl" style="margin-left:4px">Opacity</span>
    <input type="range" id="btb-alpha-sl" min="0.08" max="1" step="0.02" value="${CFG.defaultOpacity}" oninput="btbSetAlpha(this.value)">
  </div>
  <div id="btb-dc">
    <div id="btb-dc-fx-row">
      <span class="btb-dcl">FX</span>
      <select id="btb-fx-select" onchange="btbSetFX(this.value)"></select>
    </div>
    <div id="btb-dc-sl-row">
      <div class="btb-dcsr">
        <span class="btb-dcsl">Sens</span>
        <input type="range" id="btb-sens" min="0.1" max="1.5" step="0.02" value="${CFG.fx[CFG.defaultFX].sens}">
      </div>
      <div class="btb-dcsr">
        <span class="btb-dcsl">Bright</span>
        <input type="range" id="btb-brt" min="0.3" max="1" step="0.05" value="${CFG.fx[CFG.defaultFX].brt}">
      </div>
      <button class="btb-tog${CFG.defaultMirror?' btb-on':''}" id="btb-tog-mirror" onclick="btbTogMirror()">&#x21C4; Mirror</button>
    </div>
    <div id="btb-dc-custom-row"></div>
    <div id="btb-dc-pal-row">
      <span class="btb-pal-label">Palette</span>
      <div class="btb-cs-group"><span class="btb-cs-num">A</span><input type="color" id="btb-cp0" value="#00ffcc" oninput="btbUpdatePalette()"></div>
      <div class="btb-cs-group"><span class="btb-cs-num">B</span><input type="color" id="btb-cp1" value="#0044ff" oninput="btbUpdatePalette()"></div>
      <div class="btb-cs-group"><span class="btb-cs-num">C</span><input type="color" id="btb-cp2" value="#ff00aa" oninput="btbUpdatePalette()"></div>
      <canvas id="btb-pal-preview" width="120" height="12"></canvas>
    </div>
    <div id="btb-dc-pre-row">
      <span class="btb-pal-label">Presets</span>
      ${presetBtns}
    </div>
  </div>
  <div id="btb-tl-wrap">
    <div id="btb-tl">
      <div style="padding:20px;text-align:center;font-size:11px;color:var(--btb-tmut);letter-spacing:2px">Loading tracks...</div>
    </div>
  </div>
</div>

<audio id="btb-aud" preload="auto"></audio>`;

  const container = document.createElement('div');
  container.innerHTML = html;
  while (container.firstChild) document.body.appendChild(container.firstChild);
}

// -- Build track list HTML ------------------------------------
function _buildTrackList() {
  const tl = document.getElementById('btb-tl');
  if (!TRACKS.length) {
    tl.innerHTML = '<div style="padding:20px;text-align:center;font-size:11px;color:var(--btb-tmut);letter-spacing:2px">No tracks found - check tracks.json</div>';
    return;
  }
  tl.innerHTML = TRACKS.map((t, i) => {
    const n = String(i+1).padStart(2,'0');
    const title = t.title || 'Untitled';
    const dur = t.duration || '';
    return `<div class="btb-ti" onclick="btbLoadT(${i},true)" tabindex="0" role="button"
      onkeydown="if(event.key==='Enter'||event.key===' ')btbLoadT(${i},true)">
      <span class="btb-tnum">${n}</span>
      <div class="btb-tinfo"><div class="btb-tnm">${title}</div></div>
      <span class="btb-tdur">${dur}</span>
    </div>`;
  }).join('');
}

// -- Palette --------------------------------------------------
function _h2r(h){const v=parseInt(h.slice(1),16);return[(v>>16)&255,(v>>8)&255,v&255];}
function _r2h(r,g,b){return'#'+[r,g,b].map(x=>Math.round(x).toString(16).padStart(2,'0')).join('');}
function palSample(t){
  t=Math.max(0,Math.min(1,t));
  let r,g,b;
  if(t<=0.5){const f=t*2;r=PAL[0][0]+(PAL[1][0]-PAL[0][0])*f;g=PAL[0][1]+(PAL[1][1]-PAL[0][1])*f;b=PAL[0][2]+(PAL[1][2]-PAL[0][2])*f;}
  else{const f=(t-0.5)*2;r=PAL[1][0]+(PAL[2][0]-PAL[1][0])*f;g=PAL[1][1]+(PAL[2][1]-PAL[1][1])*f;b=PAL[1][2]+(PAL[2][2]-PAL[1][2])*f;}
  return[Math.round(r),Math.round(g),Math.round(b)];
}
function palHSL(t){
  const[r,g,b]=palSample(t);
  let rn=r/255,gn=g/255,bn=b/255;
  const mx=Math.max(rn,gn,bn),mn=Math.min(rn,gn,bn),d=mx-mn;
  let h=0,s=0,l=(mx+mn)/2;
  if(d>0){s=d/(1-Math.abs(2*l-1));if(mx===rn)h=((gn-bn)/d+6)%6;else if(mx===gn)h=(bn-rn)/d+2;else h=(rn-gn)/d+4;h*=60;}
  return[h,s*100,l*100];
}
function btbUpdatePalette(){
  PAL=['btb-cp0','btb-cp1','btb-cp2'].map(id=>_h2r(document.getElementById(id).value));
  _drawPrev(); gradCache.clear();
}
window.btbUpdatePalette=btbUpdatePalette;

function btbApplyPreset(i){
  const preset = CFG.colorPresets[i];
  if(!preset) return;
  PAL = preset.colors.map(c=>[...c]);
  ['btb-cp0','btb-cp1','btb-cp2'].forEach((id,j)=>document.getElementById(id).value=_r2h(...PAL[j]));
  _drawPrev(); gradCache.clear();
}
window.btbApplyPreset=btbApplyPreset;

function _drawPrev(){
  const cv2=document.getElementById('btb-pal-preview');if(!cv2)return;
  const g2=cv2.getContext('2d'),W=cv2.width,H=cv2.height;
  for(let x=0;x<W;x++){const[r,g,b]=palSample(x/W);g2.fillStyle=`rgb(${r},${g},${b})`;g2.fillRect(x,0,1,H);}
}
function _initPresets(){
  CFG.colorPresets.forEach((_,i)=>{
    const btn=document.getElementById('btb-pp'+i);if(!btn)return;
    const c=document.createElement('canvas');c.width=34;c.height=12;
    const g=c.getContext('2d');
    const colors=CFG.colorPresets[i].colors.map(x=>[...x]);
    for(let x=0;x<34;x++){
      const t=x/33;let r,gg,b;
      if(t<=0.5){const f=t*2;r=colors[0][0]+(colors[1][0]-colors[0][0])*f;gg=colors[0][1]+(colors[1][1]-colors[0][1])*f;b=colors[0][2]+(colors[1][2]-colors[0][2])*f;}
      else{const f=(t-0.5)*2;r=colors[1][0]+(colors[2][0]-colors[1][0])*f;gg=colors[1][1]+(colors[2][1]-colors[1][1])*f;b=colors[1][2]+(colors[2][2]-colors[1][2])*f;}
      g.fillStyle=`rgb(${Math.round(r)},${Math.round(gg)},${Math.round(b)})`;g.fillRect(x,0,1,12);
    }
    btn.style.backgroundImage=`url(${c.toDataURL()})`;btn.style.backgroundSize='100% 100%';
  });
}

// -- Audio ----------------------------------------------------
let aud, actx, analyser, src, freq, waveD, BL;
function _initAudio(){
  aud = document.getElementById('btb-aud');
  aud.volume = CFG.defaultVolume;
  aud.addEventListener('ended', btbNextT);
  aud.addEventListener('play', ()=>_setPlayBtns(true));
  aud.addEventListener('pause', ()=>_setPlayBtns(false));
  aud.addEventListener('timeupdate', ()=>{
    if(!aud.duration||isNaN(aud.duration)) return;
    const pct=aud.currentTime/aud.duration*100;
    document.getElementById('btb-prog-fill').style.width=pct+'%';
    document.getElementById('btb-mini-prog-fill').style.width=pct+'%';
    document.getElementById('btb-tc').textContent=_fmt(aud.currentTime);
    document.getElementById('btb-tt').textContent=_fmt(aud.duration);
  });
}
function _initACtx(){
  if(actx) return;
  actx=new(window.AudioContext||window.webkitAudioContext)();
  analyser=actx.createAnalyser();
  analyser.fftSize=2048; analyser.smoothingTimeConstant=0.78;
  BL=analyser.frequencyBinCount;
  freq=new Uint8Array(BL); waveD=new Uint8Array(BL);
  src=actx.createMediaElementSource(aud);
  src.connect(analyser); analyser.connect(actx.destination);
}
function _resume(){if(actx&&actx.state==='suspended')actx.resume();}

function btbLoadT(i,play){
  if(i<0||i>=TRACKS.length) return;
  curIdx=i; const t=TRACKS[i];
  aud.src=t.url;
  const title=t.title||'Untitled';
  document.getElementById('btb-mini-title').textContent=title;
  document.getElementById('btb-exp-title').textContent=title;
  document.getElementById('btb-exp-meta').textContent=(t.album?t.album+' . ':'')+CFG.bandName;
  document.getElementById('btb-tt').textContent=t.duration||'0:00';
  document.querySelectorAll('.btb-ti').forEach((el,j)=>el.classList.toggle('btb-on',j===i));
  if(play){_initACtx();_resume();aud.play().catch(()=>{});}
}
window.btbLoadT=btbLoadT;

function btbTogglePlay(){
  if(curIdx<0){btbLoadT(0,true);return;}
  _initACtx();_resume();
  if(aud.paused){aud.play().catch(()=>{});}else{aud.pause();}
}
window.btbTogglePlay=btbTogglePlay;

function btbPrevT(){btbLoadT(curIdx>0?curIdx-1:TRACKS.length-1,true);}
function btbNextT(){btbLoadT((curIdx+1)%TRACKS.length,true);}
window.btbPrevT=btbPrevT; window.btbNextT=btbNextT;

function btbSetVol(v){aud.volume=parseFloat(v);}
window.btbSetVol=btbSetVol;

function btbSetAlpha(v){
  const a=parseFloat(v);
  ['btb-mini','btb-expanded'].forEach(id=>{document.getElementById(id).style.background=`rgba(14,11,7,${a})`;});
}
window.btbSetAlpha=btbSetAlpha;

function _setPlayBtns(p){
  document.getElementById('btb-btn-play').innerHTML=p?'&#x23F8; Pause':'&#x25B6; Play';
  document.getElementById('btb-mini-play').innerHTML=p?'&#x23F8;':'&#x25B6;';
}
function btbSeekTo(e){
  if(!aud||!aud.src||!aud.duration) return;
  const r=e.currentTarget.getBoundingClientRect();
  aud.currentTime=Math.max(0,Math.min(1,(e.clientX-r.left)/r.width))*aud.duration;
}
function btbMiniSeek(e){
  if(!aud||!aud.src||!aud.duration) return;
  const r=e.currentTarget.getBoundingClientRect();
  aud.currentTime=Math.max(0,Math.min(1,(e.clientX-r.left)/r.width))*aud.duration;
}
window.btbSeekTo=btbSeekTo; window.btbMiniSeek=btbMiniSeek;
function _fmt(s){if(!s||isNaN(s))return'0:00';return Math.floor(s/60)+':'+(Math.floor(s%60)<10?'0':'')+Math.floor(s%60);}

// -- Expand / Collapse ----------------------------------------
function btbExpand(){
  expanded=true;
  document.getElementById('btb-expanded').classList.add('btb-open');
  document.getElementById('btb-mini-expand').style.visibility='hidden';
  document.getElementById('btb-mini-expand').textContent='';
}
function btbCollapse(){
  expanded=false;
  document.getElementById('btb-expanded').classList.remove('btb-open');
  document.getElementById('btb-mini-expand').textContent='&#x25B2; Open';
  document.getElementById('btb-mini-expand').style.visibility='visible';
}
window.btbExpand=btbExpand; window.btbCollapse=btbCollapse;

// -- Disco ----------------------------------------------------
function btbReqDisco(){
  if(discoOn){_stopDisco();return;}
  if(localStorage.getItem('btb-dw')==='1'){_startDisco();return;}
  document.getElementById('btb-wo').classList.remove('btb-h');
}
function btbWCancel(){document.getElementById('btb-wo').classList.add('btb-h');document.getElementById('btb-wcb').checked=false;}
function btbWConfirm(){
  if(document.getElementById('btb-wcb').checked)localStorage.setItem('btb-dw','1');
  document.getElementById('btb-wo').classList.add('btb-h');
  _startDisco();
}
window.btbReqDisco=btbReqDisco; window.btbWCancel=btbWCancel; window.btbWConfirm=btbWConfirm;

function _startDisco(){
  discoOn=true;
  ['btb-btn-disco','btb-disco-mini'].forEach(id=>{
    const el=document.getElementById(id);
    el.classList.add('btb-on'); el.innerHTML='&#x2605; ON';
  });
  document.getElementById('btb-dc').classList.add('btb-on');
  if(aud.paused){
    if(curIdx<0) btbLoadT(0,true);
    else{_initACtx();_resume();aud.play().catch(()=>{});}
  }
  _initLED(); if(!raf) _ledLoop();
}
function _stopDisco(){discoFading=true;}
function _finishStopDisco(){
  discoOn=false; discoFading=false;
  ['btb-btn-disco','btb-disco-mini'].forEach(id=>{
    const el=document.getElementById(id);
    el.classList.remove('btb-on'); el.innerHTML='&#x2605; Disco';
  });
  document.getElementById('btb-dc').classList.remove('btb-on');
  gc.fillStyle='#000'; gc.fillRect(0,0,cv.width,cv.height);
  if(raf){cancelAnimationFrame(raf);raf=null;}
}

function _setMirror(on) {
  doMirror = on;
  document.getElementById('btb-tog-mirror').classList.toggle('btb-on', on);
}

// -- FX switching ---------------------------------------------
function btbSetFX(fx) {
  curFX = fx;

  // Keep dropdown in sync
  const sel = document.getElementById('btb-fx-select');
  if (sel && sel.value !== fx) sel.value = fx;

  const plug = _plugins.get(fx);

  // Load sens/brt/mirror defaults
  const d = CFG.fx[fx] || { sens: 1.1, brt: 0.90 };
  const sens   = plug && plug.sens   !== undefined ? plug.sens   : d.sens;
  const brt    = plug && plug.brt    !== undefined ? plug.brt    : d.brt;
  const mirror = plug && plug.mirror !== undefined ? plug.mirror : CFG.defaultMirror;

  document.getElementById('btb-sens').value = sens;
  document.getElementById('btb-brt').value  = brt;
  _setMirror(mirror);

  // Built-in inits
  if (fx === 'rain')      _initRain();
  if (fx === 'starfield') _initStars();

  // Plugin init
  if (plug && discoOn) plug.init(_ledCtx());

  // Render custom controls for this plugin
  _renderCustomControls(plug);
}
window.btbSetFX = btbSetFX;

function btbTogMirror() {
  _setMirror(!doMirror);
}
window.btbTogMirror = btbTogMirror;

// -- Plugin custom controls -----------------------------------

/**
 * Build (or clear) the custom controls row for the active plugin.
 * Values persist in _pluginControlValues for the session.
 */
function _renderCustomControls(plug) {
  const row = document.getElementById('btb-dc-custom-row');
  if (!row) return;

  row.innerHTML = '';
  row.classList.remove('btb-has-controls');

  if (!plug || !Array.isArray(plug.controls) || plug.controls.length === 0) return;

  // Section label
  const lbl = document.createElement('span');
  lbl.className = 'btb-cust-label';
  lbl.textContent = 'Controls';
  row.appendChild(lbl);

  plug.controls.forEach(ctrl => {
    const storeKey = plug.name + '.' + ctrl.id;
    const stored = _pluginControlValues.get(storeKey);
    const val = stored !== undefined ? stored : ctrl.default;
    if (stored === undefined) _pluginControlValues.set(storeKey, val);

    if (ctrl.type === 'range') {
      const wrap = document.createElement('div');
      wrap.className = 'btb-cust-range';

      const label = document.createElement('span');
      label.className = 'btb-cust-range-label';
      label.textContent = ctrl.label;
      wrap.appendChild(label);

      const input = document.createElement('input');
      input.type  = 'range';
      input.min   = ctrl.min  !== undefined ? ctrl.min  : 0;
      input.max   = ctrl.max  !== undefined ? ctrl.max  : 1;
      input.step  = ctrl.step !== undefined ? ctrl.step : 0.01;
      input.value = val;
      input.oninput = () => _pluginControlValues.set(storeKey, parseFloat(input.value));
      wrap.appendChild(input);

      row.appendChild(wrap);

    } else if (ctrl.type === 'toggle') {
      const btn = document.createElement('button');
      btn.className = 'btb-cust-toggle' + (val ? ' btb-on' : '');
      btn.textContent = ctrl.label;
      btn.onclick = () => {
        const next = !_pluginControlValues.get(storeKey);
        _pluginControlValues.set(storeKey, next);
        btn.classList.toggle('btb-on', next);
      };
      row.appendChild(btn);

    } else if (ctrl.type === 'select') {
      const wrap = document.createElement('div');
      wrap.className = 'btb-cust-select-wrap';

      const label = document.createElement('span');
      label.className = 'btb-cust-select-label';
      label.textContent = ctrl.label;
      wrap.appendChild(label);

      const sel = document.createElement('select');
      sel.className = 'btb-cust-select';
      (ctrl.options || []).forEach(opt => {
        const o = document.createElement('option');
        o.value       = opt.value !== undefined ? opt.value : opt;
        o.textContent = opt.label !== undefined ? opt.label : opt;
        if (String(o.value) === String(val)) o.selected = true;
        sel.appendChild(o);
      });
      sel.onchange = () => _pluginControlValues.set(storeKey, sel.value);
      wrap.appendChild(sel);

      row.appendChild(wrap);
    }
  });

  row.classList.add('btb-has-controls');
}

/**
 * Returns a plain object of current values for a plugin's custom controls.
 * Passed as state.controls in every draw() call.
 */
function _getPluginControls(plug) {
  if (!plug || !Array.isArray(plug.controls)) return {};
  const out = {};
  plug.controls.forEach(ctrl => {
    const storeKey = plug.name + '.' + ctrl.id;
    const stored = _pluginControlValues.get(storeKey);
    out[ctrl.id] = stored !== undefined ? stored : ctrl.default;
  });
  return out;
}

function btbTogFront(){
  cvFront=!cvFront;
  cv.classList.toggle('btb-front',cvFront);
  if(CFG.pageWrapId){
    const wrap=document.getElementById(CFG.pageWrapId);
    if(wrap){wrap.style.transition=`opacity ${CFG.fgFadeDuration} ease`;wrap.style.opacity=cvFront?'0':'1';}
  }
  const label=cvFront?'&#x2B1C; BG':'&#x2B1B; FG';
  const title=cvFront?'Send LED to background':'Bring LED to front';
  ['btb-cv-front','btb-cv-front-exp'].forEach(id=>{
    const el=document.getElementById(id);if(!el)return;
    el.classList.toggle('btb-on',cvFront);el.title=title;el.innerHTML=label;
  });
}
window.btbTogFront=btbTogFront;

function btbCloseTip(){
  const tip=document.getElementById('btb-tip');if(!tip)return;
  if(document.getElementById('btb-tip-cb').checked)localStorage.setItem('btb-tip-hide','1');
  tip.style.display='none';
}
window.btbCloseTip=btbCloseTip;
const _origReqDisco=window.btbReqDisco;
window.btbReqDisco=function(){btbCloseTip();_origReqDisco();};

// -- LED Engine -----------------------------------------------
let cv, gc;
const LED_FILL=0.72, GLOW_R=1.55;
let COLS,ROWS,CELL,LED_R;
let rain=[],stars=[];
const pkH=[],gradCache=new Map();
const _getSens=()=>parseFloat(document.getElementById('btb-sens').value);
const _getBrt=()=>parseFloat(document.getElementById('btb-brt').value);

function _initLED(){
  _resizeLED();_initRain();_initStars();
  for(let i=0;i<COLS;i++)pkH[i]=0;
  gradCache.clear();
  const plug=_plugins.get(curFX);
  if(plug) plug.init(_ledCtx());
}
function _initRain(){rain=Array.from({length:COLS},()=>({y:-10,speed:0,active:false,bright:0,t:0}));}
function _initStars(){stars=Array.from({length:280},()=>({x:(Math.random()-.5)*2,y:(Math.random()-.5)*2,z:Math.random(),pz:0}));}
function _resizeLED(){
  cv.width=window.innerWidth; cv.height=window.innerHeight;
  const tgt=cv.width<500?CFG.ledSizeMobile:CFG.ledSize;
  COLS=Math.max(20,Math.round(cv.width/tgt));
  CELL=cv.width/COLS; LED_R=(CELL*LED_FILL)/2;
  ROWS=Math.ceil(cv.height/CELL)+1; gradCache.clear();
}
window.addEventListener('resize',()=>{if(discoOn){_resizeLED();_initLED();}});

function _dot(col,row,hue,sat,lum){
  if(col<0||col>=COLS||row<0||row>=ROWS)return;
  lum=Math.min(lum*_getBrt(),78);if(lum<2)return;
  hue=((hue%360)+360)%360;
  const hk=Math.round(hue/6)*6,sk=Math.round(sat/5)*5,lk=Math.round(lum/4)*4;
  const key=hk+'_'+sk+'_'+lk;
  const cx2=(col+.5)*CELL,cy2=(row+.5)*CELL,gr=LED_R*GLOW_R;
  let g=gradCache.get(key);
  if(!g){
    g=gc.createRadialGradient(0,0,0,0,0,gr);
    g.addColorStop(0,`hsl(${hk},${Math.max(0,sk-35)}%,${Math.min(95,lk+32)}%)`);
    g.addColorStop(.20,`hsl(${hk},${sk}%,${Math.min(88,lk+18)}%)`);
    g.addColorStop(.58,`hsl(${hk},${sk}%,${lk}%)`);
    g.addColorStop(.85,`hsl(${hk},${sk}%,${Math.round(lk*.52)}%)`);
    g.addColorStop(1,`hsla(${hk},${sk}%,${Math.round(lk*.28)}%,0)`);
    gradCache.set(key,g);if(gradCache.size>900)gradCache.delete(gradCache.keys().next().value);
  }
  gc.save();gc.translate(cx2,cy2);gc.fillStyle=g;gc.beginPath();gc.arc(0,0,gr,0,Math.PI*2);gc.fill();gc.restore();
}
function setLED(c,r,h,s,l,palT){
  if(c<0||c>=COLS||r<0||r>=ROWS)return;
  let fh=h,fs=s,fl=l;
  if(palT!==undefined){const[ph,ps,pl]=palHSL(palT);fh=ph;fs=ps;fl=Math.min(pl*(l/50),90);}
  if(doMirror){
    const half=COLS/2,fold=c<half?c:COLS-1-c;
    _dot(fold,r,fh,fs,fl);
    const m=COLS-1-fold;if(m!==fold)_dot(m,r,fh,fs,fl);
  }else{_dot(c,r,fh,fs,fl);}
}

function _ledCtx(){
  return {
    setLED,
    get COLS(){ return COLS; },
    get ROWS(){ return ROWS; },
    get CELL(){ return CELL; },
    get phase(){ return phase; },
    colT: c => c / Math.max(1, COLS - 1),
    get canvas(){ return cv; },
    get gc(){ return gc; },
    get freq(){ return freq; },
    get waveD(){ return waveD; },
    palSample,
    palHSL,
  };
}

// -- Beat detection -------------------------------------------
const HIST=43;
const bHist={b:new Float32Array(HIST),m:new Float32Array(HIST),h:new Float32Array(HIST)};
let bPtr=0;
const beat={b:0,m:0,h:0,p:0};
function _rawBand(lo,hi){
  if(!freq)return 0;let s=0;
  for(let i=lo;i<hi&&i<BL;i++)s+=freq[i];
  return Math.min((s/(hi-lo))/255*_getSens(),1.5);
}
function _updateBeats(){
  if(!analyser)return;
  analyser.getByteFrequencyData(freq);analyser.getByteTimeDomainData(waveD);
  bPtr=(bPtr+1)%HIST;
  const rb=_rawBand(0,5),rm=_rawBand(5,25),rh=_rawBand(25,100);
  bHist.b[bPtr]=rb;bHist.m[bPtr]=rm;bHist.h[bPtr]=rh;
  let ab=0,am=0,ah=0;
  for(let i=0;i<HIST;i++){ab+=bHist.b[i];am+=bHist.m[i];ah+=bHist.h[i];}
  ab/=HIST;am/=HIST;ah/=HIST;
  const T=1.55;
  beat.b=Math.max(beat.b*.80,rb>ab*T?rb:rb*.32);
  beat.m=Math.max(beat.m*.84,rm>am*T?rm:rm*.42);
  beat.h=Math.max(beat.h*.87,rh>ah*T?rh:rh*.52);
  beat.p=_rawBand(90,200)*.75;
}

// -- Main loop ------------------------------------------------
function _ledLoop(){
  raf=requestAnimationFrame(_ledLoop);
  gc.fillStyle='#000';gc.fillRect(0,0,cv.width,cv.height);
  if(discoFading){_finishStopDisco();return;}
  if(!discoOn)return;
  if(actx&&actx.state==='suspended')actx.resume();
  _updateBeats();phase+=0.016;
  gc.fillStyle='#000';gc.fillRect(0,0,cv.width,cv.height);
  const colT=c=>c/Math.max(1,COLS-1);

  const plug=_plugins.get(curFX);
  if(plug){
    plug.draw(_ledCtx(), {
      beat:     { b: beat.b, m: beat.m, h: beat.h, p: beat.p },
      sens:     _getSens(),
      brt:      _getBrt(),
      controls: _getPluginControls(plug),
    });
    return;
  }

  // Built-in effects
  switch(curFX){
    case 'spectrum': _fxSpectrum(colT); break;
    case 'rain':     _fxRain(colT);     break;
    case 'waveform': _fxWave(colT);     break;
    case 'starfield':_fxStars();        break;
  }
}

// -- Built-in effects -----------------------------------------
function _fxSpectrum(colT){
  const S=_getSens(),maxBin=Math.floor(BL*.72);
  for(let c=0;c<COLS;c++){
    const lo=Math.floor(c/COLS*maxBin),hi=Math.floor((c+1)/COLS*maxBin)+1;
    let sum=0,cnt=Math.max(1,hi-lo);
    for(let i=lo;i<hi&&i<BL;i++)sum+=freq[i];
    const raw=(sum/cnt)/255;
    const bBoost=c<COLS*.12?beat.b*.35:c<COLS*.4?beat.m*.20:beat.h*.12;
    const v=Math.min(raw*S+bBoost,1),h=Math.round(v*ROWS),t=colT(c);
    for(let r=ROWS-1;r>=ROWS-h;r--){const frac=(ROWS-r)/Math.max(h,1);setLED(c,r,0,0,22+frac*52,t);}
    pkH[c]=Math.max((pkH[c]||0)*.96,h);
    const pr=ROWS-Math.round(pkH[c]);
    if(pr>=0&&pr<ROWS&&pkH[c]>2)setLED(c,pr,0,0,75,t);
  }
}
function _fxRain(colT){
  if(beat.b>0.3){
    const n=Math.max(1,Math.round(beat.b*COLS*.18));
    for(let i=0;i<n;i++){
      const c=Math.floor(Math.random()*COLS);
      if(!rain[c].active)rain[c]={active:true,y:0,speed:.4+beat.b*1.8,bright:.6+beat.b*.4,t:colT(c)};
    }
  }
  if(Math.random()<.04){const c=Math.floor(Math.random()*COLS);if(!rain[c].active)rain[c]={active:true,y:0,speed:.3+Math.random()*.4,bright:.4,t:colT(c)};}
  for(let c=0;c<COLS;c++){
    if(!rain[c].active)continue;
    rain[c].y+=rain[c].speed+(beat.m*.6);
    const r=Math.floor(rain[c].y);
    if(r>=ROWS){rain[c].active=false;continue;}
    for(let t2=0;t2<12;t2++){const tr=r-t2;if(tr<0)continue;const a=Math.pow(1-t2/12,1.4);setLED(c,tr,0,0,Math.max(3,a*rain[c].bright*70),rain[c].t);}
  }
}
function _fxWave(colT){
  const mid=Math.floor(ROWS/2),S=_getSens(),punch=1+beat.b*2.5+beat.m;
  const samples=new Uint8Array(BL);if(analyser)analyser.getByteTimeDomainData(samples);
  for(let c=0;c<COLS;c++){
    const idx=Math.floor(c/COLS*BL);let acc=0;const W=Math.max(1,Math.floor(BL/COLS));
    for(let k=0;k<W&&idx+k<BL;k++)acc+=samples[idx+k];
    const v=(acc/W/128-1)*S*punch,h=Math.min(Math.abs(v)*(ROWS*.48),ROWS/2-1)|0,t=colT(c);
    for(let i=0;i<=h;i++){const lum=16+(i/Math.max(h,1))*58;if(v>=0)setLED(c,mid-i,0,0,lum,t);else setLED(c,mid+i,0,0,lum,t);}
    if(h>1){if(v>=0)setLED(c,mid-h,0,0,76,t);else setLED(c,mid+h,0,0,76,t);}
    if(beat.p>0.1)setLED(c,mid,0,0,Math.round(beat.p*42),(phase*.08)%1);
  }
}
function _fxStars(){
  const spd=.003+beat.b*.055+beat.m*.012,cx=COLS/2,cy=ROWS/2;
  for(let i=0;i<stars.length;i++){
    const s=stars[i];s.pz=s.z;s.z-=spd;
    if(s.z<=0){s.x=(Math.random()-.5)*2;s.y=(Math.random()-.5)*2;s.z=1;s.pz=1;}
    const sx=Math.round(cx+(s.x/s.z)*(COLS*.5)),sy=Math.round(cy+(s.y/s.z)*(ROWS*.5));
    if(sx<0||sx>=COLS||sy<0||sy>=ROWS){s.z=Math.max(.01,s.z-spd*2);continue;}
    const brt=Math.pow(1-s.z,1.8),lum=Math.min(10+brt*72,75),t=((i*.618)+phase*.05)%1;
    if(spd>0.015){const opx=Math.round(cx+(s.x/s.pz)*(COLS*.5)),opy=Math.round(cy+(s.y/s.pz)*(ROWS*.5));if(opx>=0&&opx<COLS&&opy>=0&&opy<ROWS)setLED(opx,opy,0,0,lum*.35,t);}
    setLED(sx,sy,0,0,lum,t);
  }
}

// -- Keyboard shortcuts ---------------------------------------
document.addEventListener('keydown',e=>{
  if(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA'||e.metaKey||e.ctrlKey)return;
  if(e.code==='Space'){e.preventDefault();btbTogglePlay();}
  if(e.code==='KeyN')btbNextT();
  if(e.code==='KeyP')btbPrevT();
  if(e.code==='KeyD')btbReqDisco();
  if(e.code==='KeyM')expanded?btbCollapse():btbExpand();
});

// -- Autoplay on first interaction ----------------------------


function btbTryAutoplay(){
  if(!autoplayPending||autoplayStarted)return;
  autoplayStarted=true; autoplayPending=false;
  btbLoadT(0,true);
}

// -- Tip bubble -----------------------------------------------
function _initTip(){
  if(!CFG.showTip) {document.getElementById('btb-tip').style.display='none';return;}
  const tip=document.getElementById('btb-tip');
  if(localStorage.getItem('btb-tip-hide')==='1'){tip.style.display='none';return;}
  function positionTip(){
    const btn=document.getElementById('btb-disco-mini');if(!btn)return;
    const r=btn.getBoundingClientRect();
    tip.style.bottom=(window.innerHeight-r.top+14)+'px';
    tip.style.right=(window.innerWidth-r.right-42)+'px';
  }
  setTimeout(positionTip,300);
  window.addEventListener('resize',positionTip);
}

// -- Boot -----------------------------------------------------
function _boot(){
  _buildHTML();

  cv = document.getElementById('btb-cv');
  gc = cv.getContext('2d');
  _initAudio();
  _initPresets();

  _drainPluginQueue();
  if (_plugins.size === 0) {
    console.warn('[BTBPlayer] No plugins found. Did you load fx/*.js before burd-player.js?');
  }
  _plugins.forEach((plug, key) => _appendPluginButton(key));

  const presetIdx = CFG.randomPreset
    ? Math.floor(Math.random()*CFG.colorPresets.length)
    : CFG.defaultPreset;
  btbApplyPreset(presetIdx);
  _drawPrev();
  _resizeLED();

  const allFX = [..._plugins.keys()];
  const fxKey = CFG.randomFX
    ? allFX[Math.floor(Math.random() * allFX.length)]
    : (allFX.includes(CFG.defaultFX) ? CFG.defaultFX : allFX[0]);
  if (fxKey) btbSetFX(fxKey);

  btbSetAlpha(CFG.defaultOpacity);
  raf = requestAnimationFrame(_ledLoop);

  fetch(CFG.tracksUrl)
    .then(r=>r.json())
    .then(data=>{
      TRACKS = Array.isArray(data) ? data : [];
      _buildTrackList();
      if(TRACKS.length>0){
        btbLoadT(0,false);
        autoplayPending=false;
        const _playerEl = document.getElementById('btb-mini');
        if (_playerEl) {
          ['click', 'keydown', 'touchstart'].forEach(ev => {
            _playerEl.addEventListener(ev, btbTryAutoplay, { once: true, passive: true });
          });
        }
      }
    })
    .catch(()=>{
      document.getElementById('btb-tl').innerHTML=
        '<div style="padding:20px;text-align:center;font-size:11px;color:var(--btb-tmut);letter-spacing:2px">Could not load tracks.json</div>';
    });

  setTimeout(()=>document.getElementById('btb-mini').classList.add('btb-ready'),100);
  _initTip();

  _booted = true;
}

// -- Public API -----------------------------------------------
window.BTBPlayer = {
  registerFX(plug){ _registerPlugin(plug); },
  get plugins(){ return [..._plugins.keys()]; },
  get analyser(){ return analyser; },
  get freq(){ return freq; },
  palSample,
  palHSL,
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => setTimeout(_boot, 0));
} else {
  setTimeout(_boot, 0);
}

})();
