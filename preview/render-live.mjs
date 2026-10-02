/* Live-Demo: echte Messungen aus netping.js + echte Systemwerte,
   Bot-Teil gemockt (keine WhatsApp-Session in der Sandbox). */
import {
  icmpPing, tcpPing, dnsPing, httpProbe, speedTest, edgeTrace, sysSnapshot, statsOf, sample
} from '../netping.js';
import { computeHealth, HEALTH_WEIGHTS, rateLowIsGood, rateHighIsGood, rateLoss } from '../pingcmd.js';
import { buildPingCardSvg, renderSvgPng } from '../glassCard.js';
import fs from 'node:fs';

const TH = {
  bot: [120, 250, 500, 1000], siteTotal: [400, 900, 1800, 3500], ttfb: [200, 500, 1000, 2000],
  dns: [40, 100, 250, 600], tcp: [60, 150, 350, 800], tls: [100, 250, 500, 1200],
  icmp: [30, 80, 160, 350], ramPct: [50, 70, 85, 95], loadPerCore: [0.5, 1.0, 2.0, 4.0]
};
const safe = async (fn, fb) => { try { return await fn(); } catch (e) { return fb; } };

const probeSite = async (host) => {
  const url = 'https://' + host;
  const [probes, icmp, dns] = await Promise.all([
    safe(() => sample(() => httpProbe(url, { timeoutMs: 12000 }), 3, 200), []),
    safe(() => icmpPing(host, { count: 3, timeoutMs: 9000 }), { ok: false, host, error: 'nicht messbar (Sandbox)' }),
    safe(() => dnsPing(host, 6000), { ok: false, hostname: host, error: 'nicht messbar' })
  ]);
  return { host, url, probes, okProbes: probes.filter((p) => p && p.ok), icmp, dns };
};

const [siteResults, icmpResults, conn, speed, sys] = await Promise.all([
  Promise.all(['maxichen.de', 'maxichen.gamebot.me'].map(probeSite)),
  Promise.all(['1.1.1.1', '8.8.8.8', 'web.whatsapp.net'].map((h) =>
    safe(() => icmpPing(h, { count: 3, timeoutMs: 9000 }), { ok: false, host: h, error: 'nicht messbar (Sandbox)' }))),
  (async () => {
    const [dnsRes, tcpRes, httpRes, edge] = await Promise.all([
      safe(() => dnsPing('cloudflare.com'), { ok: false, hostname: 'cloudflare.com', error: '—' }),
      safe(() => tcpPing('cloudflare.com', 443, 5000), { ok: false, host: 'cloudflare.com', port: 443, error: '—' }),
      safe(() => httpProbe('https://cloudflare.com/cdn-cgi/trace', { timeoutMs: 12000 }), { ok: false, url: '—', error: '—' }),
      safe(() => edgeTrace(), { ok: false, error: '—' })
    ]);
    return { dnsRes, tcpRes, httpRes, edge };
  })(),
  safe(() => speedTest({ downBytes: 3 * 1024 * 1024, upBytes: 1024 * 1024, timeoutMs: 20000 }), null),
  safe(() => sysSnapshot(), null)
]);

/* Bot-Teil gemockt (keine WA-Session in der Sandbox) */
const bot = {
  wsState: { readyState: 1, label: 'OPEN', open: true, detail: 'readyState 1 (Demo)' },
  wsSamples: [{ ok: true, ms: 96 }, { ok: true, ms: 104 }, { ok: true, ms: 101 }],
  wsOk: [{ ok: true, ms: 96 }, { ok: true, ms: 104 }, { ok: true, ms: 101 }],
  wsStats: statsOf([96, 104, 101]),
  iqSamples: [{ ok: true, ms: 122 }, { ok: true, ms: 118 }, { ok: true, ms: 130 }],
  iqOk: [{ ok: true, ms: 122 }, { ok: true, ms: 118 }, { ok: true, ms: 130 }],
  iqStats: statsOf([122, 118, 130]),
  echo: { ok: true, echoMs: 187, sendMs: 84 }
};

const avgOf = (list) => { const v = list.filter((x) => x != null && isFinite(x)); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
const siteAvg = (r) => avgOf(r.okProbes.map((p) => p.totalMs));
const botScore = avgOf([bot.wsStats, bot.iqStats].map((s) => rateLowIsGood(s.avg, TH.bot)?.score).concat(bot.echo.ok ? rateLowIsGood(bot.echo.echoMs, TH.bot)?.score : 0));
const websitesScore = avgOf(siteResults.map((r) => { const t = rateLowIsGood(siteAvg(r), TH.siteTotal); return t ? Math.round(t.score * (r.okProbes.length / (r.probes.length || 3))) : 0; }));
const networkScore = avgOf(icmpResults.map((r) => r.ok ? Math.min(rateLowIsGood(r.avg, TH.icmp)?.score ?? 0, rateLoss(r.lossPct)?.score ?? 0) : 0));
const connectionScore = avgOf([
  conn.dnsRes.ok ? rateLowIsGood(conn.dnsRes.ms, TH.dns)?.score : 0,
  conn.tcpRes.ok ? rateLowIsGood(conn.tcpRes.ms, TH.tcp)?.score : 0,
  conn.httpRes.ok && conn.httpRes.tlsMs != null ? rateLowIsGood(conn.httpRes.tlsMs - conn.httpRes.tcpMs, TH.tls)?.score : 0,
  conn.httpRes.ok ? rateLowIsGood(conn.httpRes.ttfbMs, TH.ttfb)?.score : 0
]);
const speedScore = speed ? Math.round((speed.down ? rateHighIsGood(speed.down.mbps, [2, 8, 20, 50]).score : 0) * 0.6 + (speed.up ? rateHighIsGood(speed.up.mbps, [1, 4, 10, 20]).score : 0) * 0.4) : null;
const heapPct = sys?.heapLimitBytes ? (sys.heapUsedBytes / sys.heapLimitBytes) * 100 : null;
const systemScore = sys ? avgOf([heapPct != null ? rateLowIsGood(heapPct, TH.ramPct)?.score : null, sys.cpuCount ? rateLowIsGood(sys.load1 / sys.cpuCount, TH.loadPerCore)?.score : null]) : null;

const health = computeHealth([
  { id: 'bot', label: 'Bot', weight: HEALTH_WEIGHTS.bot, score: botScore },
  { id: 'websites', label: 'Websites', weight: HEALTH_WEIGHTS.websites, score: websitesScore },
  { id: 'network', label: 'Netzwerk', weight: HEALTH_WEIGHTS.network, score: networkScore },
  { id: 'connection', label: 'Verbindung', weight: HEALTH_WEIGHTS.connection, score: connectionScore },
  { id: 'speed', label: 'Speed', weight: HEALTH_WEIGHTS.speed, score: speedScore },
  { id: 'system', label: 'System', weight: HEALTH_WEIGHTS.system, score: systemScore }
]);

const issues = [];
for (const r of siteResults) if (!r.okProbes.length) issues.push({ sev: '🔴', text: `*${r.host}* — OFFLINE` });
for (const r of icmpResults) if (!r.ok) issues.push({ sev: '🟠', text: `*${r.host}* — ICMP in der Sandbox nicht messbar` });

const now = new Date();
const pad = (n) => String(n).padStart(2, '0');
const svg = buildPingCardSvg({
  modeLabel: 'Live-Demo _(Sandbox-Messung)_',
  dateLabel: `${pad(now.getDate())}.${pad(now.getMonth() + 1)}.${now.getFullYear()} · ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`,
  bot, siteResults, conn, icmpResults, speed, sys, health, issues,
  db: 'DB › Demo (keine Session)'
});
fs.writeFileSync('preview/ping-card-live.svg', svg);
const png = await renderSvgPng(svg);
fs.writeFileSync('preview/ping-card-live.png', png);
console.log('Live-Karte:', png.length, 'bytes · Health', health.score + '%', health.rating.label);
console.log('Sites:', siteResults.map((r) => `${r.host}=${r.okProbes.length ? Math.round(siteAvg(r)) + 'ms' : 'OFFLINE'}`).join(' · '));
console.log('ICMP:', icmpResults.map((r) => r.ok ? r.avg.toFixed(1) : 'n/a').join(' · '), '· Speed:', speed?.down ? speed.down.mbps.toFixed(1) : 'n/a', 'Mbit/s');
