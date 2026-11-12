import { DatabaseSync } from 'node:sqlite';

import { cleanModel } from './agent.mjs';
import { redactMessage } from './redact.mjs';

export const EVENT_TYPES = new Set(['visit', 'game_started', 'game_ended', 'error']);

/** How a game ended: played to its result, left through the quit button, or the page went away. */
const ENDINGS = new Set(['finished', 'quit', 'left']);

/** A place id as js/strings.js writes it. New places need no change here. */
const PLACE = /^[a-z]{2,20}$/;

/** Numbers arrive from the network, so every one of them is bounded here. */
const clampInt = (value, min, max) => {
  const n = Number(value);
  if (value === null || value === '' || !Number.isFinite(n)) return null;
  return Math.max(min, Math.min(max, Math.round(n)));
};

const clip = (value, max) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().replace(/\s+/g, ' ');
  return trimmed ? trimmed.slice(0, max) : null;
};

const flag = (value) => (typeof value === 'boolean' ? Number(value) : null);

/** The columns of an event, in the order they are inserted. */
const COLUMNS = [
  'type', 'rev', 'place', 'ending', 'stars', 'seconds', 'first', 'sound', 'installed', 'stamps', 'width',
  'message', 'browser', 'version', 'os', 'device', 'model', 'country', 'region', 'city',
];

/**
 * Returns the row to store, or null when the event is not worth keeping.
 * Everything that is not on this list is dropped, including extra fields.
 *
 * `agent` is what server/agent.mjs read from the User-Agent header and `place`
 * what server/geo.mjs found for the address; neither the header nor the
 * address is part of the row.
 */
export function normaliseEvent(input, agent = {}, where = null) {
  if (!input || typeof input !== 'object') return null;
  if (!EVENT_TYPES.has(input.type)) return null;

  const event = Object.fromEntries(COLUMNS.map((column) => [column, null]));
  event.type = input.type;
  event.rev = clip(input.rev, 40);

  event.browser = agent.browser ?? null;
  event.version = agent.version ?? null;
  event.os = agent.os ?? null;
  event.device = agent.device ?? null;
  // Chrome names the phone only when the page asks, so the page may say it.
  event.model = cleanModel(input.model) ?? agent.model ?? null;
  event.country = where?.country ?? null;
  event.region = where?.region ?? null;
  event.city = where?.city ?? null;

  if (input.type === 'visit') {
    event.installed = flag(input.installed);
    event.sound = flag(input.sound);
    event.stamps = clampInt(input.stamps, 0, 99);
    event.width = clampInt(input.width, 100, 9999);
  }

  if (input.type === 'game_started' || input.type === 'game_ended') {
    if (typeof input.place !== 'string' || !PLACE.test(input.place)) return null;
    event.place = input.place;
  }

  if (input.type === 'game_ended') {
    if (!ENDINGS.has(input.ending)) return null;
    event.ending = input.ending;
    event.seconds = clampInt(input.seconds, 0, 3600);
    event.sound = flag(input.sound);
    if (input.ending === 'finished') {
      event.stars = clampInt(input.stars, 1, 3);
      event.first = flag(input.first);
    }
  }

  if (input.type === 'error') {
    event.message = redactMessage(input.message) || null;
    if (!event.message) return null;
  }

  return event;
}

/** Bumped when the shape of the statistics changes, so a reader knows what it is holding. */
const STATS_FORMAT = 1;

/** Hours are counted in western Indonesian time, where the players are. */
const WIB_HOURS = 7;

/**
 * What every part of the statistics means, sent with them. The answer is read
 * by people through the panel and by programs as it is; this is for the
 * programs, and for anyone who opens the file a month later.
 */
const ABOUT = {
  purpose:
    'Anonymous, aggregate telemetry of the browser game Jelajah Kerinci (kerinciku.web.id) for the last `days` days, starting on `since` (UTC days). No cookie and no identifier: two rows cannot be tied to the same player. The address a beacon comes from is used once, to look up a country, a province and a town, and is never stored or logged; the User-Agent header is reduced to a browser name, a system and a device kind.',
  units: 'Durations are seconds. Medians are null when there are no rows to take them from.',
  totals:
    'visits: page loads. started: games begun, so one visit can start several. finished: games played to their result screen. quit: games left through the quit button or the back button. left: games that were running when the page was closed or hidden. errors: JavaScript errors in players’ browsers.',
  daily: 'The same counts per UTC day. Days without events are absent, not zero.',
  places:
    'Per place on the map (the ids of js/strings.js): games started, finished, quit and left; the median duration of the finished and of the abandoned ones; how many finished games gave 1, 2 and 3 stars; and `first`, the finished games that gave the place’s first stamp. A place where many games are quit, or where few reach three stars, is the one to look at.',
  visitors:
    'Of the visits that said so: installed (opened from the home screen), returning (came with at least one stamp already saved), muted (sound switched off), and the median number of stamps held.',
  devices: 'Visits, games started and games finished by kind of device: phone, tablet or desktop.',
  browsers: 'Visits by browser, with the oldest and the most common major version seen.',
  systems: 'Visits by operating system.',
  models:
    'Visits by phone model, where the browser names it. Chrome on Android names it only when the page asks; Safari says no more than iPhone or iPad.',
  widths:
    'Visits by the width of the page in CSS pixels: narrow (under 360), phone (360 to 479), wide phone or small tablet (480 to 839), tablet or desktop (840 and up).',
  countries: 'Visits by country (ISO 3166 code), from the GeoIP lookup.',
  regions: 'Visits from Indonesia by province, as the GeoIP database names it.',
  cities:
    'Visits from Indonesia by town. Mobile networks often show up as Jakarta wherever the phone is, so read this as a hint, not a census.',
  hours: 'Visits by hour of the day in western Indonesian time (UTC+7), 0 to 23.',
  errors:
    'JavaScript errors by message, most frequent first, with the last time seen and a build that showed it. Addresses are removed before storage.',
  revs: 'Events per build label (`version+commit`), to tell which release the data comes from.',
  geo: 'Whether the GeoIP database was available when these numbers were read, and the date it was built.',
};

const median = (values) => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
};

const widthClass = (width) => (width < 360 ? 'narrow' : width < 480 ? 'phone' : width < 840 ? 'wide' : 'desktop');

export function openStore(path) {
  const db = new DatabaseSync(path);
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA synchronous = NORMAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ts INTEGER NOT NULL,
      day TEXT NOT NULL,
      type TEXT NOT NULL,
      rev TEXT,
      place TEXT,
      ending TEXT,
      stars INTEGER,
      seconds INTEGER,
      first INTEGER,
      sound INTEGER,
      installed INTEGER,
      stamps INTEGER,
      width INTEGER,
      message TEXT,
      browser TEXT,
      version INTEGER,
      os TEXT,
      device TEXT,
      model TEXT,
      country TEXT,
      region TEXT,
      city TEXT
    )
  `);
  db.exec('CREATE INDEX IF NOT EXISTS events_day ON events (day)');
  db.exec('CREATE INDEX IF NOT EXISTS events_type_day ON events (type, day)');

  const insertStmt = db.prepare(
    `INSERT INTO events (ts, day, ${COLUMNS.join(', ')}) VALUES (?, ?, ${COLUMNS.map(() => '?').join(', ')})`,
  );

  /** Visits grouped by one column, most frequent first. */
  const visitsBy = (column, since, extra = '', limit = 20) =>
    db
      .prepare(
        `SELECT ${column} AS name, COUNT(*) AS n
           FROM events
          WHERE type = 'visit' AND day >= ? AND ${column} IS NOT NULL ${extra}
          GROUP BY ${column}
          ORDER BY n DESC, name
          LIMIT ${limit}`,
      )
      .all(since);

  return {
    insert(event, now = Date.now()) {
      const day = new Date(now).toISOString().slice(0, 10);
      insertStmt.run(now, day, ...COLUMNS.map((column) => event[column] ?? null));
    },

    stats(days = 30, geo = null) {
      const since = new Date(Date.now() - (days - 1) * 86_400_000).toISOString().slice(0, 10);

      const daily = db
        .prepare(
          `SELECT day,
                  SUM(type = 'visit')        AS visits,
                  SUM(type = 'game_started') AS started,
                  SUM(type = 'game_ended' AND ending = 'finished') AS finished,
                  SUM(type = 'game_ended' AND ending = 'quit')     AS quit,
                  SUM(type = 'game_ended' AND ending = 'left')     AS "left",
                  SUM(type = 'error')        AS errors
             FROM events
            WHERE day >= ?
            GROUP BY day
            ORDER BY day`,
        )
        .all(since);

      const totals = { visits: 0, started: 0, finished: 0, quit: 0, left: 0, errors: 0 };
      for (const row of daily) for (const key of Object.keys(totals)) totals[key] += row[key];

      // Per place: what was started, and how each game ended.
      const started = db
        .prepare(
          `SELECT place, COUNT(*) AS n FROM events
            WHERE type = 'game_started' AND day >= ? AND place IS NOT NULL GROUP BY place`,
        )
        .all(since);
      const ended = db
        .prepare(
          `SELECT place, ending, stars, seconds, first FROM events
            WHERE type = 'game_ended' AND day >= ? AND place IS NOT NULL
            ORDER BY id DESC LIMIT 100000`,
        )
        .all(since);

      const placeMap = new Map();
      const placeRow = (id) => {
        if (!placeMap.has(id)) {
          placeMap.set(id, { place: id, started: 0, finished: 0, quit: 0, left: 0, first: 0, stars: [0, 0, 0], took: [], gaveUp: [] });
        }
        return placeMap.get(id);
      };
      for (const row of started) placeRow(row.place).started = row.n;
      for (const row of ended) {
        const p = placeRow(row.place);
        p[row.ending] += 1;
        if (row.ending === 'finished') {
          if (row.stars >= 1 && row.stars <= 3) p.stars[row.stars - 1] += 1;
          if (row.first === 1) p.first += 1;
          if (row.seconds != null) p.took.push(row.seconds);
        } else if (row.seconds != null) {
          p.gaveUp.push(row.seconds);
        }
      }
      const places = [...placeMap.values()]
        .map(({ took, gaveUp, ...row }) => ({ ...row, seconds: median(took), abandonedSeconds: median(gaveUp) }))
        .sort((x, y) => y.started - x.started || x.place.localeCompare(y.place));

      // Who comes: what a visit says about itself.
      const visits = db
        .prepare(`SELECT installed, sound, stamps, width, ts FROM events WHERE type = 'visit' AND day >= ? ORDER BY id DESC LIMIT 100000`)
        .all(since);
      const said = (field) => visits.filter((v) => v[field] != null);
      const widths = { narrow: 0, phone: 0, wide: 0, desktop: 0 };
      const hours = new Array(24).fill(0);
      for (const visit of visits) {
        if (visit.width != null) widths[widthClass(visit.width)] += 1;
        hours[new Date(visit.ts + WIB_HOURS * 3_600_000).getUTCHours()] += 1;
      }

      const devices = db
        .prepare(
          `SELECT device,
                  SUM(type = 'visit')        AS visits,
                  SUM(type = 'game_started') AS started,
                  SUM(type = 'game_ended' AND ending = 'finished') AS finished
             FROM events
            WHERE day >= ? AND device IS NOT NULL
            GROUP BY device
            ORDER BY visits DESC, device`,
        )
        .all(since);

      const browsers = db
        .prepare(
          `SELECT browser AS name, COUNT(*) AS n, MIN(version) AS oldest
             FROM events
            WHERE type = 'visit' AND day >= ? AND browser IS NOT NULL
            GROUP BY browser
            ORDER BY n DESC, name
            LIMIT 20`,
        )
        .all(since);
      const commonVersion = db.prepare(
        `SELECT version FROM events
          WHERE type = 'visit' AND day >= ? AND browser = ? AND version IS NOT NULL
          GROUP BY version ORDER BY COUNT(*) DESC, version DESC LIMIT 1`,
      );
      for (const row of browsers) row.common = commonVersion.get(since, row.name)?.version ?? null;

      const errors = db
        .prepare(
          `SELECT message, COUNT(*) AS n, MAX(ts) AS last, MAX(rev) AS rev
             FROM events
            WHERE type = 'error' AND day >= ?
            GROUP BY message
            ORDER BY n DESC
            LIMIT 25`,
        )
        .all(since);

      const revs = db
        .prepare(
          `SELECT rev, COUNT(*) AS n
             FROM events
            WHERE day >= ? AND rev IS NOT NULL
            GROUP BY rev
            ORDER BY n DESC
            LIMIT 10`,
        )
        .all(since);

      return {
        format: STATS_FORMAT,
        generated: new Date().toISOString(),
        about: ABOUT,
        days,
        since,
        daily,
        totals,
        places,
        visitors: {
          installed: { said: said('installed').length, yes: said('installed').filter((v) => v.installed === 1).length },
          returning: { said: said('stamps').length, yes: said('stamps').filter((v) => v.stamps > 0).length },
          muted: { said: said('sound').length, yes: said('sound').filter((v) => v.sound === 0).length },
          stamps: median(said('stamps').map((v) => v.stamps)),
        },
        devices,
        browsers,
        systems: visitsBy('os', since),
        models: visitsBy('model', since, '', 25),
        widths: Object.entries(widths).map(([name, n]) => ({ name, n })),
        countries: visitsBy('country', since),
        regions: visitsBy('region', since, "AND country = 'ID'", 40),
        cities: visitsBy('city', since, "AND country = 'ID'", 25),
        hours: hours.map((n, hour) => ({ hour, n })),
        errors,
        revs,
        geo: { available: !!geo, built: geo?.built ?? null },
      };
    },

    prune(keepDays = 90) {
      const cutoff = Date.now() - keepDays * 86_400_000;
      const result = db.prepare('DELETE FROM events WHERE ts < ?').run(cutoff);
      return result.changes ?? 0;
    },

    close() {
      db.close();
    },
  };
}
