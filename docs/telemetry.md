# Telemetry

The game counts what happens in it, so the next change can be aimed at what players
actually struggle with: which game is abandoned, which one rarely gives three stars, which
phones it is played on. It counts events, never people.

The players are children. That sets the rule for everything below: **nothing is collected
that could identify a player or tie two events to the same one.**

## What is never collected

- No cookie, no identifier, nothing written to the device for this purpose.
- No name, no account, nothing a player types (there is nothing to type).
- No precise location: the browser's location API is switched off for the whole site
  (`Permissions-Policy: geolocation=()`).
- The **IP address is not stored and not logged.** nginx hands it to the collector with the
  beacon; the collector looks it up in an offline GeoIP file to get a country, a province
  and a town, keeps those three names and drops the address. The access log is off for the
  beacon.
- The **User-Agent header is not stored.** It is reduced to a browser name and major
  version, an operating system, a kind of device (phone, tablet, desktop) and, where the
  browser gives one, the phone's model.

A browser that sends Do Not Track or Global Privacy Control is not counted, in the page and
again in the collector. Crawlers are dropped. Games played offline are not counted at all:
a beacon that cannot be sent is lost, never queued.

## The events

`js/telemetry.js` sends them to `POST /api/beacon`, at most 60 per page load, and only from
a release build over https. Every event carries `type` and `rev` (the build label).

| Event | When | Fields |
| --- | --- | --- |
| `visit` | the page opened | `installed` (opened from the home screen), `stamps` (how many are already saved), `sound`, `width` (CSS pixels), `model` (only where Chrome gives it) |
| `game_started` | a game began, replays included | `place` |
| `game_ended` | a game ended | `place`, `ending`, `seconds`, `sound`; for a finished game also `stars` and `first` (this gave the place's first stamp) |
| `error` | a JavaScript error | `message`: one line, with addresses and e-mail removed |

`ending` is `finished` (played to the result screen), `quit` (the quit button or the back
button) or `left` (the page was closed or hidden while the game ran).

The collector (`server/`) keeps only these fields, bounds every number, and adds what it
read from the request: `browser`, `version`, `os`, `device`, `model`, `country`, `region`,
`city`. A place is any id from `js/strings.js`, so a new place on the map needs no change
here. Rows are deleted after 90 days.

## The panel

`https://kerinciku.web.id/panel/`, behind a password (nginx basic auth). It is read-only
and shows, for the last 7, 30 or 90 days: the headline counts, a daily chart, every place
on the map (started, finished, quit, left, median time, stars), who comes (returning,
installed, muted), the hour of the day, devices, phone models, browsers, systems, and
provinces and towns. **Unduh data (JSON)** saves the same numbers as one file whose `about`
key explains every part, for a script to read.

The panel is written in Indonesian, like the game: it is read by the people who make it.

## The GeoIP file

Provinces and towns come from the free [IP to City Lite](https://db-ip.com/db/download/ip-to-city-lite)
database by DB-IP (CC BY 4.0; the panel carries the attribution), in MaxMind DB format,
read by `server/geo.mjs` without any dependency. It is not part of a release. On the
server it lives at `/opt/kerinciku-stats/geo/city.mmdb`; without it the collector works and
simply records no location. DB-IP publishes a new file every month:

```sh
cd /opt/kerinciku-stats/geo
curl -fsSL "https://download.db-ip.com/free/dbip-city-lite-$(date +%Y-%m).mmdb.gz" | gunzip > city.mmdb.new
mv city.mmdb.new city.mmdb     # picked up within a day, or at the next deploy
```

It is an estimate. Mobile networks in Indonesia often resolve to Jakarta wherever the
phone is, so a town in the panel is a hint, not a census.

## Running it locally

```sh
node server/index.mjs          # http://127.0.0.1:8788/panel/, data in ./data/
```

`PORT`, `HOST`, `DB_PATH` and `GEO_DB` change the defaults. The page only sends beacons
from the live site, so a local panel stays empty unless you post to it yourself:

```sh
curl -X POST -H 'Content-Type: application/json' -H 'User-Agent: Mozilla/5.0 (Android 13; Mobile)' \
  --data '{"type":"game_started","place":"tea"}' http://127.0.0.1:8788/api/beacon
```

The collector needs Node 22.13 or newer (`node:sqlite`) and has no dependencies.
