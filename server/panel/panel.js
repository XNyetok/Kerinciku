/**
 * The panel reads /api/stats and lays it out to be understood at a glance:
 * the headline numbers, the days as one chart, then each place on the map,
 * who comes, on what device and from where.
 *
 * Everything from the API is put on the page with textContent, never as HTML.
 * No inline styles in the markup either: the collector's content security
 * policy forbids them. Sizes are set through the style object, which it allows.
 */

const SVG = 'http://www.w3.org/2000/svg';

const number = (n) => Number(n).toLocaleString('id-ID', { maximumFractionDigits: 0 });
const decimal = (n) => Number(n).toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const percent = (part, whole) => (whole > 0 ? Math.round((part / whole) * 100) + '%' : '—');

/** 96 -> "1:36". */
const clock = (seconds) => `${Math.floor(seconds / 60)}:${String(Math.round(seconds) % 60).padStart(2, '0')}`;

const shortDay = (iso) => {
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
};

const longDay = (iso) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' });

const timeLabel = (ms) =>
  new Date(ms).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = String(text);
  return node;
};

const svg = (tag, attrs = {}) => {
  const node = document.createElementNS(SVG, tag);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
  return node;
};

const byId = (id) => document.getElementById(id);

/** The three lines of the daily chart: fixed order, fixed colour, whatever the data. */
const SERIES = [
  { key: 'visits', name: 'Kunjungan' },
  { key: 'started', css: 'starts', name: 'Mulai main' },
  { key: 'finished', name: 'Selesai' },
];

/** The places as the game names them (js/strings.js, loaded by the page); an id it does not know is shown as it is. */
const PLACES = new Map((window.JK?.places ?? []).map((place) => [place.id, place]));
const placeName = (id) => {
  const place = PLACES.get(id);
  return place ? `${place.place} · ${place.title}` : id;
};

const DEVICE_NAMES = { phone: 'HP', tablet: 'Tablet', desktop: 'Komputer' };
const WIDTH_NAMES = {
  narrow: ['HP kecil', 'di bawah 360 px'],
  phone: ['HP', '360–479 px'],
  wide: ['HP besar atau tablet kecil', '480–839 px'],
  desktop: ['Tablet atau komputer', '840 px ke atas'],
};

/** Country names in Indonesian, where the browser knows them. */
const regionNames = (() => {
  try {
    return new Intl.DisplayNames(['id'], { type: 'region' });
  } catch {
    return null;
  }
})();
const countryName = (code) => {
  try {
    return regionNames?.of(code) ?? code;
  } catch {
    return code;
  }
};

const NOTHING = 'Belum ada data pada rentang ini.';

let days = 30;
let lastStats = null;

// ---------- data ----------

/** The API only lists days that had events. A chart needs every day, zeros included. */
function everyDay(stats) {
  const known = new Map(stats.daily.map((row) => [row.day, row]));
  const out = [];
  const end = new Date();
  for (let i = stats.days - 1; i >= 0; i--) {
    const date = new Date(end.getTime() - i * 86_400_000).toISOString().slice(0, 10);
    const row = known.get(date);
    out.push({
      day: date,
      visits: row?.visits ?? 0,
      started: row?.started ?? 0,
      finished: row?.finished ?? 0,
      quit: row?.quit ?? 0,
      left: row?.left ?? 0,
      errors: row?.errors ?? 0,
    });
  }
  return out;
}

// ---------- headline tiles ----------

function tile({ label, value, what, share, ratio }) {
  const box = el('dl', 'tile');
  box.append(el('dt', null, label), el('dd', null, value));
  if (what) box.append(el('p', 'what', what));
  if (share) box.append(el('p', 'share', share));
  if (ratio != null) {
    const meter = el('div', 'meter');
    const fill = el('i');
    fill.style.width = Math.max(0, Math.min(100, ratio * 100)) + '%';
    meter.append(fill);
    meter.setAttribute('role', 'img');
    meter.setAttribute('aria-label', share ?? '');
    box.append(meter);
  }
  return box;
}

function renderTiles(stats) {
  const { visits, started, finished, quit, left } = stats.totals;
  const gone = quit + left;

  byId('tiles').replaceChildren(
    tile({ label: 'Kunjungan', value: number(visits), what: 'Berapa kali halaman game dibuka.' }),
    tile({
      label: 'Mulai main',
      value: number(started),
      what: 'Berapa kali sebuah permainan dimulai, termasuk main ulang.',
      share: visits ? `${decimal(started / visits)} permainan per kunjungan` : 'Belum ada kunjungan',
    }),
    tile({
      label: 'Selesai',
      value: number(finished),
      what: 'Permainan yang dimainkan sampai layar hasil.',
      share: started ? `${percent(finished, started)} dari permainan yang dimulai` : 'Belum ada permainan',
      ratio: started ? finished / started : 0,
    }),
    tile({
      label: 'Ditinggal',
      value: number(gone),
      what: 'Permainan yang ditinggal sebelum selesai: keluar atau halaman ditutup.',
      share: started ? `${percent(gone, started)} dari permainan yang dimulai` : 'Belum ada permainan',
      ratio: started ? gone / started : 0,
    }),
  );
}

// ---------- bars ----------

/** One row per part: a name, a bar from a shared baseline, and the figure at its tip. */
function bars(target, rows, emptyText) {
  const total = rows.reduce((sum, row) => sum + row.n, 0);
  if (!total) {
    target.replaceChildren(el('p', 'empty', emptyText));
    return;
  }
  const longest = Math.max(...rows.map((row) => row.n));

  target.replaceChildren(
    ...rows.map((row) => {
      const wrap = el('div', 'bar');
      const name = el('div', 'name', row.name);
      if (row.note) name.append(el('small', null, row.note));

      const run = el('div', 'run');
      const fill = el('div', 'fill');
      // The longest bar takes 78% of the track, leaving room for its figure.
      fill.style.width = (row.n / longest) * 78 + '%';
      const value = el('span', 'value', number(row.n) + ' ');
      value.append(el('small', null, percent(row.n, total)));
      run.append(fill, value);

      wrap.append(name, run);
      wrap.title = `${row.name}: ${number(row.n)} dari ${number(total)} (${percent(row.n, total)})`;
      return wrap;
    }),
  );
}

/** Rows of { name, n } from the API, as bars. `label` turns a stored name into the words shown. */
function tally(id, rows, label = (name) => ({ name })) {
  bars(
    byId(id),
    rows.map((row) => ({ ...label(row.name, row), n: row.n })),
    NOTHING,
  );
}

function cells(...values) {
  const tr = el('tr');
  tr.append(...values.map((value) => el('td', null, value)));
  return tr;
}

function emptyRow(columns) {
  const tr = el('tr');
  const td = el('td', null, NOTHING);
  td.colSpan = columns;
  tr.append(td);
  return tr;
}

const time = (seconds) => (seconds == null ? '—' : clock(seconds));

// ---------- places ----------

function renderPlaces(stats) {
  const body = document.querySelector('#places tbody');
  if (!stats.places.length) {
    body.replaceChildren(emptyRow(12));
    return;
  }
  body.replaceChildren(
    ...stats.places.map((row) =>
      cells(
        placeName(row.place),
        number(row.started),
        number(row.finished),
        percent(row.finished, row.started),
        number(row.quit),
        number(row.left),
        time(row.seconds),
        time(row.abandonedSeconds),
        number(row.stars[0]),
        number(row.stars[1]),
        number(row.stars[2]),
        number(row.first),
      ),
    ),
  );
}

// ---------- visitors ----------

function renderVisitors(stats) {
  const v = stats.visitors;
  const share = (part) => (part.said ? percent(part.yes, part.said) : '—');
  const of = (part) => (part.said ? `${number(part.yes)} dari ${number(part.said)} kunjungan` : 'Belum ada data');
  byId('visitors').replaceChildren(
    tile({ label: 'Pemain lama', value: share(v.returning), what: of(v.returning) }),
    tile({ label: 'Dipasang di layar utama', value: share(v.installed), what: of(v.installed) }),
    tile({ label: 'Suara dimatikan', value: share(v.muted), what: of(v.muted) }),
    tile({ label: 'Stempel dimiliki', value: v.stamps == null ? '—' : number(v.stamps), what: 'nilai tengah saat datang' }),
  );
}

// ---------- devices and places of origin ----------

function renderDevices(stats) {
  const body = document.querySelector('#devices tbody');
  body.replaceChildren(
    ...(stats.devices.length
      ? stats.devices.map((row) =>
          cells(
            DEVICE_NAMES[row.device] ?? row.device,
            number(row.visits),
            number(row.started),
            number(row.finished),
            percent(row.finished, row.started),
          ),
        )
      : [emptyRow(5)]),
  );
  tally('widths', stats.widths, (name) => ({ name: WIDTH_NAMES[name]?.[0] ?? name, note: WIDTH_NAMES[name]?.[1] }));
  tally('models', stats.models);
  tally('systems', stats.systems);
  tally('browsers', stats.browsers, (name, row) => ({
    name,
    note: row.common == null ? null : `umumnya versi ${row.common}, tertua ${row.oldest}`,
  }));
}

function renderOrigins(stats) {
  byId('geo-hint').textContent = stats.geo.available
    ? `Kunjungan dari Indonesia per provinsi, diperkirakan dari jaringan internet pengunjung (data lokasi ${stats.geo.built ?? 'tanpa tanggal'}).`
    : 'Data lokasi belum terpasang di server, jadi lokasi tidak tercatat (docs/telemetry.md).';
  tally('regions', stats.regions);
  tally('cities', stats.cities);
  tally('countries', stats.countries, (code) => ({ name: countryName(code) }));
}

function renderRevs(stats) {
  bars(
    byId('revs'),
    stats.revs.map((row) => ({ name: row.rev ?? 'tanpa versi', n: row.n })),
    'Belum ada data versi.',
  );
}

// ---------- hours of the day ----------

function renderHours(stats) {
  const host = byId('hours');
  const total = stats.hours.reduce((sum, row) => sum + row.n, 0);
  if (!total) {
    host.replaceChildren(el('p', 'empty', NOTHING));
    return;
  }
  const width = Math.max(280, Math.floor(host.clientWidth));
  const height = 170;
  const pad = { top: 10, right: 6, bottom: 22, left: 6 };
  const plotH = height - pad.top - pad.bottom;
  const step = (width - pad.left - pad.right) / 24;
  const top = Math.max(...stats.hours.map((row) => row.n));
  const busiest = stats.hours.reduce((best, row) => (row.n > best.n ? row : best));

  const plot = svg('svg', {
    class: 'plot',
    width,
    height,
    viewBox: `0 0 ${width} ${height}`,
    role: 'img',
    'aria-label': `Kunjungan per jam (WIB). Paling ramai pukul ${busiest.hour}.00 dengan ${number(busiest.n)} kunjungan.`,
  });
  plot.append(svg('line', { class: 'base', x1: pad.left, x2: width - pad.right, y1: pad.top + plotH, y2: pad.top + plotH }));
  for (const row of stats.hours) {
    const h = (row.n / top) * plotH;
    const bar = svg('rect', {
      class: 'column',
      x: pad.left + row.hour * step + 1,
      y: pad.top + plotH - h,
      width: Math.max(1, step - 2),
      height: h,
      rx: 2,
    });
    const title = svg('title');
    title.textContent = `Pukul ${row.hour}.00–${row.hour}.59: ${number(row.n)} kunjungan (${percent(row.n, total)})`;
    bar.append(title);
    plot.append(bar);
    if (row.hour % 3 === 0) {
      const label = svg('text', { x: pad.left + row.hour * step + step / 2, y: height - 6, 'text-anchor': 'middle' });
      label.textContent = String(row.hour).padStart(2, '0');
      plot.append(label);
    }
  }
  host.replaceChildren(plot);
}

// ---------- errors ----------

const ICONS = {
  good: 'M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm3.3 5.3-4 4a1 1 0 0 1-1.4 0l-1.8-1.8 1.4-1.4L6.6 8.2l3.3-3.3z',
  critical: 'M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm-1 3h2v5H7zm0 6h2v2H7z',
};

function state(kind, text) {
  const row = el('p', 'state ' + kind);
  const icon = svg('svg', { viewBox: '0 0 16 16', 'aria-hidden': 'true' });
  icon.append(svg('path', { d: ICONS[kind] }));
  row.append(icon, el('span', null, text));
  return row;
}

function renderErrors(stats) {
  const list = byId('errors');
  if (!stats.errors.length) {
    list.replaceChildren(state('good', 'Tidak ada error pada rentang ini.'));
    return;
  }
  list.replaceChildren(
    state('critical', `${number(stats.totals.errors)} error, ${number(stats.errors.length)} jenis.`),
    ...stats.errors.map((row) => {
      const item = el('li');
      item.append(
        el('span', 'msg', row.message),
        el('span', 'meta', `${number(row.n)} kali · terakhir ${timeLabel(row.last)} · versi ${row.rev ?? '—'}`),
      );
      return item;
    }),
  );
}

// ---------- the daily chart ----------

/** A round number at or above `value`, so the axis ends on a tick people can read. */
function niceCeil(value) {
  if (value <= 4) return 4;
  const power = 10 ** Math.floor(Math.log10(value));
  for (const step of [1, 2, 2.5, 5, 10]) if (step * power >= value) return step * power;
  return 10 * power;
}

const tip = byId('tip');

function hideTip() {
  tip.hidden = true;
}

function showTip(row, x, y) {
  const list = el('ul');
  for (const series of SERIES) {
    const item = el('li');
    // The number leads; the name follows. A stroke, not a box, keys the series.
    item.append(
      el('span', 'key ' + (series.css ?? series.key)),
      el('b', null, number(row[series.key])),
      el('span', null, series.name),
    );
    list.append(item);
  }
  tip.replaceChildren(el('p', 'when', longDay(row.day)), list);
  tip.hidden = false;
  const box = tip.getBoundingClientRect();
  const left = x + 14 + box.width > window.innerWidth ? x - 14 - box.width : x + 14;
  tip.style.left = Math.max(8, left) + 'px';
  tip.style.top = Math.max(8, Math.min(window.innerHeight - box.height - 8, y - box.height / 2)) + 'px';
}

function renderChart(stats) {
  const host = byId('chart');
  const rows = everyDay(stats);
  const width = Math.max(320, Math.floor(host.clientWidth));
  const height = 250;
  // On a narrow screen the names at the line ends would take half the plot;
  // the legend above and the reading on touch carry them instead.
  const roomy = width >= 520;
  const pad = { top: 12, right: roomy ? 118 : 14, bottom: 26, left: 38 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const top = niceCeil(Math.max(...rows.flatMap((row) => SERIES.map((s) => row[s.key]))));
  const xAt = (i) => pad.left + (rows.length > 1 ? (i / (rows.length - 1)) * plotW : plotW / 2);
  const yAt = (v) => pad.top + plotH - (v / top) * plotH;

  const total = rows.reduce((sum, row) => sum + row.visits + row.started + row.finished, 0);
  const plot = svg('svg', {
    class: 'plot',
    width,
    height,
    viewBox: `0 0 ${width} ${height}`,
    role: 'img',
    tabindex: 0,
    'aria-label': `Grafik harian ${stats.days} hari: kunjungan, permainan dimulai, dan selesai. Panah kiri dan kanan membaca tiap hari; tabel di bawah berisi angka yang sama.`,
  });

  // Hairline grid and round ticks; the baseline is one step darker.
  for (let i = 0; i <= 4; i++) {
    const value = (top / 4) * i;
    const y = yAt(value);
    plot.append(svg('line', { class: i === 0 ? 'base' : 'grid', x1: pad.left, x2: pad.left + plotW, y1: y, y2: y }));
    const label = svg('text', { x: pad.left - 8, y: y + 4, 'text-anchor': 'end' });
    label.textContent = number(value);
    plot.append(label);
  }

  // As many dates as fit without touching; always the first and the last.
  const every = Math.max(1, Math.ceil(rows.length / Math.max(2, Math.floor(plotW / 64))));
  rows.forEach((row, i) => {
    const last = i === rows.length - 1;
    if (i % every !== 0 && !last) return;
    if (!last && rows.length - 1 - i < every * 0.75) return;
    const label = svg('text', { x: xAt(i), y: height - 8, 'text-anchor': i === 0 ? 'start' : last ? 'end' : 'middle' });
    label.textContent = shortDay(row.day);
    plot.append(label);
  });

  if (!total) {
    const none = svg('text', { x: pad.left + plotW / 2, y: pad.top + plotH / 2, 'text-anchor': 'middle' });
    none.textContent = 'Belum ada data pada rentang ini.';
    plot.append(none);
    host.replaceChildren(plot);
    return;
  }

  for (const series of SERIES) {
    const d = rows.map((row, i) => `${i ? 'L' : 'M'}${xAt(i).toFixed(1)} ${yAt(row[series.key]).toFixed(1)}`).join(' ');
    plot.append(svg('path', { class: 'line ' + (series.css ?? series.key), d }));
  }

  // Each line is named where it ends. Labels that would sit on top of each
  // other are spread apart and tied back to their line with a hairline.
  const lastRow = rows[rows.length - 1];
  const endX = xAt(rows.length - 1);
  const ends = SERIES.map((series) => ({ series, y: yAt(lastRow[series.key]), at: yAt(lastRow[series.key]) })).sort(
    (a, b) => a.at - b.at,
  );
  const gap = 15;
  for (let i = 1; i < ends.length; i++) ends[i].at = Math.max(ends[i].at, ends[i - 1].at + gap);
  const overflow = ends[ends.length - 1].at - (pad.top + plotH);
  if (overflow > 0) for (const end of ends) end.at -= overflow;

  for (const end of ends) {
    if (!roomy) {
      plot.append(svg('circle', { class: 'dot ' + (end.series.css ?? end.series.key), cx: endX, cy: end.y, r: 4 }));
      continue;
    }
    if (Math.abs(end.at - end.y) > 2) {
      plot.append(svg('line', { class: 'lead', x1: endX + 6, y1: end.y, x2: endX + 12, y2: end.at }));
    }
    plot.append(svg('circle', { class: 'dot ' + (end.series.css ?? end.series.key), cx: endX, cy: end.y, r: 4 }));
    const label = svg('text', { class: 'end', x: endX + 14, y: end.at + 4 });
    const figure = svg('tspan');
    figure.textContent = number(lastRow[end.series.key]);
    label.append(figure, document.createTextNode(' ' + end.series.name));
    plot.append(label);
  }

  // The reader aims at a day, never at a two-pixel line: the whole plot is
  // the target, and the crosshair snaps to the nearest day.
  const cross = svg('line', { class: 'cross', y1: pad.top, y2: pad.top + plotH, visibility: 'hidden' });
  const marks = SERIES.map((series) => {
    const dot = svg('circle', { class: 'dot ' + (series.css ?? series.key), r: 4, visibility: 'hidden' });
    return { series, dot };
  });
  plot.append(cross, ...marks.map((m) => m.dot));

  let current = -1;
  const select = (i) => {
    current = Math.max(0, Math.min(rows.length - 1, i));
    const x = xAt(current);
    cross.setAttribute('x1', x);
    cross.setAttribute('x2', x);
    cross.setAttribute('visibility', 'visible');
    for (const { series, dot } of marks) {
      dot.setAttribute('cx', x);
      dot.setAttribute('cy', yAt(rows[current][series.key]));
      dot.setAttribute('visibility', 'visible');
    }
    const box = plot.getBoundingClientRect();
    showTip(rows[current], box.left + x, box.top + pad.top + plotH / 2);
  };
  const clear = () => {
    current = -1;
    cross.setAttribute('visibility', 'hidden');
    for (const { dot } of marks) dot.setAttribute('visibility', 'hidden');
    hideTip();
  };

  plot.addEventListener('pointermove', (event) => {
    const box = plot.getBoundingClientRect();
    const ratio = (event.clientX - box.left - pad.left) / plotW;
    select(Math.round(ratio * (rows.length - 1)));
  });
  plot.addEventListener('pointerleave', clear);
  // The same reading from the keyboard as from the pointer.
  plot.addEventListener('focus', () => select(rows.length - 1));
  plot.addEventListener('blur', clear);
  plot.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') select((current < 0 ? rows.length : current) - 1);
    else if (event.key === 'ArrowRight') select(current + 1);
    else if (event.key === 'Escape') clear();
    else return;
    event.preventDefault();
  });

  host.replaceChildren(plot);
}

function renderLegend() {
  byId('legend').replaceChildren(
    ...SERIES.map((series) => {
      const item = el('li');
      item.append(el('span', 'key ' + (series.css ?? series.key)), el('span', null, series.name));
      return item;
    }),
  );
}

/** The chart's twin: the same days as rows, for reading exact figures. */
/** The chart's twin: the same days as rows, for reading exact figures. */
function renderTable(stats) {
  const body = document.querySelector('#daily tbody');
  body.replaceChildren(
    ...everyDay(stats)
      .reverse()
      .map((row) =>
        cells(
          longDay(row.day),
          number(row.visits),
          number(row.started),
          number(row.finished),
          number(row.quit),
          number(row.left),
          number(row.errors),
        ),
      ),
  );
}

// ---------- loading ----------

function render(stats) {
  renderTiles(stats);
  renderChart(stats);
  renderTable(stats);
  renderPlaces(stats);
  renderVisitors(stats);
  renderHours(stats);
  renderDevices(stats);
  renderOrigins(stats);
  renderErrors(stats);
  renderRevs(stats);
}

function renderPeriod(stats) {
  const first = new Date(stats.since + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  const today = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  const now = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  byId('period').textContent = `${first} – ${today} · diperbarui ${now}`;
}

async function load() {
  // The page keeps its last render, dimmed, while the new numbers arrive.
  document.body.dataset.loading = 'true';
  const failure = byId('failure');
  try {
    const response = await fetch(`/api/stats?days=${days}`, { headers: { accept: 'application/json' } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    lastStats = await response.json();
    failure.hidden = true;
    renderPeriod(lastStats);
    render(lastStats);
  } catch (error) {
    failure.textContent = 'Gagal memuat data: ' + (error instanceof Error ? error.message : String(error));
    failure.hidden = false;
  } finally {
    document.body.dataset.loading = 'false';
  }
}

for (const button of document.querySelectorAll('[data-days]')) {
  button.addEventListener('click', () => {
    days = Number(button.dataset.days);
    for (const other of document.querySelectorAll('[data-days]')) {
      other.setAttribute('aria-pressed', String(other === button));
    }
    void load();
  });
}

byId('refresh').addEventListener('click', () => void load());

// The same numbers as one file, with the collector's own notes on what each
// part means: for a script or a spreadsheet.
byId('export').addEventListener('click', () => {
  if (!lastStats) return;
  const file = new Blob([JSON.stringify(lastStats, null, 2) + '\n'], { type: 'application/json' });
  const url = URL.createObjectURL(file);
  const link = el('a');
  link.href = url;
  link.download = `kerinciku-stats-${lastStats.days}d-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
});

// The chart is drawn to the width it has, so it is redrawn when that changes.
let resizing = 0;
window.addEventListener('resize', () => {
  window.clearTimeout(resizing);
  resizing = window.setTimeout(() => {
    if (lastStats) {
      renderChart(lastStats);
      renderHours(lastStats);
    }
  }, 150);
});

renderLegend();
void load();
