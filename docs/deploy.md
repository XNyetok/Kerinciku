# Deploy

The game is a static site, plus a small collector for its anonymous counts
(`docs/telemetry.md`). Merging to `main` runs the checks and never changes the live game;
players get a change when a maintainer pushes a version tag and publishes the draft
release it creates. Publishing copies that release to the VPS over SSH, into fresh release
folders, and switches `current` to them. The VPS runs nginx through aaPanel; the panel
owns the vhost and the certificate.

The new game, which is being built in `game/`, is not part of a release yet. A merge that
touches it goes to the staging site, `dev.kerinciku.web.id`, to be tried on real phones
(see *Staging*).

```
PR, merge to main ─► CI: secret scan, tracked files and personal data, static
                     checks, unit tests, build, browser tests        (no deploy)

git tag vX.Y.Z, push ─► Release: the same checks on the tag, then a DRAFT GitHub
                        Release with the site, the collector and SHA256SUMS
                     │
                     ▼  a maintainer reviews the notes and publishes
                  Deploy: download the release files, check their sums
                     │
                     ▼  rsync over SSH (an unprivileged deploy user)
VPS  /www/wwwroot/kerinciku.web.id/releases/20261112000000-a1b2c3d/   the site
     /opt/kerinciku-stats/releases/20261112000000-a1b2c3d/           the collector
                     │
                     ▼  deploy/remote.sh: check the uploads, switch the collector and
                        wait for it to answer as the new release, then switch the site
     current ─► the new release, previous ─► the one before
```

```
/www/wwwroot/kerinciku.web.id/
  .well-known/                 Let's Encrypt checks, managed by the panel
  releases/
    20261112000000-a1b2c3d/    one folder per deploy (UTC time, commit), newest five kept
  current -> releases/...      what is live, switched atomically on deploy
  previous -> releases/...     what a rollback goes back to

/opt/kerinciku-stats/          the collector, same layout
  releases/, current, previous
  geo/city.mmdb                the GeoIP file (docs/telemetry.md), not part of a release
/var/lib/kerinciku-stats/      its SQLite database, owned by the service
```

The collector runs as the systemd service `kerinciku-stats`, from `current`, on
`127.0.0.1:8788`. The deploy user cannot restart a service and does not need to: the
collector notices that `current` points at another release and stops, and systemd starts
the new one. The deploy waits for the health answer to name the new release before it
moves the site, and puts the old collector back if that never happens.

Four files on the server come from this repository but are installed by hand: the
site's rewrite rules (`deploy/nginx/kerinciku-rewrite.conf`), the staging site's rewrite
rules (`deploy/nginx/kerinciku-dev-rewrite.conf`), the rate limit zones
(`deploy/nginx/kerinciku-limits.conf`) and the service
(`deploy/systemd/kerinciku-stats.service`). A release never touches the server's nginx or
systemd config (see *Changing the server config*).

## One-time setup

1. **DNS** — `A kerinciku.web.id → <server IP>`, `CNAME www → kerinciku.web.id`.
2. **Site in aaPanel** — Website → Add site. Domain `kerinciku.web.id`, root
   `/www/wwwroot/kerinciku.web.id`, no PHP, no database, no FTP.
3. **Certificate in aaPanel** — Site → SSL → Let's Encrypt → file verification. The panel
   stores and renews the certificate itself.
4. **TLS versions** — the panel writes `ssl_protocols TLSv1.1 TLSv1.2 TLSv1.3` into a new
   vhost. Remove `TLSv1.1` by hand, and check it again whenever the panel re-saves the
   site's SSL settings.
5. **Release folder** — the releases are uploaded by an unprivileged deploy user. It has
   to own the site root, because `current` is created there:

   ```sh
   sudo mkdir -p /www/wwwroot/kerinciku.web.id/releases
   sudo chown <deploy-user>: /www/wwwroot/kerinciku.web.id /www/wwwroot/kerinciku.web.id/releases
   ```

6. **SSH key for CI** — a keypair used for nothing else. The public half goes into the
   deploy user's `authorized_keys`; the private half is stored as the repository secret
   `DEPLOY_SSH_KEY`. Never commit it.
7. **Server config** — install the nginx files by hand (see *Changing the server config*).
   Without them the site does not show at all: nginx keeps looking for files in the site
   root, not in `current`.
8. **Collector** — Node 22.13 or newer at `/usr/bin/node`, then, from the admin account:

   ```sh
   sudo mkdir -p /opt/kerinciku-stats/releases /opt/kerinciku-stats/geo
   sudo chown -R <deploy-user>: /opt/kerinciku-stats
   sudo install -m 644 /tmp/kerinciku-stats.service /etc/systemd/system/kerinciku-stats.service
   sudo systemctl daemon-reload && sudo systemctl enable --now kerinciku-stats
   ```

   The service keeps restarting quietly until the first deploy gives it a `current`. It
   needs no account of its own (`DynamicUser`), and its database appears in
   `/var/lib/kerinciku-stats` on the first start. Fetch the GeoIP file as
   `docs/telemetry.md` describes.
9. **Panel password** — `sudo htpasswd -c /www/server/nginx/conf/.htpasswd-kerinciku <name>`
   (or `openssl passwd -apr1`), readable by nginx only. The password is never written
   into this repository.

## Repository secrets and variables

| Name | Kind | Value |
| --- | --- | --- |
| `DEPLOY_SSH_KEY` | secret | private key of the deploy keypair |
| `DEPLOY_KNOWN_HOSTS` | secret | the server's host keys, as `known_hosts` lines |
| `DEPLOY_HOST` | secret | server address; a secret so Actions masks it in logs |
| `DEPLOY_USER` | variable | the unprivileged deploy user |
| `DEPLOY_PORT` | variable | SSH port |
| `DEPLOY_PATH` | variable | site root, `/www/wwwroot/kerinciku.web.id` |
| `DEPLOY_ENABLED` | variable | `true`, or `false` to pause deploys |
| `STAGING_PATH` | variable, environment `staging` | staging site root, `/www/wwwroot/dev.kerinciku.web.id` |
| `STAGING_ENABLED` | variable | `true` once the staging site exists, `false` to pause staging deploys |

The deploy job runs in the GitHub environment `production`, which accepts only tags
matching `v*.*.*`. A branch, a pull request or a fork cannot deploy to the live site. The
staging deploy (*Staging*) runs in the environment `staging`, from `main` or from a branch
a maintainer starts it on; a pull request from a fork never reaches it.

A variable missing from GitHub is an empty string in the workflow, not an error. The first
step of the deploy job ("Check deploy settings") fails the run when any of them is empty or
malformed, and `DEPLOY_PATH` must be an absolute path at least two levels deep. The remote
script also refuses to switch `current` unless the new release folder is complete.

The actual values live only in the repository settings and in the operator's notes, not
in this public file.

## Releasing

Day to day, open a pull request and merge it when CI is green. Nothing reaches players
yet. When `main` has something worth shipping:

1. Make sure `main` is green in CI.
2. Create and push a version tag on the latest `main`:

   ```sh
   git switch main && git pull --ff-only
   git tag -a vX.Y.Z -m "Jelajah Kerinci X.Y.Z"
   git push origin vX.Y.Z
   ```

3. The **Release** workflow checks that the tag is `vX.Y.Z` and on `main`, runs every CI
   check on it, builds it with version `X.Y.Z`, and creates a **draft release** with
   `kerinciku-site-X.Y.Z.tar.gz` and `SHA256SUMS`, plus notes generated from the merged
   pull requests.
4. Review the draft (GitHub → Releases): rewrite the notes for players and their parents,
   in Indonesian, saying what changed in the game rather than how. Then **Publish**.
5. Publishing starts the **Deploy** workflow, which deploys exactly those files. It is
   live about a minute later.

Drafts never reach players, and deleting a draft and its tag cancels a release. The GitHub
Releases page is the changelog; there is no `CHANGELOG.md`.

The version comes from the tag: `package.json` stays at `0.0.0` and is not bumped. Patch
(`0.3.1`) for fixes, minor (`0.4.0`) for anything a player notices.

- **Deploy a release again:** `gh workflow run deploy.yml --ref vX.Y.Z` (or Actions → Deploy
  → Run workflow, choosing the tag).
- **Pause deploying:** set the repository variable `DEPLOY_ENABLED` to `false`. Publishing
  then deploys nothing.

The build writes its label into `js/version.js` (shown in small print on the title screen)
and into `sw.js`:

| Build | Label | Example |
| --- | --- | --- |
| Release | `X.Y.Z+<sha7>` | `0.3.1+a1b2c3d` |
| Any other CI build | `0.0.0-dev+<sha7>` | `0.0.0-dev+9f8e7d6` |
| Local build, or the files opened directly | `dev` | `dev` |

## What a deploy does

`.github/workflows/deploy.yml`, given a published release:

1. Download the release's site and collector files, check them against `SHA256SUMS`, and
   make sure the site was built for that tag. A draft, or a release without the files,
   stops here. (Releases up to 0.2.1 have no collector file and cannot be deployed again.)
2. Check the deploy settings, then `rsync` the site into `releases/<release>/` under the
   site root and the collector into `releases/<release>/` under `/opt/kerinciku-stats`. The
   folders are new on every deploy (`<UTC time>-<sha7>`), so nothing live changes during
   the upload.
3. Run `deploy/remote.sh activate` over SSH: check that both uploads are complete; switch
   the collector's `current` and wait until its health answer names this release (if it
   never does, the old collector is put back and the site is not touched); switch the
   site's `current` with `mv -Tf` so no request sees a half switch; record the old targets
   as `previous`; and keep the five newest releases plus whatever `current` and `previous`
   point at.
4. Smoke test: the page, `sw.js`, a script, the stylesheet, the manifest and an icon answer
   200; the live `js/version.js` and `sw.js` carry this release's label; the server sends a
   Content-Security-Policy; the beacon answers; and the panel's numbers ask for a password.
   If the smoke test fails, the job runs `deploy/remote.sh rollback` and fails.

## Changing the server config

Edit the file in `deploy/`, merge it (CI runs `nginx -t` on the repository's nginx files),
then install it from the admin account on the VPS. Other sites share this nginx: keep a
dated copy, and always run `nginx -t` before reloading.

```sh
F=/www/server/panel/vhost/rewrite/kerinciku.web.id.conf
sudo cp -p "$F" "$F.bak-$(date +%F-%H%M%S)"
sudo install -m 644 /tmp/kerinciku-rewrite.conf "$F"     # copied over with scp
# The rate limit zones the rules refer to; only when that file changed.
sudo install -m 644 /tmp/kerinciku-limits.conf /www/server/panel/vhost/nginx/0.kerinciku-limits.conf
# The staging site's rules; only when that file changed. The panel creates the file,
# empty, together with the site.
D=/www/server/panel/vhost/rewrite/dev.kerinciku.web.id.conf
sudo cp -p "$D" "$D.bak-$(date +%F-%H%M%S)"
sudo install -m 644 /tmp/kerinciku-dev-rewrite.conf "$D"
sudo nginx -t && sudo nginx -s reload
```

The service file goes to `/etc/systemd/system/kerinciku-stats.service`, followed by
`sudo systemctl daemon-reload && sudo systemctl restart kerinciku-stats`.

## Rollback

On the server, as the deploy user, from a checkout of this repository or with the script
copied over:

```sh
bash deploy/remote.sh rollback /www/wwwroot/kerinciku.web.id /opt/kerinciku-stats
```

It swaps `current` and `previous` for the site, and for the collector when it has a
previous release, so running it a second time undoes it. No rebuild, no downtime.

Through CI instead, deploy the previous release again:
`gh workflow run deploy.yml --ref v<previous>`. Then fix the problem on `main` and release
a new version.

## Staging

The new game (`game/`) is tried at `https://dev.kerinciku.web.id` long before it is part
of a release: on real phones, over HTTPS and a real connection, with the server's own
headers. Anyone with the link can open it; search engines are told to stay away
(`X-Robots-Tag: noindex`, and a `robots.txt` that disallows everything). It has no
collector and counts nothing.

```
merge to main that touches game/ ─┐
gh workflow run staging.yml       ├─► Staging: build without secrets
  --ref <branch>                 ─┘        │
                                           ▼  deploy job, environment "staging"
VPS  /www/wwwroot/dev.kerinciku.web.id/releases/20261118000000-a1b2c3d/
                                           │
                                           ▼  deploy/remote.sh activate-site, smoke test
     current ─► the new build, previous ─► the one before (five newest kept)
```

### One-time setup

1. **DNS** — `A dev.kerinciku.web.id → <server IP>`.
2. **Site in aaPanel** — Website → Add site. Domain `dev.kerinciku.web.id`, root
   `/www/wwwroot/dev.kerinciku.web.id`, no PHP, no database, no FTP.
3. **Certificate in aaPanel** — Let's Encrypt, as for the live site, and remove `TLSv1.1`
   from the new vhost. Do this before anyone opens the site: `kerinciku.web.id` sends HSTS
   with `includeSubDomains`, so a browser that has visited the live site refuses
   `dev.kerinciku.web.id` without a valid certificate.
4. **Release folder** — owned by the same deploy user as the live site:

   ```sh
   sudo mkdir -p /www/wwwroot/dev.kerinciku.web.id/releases
   sudo chown <deploy-user>: /www/wwwroot/dev.kerinciku.web.id /www/wwwroot/dev.kerinciku.web.id/releases
   ```

5. **Rewrite rules** — install `deploy/nginx/kerinciku-dev-rewrite.conf` (see *Changing
   the server config*). Without them nginx looks for files in the site root, not in
   `current`.
6. **GitHub** — the environment `staging`, the variable `STAGING_PATH` (see *Repository
   secrets and variables*), and the repository variable `STAGING_ENABLED` set to `true`.
   The deploy reuses the live site's deploy key, host, user and port; no new key is needed.

Until `STAGING_ENABLED` is `true`, the workflow builds the new game and skips the deploy.

### What a staging deploy does

`.github/workflows/staging.yml`:

1. Build: `npm ci`, then `npm run game:build` (type check, then Vite) with the label
   `0.0.0-dev+<sha7>`, which the page shows and `version.txt` holds. This job has no secret.
2. Deploy, in the environment `staging`: check the settings (`STAGING_PATH` must be the
   root of `dev.kerinciku.web.id` and never `DEPLOY_PATH`), `rsync` the build into a fresh
   release folder, and run `deploy/remote.sh activate-site`, which checks that
   `index.html` and `version.txt` arrived, switches `current`, records `previous` and
   prunes. This job runs nothing from npm.
3. Smoke test: the page, `robots.txt` and every file the page loads answer 200; the live
   `version.txt` is this build; the server sends the new game's policy and
   `X-Robots-Tag: noindex`. If it fails, the job runs `deploy/remote.sh rollback-site`.

The staging site's policy is `GAME_CSP` in `scripts/site.mjs`. It differs from the live
site's where the decoders of the 3D files need it: `blob:` for their workers and the
textures they unpack, and `'unsafe-eval'`, because the Basis texture transcoder that
ships with three.js creates functions with `new Function` (Emscripten's embind). Inline
scripts stay blocked. `npm run game:preview` and the browser tests send the same policy.

To go back, as the deploy user on the server:
`bash deploy/remote.sh rollback-site /www/wwwroot/dev.kerinciku.web.id`. Or deploy an
older state again: `gh workflow run staging.yml --ref <branch or tag>`.

## Notes

- **The CSP allows no inline script or style.** `scripts/serve.mjs` and the browser tests
  send the same policy as nginx, and `npm run check` fails when the two differ, so a
  violation shows up before a release, not after.
- **Caching:** pages, scripts and styles always revalidate (`no-cache`), so a deploy shows
  up on the next load. Icons are cached for seven days.
- **Offline play:** `sw.js` keeps every file of a release on the phone. The build writes
  the release label and the list of files into `sw.js`, so every release changes that
  file; the phone then downloads the new release into a new cache, drops the old one, and
  reloads the page while the player is on the title screen or the map, never in the middle
  of a game. The server must not cache `sw.js`: a phone holding an old copy keeps showing
  the old game.
- If offline play ever has to be switched off, replace `sw.js` with a worker that deletes
  every cache and unregisters itself, and leave that file at `/sw.js` for a few months,
  until the phones that have the old one have fetched it.
- Version 0.1.0 saved progress with Indonesian field names and place ids. `js/util.js`
  still reads that format, so nobody loses stamps; the first save rewrites it.
