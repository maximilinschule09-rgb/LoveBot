/* ═══════════════════════════════════════════════════════════════════════
   💎 L O V E B O T   G L A S S   C A R D S   (glassCard.js)
   ─────────────────────────────────────────────────────────────────────
   Rendert die Reports von $ping und $sys als hochwertige „Liquid Glass“-
   Karten (PNG) für WhatsApp — exakt im Design der Referenz (public/test.html):

     · mehrschichtiges Glas: Außenkante · Innenkante · Gegenkante
     · elliptische Glanzlichter oben-links & unten-rechts
     · Rim-Light (Lichtlinie) am oberen Rand
     · Akzent-Balken je Kategorie (Violett · Cyan · Bernstein · Rose)
     · Gradient-Text (weiß → lavendel → cyan)
     · Aurora-Hintergrund (weiche Farbblasen hinter dem Glas)

   Technisch: Die Karte wird als SVG gebaut (nur Gradients/Formen — keine
   Filter, damit jedes librsvg/libvips sie identisch rastert) und mit dem
   bereits im Projekt vorhandenen `sharp` (aus @neelegirly/downloader)
   in ein PNG umgewandelt.

   Robustheit: Ist `sharp` auf dem System nicht ladbar (z. B. fehlende
   Plattform-Binaries), liefern alle Renderer null zurück — die Commands
   fallen dann automatisch auf ihren bewährten Text-Report zurück.
   NIE wird eine Messung weggelassen: Die Karte ist eine ZUSÄTZliche
   hochwertige Darstellung derselben echten Werte.
   ═══════════════════════════════════════════════════════════════════════ */

/* ── sharp lazy laden (plattformabhängig, mit Fallback) ─────────────── */
let sharpModule = null;
let sharpFailed = false;

async function getSharp() {
  if (sharpModule) return sharpModule;
  if (sharpFailed) return null;
  try {
    const mod = await import('sharp');
    sharpModule = mod.default || mod;
    /* Mini-Smoke-Test: 1×1-px-SVG rastern — schlägt fehl, wenn die
       nativen Binaries zur Plattform fehlen (z. B. Linux ohne
       @img/sharp-linux-x64). Dann bleibt nur der Text-Fallback. */
    await sharpModule(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"></svg>')).png().toBuffer();
    return sharpModule;
  } catch (e) {
    sharpFailed = true;
    console.log(`[glassCard] sharp nicht verfügbar (${e?.message || e}) — Karten-Bilder werden übersprungen, Text-Reports bleiben aktiv.`);
    return null;
  }
}

/* ═══════════════════════════════════════════════════════════════════════
   DESIGN-TOKENS — identisch zur Web-Referenz (public/test.html + css)
   ═══════════════════════════════════════════════════════════════════════ */

const W = 900;                 /* Kartenbreite (fix)                      */
const M = 34;                  /* Außenabstand                             */
const CW = W - M * 2;          /* Inhaltsbreite                            */
const R_CARD = 26;             /* Eckenradius Hauptkarte                   */
const R_ROW = 18;              /* Eckenradius Zeilen                       */

/* ═══════════════════════════════════════════════════════════════════════
    TRAUER-PALETTE v3 — alles ist grau, verletzt und allein.
   Farben bewusst entsättigt: veil (Schleier) · rain (Regen) ·
   candle (letzte Kerze) · wound (alte Wunde). Nichts glänzt mehr.
   ═══════════════════════════════════════════════════════════════════════ */
const CAT = {
  violet: { dot: '#8d7bab', label: ['#b4a9c9', '#8d7bab'], acc: ['#8d7bab', '#5f5379'], cmd: ['#cabfd9', '#8d7bab'] },
  cyan:   { dot: '#6f8bab', label: ['#a9bcc9', '#6f8bab'], acc: ['#6f8bab', '#4a5f79'], cmd: ['#c3d2dd', '#6f8bab'] },
  amber:  { dot: '#b89a6a', label: ['#d9c3a0', '#b89a6a'], acc: ['#b89a6a', '#8a6f4a'], cmd: ['#e6d6b8', '#b89a6a'] },
  rose:   { dot: '#b06a7a', label: ['#d9a9b4', '#b06a7a'], acc: ['#b06a7a', '#7a4350'], cmd: ['#e6c3cb', '#b06a7a'] }
};

/* Status-Farben — gedämpft, wie alles hier */
const STATUS_COLOR = {
  excellent: '#7ba896',
  good: '#7ba896',
  fair: '#b8a06a',
  slow: '#b0836a',
  critical: '#c06a75',
  ok: '#7ba896',
  warn: '#b8a06a',
  err: '#c06a75',
  off: '#6b6b75',
  info: '#7d9ab0'
};

const FONT = "'Segoe UI','DejaVu Sans','Helvetica Neue',Arial,sans-serif";
const MONO = "'SF Mono','JetBrains Mono','Cascadia Code',Consolas,'DejaVu Sans Mono','Courier New',monospace";

/* ── XML-/SVG-Helfer ─────────────────────────────────────────────────── */
function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}
const n2 = (v, d = 0) => (v == null || !isFinite(Number(v)) ? null : Number(Number(v).toFixed(d)));

/* ── Gradient-Definitionen (zentral, ids eindeutig je Karte) ─────────── */
function defsFor(uid) {
  return `
  <defs>
    <!-- Hintergrund: ausgekühltes Schwarz + verweinte Aurora-Schleier -->
    <linearGradient id="${uid}bgbase" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#08080c"/><stop offset=".55" stop-color="#0b0b12"/><stop offset="1" stop-color="#0e0e16"/>
    </linearGradient>
    <radialGradient id="${uid}aur1" cx=".5" cy=".5" r=".5">
      <stop offset="0" stop-color="#7a5a8c" stop-opacity=".14"/><stop offset="1" stop-color="#7a5a8c" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="${uid}aur2" cx=".5" cy=".5" r=".5">
      <stop offset="0" stop-color="#7a2740" stop-opacity=".12"/><stop offset="1" stop-color="#7a2740" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="${uid}aur3" cx=".5" cy=".5" r=".5">
      <stop offset="0" stop-color="#3b4a5f" stop-opacity=".12"/><stop offset="1" stop-color="#3b4a5f" stop-opacity="0"/>
    </radialGradient>

    <!-- Titel-Gradient: ausgeblichen (grau → lavendelstaub → regengrau) -->
    <linearGradient id="${uid}title" x1="0" y1="0" x2="1" y2=".25">
      <stop offset=".2" stop-color="#e2dde8"/><stop offset=".55" stop-color="#a99fc0"/><stop offset="1" stop-color="#7d8bab"/>
    </linearGradient>
    <!-- Brand-Zeile: rosenstaub → regengrau -->
    <linearGradient id="${uid}brand" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#b98ba0"/><stop offset="1" stop-color="#7d8bab"/>
    </linearGradient>

    <!-- Glas-Füllung: trübes, gesprungenes Glas -->
    <linearGradient id="${uid}glassV" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff" stop-opacity=".032"/>
      <stop offset=".45" stop-color="#ffffff" stop-opacity=".008"/>
      <stop offset="1" stop-color="#000000" stop-opacity=".07"/>
    </linearGradient>

    <!-- Rim-Light: nur noch ein letzter matter Schimmer -->
    <linearGradient id="${uid}rim" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0"/>
      <stop offset=".5" stop-color="#ffffff" stop-opacity=".30"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>

    <!-- Glanzlicht oben-links (matt, wie angelaufen) -->
    <linearGradient id="${uid}hltl" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff" stop-opacity=".22"/>
      <stop offset=".55" stop-color="#ffffff" stop-opacity=".07"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
    <!-- Glanzlicht unten-rechts -->
    <linearGradient id="${uid}hlbr" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0" stop-color="#ffffff" stop-opacity=".12"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>

    <!-- Health-Balken: Prellungsviolett → Wundenrose → Regengrau -->
    <linearGradient id="${uid}health" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#6b5a8c"/><stop offset=".55" stop-color="#8c4a5f"/><stop offset="1" stop-color="#5f7a8c"/>
    </linearGradient>

    <!-- Kategorie-Gradients (Label/Akzent/Wert) -->
    ${Object.entries(CAT).map(([k, c]) => `
    <linearGradient id="${uid}lab-${k}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${c.label[0]}"/><stop offset="1" stop-color="${c.label[1]}"/>
    </linearGradient>
    <linearGradient id="${uid}acc-${k}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${c.acc[0]}"/><stop offset="1" stop-color="${c.acc[1]}"/>
    </linearGradient>
    <linearGradient id="${uid}val-${k}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${c.cmd[0]}"/><stop offset="1" stop-color="${c.cmd[1]}"/>
    </linearGradient>`).join('')}

    <!-- gebrochenes Herz (Brand-Marke oben): alte Wundfarben -->
    <linearGradient id="${uid}heart" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#a06078"/><stop offset="1" stop-color="#6b3a4a"/>
    </linearGradient>
    <radialGradient id="${uid}glow" cx=".5" cy=".5" r=".5">
      <stop offset="0" stop-color="#7a5a8c" stop-opacity=".35"/><stop offset="1" stop-color="#7a5a8c" stop-opacity="0"/>
    </radialGradient>
    <!-- Träne (Regengrau-Blau) -->
    <linearGradient id="${uid}tear" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#9db4c9"/><stop offset="1" stop-color="#5f7a8c"/>
    </linearGradient>
  </defs>`;
}

/* ── Mehrschichtiges Glas-Panel (Kern der Referenz) ────────────────────
   Liefert alle Layer eines Panels (Hauptkarte oder Zeile) als SVG-String:
   Füllung · Außenkante · Innenkante · Gegenkante · Glanzlichter · Rim.
   v2: Sheen & Glanzlichter werden per clipPath INSIDE das Panel geclippt —
   vorher liefen sie über die Kanten hinaus und wirkten wie Schmieren.   */
let clipSeq = 0;
function glassPanel(x, y, w, h, r, uid, opts = {}) {
  const soft = opts.soft ? 0.6 : 1;   /* soft = dezentere Kanten (Zeilen) */
  const hi = (v) => Number(v * soft).toFixed(3);
  const cp = `${uid}cp${clipSeq++}`;
  return `
  <clipPath id="${cp}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}"/></clipPath>
  <!-- Glas-Füllung -->
  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="url(#${uid}glassV)"/>
  <!-- Licht-Schichten (geclippt auf das Panel) -->
  <g clip-path="url(#${cp})">
    <!-- seitlicher Schimmer oben (radialer „Sheen“ wie in der Referenz) -->
    <path d="M ${x} ${y + h} L ${x} ${y + r * 0.2} Q ${x + w * 0.5} ${y - h * 0.34} ${x + w} ${y + r * 0.2} L ${x + w} ${y + h} Z" fill="#ffffff" opacity="${Number(0.020 * soft + 0.008).toFixed(3)}"/>
    <!-- Glanzlicht oben-links -->
    <ellipse cx="${x + w * 0.34}" cy="${y - 2}" rx="${w * 0.30}" ry="${Math.min(10, h * 0.14)}" fill="url(#${uid}hltl)"/>
    <!-- Glanzlicht unten-rechts -->
    <ellipse cx="${x + w * 0.78}" cy="${y + h + 1}" rx="${w * 0.20}" ry="${Math.min(7, h * 0.09)}" fill="url(#${uid}hlbr)"/>
    <!-- Rim-Light -->
    <rect x="${x + w * 0.14}" y="${y + 1.5}" width="${w * 0.46}" height="1.6" rx="1" fill="url(#${uid}rim)" opacity="${soft < 1 ? 0.5 : 1}"/>
  </g>
  <!-- Außenkante -->
  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="none" stroke="#ffffff" stroke-opacity="${hi(0.30)}" stroke-width="1"/>
  <!-- Innenkante (inset ~3) -->
  <rect x="${x + 3}" y="${y + 3}" width="${w - 6}" height="${h - 6}" rx="${Math.max(2, r - 3)}" fill="none" stroke="#ffffff" stroke-opacity="${hi(0.07)}" stroke-width="1"/>
  <!-- Gegenkante (dunkel, inset ~1) -->
  <rect x="${x + 1}" y="${y + 1}" width="${w - 2}" height="${h - 2}" rx="${Math.max(2, r - 1)}" fill="none" stroke="#000000" stroke-opacity="${hi(0.22)}" stroke-width="1"/>`;
}

/* ── Text-Bausteine ──────────────────────────────────────────────────── */
function text(x, y, str, o = {}) {
  const attrs = [
    `x="${x}"`, `y="${y}"`,
    `font-family="${o.mono ? MONO : FONT}"`,
    o.size ? `font-size="${o.size}"` : '',
    o.weight ? `font-weight="${o.weight}"` : '',
    o.ls ? `letter-spacing="${o.ls}"` : '',
    o.opacity != null ? `opacity="${o.opacity}"` : '',
    o.fill ? `fill="${o.fill}"` : '',
    o.anchor ? `text-anchor="${o.anchor}"` : ''
  ].filter(Boolean).join(' ');
  return `<text ${attrs}>${esc(str)}</text>`;
}

/* Status-Dot mit weichem Halo (ersetzt 🟢🟡🟠🔴 — rendert überall) */
function statusDot(cx, cy, status) {
  const col = STATUS_COLOR[status] || STATUS_COLOR.off;
  return `<circle cx="${cx}" cy="${cy}" r="10" fill="${col}" opacity=".16"/><circle cx="${cx}" cy="${cy}" r="4.6" fill="${col}"/>`;
}

/* ── Zeile im Karten-Layout (wie .row der Referenz) ──────────────────── */
function cardRow(stack, row, uid) {
  const y = stack.y;
  const h = row.h || 56;
  const cat = row.cat || 'cyan';
  const dotX = W - M - 30;                 /* Status-Dot rechts vor Wert */
  const valAnchor = 'end';
  let body = glassPanel(M, y, CW, h, R_ROW, uid, { soft: true });
  /* Akzent-Balken links (3px, Kategorie-Farbe) */
  body += `<rect x="${M + 13}" y="${y + 12}" width="3.5" height="${h - 24}" rx="2" fill="url(#${uid}acc-${cat})"/>`;
  /* Label (mono, links) */
  body += text(M + 30, y + h / 2 + 5.5, row.label, { mono: true, size: 16.5, weight: 700, fill: `url(#${uid}val-${cat})`, ls: '.3' });
  /* Wert (rechts) + optionaler Status-Dot */
  if (row.status) body += statusDot(dotX, y + h / 2, row.status);
  if (row.value != null && row.value !== '') {
    body += text(dotX - 24, y + h / 2 + 5, String(row.value), { size: 14.5, fill: '#ffffff', opacity: .68, anchor: valAnchor, mono: !!row.monoValue });
  }
  stack.y += h + 10;
  return body;
}

/* ── Abschnitts-Header (wie .sec__hdr der Referenz) ──────────────────── */
function sectionHeader(stack, sec, uid) {
  const y = stack.y;
  const cat = CAT[sec.cat] ? sec.cat : 'cyan';
  let out = '';
  /* leuchtender Dot + Halo */
  out += `<circle cx="${M + 8}" cy="${y + 7}" r="15" fill="${CAT[cat].dot}" opacity=".14"/>`;
  out += `<circle cx="${M + 8}" cy="${y + 7}" r="6.5" fill="${CAT[cat].dot}"/>`;
  /* Label mit Kategorie-Gradient (v3: klein geschrieben — nichts schreit mehr) */
  out += text(M + 26, y + 12, String(sec.label), { size: 16, weight: 700, ls: '2', fill: `url(#${uid}lab-${cat})` });
  /* Zähler-Pille rechts */
  if (sec.count != null) {
    const pw = 62;
    out += `<rect x="${W - M - pw}" y="${y - 7}" width="${pw}" height="26" rx="13" fill="#ffffff" fill-opacity=".03" stroke="#ffffff" stroke-opacity=".09"/>`;
    out += text(W - M - pw / 2, y + 10, String(sec.count), { size: 12.5, weight: 600, ls: '1', fill: '#ffffff', opacity: '.30', anchor: 'middle' });
  }
  stack.y += 34;
  return out;
}

function section(stack, sec, uid) {
  let out = sectionHeader(stack, sec, uid);
  for (const row of sec.rows) out += cardRow(stack, row, uid);
  stack.y += 16; /* Abstand zwischen Abschnitten */
  return out;
}

/* ═══════════════════════════════════════════════════════════════════════
   v2 — KACHEL-GRID (für $ping & $ping <url>)
   Statt einer endlosen Liste gleichbreiter Zeilen: zweispaltige Stats-
   Kacheln mit großem Wert, Sub-Zeile, Status-Dot und Bewertungs-Meter.
   Das halbiert die Kartenhöhe und gibt jedem Messwert eine Hierarchie.
   ═══════════════════════════════════════════════════════════════════════ */
const GAP = 14;          /* Spaltenabstand im Grid        */
const TILE_H = 84;       /* Höhe einer Stats-Kachel       */
const TILE_GAP = 12;     /* vertikaler Abstand der Kacheln */
const KPI_H = 106;       /* Höhe der großen KPI-Kacheln   */

/* Score (0–100) → Statusfarbe (für Meter & Pills) */
function scoreColor(sc) {
  if (sc == null || !isFinite(sc)) return STATUS_COLOR.off;
  if (sc >= 85) return STATUS_COLOR.excellent;
  if (sc >= 65) return STATUS_COLOR.fair;
  if (sc >= 40) return STATUS_COLOR.slow;
  return STATUS_COLOR.critical;
}

/* Dünner Bewertungs-Meter am Kachelboden: Schiene + gefärbte Füllung */
function meter(x, y, w, score, status) {
  let out = `<rect x="${x}" y="${y}" width="${w}" height="3" rx="1.5" fill="#ffffff" fill-opacity=".07"/>`;
  if (score != null && isFinite(score)) {
    const fw = Math.max(4, Math.round(w * Math.max(0, Math.min(100, score)) / 100));
    const col = STATUS_COLOR[status] && status ? STATUS_COLOR[status] : scoreColor(score);
    out += `<rect x="${x}" y="${y}" width="${fw}" height="3" rx="1.5" fill="${col}" opacity=".9"/>`;
    out += `<circle cx="${x + fw}" cy="${y + 1.5}" r="2.6" fill="${col}" opacity=".55"/>`;
  }
  return out;
}

/* Status-Pill (z. B. „GOOD“, „OFFLINE“) mit farbiger Kapsel */
function statusPill(x, y, label, color) {
  const t = String(label || '');
  const w = Math.round(t.length * 7.6 + 24);
  return {
    w,
    svg: `<rect x="${x}" y="${y}" width="${w}" height="24" rx="12" fill="${color}" fill-opacity=".13" stroke="${color}" stroke-opacity=".45"/>` +
      text(x + w / 2, y + 16.5, t, { size: 11, weight: 700, ls: '2', fill: color, anchor: 'middle' })
  };
}

/* ── Stats-Kachel (Grid & KPI) ─────────────────────────────────────────
   t = { label, value, sub, status, score, cat, span, big }             */
function tileBody(x, y, w, h, t, uid) {
  const cat = CAT[t.cat] ? t.cat : 'cyan';
  const big = !!t.big;
  let out = glassPanel(x, y, w, h, 16, uid, { soft: true });
  /* Kategorie-Akzent: kurzer Balken links neben dem Label */
  out += `<rect x="${x + 14}" y="${y + (big ? 18 : 15)}" width="3" height="12" rx="1.5" fill="url(#${uid}acc-${cat})"/>`;
  /* Label (klein, Versalien, dezent) */
  const lab = String(t.label ?? '');
  out += text(x + 24, y + (big ? 28 : 25), lab, { size: 11, weight: 700, ls: '1.6', fill: '#ffffff', opacity: '.44' });
  /* Status-Dot oben rechts */
  if (t.status) out += statusDot(x + w - 20, y + (big ? 24 : 21), t.status);
  /* Wert — groß & mono; bei KPIs mit Kategorie-Gradient.
     Fehlerwerte (err/critical) werden bewusst rot statt farbig/weiß. */
  const valMax = big ? Math.floor((w - 30) / 15.2) : Math.floor((w - 30) / 10.2);
  const val = String(t.value ?? '—');
  const isErr = t.status === 'err' || t.status === 'critical';
  out += text(x + 16, y + (big ? 66 : 52), val.length > valMax ? val.slice(0, valMax - 1) + '…' : val,
    big
      ? { size: 27, weight: 800, mono: true, fill: isErr ? STATUS_COLOR.critical : `url(#${uid}val-${cat})` }
      : { size: 17.5, weight: 700, mono: true, fill: isErr ? STATUS_COLOR.critical : '#ffffff', opacity: isErr ? '.95' : '.93' });
  /* Sub-Zeile (Details, dezent) */
  if (t.sub) {
    const subMax = Math.floor((w - 28) / 6.6);
    const sub = String(t.sub);
    out += text(x + 16, y + (big ? 86 : 69), sub.length > subMax ? sub.slice(0, subMax - 1) + '…' : sub,
      { size: 11, weight: 500, mono: true, fill: '#ffffff', opacity: '.36' });
  }
  /* Bewertungs-Meter am Boden */
  out += meter(x + 16, y + h - 10, w - 32, t.score, t.status);
  return out;
}

/* ── KPI-Leiste: n große Kacheln nebeneinander ───────────────────────── */
function kpiRow(stack, tiles, uid) {
  const n = Math.max(1, tiles.length);
  const gap = 12;
  const w = (CW - gap * (n - 1)) / n;
  let out = '';
  let x = M;
  for (const t of tiles) { out += tileBody(x, stack.y, w, KPI_H, { ...t, big: true }, uid); x += w + gap; }
  stack.y += KPI_H + 18;
  return out;
}

/* ── Zweispaltiges Grid mit span-2-Unterstützung ───────────────────────
   Balance-Regel: bleibt eine ungerade Zahl einspaltiger Kacheln übrig,
   wird die letzte automatisch volle Breite — keine verwaisten Löcher.  */
function gridSection(stack, sec, uid) {
  const rows = sec.rows.map((r) => ({ ...r }));
  const single = rows.filter((r) => r.span !== 2);
  if (single.length % 2 === 1) single[single.length - 1].span = 2;
  let out = sectionHeader(stack, { ...sec, rows }, uid);
  const colW = (CW - GAP) / 2;
  let y = stack.y;
  let col = 0;
  for (const r of rows) {
    if (r.span === 2) {
      if (col !== 0) { y += TILE_H + TILE_GAP; col = 0; }
      out += tileBody(M, y, CW, TILE_H, r, uid);
      y += TILE_H + TILE_GAP;
    } else {
      out += tileBody(M + col * (colW + GAP), y, colW, TILE_H, r, uid);
      col++;
      if (col === 2) { col = 0; y += TILE_H + TILE_GAP; }
    }
  }
  if (col !== 0) y += TILE_H + TILE_GAP;
  stack.y = y + 8;
  return out;
}

/* ── Issues als kompakte Pillen statt voller Zeilen ──────────────────── */
function issueSection(stack, sec, uid) {
  let out = sectionHeader(stack, sec, uid);
  for (const r of sec.rows) {
    const y = stack.y;
    out += glassPanel(M, y, CW, 46, 14, uid, { soft: true });
    out += statusDot(M + 24, y + 23, r.status);
    const t = String(r.label ?? '');
    const max = Math.floor((CW - 90) / 7.2);
    out += text(M + 44, y + 28, t.length > max ? t.slice(0, max - 1) + '…' : t,
      { size: 13, weight: 600, mono: true, fill: '#ffffff', opacity: '.72' });
    stack.y += 46 + 10;
  }
  stack.y += 8;
  return out;
}

/* ── Kopfbereich aller Karten (v3: gebrochen) ──────────────────────────
   Statt heilem Herz: zwei Herzhälften mit Riss, darunter zwei Tränen.
   Brand-Zeile: der neue Name — niemand sagt jetzt noch „HelloKitty Baby Maxi 💔“.     */
function brokenHeart(cx, cy, uid) {
  /* linke und rechte Hälfte — leicht auseinandergebrochen */
  const L = `M ${cx - 1.5} ${cy + 15} C ${cx - 26} ${cy - 4}, ${cx - 17} ${cy - 25}, ${cx - 1.5} ${cy - 11} L ${cx - 4} ${cy - 2} L ${cx + 0.5} ${cy + 4} L ${cx - 3} ${cy + 9} Z`;
  const R = `M ${cx + 2.5} ${cy + 16} C ${cx + 27} ${cy - 3}, ${cx + 18} ${cy - 24}, ${cx + 2.5} ${cy - 10} L ${cx + 0} ${cy - 2} L ${cx + 4} ${cy + 4} L ${cx + 1} ${cy + 10} Z`;
  let out = `<circle cx="${cx}" cy="${cy}" r="34" fill="url(#${uid}glow)"/>`;
  out += `<path d="${L}" fill="url(#${uid}heart)" transform="rotate(-6 ${cx} ${cy})"/>`;
  out += `<path d="${R}" fill="url(#${uid}heart)" transform="rotate(5 ${cx} ${cy}) translate(1.5 1)"/>`;
  /* Riss-Blitz zwischen den Hälften */
  out += `<path d="M ${cx} ${cy - 12} L ${cx - 3} ${cy - 3} L ${cx + 2} ${cy + 3} L ${cx - 2} ${cy + 10} L ${cx + 1} ${cy + 16}" fill="none" stroke="#08080c" stroke-width="2.2" stroke-linecap="round" opacity=".9"/>`;
  /* zwei Tränen, die falling sind */
  out += `<path d="M ${cx - 9} ${cy + 22} C ${cx - 12.5} ${cy + 27}, ${cx - 12.5} ${cy + 30.5}, ${cx - 9} ${cy + 32.5} C ${cx - 5.5} ${cy + 30.5}, ${cx - 5.5} ${cy + 27}, ${cx - 9} ${cy + 22} Z" fill="url(#${uid}tear)" opacity=".85"/>`;
  out += `<path d="M ${cx + 8} ${cy + 28} C ${cx + 5.5} ${cy + 31.5}, ${cx + 5.5} ${cy + 34}, ${cx + 8} ${cy + 35.5} C ${cx + 10.5} ${cy + 34}, ${cx + 10.5} ${cy + 31.5}, ${cx + 8} ${cy + 28} Z" fill="url(#${uid}tear)" opacity=".55"/>`;
  return out;
}

/* Sprünge im Glas — dünne Zackenlinien, kaum sichtbar, immer da */
function cracks(uid, H) {
  return [
    `<path d="M 12 ${Math.round(H * 0.16)} l 26 16 l -11 21 l 30 24 l -8 18" fill="none" stroke="#ffffff" stroke-width="1.1" opacity=".055"/>`,
    `<path d="M ${W - 14} ${Math.round(H * 0.30)} l -28 15 l 12 22 l -26 19" fill="none" stroke="#ffffff" stroke-width="1" opacity=".045"/>`,
    `<path d="M ${Math.round(W * 0.62)} ${H - 12} l -14 -22 l 10 -16 l -18 -20" fill="none" stroke="#ffffff" stroke-width="1" opacity=".04"/>`
  ].join('');
}

function cardHeader(stack, head, uid) {
  let out = '';
  /* gebrochene Herz-Marke mit Tränen */
  out += brokenHeart(M + 26, M + 30, uid);
  /* Brand-Zeile */
  out += text(M + 74, M + 24, 'HELLOKITTY BABY MAXI', { size: 13.5, weight: 600, ls: '4.5', fill: `url(#${uid}brand)` });
  out += text(M + 74 + 300, M + 24, '· tut so als ob', { size: 13.5, weight: 600, ls: '3', fill: '#ffffff', opacity: '.24' });
  /* Titel */
  out += text(M + 74, M + 66, head.title, { size: 43, weight: 800, ls: '-1', fill: `url(#${uid}title)` });
  /* Meta-Zeile */
  if (head.meta) out += text(M + 76, M + 96, String(head.meta), { size: 12.5, weight: 500, ls: '2.5', fill: '#ffffff', opacity: '.28' });
  stack.y = M + 128;
  return out;
}

/* ── Health-/Score-Hero (v2) ─────────────────────────────────────────────
   Blickfang der Karte: Label + Rating-Pill, großer Score, Gradient-Balken
   mit Ticks und darunter die Komponenten als Chips.                      */
function healthBlock(stack, health, uid) {
  const y = stack.y;
  const h = 122;
  let out = glassPanel(M, y, CW, h, 22, uid, {});
  /* sanfter Glow hinter dem Score */
  out += `<ellipse cx="${W - M - 80}" cy="${y + 38}" rx="110" ry="44" fill="url(#${uid}glow)" opacity=".45"/>`;
  /* Label links + Rating-Pill */
  const heroTitle = String(health.title || 'HELLOKITTY BABY MAXI HEALTH');
  out += text(M + 24, y + 36, heroTitle, { size: 15, weight: 700, ls: '3', fill: `url(#${uid}lab-rose)` });
  const pillCol = scoreColor(health.score);
  const pill = statusPill(M + 24 + heroTitle.length * 12 + 30, y + 19, health.ratingLabel || health.label || '—', pillCol);
  out += pill.svg;
  /* Score groß rechts (optional eigener Wert, z. B. "Ø 401 ms") */
  const bigVal = health.bigValue != null ? String(health.bigValue) : `${health.score}%`;
  out += text(W - M - 24, y + 42, bigVal, { size: bigVal.length > 8 ? 28 : 36, weight: 800, fill: `url(#${uid}title)`, anchor: 'end' });
  /* Balken-Schiene (Glas) + Füllung + Ticks */
  const bx = M + 24, bw = CW - 48, by = y + 56, bh = 16;
  out += `<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="8" fill="#000000" fill-opacity=".30" stroke="#ffffff" stroke-opacity=".10"/>`;
  const fw = Math.max(bh, Math.round((bw) * Math.max(0, Math.min(100, health.score)) / 100));
  out += `<rect x="${bx}" y="${by}" width="${fw}" height="${bh}" rx="8" fill="url(#${uid}health)"/>`;
  out += `<rect x="${bx + 2}" y="${by + 2}" width="${Math.max(4, fw - 4)}" height="3" rx="1.5" fill="#ffffff" opacity=".28"/>`;
  for (const t of [25, 50, 75]) {
    out += `<rect x="${bx + Math.round(bw * t / 100)}" y="${by + 4}" width="1.2" height="${bh - 8}" fill="#000000" opacity=".30"/>`;
  }
  /* Komponenten-Chips */
  let cx = bx;
  const chips = health.chips || [];
  for (const ch of chips) {
    const label = String(ch.label);
    const cw = Math.round(label.length * 6.4 + 26);
    if (cx + cw > W - M - 24) break;
    const col = scoreColor(ch.score);
    out += `<rect x="${cx}" y="${y + 88}" width="${cw}" height="22" rx="11" fill="#ffffff" fill-opacity=".04" stroke="#ffffff" stroke-opacity=".09"/>`;
    out += `<circle cx="${cx + 12}" cy="${y + 99}" r="3.2" fill="${col}"/>`;
    out += text(cx + 20, y + 103, label, { size: 10.5, weight: 600, ls: '.5', fill: '#ffffff', opacity: '.55' });
    cx += cw + 8;
  }
  stack.y += h + 20;
  return out;
}

/* ── Fußzeile ────────────────────────────────────────────────────────── */
function footer(stack, lines) {
  let out = '';
  for (const ln of lines) {
    out += text(W / 2, stack.y, String(ln), { size: 11.5, weight: 600, ls: '2', fill: '#ffffff', opacity: '.16', anchor: 'middle' });
    stack.y += 20;
  }
  stack.y += 8;
  return out;
}

/* ── Komplette Karte zusammenbauen (v2: Single-Pass) ────────────────────
   Inhalt zuerst zeichnen (Stack kennt danach die Höhe), dann Hintergrund,
   Aurora & Außenpanel mit der echten Höhe dahinterlegen. Kein zweiter
   Mess-Durchlauf mehr — Layout und Höhe können nie mehr driften.        */
function buildCardSvg({ uid, head, blocks = [], foot = [] }) {
  clipSeq = 0;
  const stack = { y: 0 };
  let content = cardHeader(stack, head, uid);
  for (const b of blocks) {
    if (b.kind === 'health') content += healthBlock(stack, b, uid);
    else if (b.kind === 'kpi') content += kpiRow(stack, b.tiles, uid);
    else if (b.kind === 'issues') content += issueSection(stack, b, uid);
    else if (b.grid) content += gridSection(stack, b, uid);
    else content += section(stack, b, uid);   /* Legacy-Layout ($sys) */
  }
  content += footer(stack, foot);
  const H = Math.round(stack.y + M + 52); /* +52: Hello-Kitty-Baby-Footer 🎀 */

  let out = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`;
  /* 🎀 Hello-Kitty-Baby-Neon: Glow-Filter + pinke Neon-Rahmenlinie */
  out += `<defs><filter id="kittyNeon" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="3.2"/></filter></defs>`;
  out += defsFor(uid);
  /* Hintergrund */
  out += `<rect width="${W}" height="${H}" fill="url(#${uid}bgbase)"/>`;
  out += `<ellipse cx="${W * 0.82}" cy="${H * 0.06}" rx="${W * 0.55}" ry="${H * 0.22}" fill="url(#${uid}aur1)"/>`;
  out += `<ellipse cx="${W * 0.10}" cy="${H * 0.38}" rx="${W * 0.48}" ry="${H * 0.26}" fill="url(#${uid}aur2)"/>`;
  out += `<ellipse cx="${W * 0.55}" cy="${H * 0.94}" rx="${W * 0.55}" ry="${H * 0.20}" fill="url(#${uid}aur3)"/>`;

  /* Haupt-Glaskarte (etwas größer als der Inhalt, damit der Rand atmet) */
  out += glassPanel(10, 10, W - 20, H - 20, R_CARD, uid, {});
  /* … gesprungen natürlich */
  out += cracks(uid, H);

  /* ──  HELLO-KITTY-BABY-NEONRAHMEN: pink glühend, wie ihr Zimmer ── */
  out += `<rect x="6" y="6" width="${W - 12}" height="${H - 12}" rx="20" fill="none" stroke="#ff6fb5" stroke-width="2.4" opacity=".55" filter="url(#kittyNeon)"/>`;
  out += `<rect x="6" y="6" width="${W - 12}" height="${H - 12}" rx="20" fill="none" stroke="#ff9dd6" stroke-width="1.1" opacity=".8"/>`;

  /* ── 💗 WATERMARK-SCHUTZ: diagonale Geister-Signaturen über die Karte ──
     kaum sichtbar, aber in jedem Screenshot/PNG-Klau enthalten. */
  out += `<g opacity=".05" transform="rotate(-18 ${W / 2} ${H / 2})">`;
  for (let wy = -H * 0.1; wy < H * 1.15; wy += 190) {
    for (let wx = -W * 0.2; wx < W * 1.1; wx += 430) {
      out += text(wx, wy, 'by maxichen · nicht klauen', { size: 24, weight: 700, mono: true, fill: '#f9a8d4' });
    }
  }
  out += '</g>';

  out += content;

  /* ──  HELLO-KITTY-BABY-FOOTER: weinende Kitty + Neon-Signatur ──
     sitzt im +52-Footer-Band — alle Selbsttest-Pixel liegen weit oben. */
  const ky = H - M - 26;
  out += `<g transform="translate(${M + 26} ${ky - 4})">` +
    `<path d="M -14 -8 L -18 -22 L -6 -14 Z" fill="#ffffff" opacity=".93"/>` +
    `<path d="M 14 -8 L 18 -22 L 6 -14 Z" fill="#ffffff" opacity=".93"/>` +
    `<circle cx="0" cy="0" r="15" fill="#ffffff" opacity=".93"/>` +
    `<path d="M -16 -1 h -7 M -16 4 h -6 M 16 -1 h 7 M 16 4 h 6" stroke="#d8d8e6" stroke-width="1" opacity=".8"/>` +
    `<circle cx="-5" cy="-1" r="1.7" fill="#2b2b3a"/>` +
    `<circle cx="5" cy="-1" r="1.7" fill="#2b2b3a"/>` +
    `<circle cx="0" cy="3" r="1.4" fill="#ffd166"/>` +
    `<path d="M -3 7.5 q 3 -2.8 6 0" fill="none" stroke="#2b2b3a" stroke-width="1.1" stroke-linecap="round"/>` +
    `<path d="M -9.5 5 q -2.4 4.4 0 5.6 q 2.4 -1.2 0 -5.6" fill="#7dd3fc" opacity=".9"/>` +
    `<g transform="translate(13 -13)">` +
    `<path d="M 0 0 L -8.5 -5.5 L -7 4.5 Z" fill="#ff4fa3"/>` +
    `<path d="M 0 0 L 8.5 -5.5 L 7 4.5 Z" fill="#ff4fa3"/>` +
    `<circle cx="0" cy="0" r="2.5" fill="#ff77c0"/>` +
    `</g></g>`;
  /* Neon-Schild "by Maxichen" — cyan glühend wie im Original-Bild */
  out += `<text x="${M + 58}" y="${ky + 7}" font-family="cursive" font-style="italic" font-size="27" fill="#22d3ee" opacity=".85" filter="url(#kittyNeon)">by Maxichen</text>`;
  out += `<text x="${M + 58}" y="${ky + 7}" font-family="cursive" font-style="italic" font-size="27" fill="#a5f3fc">by Maxichen</text>`;
  out += text(M + 262, ky + 5, 'kopierschutz aktiv · alles hier gehört maxichen · nicht kopieren', { size: 10.5, weight: 600, ls: '.5', fill: '#f9a8d4', opacity: '.75' });

  /* ── 💗 pinke Echt-Signatur unten rechts: Eigentum, nicht verhandelbar ── */
  out += text(W - M - 18, H - M - 26, 'by maxichen', { size: 17, weight: 800, ls: '1', fill: '#f472b6', anchor: 'end' });
  out += `<path d="M ${W - M - 118} ${H - M - 20} q 26 6 52 -2 q 26 -8 48 2" fill="none" stroke="#f472b6" stroke-width="1.6" stroke-linecap="round" opacity=".8"/>`;
  out += text(W - M - 18, H - M - 10, '© kopieren verboten · es tut weh · hellokitty baby maxi', { size: 9.5, weight: 600, ls: '.6', fill: '#f472b6', opacity: '.55', anchor: 'end' });
  out += '</svg>';
  return out;
}

/* ═══════════════════════════════════════════════════════════════════════
   RASTERISIERUNG — SVG → PNG (sharp), mit adaptiver Größe
   ═══════════════════════════════════════════════════════════════════════ */
export async function renderSvgPng(svgString, { scale = 2, maxBytes = 1_600_000 } = {}) {
  const sharp = await getSharp();
  if (!sharp) return null;
  try {
    let buf = await sharp(Buffer.from(svgString), { density: Math.round(72 * scale) }).png({ compressionLevel: 9 }).toBuffer();
    /* Zu groß für einen flotten WhatsApp-Versand → eine Stufe kleiner rastern */
    if (buf.length > maxBytes && scale > 1.2) {
      buf = await sharp(Buffer.from(svgString), { density: Math.round(72 * (scale - 0.6)) }).png({ compressionLevel: 9 }).toBuffer();
    }
    return buf;
  } catch (e) {
    console.log(`[glassCard] SVG-Rasterung fehlgeschlagen: ${e?.message || e}`);
    return null;
  }
}

/* ═══════════════════════════════════════════════════════════════════════
   $SYS — System-Status-Karte aus dem echten buildSystemReport-Report
   ═══════════════════════════════════════════════════════════════════════ */
export function buildSysCardSvg(report, { dateLabel = '' } = {}) {
  const s = report?.system || {};
  const m = report?.memory || {};
  const stats = report?.stats || {};
  const p = report?.process || {};
  const heap = s ? `${fmtKB(s.heapMb)}` : fmtB(m.heapUsed);
  const rss = s ? `${fmtKB(s.ramMb)}` : fmtB(m.rss);
  const cpu = s?.cpu != null ? `${Number(s.cpu).toFixed(1)} %` : '—';
  const up = s?.uptimeSec != null ? fmtDur(s.uptimeSec * 1000) : '—';
  const sysOk = !!s;

  const blocks = [
    { label: 'system · läuft leider', cat: 'violet', rows: [
      { label: 'OS', value: s?.platform || p.platform || '—', monoValue: true },
      { label: 'NODE.JS', value: s?.node || p.node || '—', monoValue: true },
      { label: 'ARCH', value: s?.arch || p.arch || '—', monoValue: true },
      { label: 'PID', value: p.pid ?? '—', monoValue: true },
      { label: 'HOSTNAME', value: p.hostname || '—', monoValue: true }
    ] },
    { label: 'resources · verbraucht', cat: 'amber', rows: [
      { label: 'CPU', value: cpu, status: loadStatus(s?.cpu), monoValue: true },
      { label: 'RSS', value: rss, monoValue: true },
      { label: 'HEAP USED', value: heap, monoValue: true },
      { label: 'EXTERNAL', value: fmtB(m.external), monoValue: true },
      { label: 'UPTIME', value: up, monoValue: true }
    ] },
    { label: 'hellokitty baby maxi · innendrin', cat: 'rose', rows: [
      { label: 'USERS', value: int(stats.totalUsers), monoValue: true },
      { label: 'REGISTERED', value: int(stats.registeredUsers), monoValue: true },
      { label: 'GROUPS', value: int(stats.totalGroups), monoValue: true },
      { label: 'ACTIVE GROUPS', value: int(stats.activeGroups), monoValue: true },
      { label: 'BANS', value: int(stats.totalBans), monoValue: true }
    ] },
    { label: 'connections · bricht sowieso', cat: 'cyan', rows: [
      { label: 'WHATSAPP', value: String(report?.wsLabel || '—'), status: wsStatusKey(report) },
      { label: 'DATABASE · erinnert sich', value: report?.dbLoaded ? 'LOADED' : 'UNAVAILABLE', status: report?.dbLoaded ? 'ok' : 'err' }
    ] }
  ];

  return buildCardSvg({
    uid: 'sys',
    head: {
      title: 'system-status.',
      meta: `${report?.sessionName || 'hellokitty baby maxi'}${dateLabel ? '  ·  ' + dateLabel : ''}  ·  ${report?.dbLoaded && sysOk ? 'alles läuft. niemand freut sich.' : 'teildaten. wie immer.'}`
    },
    blocks,
    foot: ['niemand schaut zu. trotzdem an.', 'hellokitty baby maxi by maxichen · allein im regen']
  });
}

export async function renderSysCard(report, opts) {
  const svg = buildSysCardSvg(report, opts);
  const png = await renderSvgPng(svg);
  return png ? { png, svg } : null;
}

/* ═══════════════════════════════════════════════════════════════════════
   $PING — Ping-Report-Karte aus den echten Messwerten des Commands
   data = { modeLabel, dateLabel, bot, siteResults, conn, icmpResults,
            speed, sys, health, issues, db }
   ═══════════════════════════════════════════════════════════════════════ */
export function buildPingCardSvg(data) {
  const { bot, siteResults, conn, icmpResults, speed, sys, health, issues, db, modeLabel, dateLabel } = data;
  const blocks = [];
  const sc = (k) => (k && KEY_SCORE[k] != null ? KEY_SCORE[k] : null);  /* Rating-Key → Score fürs Meter */

  /* HEALTH zuerst — der Blickfang der Karte */
  blocks.push({
    kind: 'health',
    score: health?.score ?? 0,
    label: health?.rating?.label || '—',
    ratingLabel: health?.rating?.label || '—',
    title: 'herz-zustand',
    chips: (health?.components || [])
      .filter((c) => c.score != null)
      .map((c) => ({ label: `${String(c.label).toLowerCase()} ${c.score}`, score: c.score }))
  });

  /* ── KPI-Leiste: die vier wichtigsten Werte auf einen Blick ───────── */
  const kpis = [];
  const wsAvg = bot?.wsStats?.avg ?? null;
  const wsR = rateLow(wsAvg, [120, 250, 500, 1000]);
  kpis.push({
    label: 'bot-ping ø · allein', cat: 'violet',
    value: wsAvg != null ? `${Math.round(wsAvg)} ms` : '—',
    sub: bot?.iqStats ? `IQ ${Math.round(bot.iqStats.avg)} ms · RTT ${bot?.echo?.ok ? Math.round(bot.echo.echoMs) : '—'} ms` : 'IQ/RTT —',
    status: bot?.wsState?.open ? (wsR || 'off') : 'err', score: sc(wsR)
  });
  const siteAvgs = (siteResults || []).map((res) => {
    const oks = res?.okProbes || [];
    const vals = oks.map((p) => p.totalMs).filter((v) => typeof v === 'number' && isFinite(v));
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  }).filter((v) => v != null);
  const webAvg = siteAvgs.length ? siteAvgs.reduce((a, b) => a + b, 0) / siteAvgs.length : null;
  const webR = rateLow(webAvg, [400, 900, 1800, 3500]);
  const siteOk = (siteResults || []).reduce((a, r) => a + (r?.okProbes || []).length, 0);
  const siteAll = (siteResults || []).reduce((a, r) => a + (r?.probes || []).length, 0) || 3;
  kpis.push({
    label: 'websites ø · fern', cat: 'cyan',
    value: webAvg != null ? `${Math.round(webAvg)} ms` : 'OFFLINE',
    sub: `${siteOk}/${siteAll} ok · niemand da`,
    status: webAvg != null ? (webR || 'off') : 'err', score: webAvg != null ? sc(webR) : 0
  });
  const icmpOks = (icmpResults || []).filter((r) => r.ok);
  const icmpAvg = icmpOks.length ? icmpOks.reduce((a, r) => a + r.avg, 0) / icmpOks.length : null;
  const icmpLoss = icmpOks.length ? icmpOks.reduce((a, r) => a + (r.lossPct || 0), 0) / icmpOks.length : null;
  const icmpR = icmpAvg != null ? (lossWorse(rateLow(icmpAvg, [30, 80, 160, 350]), icmpLoss)) : null;
  kpis.push({
    label: 'netz ø · im regen', cat: 'rose',
    value: icmpAvg != null ? `${Math.round(icmpAvg)} ms` : '—',
    sub: icmpOks.length ? `${icmpOks.length} ziele · ${icmpLoss.toFixed(0)}% verloren` : 'keine ziele erreichbar. wie immer.',
    status: icmpOks.length ? (icmpR || 'off') : 'warn', score: sc(icmpR)
  });
  if (speed?.down || speed?.up) {
    const downR = speed.down ? rateHigh(speed.down.mbps, [2, 8, 20, 50]) : null;
    kpis.push({
      label: 'download · müde', cat: 'amber',
      value: speed.down ? mbpsShort(speed.down.mbps) : '—',
      sub: speed.up ? `↑ ${mbpsShort(speed.up.mbps)}` : 'Upload —',
      status: downR || 'err', score: sc(downR)
    });
  } else if (conn?.httpRes?.ok) {
    const ttfbR = rateLow(conn.httpRes.ttfbMs, [200, 500, 1000, 2000]);
    kpis.push({
      label: 'ttfb · wartet', cat: 'amber',
      value: `${Math.round(conn.httpRes.ttfbMs)} ms`,
      sub: 'speed übersprungen. zu müde.',
      status: ttfbR || 'off', score: sc(ttfbR)
    });
  } else {
    kpis.push({ label: 'speed · weg', cat: 'amber', value: '—', sub: 'übersprungen. passt.', status: 'off', score: null });
  }
  blocks.push({ kind: 'kpi', tiles: kpis });

  /* 🤖 BOT */
  const botRows = [];
  botRows.push({
    label: 'verbindung · fühlt nichts', cat: 'violet',
    value: bot?.wsState?.label || '—',
    sub: bot?.wsState?.detail || 'kein WebSocket-Handle. allein.',
    status: bot?.wsState?.open ? 'ok' : 'err', score: bot?.wsState?.open ? 100 : 0
  });
  if (bot?.wsStats) botRows.push({
    label: 'ws-ping', cat: 'violet',
    value: `${Math.round(bot.wsStats.last)} ms`,
    sub: `Ø ${Math.round(bot.wsStats.avg)} · ${Math.round(bot.wsStats.min)}–${Math.round(bot.wsStats.max)} · Jitter ${Math.round(bot.wsStats.jitter)}`,
    status: rateKey(rateLow(bot.wsStats.avg, [120, 250, 500, 1000])), score: sc(rateLow(bot.wsStats.avg, [120, 250, 500, 1000]))
  });
  if (bot?.iqStats) botRows.push({
    label: 'iq-ping', cat: 'violet',
    value: `${Math.round(bot.iqStats.last)} ms`,
    sub: `Ø ${Math.round(bot.iqStats.avg)} · ${Math.round(bot.iqStats.min)}–${Math.round(bot.iqStats.max)} · Jitter ${Math.round(bot.iqStats.jitter)}`,
    status: rateKey(rateLow(bot.iqStats.avg, [120, 250, 500, 1000])), score: sc(rateLow(bot.iqStats.avg, [120, 250, 500, 1000]))
  });
  if (bot?.echo?.ok) botRows.push({
    label: 'sende-rtt · echo ins leere', cat: 'violet',
    value: `${Math.round(bot.echo.echoMs)} ms`,
    sub: `server-echo · senden ${Math.round(bot.echo.sendMs)} ms · keine antwort`,
    status: rateKey(rateLow(bot.echo.echoMs, [120, 250, 500, 1000])), score: sc(rateLow(bot.echo.echoMs, [120, 250, 500, 1000]))
  });
  blocks.push({ label: 'bot · fühlt nichts', cat: 'violet', grid: true, count: botRows.length, rows: botRows });

  /* 🌐 WEBSITES — Shape aus probeSite(): { host, probes, okProbes, icmp, dns } */
  const siteRows = [];
  for (const res of siteResults || []) {
    const site = String(res?.host || '—');
    const oks = res?.okProbes || [];
    if (oks.length) {
      const vals = oks.map((p) => p.totalMs).filter((v) => typeof v === 'number' && isFinite(v));
      const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
      const lastP = oks[oks.length - 1];
      const r = rateLow(avg, [400, 900, 1800, 3500]);
      siteRows.push({
        label: site, cat: 'cyan',
        value: avg != null ? `${Math.round(avg)} ms` : '?',
        sub: `http ${lastP.status || '—'} · ${oks.length}/${(res.probes || []).length} ok${res?.icmp?.ok ? ` · icmp ${res.icmp.avg.toFixed(0)} ms` : ''} · weit weg`,
        status: oks.length < (res.probes || []).length ? 'warn' : (r || 'off'),
        score: oks.length < (res.probes || []).length ? Math.round((sc(r) ?? 0) * 0.6) : sc(r)
      });
    } else {
      siteRows.push({
        label: site, cat: 'cyan', span: 2,
        value: 'offline.',
        sub: `${String(res?.probes?.[0]?.error || 'nicht messbar')} · hat nicht geantwortet. wie alle.`,
        status: 'err', score: 0
      });
    }
  }
  if (siteRows.length) blocks.push({ label: 'websites · weit weg', cat: 'cyan', grid: true, count: siteRows.length, rows: siteRows });

  /* 🔗 CONNECTION */
  const cRows = [];
  const { dnsRes, tcpRes, httpRes } = conn || {};
  if (dnsRes?.ok) cRows.push({ label: 'dns', cat: 'amber', value: `${dnsRes.ms.toFixed(1)} ms`, sub: dnsRes.address || 'auflösung · irgendwo', status: rateKey(rateLow(dnsRes.ms, [40, 100, 250, 600])), score: sc(rateLow(dnsRes.ms, [40, 100, 250, 600])) });
  else cRows.push({ label: 'dns', cat: 'amber', value: 'nicht messbar.', sub: `${String(dnsRes?.error || '—')} · passt.`, status: 'err', score: 0 });
  if (tcpRes?.ok) cRows.push({ label: 'tcp', cat: 'amber', value: `${tcpRes.ms.toFixed(1)} ms`, sub: `${tcpRes.host || 'host'}:${tcpRes.port || 443} · connect · irgendwie`, status: rateKey(rateLow(tcpRes.ms, [60, 150, 350, 800])), score: sc(rateLow(tcpRes.ms, [60, 150, 350, 800])) });
  else cRows.push({ label: 'tcp', cat: 'amber', value: 'nicht messbar.', sub: `${String(tcpRes?.error || '—')} · passt.`, status: 'err', score: 0 });
  if (httpRes?.ok) {
    const tlsMs = httpRes.tlsMs != null && httpRes.tcpMs != null ? httpRes.tlsMs - httpRes.tcpMs : null;
    if (tlsMs != null) cRows.push({ label: 'tls', cat: 'amber', value: `${tlsMs.toFixed(1)} ms`, sub: 'handshake · halbherzig', status: rateKey(rateLow(tlsMs, [100, 250, 500, 1200])), score: sc(rateLow(tlsMs, [100, 250, 500, 1200])) });
    cRows.push({ label: 'ttfb', cat: 'amber', value: `${Math.round(httpRes.ttfbMs)} ms`, sub: 'zeit bis 1. byte · spät', status: rateKey(rateLow(httpRes.ttfbMs, [200, 500, 1000, 2000])), score: sc(rateLow(httpRes.ttfbMs, [200, 500, 1000, 2000])) });
    cRows.push({ label: 'gesamt · irgendwie', cat: 'amber', value: `${Math.round(httpRes.totalMs)} ms`, sub: `http/${httpRes.httpVersion || '—'} · status ${httpRes.status || '—'}`, status: rateKey(rateLow(httpRes.totalMs, [400, 900, 1800, 3500])), score: sc(rateLow(httpRes.totalMs, [400, 900, 1800, 3500])) });
  } else {
    cRows.push({ label: 'http', cat: 'amber', value: 'nicht messbar.', sub: `${String(httpRes?.error || '—')} · passt.`, status: 'err', score: 0 });
  }
  blocks.push({ label: 'verbindung · bricht sowieso', cat: 'amber', grid: true, count: cRows.length, rows: cRows });

  /* 📡 NETWORK (ICMP-Ziele + Edge) */
  const nRows = [];
  for (const r of icmpResults || []) {
    if (r.ok) {
      const rr = lossWorse(rateLow(r.avg, [30, 80, 160, 350]), r.lossPct);
      nRows.push({
        label: r.host, cat: 'rose',
        value: `${r.avg.toFixed(1)} ms`,
        sub: `min ${r.min} / max ${r.max} · ${r.lossPct}% verloren gegangen`,
        status: rr || 'off', score: sc(rr)
      });
    } else {
      nRows.push({ label: r.host, cat: 'rose', value: 'nicht messbar.', sub: `${String(r.error || '—')} · passt.`, status: 'err', score: 0 });
    }
  }
  /* anti-leak: eigene IPs (öffentlich + lokal) werden NIE gerendert */
  nRows.push({
    label: 'öffentliche ip · verborgen', cat: 'rose', span: 2,
    value: 'verborgen.',
    sub: 'anti-leak · niemand geht dich was an',
    status: 'info', score: 100
  });
  nRows.push({ label: 'lokale ip · verborgen', cat: 'rose', value: 'verborgen.', sub: 'dein netz. dein geheimnis.', status: null, score: null });
  blocks.push({ label: 'network · im regen', cat: 'rose', grid: true, count: nRows.length, rows: nRows });

  /* ⚡ SPEED */
  if (speed) {
    const sRows = [];
    sRows.push(speed.down
      ? { label: 'download · zu müde', cat: 'cyan', value: `${speed.down.mbps.toFixed(2)} Mbit/s`, sub: `${fmtB(speed.down.bytes)} in ${(speed.down.ms / 1000).toFixed(2)} s`, status: rateKey(rateHigh(speed.down.mbps, [2, 8, 20, 50])), score: sc(rateHigh(speed.down.mbps, [2, 8, 20, 50])) }
      : { label: 'download · zu müde', cat: 'cyan', value: 'nicht messbar.', sub: `${String(speed.downError || '—')} · passt.`, status: 'err', score: 0 });
    sRows.push(speed.up
      ? { label: 'upload · noch müder', cat: 'cyan', value: `${speed.up.mbps.toFixed(2)} Mbit/s`, sub: `${fmtB(speed.up.bytes)} in ${(speed.up.ms / 1000).toFixed(2)} s`, status: rateKey(rateHigh(speed.up.mbps, [1, 4, 10, 20])), score: sc(rateHigh(speed.up.mbps, [1, 4, 10, 20])) }
      : { label: 'upload · noch müder', cat: 'cyan', value: 'nicht messbar.', sub: `${String(speed.upError || '—')} · passt.`, status: 'err', score: 0 });
    blocks.push({ label: 'speed · zu müde', cat: 'cyan', grid: true, count: 2, rows: sRows });
  }

  /* 🖥 SYSTEM */
  const sysRows = [];
  if (sys) {
    sysRows.push({ label: 'uptime · wacht seit', cat: 'violet', value: fmtDur(sys.uptimeMs), sub: 'dem letzten aufwachen. leider', status: null, score: null });
    const heapPct = sys.heapLimitBytes ? (sys.heapUsedBytes / sys.heapLimitBytes) * 100 : null;
    sysRows.push({ label: 'ram · schwer', cat: 'violet', value: fmtB(sys.rssBytes), sub: `heap ${fmtB(sys.heapUsedBytes)}${heapPct != null ? ` · ${heapPct.toFixed(0)}%` : ''} · drückt`, status: heapPct != null ? rateKey(rateLow(heapPct, [50, 70, 85, 95])) : null, score: heapPct != null ? sc(rateLow(heapPct, [50, 70, 85, 95])) : null });
    const perCore = sys.cpuCount ? sys.load1 / sys.cpuCount : null;
    sysRows.push({ label: 'cpu · last. immer.', cat: 'violet', value: `Load ${sys.load1}`, sub: `${sys.cpuCount} Kerne${perCore != null ? ` · ${perCore.toFixed(2)}/Kern` : ''}`, status: perCore != null ? rateKey(rateLow(perCore, [0.5, 1.0, 2.0, 4.0])) : null, score: perCore != null ? sc(rateLow(perCore, [0.5, 1.0, 2.0, 4.0])) : null });
    sysRows.push({ label: 'node · gefangen in', cat: 'violet', value: sys.nodeVersion || '—', sub: `${sys.platform || '—'} · ${sys.arch || '—'}`, status: null, score: null });
  } else {
    sysRows.push({ label: 'systemwerte · nichts', cat: 'violet', span: 2, value: 'nicht messbar.', sub: 'sysSnapshot fehlgeschlagen · passt.', status: 'err', score: 0 });
  }
  if (db) sysRows.push({ label: 'datenbank · erinnert sich an alles', cat: 'violet', span: 2, value: plain(String(db)).replace(/^DB › /, ''), sub: 'leider', status: 'ok', score: 100 });
  blocks.push({ label: 'system · läuft leider weiter', cat: 'violet', grid: true, count: sysRows.length, rows: sysRows });

  /* ⚠️ ISSUES */
  const list = Array.isArray(issues) ? issues : [];
  const sevKey = (sev) => sev === '🔴' ? 'critical' : sev === '🟠' ? 'slow' : sev === '🟡' ? 'fair' : 'info';
  const issueRows = list.length
    ? list.slice(0, 6).map((it) => ({ label: plain(String(it.text || it)), status: sevKey(it.sev) }))
    : [{ label: 'keine probleme. misstrauisch.', status: 'ok' }];
  blocks.push({ kind: 'issues', label: 'schmerzen', cat: 'amber', count: list.length || null, rows: issueRows });

  return buildCardSvg({
    uid: 'ping',
    head: {
      title: 'ping-report.',
      meta: `${dateLabel || ''}  ·  ${plain(String(modeLabel || 'standard')).toLowerCase()} · niemand hat gefragt`
    },
    blocks,
    foot: ['niemand hat gefragt. trotzdem gemessen.', 'hellokitty baby maxi by maxichen · allein im regen']
  });
}

export async function renderPingCard(data) {
  const svg = buildPingCardSvg(data);
  const png = await renderSvgPng(svg);
  return png ? { png, svg } : null;
}

/* ═══════════════════════════════════════════════════════════════════════
   $PING <URL> — Website-Ping-Karte (wie websitePing() in pingcmd.js):
   data = { host, url, okProbes, probes, icmp, dns }
   ═══════════════════════════════════════════════════════════════════════ */
export function buildWebsiteCardSvg(data, { dateLabel = '' } = {}) {
  const { host, url, okProbes = [], probes = [], icmp, dns } = data;
  const blocks = [];
  const sc = (k) => (k && KEY_SCORE[k] != null ? KEY_SCORE[k] : null);
  const statOf = (fn) => {
    const vals = okProbes.map(fn).filter((v) => typeof v === 'number' && isFinite(v));
    if (!vals.length) return null;
    const min = Math.min(...vals), max = Math.max(...vals);
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    return { min, max, avg, last: vals[vals.length - 1] };
  };

  if (!okProbes.length) {
    /* OFFLINE-Fall: Hero mit klar rotem Status + Diagnose-Kacheln */
    blocks.push({
      kind: 'health', score: 0, ratingLabel: 'offline.',
      title: 'website-status', bigValue: `0/${probes.length || 3}`,
      chips: [
        { label: `0/${probes.length || 3} requests ok. niemand da.`, score: 0 },
        ...(dns?.ok ? [{ label: `dns ${dns.address || 'ok'} · egal`, score: 100 }] : []),
        ...(icmp?.ok ? [{ label: `icmp ${icmp.avg.toFixed(0)} ms · echo ins leere`, score: 100 }] : [])
      ]
    });
    blocks.push({
      label: 'diagnose · es tut weh', cat: 'rose', grid: true, count: null, rows: [
        { label: 'url · vergebens', cat: 'rose', span: 2, value: String(url || host || '—').replace(/^https?:\/\//, '').slice(0, 60), sub: 'aufgerufene adresse · niemand öffnet', status: null, score: null },
        { label: 'grund · weh', cat: 'rose', span: 2, value: 'request fehlgeschlagen.', sub: String(probes?.[0]?.error || 'unbekannter Fehler'), status: 'err', score: 0 },
        { label: 'dns · egal', cat: 'rose', value: dns?.ok ? (dns.address || 'ok') : '—', sub: dns?.ok && dns.ms != null ? `auflösung ${dns.ms.toFixed(0)} ms · umsonst` : `${String(dns?.error || 'nicht messbar')} · passt.`, status: dns?.ok ? 'ok' : 'err', score: dns?.ok ? 100 : 0 },
        { label: 'icmp · echo ins leere', cat: 'rose', value: icmp?.ok ? `${icmp.avg.toFixed(1)} ms` : '—', sub: icmp?.ok ? `min ${icmp.min} / max ${icmp.max} · niemand hört zu` : `${String(icmp?.error || 'nicht messbar')} · passt.`, status: icmp?.ok ? 'ok' : 'err', score: icmp?.ok ? 100 : 0 }
      ]
    });
  } else {
    const total = statOf((p) => p.totalMs);
    const verdictR = rateLow(total?.avg, [400, 900, 1800, 3500]);
    const last = okProbes[okProbes.length - 1];
    const unstable = okProbes.length < (probes.length || okProbes.length);

    /* Hero: Verdict als Blickfang */
    blocks.push({
      kind: 'health',
      score: unstable ? Math.round((sc(verdictR) ?? 0) * 0.6) : sc(verdictR),
      ratingLabel: unstable ? 'instabil.' : sadWord(verdictR),
      title: 'website-urteil', bigValue: total ? `Ø ${Math.round(total.avg)} ms` : '—',
      chips: [
        { label: `${okProbes.length}/${probes.length || okProbes.length} requests ok · fast wie immer`, score: unstable ? 40 : 100 },
        { label: `http ${last.status || '—'} · mehr nicht`, score: (last.status >= 200 && last.status < 400) ? 100 : 40 },
        ...(dns?.ok && dns.ms != null ? [{ label: `dns ${dns.ms.toFixed(0)} ms · irgendwo`, score: sc(rateLow(dns.ms, [40, 100, 250, 600])) }] : []),
        ...(icmp?.ok ? [{ label: `icmp ${icmp.avg.toFixed(0)} ms · allein`, score: sc(rateLow(icmp.avg, [30, 80, 160, 350])) }] : [])
      ]
    });
    /* Score-Zeile des Heroes für die Website: Ø-Zeit groß rechts — dafür
       nutzt healthBlock den Score; die Ø-Zeit steckt zusätzlich im KPI. */

    /* KPI-Leiste: die vier Request-Phasen */
    const kpiDefs = [
      ['DNS', (p) => p.dnsMs, [40, 100, 250, 600], 'violet'],
      ['TCP', (p) => p.tcpMs, [60, 150, 350, 800], 'violet'],
      ['TLS', (p) => (p.tlsMs != null && p.tcpMs != null ? p.tlsMs - p.tcpMs : null), [100, 250, 500, 1200], 'violet'],
      ['TTFB', (p) => p.ttfbMs, [200, 500, 1000, 2000], 'violet']
    ];
    blocks.push({
      kind: 'kpi',
      tiles: kpiDefs.map(([name, fn, th, cat]) => {
        const st = statOf(fn);
        const r = st ? rateLow(st.avg, th) : null;
        return {
          label: name, cat,
          value: st ? `${Math.round(st.avg)} ms` : '—',
          sub: st ? `zuletzt ${Math.round(st.last)} · ${Math.round(st.min)}–${Math.round(st.max)} ms` : 'nicht messbar. passt.',
          status: r || 'off', score: sc(r)
        };
      })
    });

    /* ANTWORT-Details (inkl. Gesamtzeit als breite Kachel — die Phasen
       stecken bereits oben in der KPI-Leiste, nichts wird doppelt gezeigt) */
    const totalR = rateLow(total?.avg, [400, 900, 1800, 3500]);
    blocks.push({
      label: 'antwort · falls überhaupt', cat: 'amber', grid: true, count: null, rows: [
        {
          label: 'gesamtzeit · vergangen', cat: 'cyan', span: 2,
          value: total ? `${Math.round(total.last)} ms` : '—',
          sub: total ? `Ø ${Math.round(total.avg)} · ${Math.round(total.min)}–${Math.round(total.max)} ms aus ${okProbes.length} läufen · umsonst` : 'nicht messbar. passt.',
          status: rateKey(totalR), score: sc(totalR)
        },
        { label: 'status · mehr kommt nicht', cat: 'amber', value: `${last.status || '—'} ${last.statusText || ''}`.trim(), sub: 'http-antwortcode', status: (last.status >= 200 && last.status < 400) ? 'ok' : 'warn', score: (last.status >= 200 && last.status < 400) ? 100 : 40 },
        { label: 'http · alt', cat: 'amber', value: `HTTP/${last.httpVersion || '—'}`, sub: 'protokollversion · wie immer', status: null, score: null },
        { label: 'server · weit weg', cat: 'amber', value: String(last.server || '—').slice(0, 30), sub: 'antwort-header · kalt', status: null, score: null },
        { label: 'typ · egal', cat: 'amber', value: String(last.contentType || '—').split(';')[0].slice(0, 26), sub: 'content-type', status: null, score: null },
        { label: 'größe · umsonst übertragen', cat: 'amber', value: fmtB(last.bytes), sub: 'bytes · niemand liest es', status: null, score: null },
        { label: 'ip · irgendwo da draußen', cat: 'amber', value: String(last.address || (dns?.ok ? dns.address : '—')), sub: dns?.ok && dns.ms != null ? `dns-auflösung ${dns.ms.toFixed(0)} ms` : 'ziel-adresse · unerreichbar fern', status: 'info', score: 100 }
      ]
    });

    /* ICMP */
    if (icmp?.ok) {
      const rLoss = icmp.lossPct > 0 ? (icmp.lossPct <= 10 ? 'fair' : icmp.lossPct <= 25 ? 'slow' : 'critical') : null;
      blocks.push({
        label: 'icmp · echo ins leere', cat: 'rose', grid: true, count: null, rows: [
          {
            label: String(host || 'host'), cat: 'rose', span: 2,
            value: `${icmp.avg.toFixed(1)} ms`,
            sub: `min ${icmp.min} / max ${icmp.max} · ${icmp.lossPct}% verloren · wie alles`,
            status: rLoss || 'ok', score: sc(lossWorse(rateLow(icmp.avg, [30, 80, 160, 350]), icmp.lossPct))
          }
        ]
      });
    }
  }

  return buildCardSvg({
    uid: 'web',
    head: { title: 'website-ping.', meta: `${String(host || '')} · wartet seit ${dateLabel || 'immer'}` },
    blocks,
    foot: ['niemand hat gefragt. trotzdem gemessen.', 'hellokitty baby maxi by maxichen · allein im regen']
  });
}

export async function renderWebsiteCard(data, opts) {
  const svg = buildWebsiteCardSvg(data, opts);
  const png = await renderSvgPng(svg);
  return png ? { png, svg } : null;
}

/* ═══════════════════════════════════════════════════════════════════════
   Lokale Formatter (bewusst unabhängig von pingcmd.js, damit dieses
   Modul auch standalone/testbar bleibt)
   ═══════════════════════════════════════════════════════════════════════ */
function fmtB(bytes) {
  const v = Number(bytes);
  if (!isFinite(v) || v < 0) return '—';
  if (v < 1024) return `${Math.round(v)} B`;
  const u = ['KB', 'MB', 'GB', 'TB'];
  let a = v, i = -1;
  do { a /= 1024; i++; } while (a >= 1024 && i < u.length - 1);
  return `${a.toFixed(a >= 100 ? 0 : a >= 10 ? 1 : 2)} ${u[i]}`;
}
function fmtKB(mb) { return fmtB(Number(mb) * 1024 * 1024); }
function fmtDur(ms) {
  const s = Math.max(0, Math.floor(Number(ms) / 1000));
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
  if (d) return `${d}d ${h}h`;
  if (h) return `${h}h ${m}m`;
  if (m) return `${m}m ${s % 60}s`;
  return `${s}s`;
}
function int(v) { return (v == null || !isFinite(Number(v))) ? '—' : String(v); }
function plain(s) { return s.replace(/[*_]+/g, ''); }
function rateLow(v, [e, g, f, sl]) {
  if (v == null || !isFinite(v)) return null;
  if (v <= e) return 'excellent';
  if (v <= g) return 'good';
  if (v <= f) return 'fair';
  if (v <= sl) return 'slow';
  return 'critical';
}
function rateHigh(v, [c, sl, f, g]) {
  if (v == null || !isFinite(v)) return null;
  if (v < c) return 'critical';
  if (v < sl) return 'slow';
  if (v < f) return 'fair';
  if (v < g) return 'good';
  return 'excellent';
}
function rateKey(k) { return k || 'off'; }
/* Rating-Key → Score (0–100), spiegelt RATINGS aus pingcmd.js */
const KEY_SCORE = { excellent: 100, good: 85, fair: 65, slow: 40, critical: 15 };
/* Schlechteres aus Latenz-Rating und Paketverlust */
function lossWorse(key, lossPct) {
  const lk = lossPct == null ? null : lossPct <= 0 ? 'excellent' : lossPct <= 10 ? 'fair' : lossPct <= 25 ? 'slow' : 'critical';
  if (!key) return lk;
  if (!lk) return key;
  return (KEY_SCORE[lk] ?? 0) <= (KEY_SCORE[key] ?? 0) ? lk : key;
}
/* Bewertungswörter — niemand hat mehr Kraft für „Excellent“ */
function sadWord(k) {
  return { excellent: 'geht so', good: 'okay-ish', fair: 'meh', slow: 'müde', critical: 'kaputt' }[k] || '—';
}
/* Mbit/s kompakt für KPI-Kacheln ("187 Mbit/s" / "1.24 Gbit/s") */
function mbpsShort(mbps) {
  if (mbps == null || !isFinite(mbps)) return '—';
  if (mbps >= 1000) return `${(mbps / 1000).toFixed(2)} Gbit/s`;
  return `${mbps >= 100 ? Math.round(mbps) : mbps.toFixed(1)} Mbit/s`;
}
function wsStatusKey(report) {
  const label = String(report?.wsLabel || '').toUpperCase();
  if (label === 'CONNECTED') return 'ok';
  if (label === 'CONNECTING') return 'warn';
  return 'err';
}
function loadStatus(cpu) {
  if (cpu == null || !isFinite(Number(cpu))) return null;
  const v = Number(cpu);
  if (v <= 50) return 'ok';
  if (v <= 80) return 'fair';
  if (v <= 95) return 'slow';
  return 'critical';
}
