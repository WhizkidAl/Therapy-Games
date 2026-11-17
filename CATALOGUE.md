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
   - `levelsSupported` — practice levels this page actually implements. Use `[]` when it has none. All Aboard uses `1`, `2`, `3a`, `3b`, `4`, `5`.
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

All Aboard can print its generic playing cards from the browser. That sheet is the demo deck only. Personalised task cards stay with the family or the clinic.

## Config contract

A configurable game must run from a config object supplied at load. It must not copy a client's file into this repository, and it must not write results to storage or call a network API of its own.

All Aboard is the reference. It accepts a config in this order:

1. `window.AllAboardConfig`, or `AllAboard.start(config)` after load
2. A `postMessage` of `{ "type": "all-aboard-config", "config": { } }`
3. The `config` URL parameter, which is fetched once. This is the only request the page makes.
4. The built-in demo embedded in the page

The demo is also saved at `speech-language/speech-sounds/all-aboard/demo-config.json`.

```json
{
  "id": "all-aboard-demo",
  "title": "All Aboard!",
  "version": "1.0.0",
  "theme": { "name": "red-trains", "trainColour": "#9f1d1d", "background": "#f4efe6", "ink": "#1b2430" },
  "roundMinutes": 4,
  "resultsOrigin": "*",
  "players": { "childLabel": "Player 1", "opponentLabel": "Station guard", "opponent": "computer" },
  "defaultLevel": "1",
  "levels": [{ "id": "1", "label": "1 · Word", "prompt": "Say the word." }],
  "wildCards": { "tunnel": true, "disco": true, "red-signal": true, "swap-track": true },
  "music": false,
  "maxMixUps": 1,
  "repairCheck": "I heard {heard}. Do you mean {heard} or {intended}?",
  "repairStrategies": [
    { "id": "key-word", "label": "Say the key word", "emoji": "🗣️", "picture": "key-word", "kind": "speech", "hint": "Say the word you meant." },
    { "id": "show-or-point", "label": "Show or point", "emoji": "👉", "picture": "show-or-point", "kind": "show", "hint": "Point to the card or hold it up." },
    { "id": "another-way", "label": "Tell it another way", "emoji": "💬", "picture": "another-way", "kind": "meaning", "hint": "Use another word or a short clue." }
  ],
  "sets": [{
    "id": "bell-set",
    "name": "Bell train",
    "approach": "multiple-oppositions",
    "contrast": "onset",
    "words": [
      { "id": "bell", "text": "bell", "emoji": "🔔", "image": "", "nonword": false, "role": "engine" },
      { "id": "fell", "text": "fell", "emoji": "🍂", "image": "", "nonword": false, "role": "carriage" }
    ]
  }]
}
```

Rules the game enforces:

- Each set needs at least two words. The first word is the engine unless `role` says otherwise.
- `nonword: true` is shown on the card. Non-words are allowed.
- `image` may be an `https` address or a same-folder image file. Emoji is the offline picture.
- Omit `levels` to use the six practice-hub prompts: 1 word, 2 phrase, 3a carrier sentence, 3b own sentence, 4 connected sentences, 5 everyday. The level changes the prompt text.
- `roundMinutes` defaults to 4 and must be from 1 to 15.
- Wild cards, when enabled, can be used once a round: Tunnel (whisper), Disco Carriage (dance, and a short tone if music is on), Red Signal (say it in a sentence), Swap Track (ask from a different train).

### Repair

Repair is a core part of All Aboard, not a repetition drill. The default strategies are the three the listener can offer, each with a simple picture:

1. Say the key word (`kind: "speech"`). The listener taps the word they heard. It works when that word is the one the child meant.
2. Show or point (`kind: "show"`). Pointing or showing is always accepted as a successful repair.
3. Tell it another way (`kind: "meaning"`). The listener says whether the meaning became clear.

Do not use "try again", "say it again", or "say it slowly" as repair prompts. The game rejects those phrases in `repairCheck` and in strategy labels or hints.

On the first confirmed mix-up, the heard carriage moves to the asker (from the other player, or from the yard if that is where it is). The listener then says the check. The default is `I heard {heard}. Do you mean {heard} or {intended}?`. The child picks one strategy. `maxMixUps` defaults to **1**, so a round contains at most one of these natural mix-ups. A later different word still moves the heard carriage, and it is still scored as an incorrect ask, but it does not open a second repair.

Hosts can replace the check, the strategy list, the pictures, and `maxMixUps` (0 to 5) in the private config.

### Results

When a round ends, the page emits a message and calls `AllAboard.onResults(payload)` if that function is set. It also fires a `all-aboard-results` event on `window`. The page does not save the payload.

```js
{
  source: 'all-aboard',
  type: 'all-aboard-results',
  resultsOrigin: '*',
  payload: {
    gameId: 'all-aboard',
    configId: 'all-aboard-demo',
    version: '1.0.0',
    level: '1',
    durationMs: 240000,
    startedAt: '2026-11-17T00:00:00.000Z',
    endedAt: '2026-11-17T00:04:00.000Z',
    outcome: 'stopped',
    attempts: [],
    attemptCount: 0,
    correct: 0,
    incorrect: 0,
    repairs: [{
      strategyId: 'show-or-point',
      strategyLabel: 'Show or point',
      strategyKind: 'show',
      success: true,
      intendedText: 'spell',
      heardText: 'bell',
      check: 'I heard bell. Do you mean bell or spell?'
    }],
    repairAttempts: 1,
    repairSuccesses: 1,
    repairByStrategy: {},
    words: [],
    trainsCompleted: { child: [], opponent: [] }
  }
}
```

`attempts` are the asks. `correct` means the listener heard the word the child was asking for. Repair is counted separately, including which strategy was used and whether it worked. `words` has attempts, correct, incorrect, repairAttempts, and repairSuccesses for each card. Ask scores and repair scores are not added together.

Set `resultsOrigin` to the host app's origin when the page is embedded. The default `*` is only for a host that has not named an origin yet.
