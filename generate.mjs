// Generates assets/terminal.svg — the animated profile header.
// A light, vertical Claude Code session with a warm harvest palette.
// Body text uses DejaVu Sans Mono (what Menlo, the macOS terminal font,
// is derived from); the /Я logo mark stays JetBrains Mono Bold.
// Self-contained: fonts embedded, pure CSS animation. Run: node generate.mjs

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const b64 = (f) => readFileSync(join(ROOT, f)).toString('base64');

// ---------------------------------------------------------------- timeline
const T = 14; // loop duration, seconds
const pct = (t) => +((t / T) * 100).toFixed(3);

// ---------------------------------------------------------------- metrics
const FS = 12;             // body font size — small, like a real terminal
const CW = FS * 0.60205;   // DejaVu Sans Mono advance = 0.60205em
const LH = 22;             // line height
const GUT = 38;            // gutter x (>, bullets, stars)
const BODY = 52;           // body text x
const rowY = (r) => 76 + r * LH;

const VB = { w: 580, h: 594 };
const WIN = { x: 8, y: 8, w: 564, h: 564, r: 10 };
const BAR = 36;

// ---------------------------------------------------------------- palette
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
  accent: '#C2641F',     // burnt orange — prompt, spinner, auto mode
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
const TYPE_END = TYPE_AT + PROMPT_TEXT.length * CPS;
const ENTER = 2.5;

const tUser = 2.55;
const tThinkOn = 2.95;
const tThinkOff = 5.9;
const tName = 5.95;
const tTag = 6.2;
const tMeta = 7.1;
const tStatus = 8.0;
const tDone = 9.2;
const FADE_START = 13.4;
const FADE_END = 13.95;

const TAGLINE = 'building agents, harnesses & some other shit';
const THINKING = 'Cultivating…';
const SPINNER = ['·', '✢', '✳', '✻']; // real Claude Code spinner glyphs

const ROWS = { user: 0, name: 2, tag: 3, meta: 5, status: 7, done: 9 };

// input box
const BOX = { x: 26, y: 478, w: 528, h: 40, r: 8 };
const BOX_TEXT_X = 58;
const BOX_BASE = 503;
const CURSOR = { y: 490, w: CW, h: 16 };
const FOOT_BASE = 545;

// ---------------------------------------------------------------- helpers
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const appearKF = (name, t) =>
  `@keyframes ${name}{0%,${pct(t)}%{opacity:0}${pct(t + 0.06)}%,100%{opacity:1}}`;
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
anim('session', `@keyframes session{0%,${pct(FADE_START)}%{opacity:1}${pct(FADE_END)}%,100%{opacity:0}}`);

// ---------------------------------------------------------------- cursor
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
blinkStops.push({ t: TYPE_AT, on: true });
blinkWindow(ENTER, T);
let blinkKF = '@keyframes cblink{';
for (const s of blinkStops.sort((a, b) => a.t - b.t)) {
  blinkKF += `${pct(s.t)}%{opacity:${s.on ? 0.85 : 0};animation-timing-function:steps(1,end)}`;
}
blinkKF += '}';
css += blinkKF + `.cursorR{animation:cblink ${T}s linear infinite}`;

// ---------------------------------------------------------------- flare
const TAG_W = +(TAGLINE.length * CW).toFixed(1);
css += `@keyframes flow{from{transform:translateX(0)}to{transform:translateX(-${TAG_W}px)}}`;
css += `.flowRect{animation:flow 6s linear infinite}`;
const THINK_W = THINKING.length * CW;
css += `@keyframes sweep{from{transform:translateX(0)}to{transform:translateX(${(THINK_W + 160).toFixed(0)}px)}}`;
css += `.sweepRect{animation:sweep 1.6s linear infinite}`;

// Spinner: cycle through the real Claude Code glyphs (· ✢ ✳ ✻),
// one visible at a time, like the actual TUI.
const SPIN_T = 1.4;
SPINNER.forEach((_, i) => {
  const a = (i / SPINNER.length) * 100;
  const b = ((i + 1) / SPINNER.length) * 100;
  css += `@keyframes sp${i}{0%,${a.toFixed(1)}%{opacity:0}${(a + 0.1).toFixed(1)}%,${b.toFixed(1)}%{opacity:1}${(b + 0.1).toFixed(1)}%,100%{opacity:0}}`;
  // first state starts visible at 0%
  if (i === 0) css = css.replace(`@keyframes sp0{0%,0.0%{opacity:0}0.1%,25.0%{opacity:1}`, `@keyframes sp0{0%,25.0%{opacity:1}`);
  css += `.sp${i}{animation:sp${i} ${SPIN_T}s linear infinite}`;
});

const bullet = (row) => `<circle cx="${GUT + 3}" cy="${rowY(row) - 4}" r="2.6" fill="${C.text}"/>`;

// ---------------------------------------------------------------- fonts
const fontMono = b64('assets/fonts/dejavu-mono-subset.woff2');
const fontLogo = b64('assets/fonts/jbmono-bold-subset.woff2');

// ---------------------------------------------------------------- svg
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${VB.w}" height="${VB.h}" viewBox="0 0 ${VB.w} ${VB.h}" role="img" aria-labelledby="t d">
<title id="t">aura-farmer — Lucas Daish, Brisbane AU — building agents, harnesses &amp; some other shit</title>
<desc id="d">An animated Claude Code session. Prompt: who is aura-farmer. Response: Lucas Daish, Brisbane AU — building agents, harnesses and some other shit. Planted 12 agents, all growing. Harness green, evals passing, infra holding. It&apos;s time for a 4x.</desc>
<style>
@font-face{font-family:'DVM';src:url(data:font/woff2;base64,${fontMono}) format('woff2');font-weight:400;font-style:normal}
@font-face{font-family:'JBM';src:url(data:font/woff2;base64,${fontLogo}) format('woff2');font-weight:700;font-style:normal}
text{font-family:'DVM',Menlo,'SF Mono',ui-monospace,Consolas,monospace;font-size:${FS}px;fill:${C.text}}
.dim{fill:${C.dim}}
.acc{fill:${C.accent}}
.title{font-size:11px;fill:${C.title};text-anchor:middle}
.small{font-size:11px}
.logoLine{font-size:11px;text-anchor:end}
.logoMark{font-family:'JBM',Menlo,monospace;font-weight:700;fill:${C.logo}}
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
<filter id="shadow" x="-4%" y="-4%" width="108%" height="112%">
<feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="#3A2A10" flood-opacity="0.18"/>
</filter>
</defs>

<g filter="url(#shadow)">
<rect x="${WIN.x}" y="${WIN.y}" width="${WIN.w}" height="${WIN.h}" rx="${WIN.r}" fill="url(#bgwin)" stroke="${C.border}" stroke-width="1"/>
</g>

<g clip-path="url(#win)">
<rect x="${WIN.x}" y="${WIN.y}" width="${WIN.w}" height="${BAR}" fill="${C.bar}"/>
<line x1="${WIN.x}" y1="${WIN.y + BAR}" x2="${WIN.x + WIN.w}" y2="${WIN.y + BAR}" stroke="${C.barLine}" stroke-width="1"/>
<circle cx="28" cy="${WIN.y + BAR / 2}" r="5.5" fill="${C.dotR}"/>
<circle cx="48" cy="${WIN.y + BAR / 2}" r="5.5" fill="${C.dotY}"/>
<circle cx="68" cy="${WIN.y + BAR / 2}" r="5.5" fill="${C.dotG}"/>
<text x="${VB.w / 2}" y="${WIN.y + BAR / 2 + 4}" class="title" xml:space="preserve">aura-farmer@bne — claude</text>

<g class="session">
  <text x="${GUT}" y="${rowY(ROWS.user)}" class="dim aUser" opacity="0" xml:space="preserve">&gt; ${esc(PROMPT_TEXT)}</text>

  <g class="aThink" opacity="0">
    <text x="${GUT}" y="${rowY(ROWS.name)}" class="acc" xml:space="preserve">${SPINNER.map((g, i) => `<tspan class="sp${i}" x="${GUT}">${g}</tspan>`).join('')}</text>
    <text x="${BODY}" y="${rowY(ROWS.name)}" class="dim" xml:space="preserve">${THINKING}</text>
    <g clip-path="url(#thinkClip)">
      <rect class="sweepRect" x="${BODY - 90}" y="${rowY(ROWS.name) - 11}" width="90" height="15" fill="url(#band)"/>
    </g>
  </g>

  <g class="aName" opacity="0">
    ${bullet(ROWS.name)}
    <text x="${BODY}" y="${rowY(ROWS.name)}" xml:space="preserve">Lucas Daish — Brisbane, AU</text>
  </g>

  <g class="aTag" opacity="0">
    <g clip-path="url(#tagClip)">
      <rect class="flowRect" x="${BODY}" y="${rowY(ROWS.tag) - 11}" width="${TAG_W * 2}" height="15" fill="url(#flow)"/>
    </g>
  </g>

  <text x="${BODY}" y="${rowY(ROWS.meta)}" class="dim aMeta" opacity="0" xml:space="preserve">Planted 12 agents · all growing (ctrl+o to expand)</text>

  <g class="aStatus" opacity="0">
    ${bullet(ROWS.status)}
    <text x="${BODY}" y="${rowY(ROWS.status)}" xml:space="preserve">harness green · evals passing · infra holding</text>
  </g>

  <g class="aDone" opacity="0">
    <text x="${GUT}" y="${rowY(ROWS.done)}" fill="${C.amber}" xml:space="preserve">✳</text>
    <text x="${BODY}" y="${rowY(ROWS.done)}" class="dim" xml:space="preserve">It&apos;s time for a 4x</text>
  </g>
</g>

<rect x="${BOX.x}" y="${BOX.y}" width="${BOX.w}" height="${BOX.h}" rx="${BOX.r}" fill="#FFFFFF" stroke="${C.boxStroke}" stroke-width="1.2"/>
<text x="40" y="${BOX_BASE}" class="acc" xml:space="preserve">❯</text>
<text x="${BOX_TEXT_X}" y="${BOX_BASE}" xml:space="preserve">${boxSpans}</text>
<g class="cursorG" transform="translate(0,0)">
<rect class="cursorR" x="${BOX_TEXT_X}" y="${CURSOR.y}" width="${CURSOR.w.toFixed(2)}" height="${CURSOR.h}" fill="${C.cursor}" opacity="0.85"/>
</g>

<path d="M${BOX.x} ${FOOT_BASE - 8} l6 4 l-6 4 z M${BOX.x + 8} ${FOOT_BASE - 8} l6 4 l-6 4 z" fill="${C.accent}"/>
<text x="${BOX.x + 20}" y="${FOOT_BASE}" class="small" fill="${C.accent}" xml:space="preserve">auto mode on (shift+tab to cycle)</text>

<text x="${BOX.x + BOX.w}" y="${FOOT_BASE}" class="logoLine" xml:space="preserve"><tspan class="dim">// </tspan><tspan class="logoMark">/&#x42F;</tspan></text>
</g>
</svg>
`;

writeFileSync(join(ROOT, 'assets/terminal.svg'), svg);
console.log(`assets/terminal.svg written — ${(svg.length / 1024).toFixed(1)} KB, loop ${T}s`);
