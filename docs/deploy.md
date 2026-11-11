# Deploy

The game is a static site. Merging to `main` only runs the checks; players get a change
when a maintainer pushes a version tag and publishes the draft release it creates.
Publishing copies that release to the VPS over SSH, into a fresh release folder, and
switches `current` to it. The VPS runs nginx through aaPanel; the panel owns the vhost and
the certificate.

```
PR, merge to main ─► CI: secret scan, tracked files and personal data, static
                     checks, unit tests, build, browser tests        (no deploy)

git tag vX.Y.Z, push ─► Release: the same checks on the tag, then a DRAFT GitHub
                        Release with the site and SHA256SUMS
                     │
                     ▼  a maintainer reviews the notes and publishes
                  Deploy: download the release file, check its sum
                     │
                     ▼  rsync over SSH (an unprivileged deploy user)
VPS  /www/wwwroot/kerinciku.web.id/releases/20261112000000-a1b2c3d/
                     │
                     ▼  deploy/remote.sh: check the upload, switch current
     current ─► the new release, previous ─► the one before
```

```
/www/wwwroot/kerinciku.web.id/
  .well-known/                 Let's Encrypt checks, managed by the panel
  releases/
    20261112000000-a1b2c3d/    one folder per deploy (UTC time, commit), newest five kept
  current -> releases/...      what is live, switched atomically on deploy
  previous -> releases/...     what a rollback goes back to
```

One file on the server comes from this repository but is installed by hand:
`deploy/nginx/kerinciku-rewrite.conf`, as the site's rewrite rules. A release never
touches the server's nginx config (see *Changing the server config*).

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
7. **Server config** — install the nginx file by hand (see *Changing the server config*).
   Without it the site does not show at all: nginx keeps looking for files in the site
   root, not in `current`.

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

The deploy job runs in the GitHub environment `production`, which accepts only tags
matching `v*.*.*`. A branch, a pull request or a fork cannot deploy.

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

1. Download the release's site file, check it against `SHA256SUMS`, and make sure it was
   built for that tag. A draft, or a release without the file, stops here.
2. Check the deploy settings, then `rsync` the site into `releases/<release>/` under the
   site root. The folder is new on every deploy (`<UTC time>-<sha7>`), so nothing live
   changes during the upload.
3. Run `deploy/remote.sh activate` over SSH: check that the upload is complete, switch
   `current` with `mv -Tf` so no request sees a half switch, record the old target as
   `previous`, and keep the five newest releases plus whatever `current` and `previous`
   point at.
4. Smoke test: the page, `sw.js`, a script, the stylesheet, the manifest and an icon answer
   200; the live `js/version.js` and `sw.js` carry this release's label; and the server
   sends a Content-Security-Policy. If the smoke test fails, the job runs
   `deploy/remote.sh rollback` and fails.

## Changing the server config

Edit the file in `deploy/`, merge it (CI runs `nginx -t` on the repository's nginx file),
then install it from the admin account on the VPS. Other sites share this nginx: keep a
dated copy, and always run `nginx -t` before reloading.

```sh
F=/www/server/panel/vhost/rewrite/kerinciku.web.id.conf
sudo cp -p "$F" "$F.bak-$(date +%F-%H%M%S)"
sudo install -m 644 /tmp/kerinciku-rewrite.conf "$F"     # copied over with scp
sudo nginx -t && sudo nginx -s reload
```

## Rollback

On the server, as the deploy user, from a checkout of this repository or with the script
copied over:

```sh
bash deploy/remote.sh rollback /www/wwwroot/kerinciku.web.id
```

It swaps `current` and `previous`, so running it a second time undoes it. No rebuild, no
downtime.

Through CI instead, deploy the previous release again:
`gh workflow run deploy.yml --ref v<previous>`. Then fix the problem on `main` and release
a new version.

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
