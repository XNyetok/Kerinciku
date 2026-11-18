# The new game (in progress)

A life-sim set in Kerinci, built one area at a time, played in the browser with the phone
held sideways. Nothing here reaches players yet: it is tried on the staging site,
`https://dev.kerinciku.web.id` (`docs/deploy.md`, Staging), while the children's game
stays live at `kerinciku.web.id`.

TypeScript, Vite and Three.js (WebGL2). Everything a player reads is in
`src/strings.ts`, in Indonesian.

```sh
npm run game:dev       # http://127.0.0.1:5173
npm run game:build     # type check, then build into game/dist/
npm run game:preview   # serve game/dist/ with the staging site's headers
npx playwright test --project=game
```

## The tech prototype

What is here now is a technical prototype: a slice of a market (copies of one baked
stall), the player, residents walking about, a joystick that appears under the thumb,
tap-to-walk, and the fixed camera. It exists to measure frame rate, download size and
memory on real phones before the game itself is planned in detail.

The numbers in the corner: frames per second (and the slowest 1%), draw calls and
triangles, the canvas size, the JS heap (Chrome only), an estimate of GPU memory, what was
downloaded, and the GPU. The GPU estimate counts textures, geometry and the drawing
buffer as if multisampling stored four samples per pixel; phones that resolve
multisampling on chip use less.

"Uji kinerja" runs the benchmark suite (`?suite=1`, about two to three minutes): the
player walks a fixed route past the same residents while frame times are recorded. The
standard scene runs at render pixel ratios 1, 1.5, 2 (and the screen's own when higher),
12 seconds each; then, one change at a time at the default ratio, the 1024 px stall
texture, no multisampling, 16 stalls with a texture each, and 24 residents. Each variant
is a fresh page load; the finished runs wait in `sessionStorage`. At the end one result
shows, with a button that copies it as JSON. `?bench=1` runs only the current settings.

Settings come from the address, so a test on a phone is a link:

| Setting | Effect |
| --- | --- |
| `tex=1k` | stall texture 1024 px instead of 2048 px |
| `stalls=16` | how many stalls (default 12) |
| `unique=1` | every stall gets its own copy of the texture on the GPU, as different baked stalls would |
| `npcs=20` | how many residents (default 8) |
| `ratio=1.5` | render pixel ratio (default: the screen's, at most 2) |
| `fps=30` | frame cap (default: as fast as the screen allows) |
| `aa=0` | no multisampling |
| `dist=14` | camera distance in metres (default 12) |
| `hud=0` | no numbers |
| `suite=1` | run the whole benchmark suite |
| `bench=1` | benchmark the current settings only; `soak=300` adds a heat test of that many seconds |

## Lighting

The stall's light is baked in Blender with the AgX view transform, so its texture is
shown as it is (`toneMapped: false`). People move, so they are lit in real time by the
same sun (5.5 W/m², warm, low from the front left) and sky as the bake, then tone mapped
with AgX. The lanes between the stalls use a repeating texture whose brightness was taken
from the sunlit paving of the bake.

## The 3D files

`src/assets/` holds files made for this project by scripts in Blender and Node: the
stall (`stall-2k.glb`, `stall-1k.glb`: one mesh, its lighting baked into one ETC1S
texture, meshopt geometry), the stand-in resident (`resident.glb`: one skinned mesh, 19
bones, `Idle` and `Walk`, an eight-colour palette that each resident replaces), and the
lane texture (`ground.ktx2`, 3 m per repeat). They are MIT, like the rest of the
repository. The scripts that make them move into the repository with the asset pipeline;
until then the files are committed as built. Never commit a `.blend` file: it stores the
path it was saved at.

The Basis transcoder that unpacks the textures ships with Three.js and uses
`new Function` (Emscripten's embind), so the staging site's policy allows
`'unsafe-eval'` (`scripts/site.mjs`, `GAME_CSP`).
