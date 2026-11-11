# Security Policy

## Reporting a vulnerability

Email **debi@elysiumx.org** with the details. Please do not open a public issue for
anything that could be exploited before it is fixed.

Include:

- what the issue is and where it lives (file, address, or commit)
- how to reproduce it, or a proof of concept
- the impact you think it has

You can expect an acknowledgement within a few days. This is a solo project, so please
allow reasonable time before disclosing publicly.

## Leaked credentials or personal data

If you notice a secret or someone's personal data published in this repository, email the
address above with the commit hash. Do not quote it and do not open a public issue: it is
a public repository, and every issue is indexable.

## Data collected by the game

None. The game sends nothing to a server beyond requesting its own files: no analytics,
no cookies, no accounts, no advertising, no third-party libraries. Stamps and the sound
setting are kept on the player's device (`localStorage`) and never leave it.

The players of this game are children. If you believe the running site behaves
differently from this, that is a bug worth reporting.

## Scope

Relevant reports include, but are not limited to:

- secrets or personal data committed to the repository or its history
- script injection (cross-site scripting), or a weakened Content-Security-Policy
- dependency, build or deploy pipeline compromise
- unlicensed assets shipped in the repository

## Not in scope

- findings that require a modified browser or an already-compromised machine
- automated scanner output pasted without a reproduction

## Supported versions

Only the latest release receives fixes.
