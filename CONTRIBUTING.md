# Contributing

Thanks for taking an interest. This is an early project, so small, focused changes are
much easier to review than large rewrites.

The help needed most right now is not code: **corrections to the Kerinci words** and
**facts about Kerinci** from people who know the place (see the table in `README.md`).

## Before you send a pull request

1. Fork the repository and branch from `main`.
2. Run `./scripts/setup-hooks.sh` once. It installs the checks that run before every commit.
3. Install `gitleaks` if it is not already on your machine:

   ```sh
   brew install gitleaks
   ```

4. Run `npm run check && npm test`, and `npm run test:e2e` when the game itself changed.
5. Check that `git status` shows only the files you meant to change.

## What we will not merge

The repository is public and permissive, so a few rules are absolute.

- **No secrets.** API keys, tokens, passwords, server addresses, private keys, `.env`
  files. The pre-commit check blocks the common cases; do not add an exception for yours.
- **No personal data.** E-mail addresses, phone numbers, identity numbers, home addresses,
  IP addresses, folder paths from your computer, photos or screenshots that show other
  people or their accounts. Names of children who tried the game must not be recorded here.
- **No unlicensed assets.** Every image, sound and font must be your own work, public
  domain, or properly licensed. All of the game's pictures are currently drawn in SVG in
  `js/art.js`; where the sounds come from is written down in `docs/audio.md`.
- **No generated noise.** Do not commit `node_modules/`, `dist/`, test reports or editor
  caches.

If a secret or personal data reaches a commit anyway, rotate the secret first, then rewrite
history. Deleting the file in a later commit is not enough: it stays in the public history.

## Content about Kerinci

- **Facts** must be traceable. Name the source in the pull request (a book, an official
  site, or a local informant). When unsure, say "about", or leave it out.
- **Words in the Kerinci language** are written as one particular village says them. Name
  the village or district in the pull request, and remove a `// CHECK` mark only once a
  native speaker has confirmed the word.
- **Culture and places** are shown with respect. Scripts, motifs and dances are not made up.
- The players are six to nine years old: short sentences, everyday words, nothing difficult.

## Language

Everything in the repository is in English: code, comments, tests, documentation. The one
exception is what players read. The game's interface is in Indonesian and lives in
`js/strings.js`, plus the few static lines in `index.html` and `manifest.webmanifest`;
`npm run check` refuses interface text written anywhere else. The statistics panel
(`server/panel/`) is in Indonesian too: it is read by the people who make the game.

## Commits

Use a short conventional prefix, lowercase, imperative summary:

```
feat: add a rice field game at Hamparan Rawang
fix: keep the boat on screen on narrow phones
docs: record who checked the Kerinci words
chore: pin gitleaks to 8.30.1
```

Keep the subject under 72 characters. Use the body for the *why*, not a replay of the
diff. Do not add co-author trailers, generated-by footers, emoji, or marketing tone.

Indonesian or English are both fine in issues and in commit bodies.

## Pull requests

- One topic per pull request. Split unrelated cleanups.
- Describe what changes for a player and how you checked it.
- Keep the branch up to date with `main` and squash fixup commits before review.
- Merging does not deploy. Players get a change when the maintainer publishes a release
  (`docs/deploy.md`, Releasing).

## Reporting bugs and ideas

Use the issue templates. Do not paste secrets, personal data or private screenshots: every
issue is public.
