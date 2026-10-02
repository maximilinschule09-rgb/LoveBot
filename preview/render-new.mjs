import { buildPingCardSvg, buildWebsiteCardSvg, renderSvgPng } from '../glassCard.js';
import fs from 'node:fs';
const bot = {
  wsState: { readyState: 1, label: 'OPEN', open: true, detail: 'readyState 1' },
  wsSamples: [{ ok: true, ms: 118 }, { ok: true, ms: 132 }, { ok: true, ms: 127 }],
  wsOk: [{ ok: true, ms: 118 }, { ok: true, ms: 132 }, { ok: true, ms: 127 }],
  wsStats: { n: 3, min: 118, max: 132, avg: 125.7, jitter: 8, last: 127 },
  iqSamples: [{ ok: true, ms: 141 }, { ok: true, ms: 149 }, { ok: true, ms: 152 }],
  iqOk: [{ ok: true, ms: 141 }, { ok: true, ms: 149 }, { ok: true, ms: 152 }],
  iqStats: { n: 3, min: 141, max: 152, avg: 147.3, jitter: 6.5, last: 152 },
  echo: { ok: true, echoMs: 214, sendMs: 96 }
};
const siteResults = [
  { host: 'maxichen.de', url: 'https://maxichen.de', probes: [{ ok: true, totalMs: 412, status: 200 }, { ok: true, totalMs: 389, status: 200 }, { ok: true, totalMs: 401, status: 200 }], okProbes: [{ ok: true, totalMs: 412, status: 200 }, { ok: true, totalMs: 389, status: 200 }, { ok: true, totalMs: 401, status: 200 }], icmp: { ok: true, avg: 12.3 }, dns: { ok: true, ms: 18, address: '1.2.3.4' } },
  { host: 'maxichen.gamebot.me', url: 'https://maxichen.gamebot.me', probes: [{ ok: true, totalMs: 655, status: 200 }, { ok: false, error: 'timeout' }, { ok: true, totalMs: 702, status: 200 }], okProbes: [{ ok: true, totalMs: 655, status: 200 }, { ok: true, totalMs: 702, status: 200 }], icmp: { ok: true, avg: 14.1 }, dns: { ok: true, ms: 22, address: '5.6.7.8' } }
];
const conn = {
  dnsRes: { ok: true, ms: 14.2, address: '104.16.132.229' },
  tcpRes: { ok: true, ms: 22.8, host: 'cloudflare.com', port: 443 },
  httpRes: { ok: true, ttfbMs: 88, totalMs: 143, tcpMs: 21, tlsMs: 61, status: 200, httpVersion: '2' },
  edge: { ok: true, ip: '84.123.45.67', loc: 'Cologne', colo: 'DUS', tls: 'TLSv1.3', http: 'HTTP/2' }
};
const icmpResults = [
  { ok: true, host: '1.1.1.1', avg: 11.2, min: 10, max: 14, lossPct: 0 },
  { ok: true, host: '8.8.8.8', avg: 13.8, min: 12, max: 18, lossPct: 0 },
  { ok: true, host: 'web.whatsapp.net', avg: 28.4, min: 24, max: 35, lossPct: 0 }
];
const speed = { down: { mbps: 187.42, bytes: 3145728, ms: 134 }, up: { mbps: 38.11, bytes: 1048576, ms: 220 } };
const sys = {
  uptimeMs: 432 * 60 * 1000, rssBytes: 218 * 1024 * 1024, heapUsedBytes: 96 * 1024 * 1024,
  heapTotalBytes: 122 * 1024 * 1024, heapLimitBytes: 4295 * 1024 * 1024, load1: 0.82,
  cpuCount: 8, nodeVersion: 'v24.4.1', platform: 'win32', arch: 'x64',
  localIps: [{ iface: 'Ethernet', address: '192.168.0.42' }]
};
const health = {
  score: 86, rating: { key: 'good', emoji: '🟢', label: 'Good', score: 85 },
  components: [
    { id: 'bot', label: 'Bot', weight: 25, score: 88 },
    { id: 'websites', label: 'Websites', weight: 25, score: 84 },
    { id: 'network', label: 'Netzwerk', weight: 15, score: 97 },
    { id: 'connection', label: 'Verbindung', weight: 10, score: 92 },
    { id: 'speed', label: 'Speed', weight: 10, score: 100 },
    { id: 'system', label: 'System', weight: 15, score: 58 }
  ]
};
const issues = [
  { sev: '🟠', text: '*maxichen.gamebot.me* — 1/3 Versuche fehlgeschlagen _(timeout)_' },
  { sev: '🟡', text: 'RAM-Auslastung hoch _(22% Heap)_' }
];
const db = 'DB › 143 Nutzer · 23 Gruppen · 0 Bans';
const pingSvg = buildPingCardSvg({ modeLabel: 'Standard _(mit Speedtest)_', dateLabel: '26.09.2026 · 04:40', bot, siteResults, conn, icmpResults, speed, sys, health, issues, db });
fs.writeFileSync('preview/ping-card-after.svg', pingSvg);
const png = await renderSvgPng(pingSvg);
fs.writeFileSync('preview/ping-card-after.png', png);
console.log('ping PNG:', png.length, 'bytes');

const webSvg = buildWebsiteCardSvg({ host: 'maxichen.de', url: 'https://maxichen.de',
  okProbes: [{ totalMs: 412, dnsMs: 18, tcpMs: 21, tlsMs: 61, ttfbMs: 88, status: 200, statusText: 'OK', httpVersion: '2', server: 'cloudflare', contentType: 'text/html; charset=utf-8', bytes: 45123, address: '104.16.132.229' },
             { totalMs: 389, dnsMs: 16, tcpMs: 20, tlsMs: 58, ttfbMs: 82, status: 200, statusText: 'OK', httpVersion: '2', server: 'cloudflare', contentType: 'text/html; charset=utf-8', bytes: 45123, address: '104.16.132.229' },
             { totalMs: 401, dnsMs: 17, tcpMs: 21, tlsMs: 60, ttfbMs: 85, status: 200, statusText: 'OK', httpVersion: '2', server: 'cloudflare', contentType: 'text/html; charset=utf-8', bytes: 45123, address: '104.16.132.229' }],
  probes: [{ ok: true }, { ok: true }, { ok: true }], icmp: { ok: true, avg: 12.3, min: 10, max: 15, lossPct: 0 }, dns: { ok: true, ms: 18, address: '104.16.132.229' } }, { dateLabel: '04:40' });
fs.writeFileSync('preview/web-card-after.svg', webSvg);
const wpng = await renderSvgPng(webSvg);
fs.writeFileSync('preview/web-card-after.png', wpng);
console.log('web PNG:', wpng.length, 'bytes');
