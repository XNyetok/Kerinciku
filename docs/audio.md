# Sounds

Everything the game plays is a file in `audio/`: 14 effects, 2 music loops and 29
narration clips, about 1 MB together. `js/audio.js` plays them through Web Audio.

```
audio/sfx/<name>.mp3      effects: tap, pick, oops, right, star, cheer, splash, shutter,
                          step, flip, and the four instruments of the rhythm game
audio/music/<name>.mp3    map (title, map, introductions, results) and play (inside a game)
audio/voice/<name>.mp3    narration: intro-<place>, fact-<place>, animal-<animal>,
                          goods-<good>, praise-1..3, map-ask, map-open, map-done
```

## Where they come from

The sounds are synthetic, made with [ElevenLabs](https://elevenlabs.io) on the
maintainer's paid plan: the effects with its sound effects model, the music with its music
model (instrumental), and the narration with its text-to-speech model and the stock
Indonesian voice "Zulfa". Nothing was recorded from a person, an instrument or an existing
piece of music.

What each one was made from:

| Sound | Description given to the model |
| --- | --- |
| `sfx/tap` | Single soft wooden click, short bamboo tick, dry, close-mic, button press sound |
| `sfx/pick` | Single short bright pop with a tiny rising bloop, plucking a fresh leaf, cheerful game pickup sound, dry |
| `sfx/oops` | Short gentle descending two-note marimba, low soft wooden uh-oh, friendly mistake sound for a children's game, dry |
| `sfx/right` | Short bright two-note ascending kalimba chime, cheerful correct answer sound, clean, dry |
| `sfx/star` | Single bright glockenspiel note with a short sparkling shimmer, clean, star reward sound |
| `sfx/cheer` | Short joyful victory jingle, ascending xylophone and bells arpeggio ending on a bright chord, children's game level complete |
| `sfx/splash` | Small quick water splash, a fish pulled out of a lake, light plop, close-mic |
| `sfx/shutter` | Single camera shutter click, mechanical SLR camera, crisp, close-mic |
| `sfx/step` | Single footstep on a gravel mountain trail, short crunchy boot step, close-mic |
| `sfx/flip` | Single playing card flipped over on a wooden table, quick soft paper snap, close-mic |
| `sfx/gong` | Single deep bronze gong strike, Indonesian gamelan gong, warm low resonant tone, short decay |
| `sfx/drum` | Single hit on a gendang, Indonesian two-headed hand drum, deep warm thump, dry, close-mic |
| `sfx/rebana` | Single hit on a rebana frame drum with metal jingles, bright sharp slap with a short tambourine rattle, dry |
| `sfx/clap` | Single hand clap, one person, crisp, dry, close-mic |
| `music/map` | Gentle, playful instrumental, Sumatran Malay folk feel: bamboo flute, plucked gambus, soft frame drum and shaker, 96 BPM |
| `music/play` | Upbeat, cheerful instrumental, Sumatran Malay folk dance feel: bamboo flute and accordion, gambus, hand drums and tambourine, 120 BPM |

`sfx/oops` and `sfx/right` came out as one note each. The game plays the note twice at two
pitches, down for a slip and up for a right answer. The three stars on the result screen
are one chime played at three pitches.

The narration says the lines in `JK.voice` (`js/strings.js`). `scripts/voice.json` keeps
the text each clip was made from. Two clips were made from a spelling that leaves no doubt
about a number: "seratus tahun" for "100 tahun" and "tiga ribu delapan ratus lima meter"
for "3.805 meter".

## How a file is prepared

Each file is mono mp3 with no metadata, cut and levelled before it is encoded:

- **Effects**: the silence before and after is cut, the end is faded, the peak is set
  just under full scale. 44.1 kHz, 80 kbit/s.
- **Narration**: the silence before and after is cut, and every clip is brought to the
  same loudness. 24 kHz, 32 kbit/s.
- **Music**: a whole number of bars is cut out (12 bars of `map`, 16 of `play`), and its
  last half bar is cross-faded into the half bar that came before its start, so the end
  runs into the beginning. The file then repeats its first 0.6 seconds after the loop.
  `js/audio.js` loops from 0.2 seconds to 0.2 seconds plus the loop's length (`MUSIC`),
  which keeps the silence an mp3 decoder adds at both ends out of the loop. 32 kHz,
  48 kbit/s.

The encoding step is the same for all three, with the rate and bit rate above:

```sh
ffmpeg -i in.wav -ac 1 -ar 24000 -c:a libmp3lame -b:a 32k \
  -map_metadata -1 -fflags +bitexact -flags:a +bitexact -id3v2_version 0 -write_id3v1 0 out.mp3
```

## Replacing or adding a sound

- `npm run check` fails when a sound the game asks for is missing, when a file in
  `audio/` is not used, and when a narration line in `js/strings.js` no longer matches
  `scripts/voice.json`.
- After changing a line that is narrated, make its clip again from the new text, then
  update the line in `scripts/voice.json`.
- A new effect needs an entry in `SFX` in `js/audio.js` and a stand-in in `fx`: the
  tone the browser synthesises while the file has not arrived.
- A new music loop needs its length in `MUSIC`, and the repeated 0.6 seconds at its end.
- The build keeps two budgets (`scripts/site.mjs`): 400 KB for everything a game needs
  before it can be played, 1200 KB for `audio/`. The sounds are fetched after the page
  has loaded and stored for offline play one by one, so a sound that fails to download
  never stops the game from installing.
- A sound made by someone else needs a licence that allows it to be published here
  (`CONTRIBUTING.md`).
