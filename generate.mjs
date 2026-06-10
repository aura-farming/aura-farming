// Generates assets/terminal.svg — the animated profile header.
// A light, vertical Claude Code session with a warm harvest palette.
// Self-contained: embeds subsetted JetBrains Mono, animates with pure CSS.
// Run: node generate.mjs

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const b64 = (f) => readFileSync(join(ROOT, f)).toString('base64');

// ---------------------------------------------------------------- timeline
const T = 14; // loop duration, seconds
const pct = (t) => +((t / T) * 100).toFixed(3);

// ---------------------------------------------------------------- metrics
const FS = 15;        // body font size
const CW = FS * 0.6;  // JetBrains Mono advance = exactly 0.6em
const LH = 25;        // line height
const GUT = 38;       // gutter x (>, bullets, stars)
const BODY = 58;      // body text x
const rowY = (r) => 78 + r * LH;

const VB = { w: 580, h: 648 };
const WIN = { x: 14, y: 10, w: 552, h: 622, r: 10 };
const BAR = 34;

// ---------------------------------------------------------------- palette
// Warm harvest tones pulled from the profile picture: sun gold, amber,
// burnt orange, deep seed-brown — on a white terminal.
const C = {
  win: '#FFFFFF',
  winBot: '#FFFCF4',
  border: '#E3D9C6',
  bar: '#FAF5EA',
  barLine: '#ECE2CE',
  dotR: '#FF5F57',
  dotY: '#FEBC2E',
  dotG: '#28C840',
  title: '#8A7B62',
  text: '#2B2114',
  dim: '#9A8C76',
  accent: '#C2641F',     // burnt orange — prompt, stars, auto mode
  amberDeep: '#B5541A',  // flow gradient stops
  amber: '#D98E2B',
  sun: '#F5C84C',
  gold: '#E8B33A',       // shimmer band
  boxStroke: '#D8CCB4',
  cursor: '#2B2114',
  logo: '#181008',
};

// ---------------------------------------------------------------- script
const PROMPT_TEXT = 'who is aura-farmer';
const TYPE_AT = 0.8;
const CPS = 0.085;
const TYPE_END = TYPE_AT + PROMPT_TEXT.length * CPS; // 2.33
const ENTER = 2.5;

const tUser = 2.55;     // "> who is aura-farmer" enters transcript
const tThinkOn = 2.95;  // ✳ Cultivating… (shimmer)
const tThinkOff = 5.9;
const tName = 5.95;     // ● Lucas — Brisbane, AU
const tTag = 6.2;       // tagline with flowing colors
const tMeta = 7.1;      // dim tool line
const tStatus = 8.0;    // ● harness green …
const tDone = 9.2;      // ✳ Cultivated for 14s
const FADE_START = 13.4;
const FADE_END = 13.95;

const TAGLINE = 'building agents, harnesses & infra';
const THINKING = 'Cultivating…';

// transcript rows
const ROWS = {
  user: 0,    // > who is aura-farmer
  name: 2,    // ● Lucas — Brisbane, AU   (thinking line lives here too)
  tag: 3,     // building agents, harnesses & infra
  meta: 5,    // Planted 12 agents · all growing (ctrl+o to expand)
  status: 7,  // ● harness green · evals passing · infra holding
  done: 9,    // ✳ Cultivated for 14s
};

// input box
const BOX = { x: 30, y: 518, w: 520, h: 44, r: 8 };
const BOX_TEXT_X = 64;
const BOX_BASE = 545;   // text baseline inside box
const CURSOR = { y: 530, w: CW, h: 19 };

// ---------------------------------------------------------------- helpers
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// hidden until t, then visible (parent .session handles the end fade)
const appearKF = (name, t) =>
  `@keyframes ${name}{0%,${pct(t)}%{opacity:0}${pct(t + 0.06)}%,100%{opacity:1}}`;
// visible only inside [a, b]
const windowKF = (name, a, b) =>
  `@keyframes ${name}{0%,${pct(a)}%{opacity:0}${pct(a + 0.05)}%,${pct(b)}%{opacity:1}${pct(b + 0.05)}%,100%{opacity:0}}`;

let css = '';
const anim = (cls, kf) => { css += kf + `.${cls}{animation:${cls} ${T}s linear infinite}`; };

// ---------------------------------------------------------------- typed chars (input box)
let boxSpans = '';
[...PROMPT_TEXT].forEach((ch, i) => {
  const on = TYPE_AT + (i + 1) * CPS;
  const k = `bc${i}`;
  anim(k, windowKF(k, on, ENTER));
  boxSpans += `<tspan class="${k}" opacity="0">${esc(ch)}</tspan>`;
});

// ---------------------------------------------------------------- transcript
anim('aUser', appearKF('aUser', tUser));
anim('aName', appearKF('aName', tName));
anim('aTag', appearKF('aTag', tTag));
anim('aMeta', appearKF('aMeta', tMeta));
anim('aStatus', appearKF('aStatus', tStatus));
anim('aDone', appearKF('aDone', tDone));
anim('aThink', windowKF('aThink', tThinkOn, tThinkOff));

// session fade (clear screen before loop restarts)
anim('session', `@keyframes session{0%,${pct(FADE_START)}%{opacity:1}${pct(FADE_END)}%,100%{opacity:0}}`);

// ---------------------------------------------------------------- cursor
// Lives in the input box: blinks while idle, steps along while typing.
const moveStops = [
  { t: 0, x: 0 },
  { t: TYPE_AT, x: 0, steps: PROMPT_TEXT.length },
  { t: TYPE_END, x: PROMPT_TEXT.length * CW },
  { t: ENTER, x: 0 },
  { t: T, x: 0 },
];
let moveKF = '@keyframes cmove{';
for (const s of moveStops) {
  const timing = s.steps ? `steps(${s.steps},end)` : 'steps(1,end)';
  moveKF += `${pct(s.t)}%{transform:translate(${+s.x.toFixed(1)}px,0px);animation-timing-function:${timing}}`;
}
moveKF += '}';
css += moveKF + `.cursorG{animation:cmove ${T}s linear infinite}`;

const BLINK = 0.55;
const blinkStops = [];
const blinkWindow = (from, to) => {
  let on = true;
  for (let t = from; t < to; t += BLINK) { blinkStops.push({ t, on }); on = !on; }
};
blinkWindow(0, TYPE_AT);
blinkStops.push({ t: TYPE_AT, on: true });   // solid while typing
blinkWindow(ENTER, T);
let blinkKF = '@keyframes cblink{';
for (const s of blinkStops.sort((a, b) => a.t - b.t)) {
  blinkKF += `${pct(s.t)}%{opacity:${s.on ? 0.85 : 0};animation-timing-function:steps(1,end)}`;
}
blinkKF += '}';
css += blinkKF + `.cursorR{animation:cblink ${T}s linear infinite}`;

// ---------------------------------------------------------------- flare
// Colors flow through the tagline: a doubled sunrise gradient slides
// behind text-shaped clipping. The thinking line gets the Claude Code
// shimmer: a gold band sweeping through grey text.
const TAG_W = TAGLINE.length * CW; // 306
css += `@keyframes flow{from{transform:translateX(0)}to{transform:translateX(-${TAG_W}px)}}`;
css += `.flowRect{animation:flow 6s linear infinite}`;
const THINK_W = THINKING.length * CW;
css += `@keyframes sweep{from{transform:translateX(0)}to{transform:translateX(${THINK_W + 190}px)}}`;
css += `.sweepRect{animation:sweep 1.6s linear infinite}`;
css += `@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(180deg)}}`;
css += `.spin{animation:spin 1.1s linear infinite}`;

// ---------------------------------------------------------------- shapes
const star = (x, y, color, cls = '') => `
<g transform="translate(${x},${y})"><g class="${cls}">
<line x1="0" y1="-5.5" x2="0" y2="5.5" stroke="${color}" stroke-width="1.7" stroke-linecap="round"/>
<line x1="-4.76" y1="-2.75" x2="4.76" y2="2.75" stroke="${color}" stroke-width="1.7" stroke-linecap="round"/>
<line x1="-4.76" y1="2.75" x2="4.76" y2="-2.75" stroke="${color}" stroke-width="1.7" stroke-linecap="round"/>
</g></g>`;

const bullet = (row) => `<circle cx="${GUT + 5}" cy="${rowY(row) - 5}" r="3.4" fill="${C.text}"/>`;

// ---------------------------------------------------------------- fonts
const fontReg = b64('assets/fonts/jbmono-regular-subset.woff2');
const fontBold = b64('assets/fonts/jbmono-bold-subset.woff2');

// ---------------------------------------------------------------- svg
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${VB.w}" height="${VB.h}" viewBox="0 0 ${VB.w} ${VB.h}" role="img" aria-labelledby="t d">
<title id="t">aura-farmer — Lucas Daish, Brisbane AU — building agents, harnesses &amp; infra</title>
<desc id="d">An animated Claude Code session. Prompt: who is aura-farmer. Response: Lucas Daish, Brisbane AU — building agents, harnesses and infra. Planted 12 agents, all growing. Harness green, evals passing, infra holding. Cultivated for 14s.</desc>
<style>
@font-face{font-family:'JBM';src:url(data:font/woff2;base64,${fontReg}) format('woff2');font-weight:400;font-style:normal}
@font-face{font-family:'JBM';src:url(data:font/woff2;base64,${fontBold}) format('woff2');font-weight:700;font-style:normal}
text{font-family:'JBM','SF Mono',ui-monospace,Menlo,Consolas,monospace;font-size:${FS}px;fill:${C.text}}
.dim{fill:${C.dim}}
.title{font-size:12px;fill:${C.title};text-anchor:middle}
.small{font-size:13px}
.logoLine{font-size:22px;text-anchor:end}
.logoMark{font-weight:700;fill:${C.logo}}
${css}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}
</style>
<defs>
<linearGradient id="bgwin" x1="0" y1="0" x2="0" y2="1">
<stop offset="0" stop-color="${C.win}"/><stop offset="1" stop-color="${C.winBot}"/>
</linearGradient>
<linearGradient id="flow" x1="0" y1="0" x2="0.5" y2="0" spreadMethod="repeat">
<stop offset="0" stop-color="${C.amberDeep}"/>
<stop offset="0.3333" stop-color="${C.amber}"/>
<stop offset="0.6667" stop-color="${C.sun}"/>
<stop offset="1" stop-color="${C.amberDeep}"/>
</linearGradient>
<linearGradient id="band" x1="0" y1="0" x2="1" y2="0">
<stop offset="0" stop-color="${C.gold}" stop-opacity="0"/>
<stop offset="0.5" stop-color="${C.gold}" stop-opacity="0.9"/>
<stop offset="1" stop-color="${C.gold}" stop-opacity="0"/>
</linearGradient>
<clipPath id="win"><rect x="${WIN.x}" y="${WIN.y}" width="${WIN.w}" height="${WIN.h}" rx="${WIN.r}"/></clipPath>
<clipPath id="tagClip"><text x="${BODY}" y="${rowY(ROWS.tag)}" xml:space="preserve">${esc(TAGLINE)}</text></clipPath>
<clipPath id="thinkClip"><text x="${BODY}" y="${rowY(ROWS.name)}" xml:space="preserve">${THINKING}</text></clipPath>
<filter id="shadow" x="-6%" y="-6%" width="112%" height="116%">
<feDropShadow dx="0" dy="8" stdDeviation="14" flood-color="#3A2A10" flood-opacity="0.16"/>
</filter>
</defs>

<g filter="url(#shadow)">
<rect x="${WIN.x}" y="${WIN.y}" width="${WIN.w}" height="${WIN.h}" rx="${WIN.r}" fill="url(#bgwin)" stroke="${C.border}" stroke-width="1"/>
</g>

<g clip-path="url(#win)">
<rect x="${WIN.x}" y="${WIN.y}" width="${WIN.w}" height="${BAR}" fill="${C.bar}"/>
<line x1="${WIN.x}" y1="${WIN.y + BAR}" x2="${WIN.x + WIN.w}" y2="${WIN.y + BAR}" stroke="${C.barLine}" stroke-width="1"/>
<circle cx="34" cy="${WIN.y + BAR / 2}" r="5.5" fill="${C.dotR}"/>
<circle cx="54" cy="${WIN.y + BAR / 2}" r="5.5" fill="${C.dotY}"/>
<circle cx="74" cy="${WIN.y + BAR / 2}" r="5.5" fill="${C.dotG}"/>
<text x="${VB.w / 2}" y="${WIN.y + BAR / 2 + 4}" class="title" xml:space="preserve">aura-farmer@bne — claude</text>

<g class="session">
  <text x="${GUT}" y="${rowY(ROWS.user)}" class="dim aUser" opacity="0" xml:space="preserve">&gt; ${esc(PROMPT_TEXT)}</text>

  <g class="aThink" opacity="0">
    ${star(GUT + 5, rowY(ROWS.name) - 5, C.accent, 'spin')}
    <text x="${BODY}" y="${rowY(ROWS.name)}" class="dim" xml:space="preserve">${THINKING}</text>
    <g clip-path="url(#thinkClip)">
      <rect class="sweepRect" x="${BODY - 95}" y="${rowY(ROWS.name) - 14}" width="95" height="19" fill="url(#band)"/>
    </g>
  </g>

  <g class="aName" opacity="0">
    ${bullet(ROWS.name)}
    <text x="${BODY}" y="${rowY(ROWS.name)}" xml:space="preserve">Lucas Daish — Brisbane, AU</text>
  </g>

  <g class="aTag" opacity="0">
    <g clip-path="url(#tagClip)">
      <rect class="flowRect" x="${BODY}" y="${rowY(ROWS.tag) - 14}" width="${TAG_W * 2}" height="19" fill="url(#flow)"/>
    </g>
  </g>

  <text x="${BODY}" y="${rowY(ROWS.meta)}" class="dim aMeta" opacity="0" xml:space="preserve">Planted 12 agents · all growing (ctrl+o to expand)</text>

  <g class="aStatus" opacity="0">
    ${bullet(ROWS.status)}
    <text x="${BODY}" y="${rowY(ROWS.status)}" xml:space="preserve">harness green · evals passing · infra holding</text>
  </g>

  <g class="aDone" opacity="0">
    ${star(GUT + 5, rowY(ROWS.done) - 5, C.amber)}
    <text x="${BODY}" y="${rowY(ROWS.done)}" class="dim" xml:space="preserve">Cultivated for 14s</text>
  </g>
</g>

<rect x="${BOX.x}" y="${BOX.y}" width="${BOX.w}" height="${BOX.h}" rx="${BOX.r}" fill="#FFFFFF" stroke="${C.boxStroke}" stroke-width="1.2"/>
<path d="M46 ${BOX.y + 15} l5.5 7 l-5.5 7" fill="none" stroke="${C.accent}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
<text x="${BOX_TEXT_X}" y="${BOX_BASE}" xml:space="preserve">${boxSpans}</text>
<g class="cursorG" transform="translate(0,0)">
<rect class="cursorR" x="${BOX_TEXT_X}" y="${CURSOR.y}" width="${CURSOR.w}" height="${CURSOR.h}" fill="${C.cursor}" opacity="0.85"/>
</g>

<path d="M30 581 l7 4.5 l-7 4.5 z M39 581 l7 4.5 l-7 4.5 z" fill="${C.accent}"/>
<text x="52" y="590" class="small" fill="${C.accent}" xml:space="preserve">auto mode on (shift+tab to cycle)</text>

<text x="542" y="616" class="logoLine" xml:space="preserve"><tspan class="dim">// </tspan><tspan class="logoMark">/&#x42F;</tspan></text>
</g>
</svg>
`;

writeFileSync(join(ROOT, 'assets/terminal.svg'), svg);
console.log(`assets/terminal.svg written — ${(svg.length / 1024).toFixed(1)} KB, loop ${T}s`);
