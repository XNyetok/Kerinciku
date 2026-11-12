/**
 * What kind of browser and device sent a beacon, read from its User-Agent
 * header. Only these few words are kept: the header itself is never stored,
 * because a full one can single out a device.
 */

const BOT = /bot\b|crawl|spider|slurp|headless|lighthouse|pagespeed|preview|monitor|curl\/|wget\/|python|node-fetch|axios/i;

/** First match wins: the browsers that pretend to be Chrome come before Chrome. */
const BROWSERS = [
  ['Samsung Internet', /SamsungBrowser\/(\d+)/],
  ['Edge', /Edg(?:A|iOS)?\/(\d+)/],
  ['Opera', /(?:OPR|OPT)\/(\d+)|Opera Mini\/(\d+)/],
  ['UC Browser', /UCBrowser\/(\d+)/],
  ['Mi Browser', /MiuiBrowser\/(\d+)/],
  ['Oppo Browser', /(?:HeyTapBrowser|OppoBrowser)\/(\d+)/],
  ['Vivo Browser', /VivoBrowser\/(\d+)/],
  ['Facebook', /FBAN|FBAV|FB_IAB/],
  ['Instagram', /Instagram/],
  ['TikTok', /musical_ly|TikTok|BytedanceWebview/],
  ['WhatsApp', /WhatsApp/],
  ['Line', /\bLine\//],
  ['Firefox', /(?:Firefox|FxiOS)\/(\d+)/],
  ['Chrome', /CriOS\/(\d+)/],
  ['Android WebView', /; wv\).*Chrome\/(\d+)/],
  ['Chrome', /Chrome\/(\d+)/],
  ['Safari', /Version\/(\d+)[\d.]* .*Safari\//],
];

const SYSTEMS = [
  ['iOS', /iPhone|iPod/],
  ['iPadOS', /iPad/],
  ['Android', /Android/],
  ['Windows', /Windows NT/],
  ['ChromeOS', /CrOS/],
  ['macOS', /Mac OS X|Macintosh/],
  ['Linux', /Linux|X11/],
];

/** A phone's model as its maker names it: letters, digits and a little punctuation, nothing else. */
export function cleanModel(value) {
  if (typeof value !== 'string') return null;
  const model = value.replace(/[^\w .+()/-]/g, '').replace(/\s+/g, ' ').trim().slice(0, 40);
  // Chrome on Android says "K" for every phone since it stopped naming the model.
  return model && model !== 'K' ? model : null;
}

/**
 * Returns { bot } for a crawler, otherwise { browser, version, os, device, model }.
 * `device` is phone, tablet or desktop; anything not recognised is null.
 */
export function readAgent(header) {
  const ua = typeof header === 'string' ? header.slice(0, 600) : '';
  if (!ua) return { bot: false, browser: null, version: null, os: null, device: null, model: null };
  if (BOT.test(ua)) return { bot: true, browser: null, version: null, os: null, device: null, model: null };

  let browser = null;
  let version = null;
  for (const [name, pattern] of BROWSERS) {
    const hit = pattern.exec(ua);
    if (!hit) continue;
    browser = name;
    const major = Number(hit[1] ?? hit[2]);
    version = Number.isInteger(major) && major > 0 && major < 1000 ? major : null;
    break;
  }

  const os = SYSTEMS.find(([, pattern]) => pattern.test(ua))?.[0] ?? null;

  let device = 'desktop';
  if (/iPad|Tablet/.test(ua) || (/Android/.test(ua) && !/Mobi/.test(ua))) device = 'tablet';
  else if (/Mobi|iPhone|iPod|Android/.test(ua)) device = 'phone';

  let model = null;
  if (os === 'iOS') model = 'iPhone';
  else if (os === 'iPadOS') model = 'iPad';
  else if (os === 'Android') {
    // "Android 13; SM-A135F Build/..." or "Android 13; SM-A135F)": the part after the version.
    const hit = /Android [\d.]+; (?:[a-z]{2}[-_][A-Za-z]{2}; )?([^;)]+?)(?: Build\/|[;)])/.exec(ua);
    model = hit ? cleanModel(hit[1]) : null;
    if (model === 'wv' || model === 'Mobile') model = null;
  }

  return { bot: false, browser, version, os, device, model };
}
