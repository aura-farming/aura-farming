// Generates assets/terminal.svg — the animated profile header.
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
const FS = 16;          // body font size
const CW = FS * 0.6;    // JetBrains Mono advance = exactly 0.6em
const LH = 27;          // line height
const X0 = 46;          // content left edge
const Y0 = 88;          // first baseline
const rowY = (r) => Y0 + r * LH;
const PROMPT = '$ ';
const CMD_X = X0 + PROMPT.length * CW; // x where typed chars begin

// window geometry
const WIN = { x: 16, y: 12, w: 808, h: 416, r: 12 };
const VB = { w: 840, h: 478 };
const BAR_H = 40;

// ---------------------------------------------------------------- palette
const C = {
  bgTop: '#0D1117',
  bgBot: '#090C11',
  border: '#1C2230',
  bar: '#11151C',
  barLine: '#1B212B',
  dotR: '#FF5F57',
  dotY: '#FEBC2E',
  dotG: '#28C840',
  title: '#6E7681',
  prompt: '#3FB950',
  cmd: '#E6EDF3',
  out: '#8B949E',
  bright: '#F0F6FC',
  okLabel: '#8B949E',
  okValue: '#C9D1D9',
  cursor: '#E6EDF3',
  ghost: '#E6EDF3',
};

// ---------------------------------------------------------------- script
// Commands: typed char-by-char. Outputs: print instantly (like real stdout).
const cmds = [
  { id: 0, row: 0, text: 'whoami', promptAt: 0.0, typeAt: 0.9, cps: 0.075 },
  { id: 1, row: 3, text: 'cat focus.txt', promptAt: 2.45, typeAt: 2.95, cps: 0.07 },
  { id: 2, row: 6, text: './harness status', promptAt: 5.16, typeAt: 5.66, cps: 0.068 },
];
const typeEnd = (c) => c.typeAt + c.text.length * c.cps;

const okPad = (label) => `${label}${' '.repeat(11 - label.length)}`;

const outs = [
  {
    id: 0, row: 1, at: 1.55,
    spans: [{ text: 'lucas — brisbane, au', fill: C.out }],
  },
  {
    id: 1, row: 4, at: 4.06,
    spans: [
      { text: 'building agents, harnesses ', fill: C.bright },
      { text: '&', fill: C.prompt },
      { text: ' infra', fill: C.bright },
    ],
  },
  {
    id: 2, row: 7, at: 7.05,
    spans: [
      { text: '[ok] ', fill: C.prompt },
      { text: okPad('agents'), fill: C.okLabel },
      { text: '12 active', fill: C.okValue },
    ],
  },
  {
    id: 3, row: 8, at: 7.25,
    spans: [
      { text: '[ok] ', fill: C.prompt },
      { text: okPad('evals'), fill: C.okLabel },
      { text: 'all green', fill: C.okValue },
    ],
  },
  {
    id: 4, row: 9, at: 7.45,
    spans: [
      { text: '[ok] ', fill: C.prompt },
      { text: okPad('infra'), fill: C.okLabel },
      { text: '99.98% uptime', fill: C.okValue },
    ],
  },
];

const IDLE_PROMPT = { row: 11, at: 8.3 };
const IDLE_END = 13.3;   // blink until here
const FADE_START = 13.4; // session fades out
const FADE_END = 13.95;

// ---------------------------------------------------------------- helpers
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Appear-instantly keyframes: hidden from 0 to t, visible after (60ms ramp).
const appearKF = (name, t) =>
  `@keyframes ${name}{0%,${pct(t)}%{opacity:0}${pct(t + 0.06)}%,100%{opacity:1}}`;

// ---------------------------------------------------------------- typed chars
let charCSS = '';
let cmdTexts = '';
for (const c of cmds) {
  let spans = `<tspan class="p pr${c.id}">${PROMPT}</tspan>`;
  [...c.text].forEach((ch, i) => {
    const t = c.typeAt + (i + 1) * c.cps;
    const k = `t${c.id}c${i}`;
    charCSS += `@keyframes ${k}{0%,${pct(t)}%{opacity:0}${pct(t + 0.001)}%,100%{opacity:1}}`;
    charCSS += `.${k}{animation:${k} ${T}s linear infinite}`;
    spans += `<tspan class="${k}">${esc(ch)}</tspan>`;
  });
  charCSS += appearKF(`pr${c.id}`, c.promptAt) + `.pr${c.id}{animation:pr${c.id} ${T}s linear infinite}`;
  cmdTexts += `<text x="${X0}" y="${rowY(c.row)}" class="cmd" xml:space="preserve">${spans}</text>\n  `;
}

// ---------------------------------------------------------------- output lines
let outCSS = '';
let outTexts = '';
for (const o of outs) {
  const k = `o${o.id}`;
  outCSS += appearKF(k, o.at) + `.${k}{animation:${k} ${T}s linear infinite}`;
  const spans = o.spans
    .map((s) => `<tspan fill="${s.fill}">${esc(s.text)}</tspan>`)
    .join('');
  outTexts += `<text x="${X0}" y="${rowY(o.row)}" class="${k}" xml:space="preserve">${spans}</text>\n  `;
}
// idle prompt
outCSS += appearKF('prI', IDLE_PROMPT.at) + `.prI{animation:prI ${T}s linear infinite}`;
outTexts += `<text x="${X0}" y="${rowY(IDLE_PROMPT.row)}" class="p prI" xml:space="preserve">$</text>`;

// ---------------------------------------------------------------- cursor
// The cursor follows the real print head: sits after the prompt, steps along
// typed chars, drops to column 0 while output prints, hops onto new prompts.
const cursorStops = []; // {t, x, row, steps?}
cursorStops.push({ t: 0, x: CMD_X, row: 0 });
for (const c of cmds) {
  cursorStops.push({ t: c.typeAt, x: CMD_X, row: c.row, steps: c.text.length });
  cursorStops.push({ t: typeEnd(c), x: CMD_X + c.text.length * CW, row: c.row });
  // Enter: head drops to col 0 of the next line, then follows prints down.
  cursorStops.push({ t: typeEnd(c) + 0.1, x: X0, row: c.row + 1 });
}
// stdout moves the head down as lines print
cursorStops.push({ t: outs[0].at, x: X0, row: 2 });
cursorStops.push({ t: cmds[1].promptAt, x: CMD_X, row: 3 });
cursorStops.push({ t: outs[1].at, x: X0, row: 5 });
cursorStops.push({ t: cmds[2].promptAt, x: CMD_X, row: 6 });
cursorStops.push({ t: outs[2].at, x: X0, row: 8 });
cursorStops.push({ t: outs[3].at, x: X0, row: 9 });
cursorStops.push({ t: outs[4].at, x: X0, row: 10 });
cursorStops.push({ t: IDLE_PROMPT.at, x: CMD_X, row: 11 });
cursorStops.push({ t: T, x: CMD_X, row: 0 }); // wrap to loop start

cursorStops.sort((a, b) => a.t - b.t);
let moveKF = '@keyframes cmove{';
for (const s of cursorStops) {
  const timing = s.steps ? `steps(${s.steps},end)` : 'steps(1,end)';
  moveKF += `${pct(s.t)}%{transform:translate(${+s.x.toFixed(1)}px,${rowY(s.row)}px);animation-timing-function:${timing}}`;
}
moveKF += '}';

// Blink: only while idle (waiting at a prompt). Solid while typing/printing.
const BLINK = 0.55;
const blinkStops = []; // {t, on}
const blinkWindow = (from, to) => {
  let on = true;
  for (let t = from; t < to; t += BLINK) {
    blinkStops.push({ t, on });
    on = !on;
  }
};
blinkWindow(0, cmds[0].typeAt);
blinkStops.push({ t: cmds[0].typeAt, on: true });
blinkWindow(IDLE_PROMPT.at, IDLE_END);
blinkStops.push({ t: IDLE_END, on: true });
blinkStops.push({ t: FADE_START, on: false }); // hide during clear
let blinkKF = '@keyframes cblink{';
for (const s of blinkStops.sort((a, b) => a.t - b.t)) {
  blinkKF += `${pct(s.t)}%{opacity:${s.on ? 0.85 : 0};animation-timing-function:steps(1,end)}`;
}
blinkKF += '}';

// ---------------------------------------------------------------- fonts
const fontReg = b64('assets/fonts/jbmono-regular-subset.woff2');
const fontBold = b64('assets/fonts/jbmono-bold-subset.woff2');

// ---------------------------------------------------------------- svg
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${VB.w}" height="${VB.h}" viewBox="0 0 ${VB.w} ${VB.h}" role="img" aria-labelledby="t d">
<title id="t">lucas — brisbane, au — building agents, harnesses &amp; infra</title>
<desc id="d">An animated terminal session. whoami: lucas, brisbane au. cat focus.txt: building agents, harnesses and infra. ./harness status: agents 12 active, evals all green, infra 99.98% uptime.</desc>
<style>
@font-face{font-family:'JBM';src:url(data:font/woff2;base64,${fontReg}) format('woff2');font-weight:400;font-style:normal}
@font-face{font-family:'JBM';src:url(data:font/woff2;base64,${fontBold}) format('woff2');font-weight:700;font-style:normal}
text{font-family:'JBM','SF Mono',ui-monospace,Menlo,Consolas,monospace;font-size:${FS}px}
.cmd{fill:${C.cmd}}
.p{fill:${C.prompt}}
.title{font-size:12.5px;fill:${C.title};text-anchor:middle}
.ghost{font-size:220px;font-weight:700;fill:${C.ghost}}
.session{animation:fade ${T}s linear infinite}
@keyframes fade{0%,${pct(FADE_START)}%{opacity:1}${pct(FADE_END)}%,100%{opacity:0}}
.cursorG{animation:cmove ${T}s linear infinite}
.cursorR{fill:${C.cursor};opacity:.85;animation:cblink ${T}s linear infinite}
.ghost{animation:breathe 7s ease-in-out infinite alternate}
@keyframes breathe{from{opacity:.055}to{opacity:.09}}
${moveKF}
${blinkKF}
${charCSS}
${outCSS}
@media (prefers-reduced-motion:reduce){*{animation:none!important}.ghost{opacity:.07}}
</style>
<defs>
<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
<stop offset="0" stop-color="${C.bgTop}"/><stop offset="1" stop-color="${C.bgBot}"/>
</linearGradient>
<clipPath id="win"><rect x="${WIN.x}" y="${WIN.y}" width="${WIN.w}" height="${WIN.h}" rx="${WIN.r}"/></clipPath>
<filter id="shadow" x="-6%" y="-6%" width="112%" height="118%">
<feDropShadow dx="0" dy="12" stdDeviation="18" flood-color="#000000" flood-opacity="0.5"/>
</filter>
</defs>

<g filter="url(#shadow)">
<rect x="${WIN.x}" y="${WIN.y}" width="${WIN.w}" height="${WIN.h}" rx="${WIN.r}" fill="url(#bg)" stroke="${C.border}" stroke-width="1"/>
</g>

<g clip-path="url(#win)">
<rect x="${WIN.x}" y="${WIN.y}" width="${WIN.w}" height="${BAR_H}" fill="${C.bar}"/>
<line x1="${WIN.x}" y1="${WIN.y + BAR_H}" x2="${WIN.x + WIN.w}" y2="${WIN.y + BAR_H}" stroke="${C.barLine}" stroke-width="1"/>
<circle cx="38" cy="${WIN.y + BAR_H / 2}" r="6.5" fill="${C.dotR}"/>
<circle cx="60" cy="${WIN.y + BAR_H / 2}" r="6.5" fill="${C.dotY}"/>
<circle cx="82" cy="${WIN.y + BAR_H / 2}" r="6.5" fill="${C.dotG}"/>
<text x="${VB.w / 2}" y="${WIN.y + BAR_H / 2 + 4.5}" class="title" xml:space="preserve">lucas@bne — zsh</text>

<text x="530" y="318" class="ghost" xml:space="preserve">/&#x42F;</text>

<g class="session">
  ${cmdTexts.trim()}
  ${outTexts.trim()}
</g>

<g class="cursorG" transform="translate(${CMD_X},${rowY(IDLE_PROMPT.row)})">
<rect class="cursorR" x="0" y="-14.5" width="${CW}" height="19"/>
</g>
</g>
</svg>
`;

writeFileSync(join(ROOT, 'assets/terminal.svg'), svg);
console.log(`assets/terminal.svg written — ${(svg.length / 1024).toFixed(1)} KB, loop ${T}s`);
