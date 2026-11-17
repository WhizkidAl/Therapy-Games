# Game catalogue and config contract

This repository is a generic, public therapy library. `catalogue.json` is the machine-readable list of games and tools. `catalogue.html` is a read-only view with filters. Neither file stores client records.

Status values move in one direction of confidence: **planned → built → tested → clinically-reviewed → released**. A page that exists is **built**. Do not mark **released** unless the checks in `PLATFORM_OPERATING_RULES.md` have actually been done. If you are unsure, use **built**.

## Add a game

1. Put the game in one primary folder for its main therapy target. Use a lowercase, hyphenated name. Do not put a participant's name, initials, or scores in the file.
2. Add one object to the `games` array in `catalogue.json`. Keep `updated` on the catalogue as the day you change it.
3. Required fields:
   - `id` — stable lowercase hyphenated id
   - `title`
   - `path` — repository path of the page
   - `url` — public GitHub Pages address for that path
   - `therapyArea` — one primary area, such as `speech-sounds` or `semantics`
   - `presentationTags` — secondary labels such as `multiple-oppositions`, `minimal-pairs`, `phonological-awareness`, `semantics`, `communication-repair`
   - `levelsSupported` — practice levels this page actually implements. Use `[]` when it has none. All Aboard uses `word`, `phrase` and `sentence`.
   - `configurable` — `true` only when an adult can change targets without editing the game file
   - `supports_repair` — `true` when the page has a real repair step (a misunderstood message, then a chosen way to repair it). A mention of repair in passing is not enough; Story Safari is `true` because a story rehearses repair. The speech-room launcher is `false`.
   - `status` — one of `planned`, `built`, `tested`, `clinically-reviewed`, `released`
   - `version` — a version string, or `unversioned` when the page has none
   - `lastUpdated` — `YYYY-MM-DD`
4. Optional fields: `summary`, `kind` (`game`, `clinician-tool`, `guide`, `directory`, `tracker`, `catalogue`, `tool`), `statusNote`.
5. Link the page from `index.html` or `shared-tools/index.html` when families or therapists should see it.
6. Run `node --test`.

## Companion printable task cards

Each game has companion printable task cards. Those cards are separate from the web game: the page is for play, and the task cards are the paper the clinician uses beside it. Do not treat a print stylesheet as a substitute for that pack, and do not commit a child's own cards, names, or targets.

Personalised task cards stay with the family or the clinic.

## All Aboard

Version 2 is a station game. A grown-up picks Word, Phrase or Sentence, and one train: bell/fell/spell/smell, bill/fill/spill/Smill, or bin/fin/spin/Smin. The child plays three rounds. Tickets and each attempt stay in this browser under the key `all-aboard-v2`. Turning on “Swap tickets for coins” only records that choice. The page does not call Supabase. A possible table is written, and not applied, in `speech-language/speech-sounds/all-aboard/RESULTS.sql`.

Each logged attempt has `round`, `word`, `level`, `support` (`independent` or `help`), `splitOff`, `strategy` and `at`. A rating is stored when the child picks a face.

