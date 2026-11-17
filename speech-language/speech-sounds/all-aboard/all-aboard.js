/* All Aboard! — rules engine.
   No storage and no network. The page loads a config, plays a round, and
   hands a results object back to the host. See /CATALOGUE.md. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.AllAboard = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const PRACTICE_LEVELS = [
    { id: '1', label: '1 · Word', prompt: 'Say the word.' },
    { id: '2', label: '2 · Phrase', prompt: 'Say the word in a short phrase.' },
    { id: '3a', label: '3a · Carrier sentence', prompt: 'Use this sentence: "I can see the ___."' },
    { id: '3b', label: '3b · Own sentence', prompt: 'Make your own sentence with the word.' },
    { id: '4', label: '4 · Connected sentences', prompt: 'Say two or three sentences that include the word.' },
    { id: '5', label: '5 · Everyday', prompt: 'Use the word the way you might really say it today.' }
  ];

  const DEFAULT_REPAIR_CHECK = 'I heard {heard}. Do you mean {heard} or {intended}?';

  const DEFAULT_REPAIR_STRATEGIES = [
    { id: 'key-word', label: 'Say the key word', emoji: '🗣️', image: '', picture: 'key-word', kind: 'speech', hint: 'Say the word you meant.' },
    { id: 'show-or-point', label: 'Show or point', emoji: '👉', image: '', picture: 'show-or-point', kind: 'show', hint: 'Point to the card or hold it up.' },
    { id: 'another-way', label: 'Tell it another way', emoji: '💬', image: '', picture: 'another-way', kind: 'meaning', hint: 'Use another word or a short clue.' }
  ];

  const BANNED_REPAIR = /try again|say it again|say it slowly/i;

  const WILDS = {
    tunnel: { id: 'tunnel', name: 'Tunnel', emoji: '🚇', instruction: 'Whisper the word.' },
    disco: { id: 'disco', name: 'Disco Carriage', emoji: '💃', instruction: 'Do a little dance, then say the word.' },
    'red-signal': { id: 'red-signal', name: 'Red Signal', emoji: '🚦', instruction: 'Say the word in a sentence.' },
    'swap-track': { id: 'swap-track', name: 'Swap Track', emoji: '🔀', instruction: 'Ask for a word from a different train.' }
  };

  const THEME_DEFAULTS = {
    name: 'red-trains',
    trainColour: '#9f1d1d',
    carriageColour: '#f8d7cf',
    background: '#f4efe6',
    ink: '#1b2430',
    accent: '#0e6b4c',
    card: '#fffdf8',
    focus: '#0b57d0'
  };

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function isHex(value) {
    return typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value);
  }

  function validateConfig(raw) {
    const errors = [];
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return { ok: false, errors: ['Config must be an object.'], config: null };
    }
    if (!Array.isArray(raw.sets) || raw.sets.length < 1) errors.push('Add at least one contrast set.');
    const setIds = new Set();
    (raw.sets || []).forEach((set, index) => {
      if (!set || typeof set !== 'object') {
        errors.push('Set ' + (index + 1) + ' is not an object.');
        return;
      }
      if (!set.id || typeof set.id !== 'string') errors.push('Set ' + (index + 1) + ' needs an id.');
      else if (setIds.has(set.id)) errors.push('Duplicate set id "' + set.id + '".');
      else setIds.add(set.id);
      if (!set.name || typeof set.name !== 'string') errors.push('Set ' + (set.id || index + 1) + ' needs a name.');
      if (!Array.isArray(set.words) || set.words.length < 2) {
        errors.push('Set "' + (set.name || set.id || index + 1) + '" needs at least two words.');
        return;
      }
      const wordIds = new Set();
      set.words.forEach((word, wordIndex) => {
        if (!word || typeof word !== 'object') {
          errors.push('A word in "' + (set.name || set.id) + '" is not an object.');
          return;
        }
        if (!word.id || typeof word.id !== 'string') errors.push('Word ' + (wordIndex + 1) + ' in "' + (set.name || set.id) + '" needs an id.');
        else if (wordIds.has(word.id)) errors.push('Duplicate word id "' + word.id + '" in "' + (set.name || set.id) + '".');
        else wordIds.add(word.id);
        if (!word.text || typeof word.text !== 'string' || !word.text.trim()) {
          errors.push('Word "' + (word.id || wordIndex + 1) + '" needs text.');
        }
      });
    });
    if (raw.levels != null) {
      if (!Array.isArray(raw.levels) || raw.levels.length < 1) errors.push('Levels must be a non-empty list when provided.');
      const levelIds = new Set();
      (raw.levels || []).forEach((level) => {
        if (!level || typeof level.id !== 'string' || !level.id) errors.push('Each level needs an id.');
        else if (levelIds.has(level.id)) errors.push('Duplicate level id "' + level.id + '".');
        else levelIds.add(level.id);
        if (!level || typeof level.prompt !== 'string' || !level.prompt.trim()) errors.push('Each level needs prompt text.');
        if (!level || typeof level.label !== 'string' || !level.label.trim()) errors.push('Each level needs a label.');
      });
      if (raw.defaultLevel != null && !levelIds.has(raw.defaultLevel)) errors.push('defaultLevel is not in levels.');
    }
    if (raw.repairPrompts != null) errors.push('Use repairStrategies, not repairPrompts.');
    if (raw.repairCheck != null) {
      if (typeof raw.repairCheck !== 'string' || !raw.repairCheck.includes('{heard}') || !raw.repairCheck.includes('{intended}')) {
        errors.push('repairCheck must include {heard} and {intended}.');
      } else if (BANNED_REPAIR.test(raw.repairCheck)) errors.push('The mix-up check cannot tell the child to repeat on cue.');
    }
    if (raw.repairStrategies != null) {
      if (!Array.isArray(raw.repairStrategies) || raw.repairStrategies.length < 1) errors.push('repairStrategies must list at least one repair.');
      const repairIds = new Set();
      (raw.repairStrategies || []).forEach((item) => {
        if (!item || typeof item.id !== 'string' || !item.id) errors.push('Each repair strategy needs an id.');
        else if (repairIds.has(item.id)) errors.push('Duplicate repair strategy "' + item.id + '".');
        else repairIds.add(item.id);
        if (!item || typeof item.label !== 'string' || !item.label.trim()) errors.push('Each repair strategy needs a label.');
        if (!item || !['speech', 'show', 'meaning'].includes(item.kind)) errors.push('Repair kind must be speech, show, or meaning.');
        const copy = ((item && item.label) || '') + ' ' + ((item && item.hint) || '');
        if (BANNED_REPAIR.test(copy)) errors.push('Repair strategies cannot use repetition cues.');
      });
    }
    if (raw.maxMixUps != null && (!Number.isInteger(raw.maxMixUps) || raw.maxMixUps < 0 || raw.maxMixUps > 5)) {
      errors.push('maxMixUps must be a whole number from 0 to 5.');
    }
    if (raw.roundMinutes != null && (typeof raw.roundMinutes !== 'number' || raw.roundMinutes < 1 || raw.roundMinutes > 15)) {
      errors.push('roundMinutes must be a number from 1 to 15.');
    }
    if (raw.theme && typeof raw.theme === 'object') {
      Object.keys(THEME_DEFAULTS).forEach((key) => {
        if (key === 'name') return;
        if (raw.theme[key] != null && !isHex(raw.theme[key])) errors.push('theme.' + key + ' must be a #rrggbb colour.');
      });
    }
    if (raw.players && raw.players.opponent != null && !['computer', 'human'].includes(raw.players.opponent)) {
      errors.push('players.opponent must be "computer" or "human".');
    }
    if (raw.wildCards && typeof raw.wildCards === 'object') {
      Object.keys(raw.wildCards).forEach((key) => {
        if (!WILDS[key]) errors.push('Unknown wild card "' + key + '".');
        else if (typeof raw.wildCards[key] !== 'boolean') errors.push('wildCards.' + key + ' must be true or false.');
      });
    }
    if (!errors.length) return { ok: true, errors: [], config: normaliseConfig(raw) };
    return { ok: false, errors, config: null };
  }

  function normaliseConfig(raw) {
    const levels = raw.levels && raw.levels.length ? clone(raw.levels) : clone(PRACTICE_LEVELS);
    const defaultLevel = levels.some((level) => level.id === raw.defaultLevel) ? raw.defaultLevel : levels[0].id;
    const wildCards = { tunnel: true, disco: true, 'red-signal': true, 'swap-track': true };
    if (raw.wildCards) Object.keys(wildCards).forEach((key) => {
      if (typeof raw.wildCards[key] === 'boolean') wildCards[key] = raw.wildCards[key];
    });
    return {
      id: typeof raw.id === 'string' && raw.id ? raw.id : 'all-aboard',
      title: typeof raw.title === 'string' && raw.title.trim() ? raw.title.trim() : 'All Aboard!',
      version: typeof raw.version === 'string' && raw.version ? raw.version : '1.0.0',
      theme: Object.assign({}, THEME_DEFAULTS, raw.theme || {}),
      roundMinutes: typeof raw.roundMinutes === 'number' ? raw.roundMinutes : 4,
      resultsOrigin: typeof raw.resultsOrigin === 'string' && raw.resultsOrigin ? raw.resultsOrigin : '*',
      players: {
        childLabel: raw.players && raw.players.childLabel ? String(raw.players.childLabel) : 'Player 1',
        opponentLabel: raw.players && raw.players.opponentLabel ? String(raw.players.opponentLabel) : 'Station guard',
        opponent: raw.players && raw.players.opponent === 'human' ? 'human' : 'computer'
      },
      defaultLevel,
      levels,
      wildCards,
      music: raw.music === true,
      maxMixUps: raw.maxMixUps == null ? 1 : raw.maxMixUps,
      repairCheck: typeof raw.repairCheck === 'string' && raw.repairCheck ? raw.repairCheck : DEFAULT_REPAIR_CHECK,
      repairStrategies: normaliseStrategies(raw.repairStrategies),
      sets: raw.sets.map((set) => ({
        id: set.id,
        name: set.name,
        approach: typeof set.approach === 'string' && set.approach ? set.approach : 'contrast',
        contrast: typeof set.contrast === 'string' && set.contrast ? set.contrast : 'onset',
        words: set.words.map((word, index) => ({
          id: word.id,
          text: word.text.trim(),
          emoji: typeof word.emoji === 'string' ? word.emoji : '',
          image: typeof word.image === 'string' ? word.image : '',
          nonword: word.nonword === true,
          role: word.role === 'engine' || (word.role == null && index === 0) ? 'engine' : 'carriage'
        }))
      }))
    };
  }

  function normaliseStrategies(list) {
    const source = Array.isArray(list) && list.length ? list : DEFAULT_REPAIR_STRATEGIES;
    return source.map((item) => ({
      id: String(item.id),
      label: String(item.label).trim(),
      emoji: typeof item.emoji === 'string' ? item.emoji : '',
      image: typeof item.image === 'string' ? item.image : '',
      picture: typeof item.picture === 'string' && item.picture ? item.picture : String(item.id),
      kind: item.kind === 'show' || item.kind === 'meaning' ? item.kind : 'speech',
      hint: typeof item.hint === 'string' ? item.hint.trim() : ''
    }));
  }

  function fillCheck(template, heard, intended) {
    return String(template).split('{heard}').join(heard).split('{intended}').join(intended);
  }

  function shuffle(list, rng) {
    const copy = list.slice();
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const swap = Math.floor(rng() * (index + 1));
      const hold = copy[index];
      copy[index] = copy[swap];
      copy[swap] = hold;
    }
    return copy;
  }

  function other(playerId) {
    return playerId === 'child' ? 'opponent' : 'child';
  }

  function inHandsOrYard(state, cardId) {
    return state.yard.includes(cardId) || state.players.child.hand.includes(cardId) || state.players.opponent.hand.includes(cardId);
  }

  function checkComplete(state, playerId) {
    const hand = state.players[playerId].hand;
    state.setIds.forEach((setId) => {
      if (state.players[playerId].complete.includes(setId)) return;
      const cards = state.trainCards.filter((card) => card.setId === setId);
      if (!cards.length || !cards.every((card) => hand.includes(card.id))) return;
      state.players[playerId].hand = hand.filter((id) => !cards.some((card) => card.id === id));
      state.players[playerId].complete.push(setId);
      state.message = 'All aboard! The ' + state.setsById[setId].name + ' is complete.';
    });
  }

  function moveCard(state, cardId, from, toPlayer) {
    if (from === 'yard') state.yard = state.yard.filter((id) => id !== cardId);
    else state.players[from].hand = state.players[from].hand.filter((id) => id !== cardId);
    state.players[toPlayer].hand.push(cardId);
    checkComplete(state, toPlayer);
  }

  function giveCard(state, asker, cardId) {
    const holder = other(asker);
    if (state.players[holder].hand.includes(cardId)) {
      moveCard(state, cardId, holder, asker);
      return 'opponent';
    }
    if (state.yard.includes(cardId)) {
      moveCard(state, cardId, 'yard', asker);
      return 'yard';
    }
    if (state.players[asker].hand.includes(cardId)) return 'already';
    return 'none';
  }

  function drawOne(state, playerId) {
    if (!state.yard.length) return null;
    const cardId = state.yard.shift();
    state.players[playerId].hand.push(cardId);
    checkComplete(state, playerId);
    return cardId;
  }

  function createGame(raw, options) {
    const checked = validateConfig(raw);
    const config = checked.ok ? (checked.config || raw) : null;
    if (!checked.ok) {
      const error = new Error(checked.errors.join(' '));
      error.errors = checked.errors;
      throw error;
    }
    const opts = options || {};
    const rng = opts.rng || Math.random;
    const requested = opts.setIds && opts.setIds.length ? opts.setIds : config.sets.map((set) => set.id);
    const sets = config.sets.filter((set) => requested.includes(set.id));
    if (!sets.length) throw new Error('Choose at least one train.');
    const cards = {};
    const trainCards = [];
    sets.forEach((set) => {
      set.words.forEach((word) => {
        const card = {
          id: set.id + ':' + word.id,
          kind: 'train',
          setId: set.id,
          wordId: word.id,
          text: word.text,
          emoji: word.emoji,
          image: word.image,
          nonword: word.nonword,
          role: word.role
        };
        cards[card.id] = card;
        trainCards.push(card);
      });
    });
    const now = typeof opts.now === 'number' ? opts.now : Date.now();
    const opponent = opts.opponent || config.players.opponent;
    const deck = shuffle(trainCards.map((card) => card.id), rng);
    const dealCount = Math.min(3, Math.floor(deck.length / 2));
    const childHand = [];
    const opponentHand = [];
    for (let index = 0; index < dealCount; index += 1) {
      childHand.push(deck.shift());
      opponentHand.push(deck.shift());
    }
    const levelId = opts.levelId && config.levels.some((level) => level.id === opts.levelId) ? opts.levelId : config.defaultLevel;
    const state = {
      config,
      cards,
      trainCards,
      roundCardIds: trainCards.map((card) => card.id),
      setIds: sets.map((set) => set.id),
      setsById: Object.fromEntries(sets.map((set) => [set.id, set])),
      players: {
        child: { id: 'child', name: config.players.childLabel, hand: childHand, complete: [], computer: false },
        opponent: { id: 'opponent', name: opponent === 'computer' ? config.players.opponentLabel : (opts.opponentLabel || 'Player 2'), hand: opponentHand, complete: [], computer: opponent === 'computer' }
      },
      yard: deck,
      turn: 'child',
      phase: 'choose',
      request: null,
      pendingHeardId: null,
      repair: null,
      mixUpsUsed: 0,
      outcome: '',
      pendingWild: null,
      switchArmed: false,
      lastSet: { child: null, opponent: null },
      wildsAvailable: Object.assign({}, config.wildCards),
      attempts: [],
      repairs: [],
      levelId,
      startedAt: now,
      now,
      endedAt: null,
      endReason: null,
      roundMs: config.roundMinutes * 60 * 1000,
      message: 'Ask for a carriage by saying its word. The listener taps what they heard.'
    };
    checkComplete(state, 'child');
    checkComplete(state, 'opponent');
    if (!legalAsks(state, 'child').length) return advance(state, true);
    return state;
  }

  function legalAsks(state, playerId) {
    const hand = state.players[playerId].hand;
    const held = new Set(hand);
    const setsHeld = new Set();
    hand.forEach((id) => {
      const card = state.cards[id];
      if (card && card.kind === 'train') setsHeld.add(card.setId);
    });
    let ids = state.roundCardIds.filter((id) => {
      const card = state.cards[id];
      return setsHeld.has(card.setId) && !held.has(id) && inHandsOrYard(state, id);
    });
    if (state.turn === playerId && state.switchArmed && state.lastSet[playerId]) {
      const switched = ids.filter((id) => state.cards[id].setId !== state.lastSet[playerId]);
      if (switched.length) ids = switched;
    }
    return ids;
  }

  function playWild(state, wildId) {
    if (state.phase !== 'choose' || state.players[state.turn].computer) return state;
    if (!WILDS[wildId] || !state.wildsAvailable[wildId]) {
      state.message = 'That signal has already been used this round.';
      return state;
    }
    state.wildsAvailable[wildId] = false;
    if (wildId === 'swap-track') {
      state.switchArmed = true;
      state.message = 'Swap Track. The next ask needs a different train.';
    } else {
      state.pendingWild = wildId;
      state.message = WILDS[wildId].name + '. ' + WILDS[wildId].instruction;
    }
    return state;
  }

  function beginAsk(state, playerId, cardId) {
    if (state.phase === 'ended' || state.turn !== playerId) return state;
    if (!state.players[playerId].computer && state.phase !== 'choose') return state;
    if (!legalAsks(state, playerId).includes(cardId)) {
      state.message = state.switchArmed
        ? 'Swap Track: ask for a word from a different train.'
        : 'Choose a missing carriage from a train you already hold.';
      return state;
    }
    const card = state.cards[cardId];
    if (state.switchArmed && state.lastSet[playerId] && card.setId === state.lastSet[playerId]) {
      state.message = 'Only one train is in your hand, so the track stays.';
    }
    state.request = { asker: playerId, cardId, setId: card.setId, wild: state.pendingWild };
    state.pendingWild = null;
    state.switchArmed = false;
    state.lastSet[playerId] = card.setId;
    state.pendingHeardId = null;
    state.repair = null;
    if (state.players[playerId].computer) {
      state.phase = 'respond';
      state.message = state.players[playerId].name + ' asks for ' + card.text + '.';
    } else {
      state.phase = 'say';
    }
    return state;
  }

  function beginListening(state) {
    if (state.phase === 'say') {
      state.phase = 'hear';
      state.message = 'Listener: tap the word you heard.';
    } else if (state.phase === 'repair-say') {
      state.phase = 'repair-hear';
      state.message = 'Listener: tap the word you heard for the repair.';
    }
    state.pendingHeardId = null;
    return state;
  }

  function proposeHeard(state, cardId) {
    if (state.phase !== 'hear' && state.phase !== 'repair-hear') return state;
    if (!state.cards[cardId] || state.cards[cardId].kind !== 'train') return state;
    state.pendingHeardId = cardId;
    state.phase = state.phase === 'hear' ? 'confirm' : 'repair-confirm';
    return state;
  }

  function listenAgain(state) {
    if (state.phase === 'hear' || state.phase === 'confirm') state.phase = 'say';
    else if (state.phase === 'repair-hear' || state.phase === 'repair-confirm') state.phase = 'repair-say';
    state.pendingHeardId = null;
    state.message = 'Listen once more.';
    return state;
  }

  function backToStrategies(state) {
    if (!state.repair || !['repair-show', 'repair-say', 'repair-meaning', 'repair-hear', 'repair-confirm'].includes(state.phase)) return state;
    state.repair.strategyId = null;
    state.repair.strategyLabel = null;
    state.repair.kind = null;
    state.pendingHeardId = null;
    state.phase = 'repair-choose';
    state.message = 'Pick one way to repair.';
    return state;
  }

  function recordAttempt(state, heardId) {
    const intended = state.cards[state.request.cardId];
    const heard = state.cards[heardId];
    state.attempts.push({
      kind: 'ask',
      playerId: state.request.asker,
      intendedWordId: intended.wordId,
      intendedText: intended.text,
      heardWordId: heard.wordId,
      heardText: heard.text,
      setId: intended.setId,
      correct: intended.id === heard.id,
      level: state.levelId,
      wild: state.request.wild,
      at: new Date(state.now).toISOString()
    });
  }

  function confirmHeard(state, accepted) {
    if (!accepted) return listenAgain(state);
    if (state.phase !== 'confirm' && state.phase !== 'repair-confirm') return state;
    const heardId = state.pendingHeardId;
    if (!heardId) return state;
    if (state.phase === 'confirm') return resolveAsk(state, heardId);
    const success = state.cards[heardId].id === state.repair.intendedCardId;
    return recordRepair(state, success, heardId);
  }

  function resolveAsk(state, heardId) {
    const asker = state.request.asker;
    const intended = state.cards[state.request.cardId];
    const heard = state.cards[heardId];
    recordAttempt(state, heardId);
    if (heard.id === intended.id) {
      let got = giveCard(state, asker, intended.id);
      if (got === 'opponent' || got === 'already') {
        state.message = 'Same word. The ' + intended.text + ' carriage moves across.';
        return advance(state, got === 'opponent' || got === 'already');
      }
      const drawn = drawOne(state, asker);
      const lucky = drawn === intended.id;
      state.message = lucky
        ? 'They did not hold it, and you drew ' + intended.text + '.'
        : 'They do not have ' + intended.text + '. You draw one card from the yard.';
      return advance(state, lucky);
    }
    const got = giveCard(state, asker, heard.id);
    const where = {
      opponent: 'That carriage was in their hand, so it moves to you.',
      yard: 'That carriage comes out of the yard to you.',
      already: 'You already hold that carriage.',
      none: 'That carriage is already on a finished train.'
    }[got];
    state.outcome = 'You asked for ' + intended.text + '. The listener heard ' + heard.text + '. ' + where;
    state.pendingHeardId = null;
    if (state.mixUpsUsed >= state.config.maxMixUps) {
      state.message = 'Different word. This game has already had its one mix-up, so play continues.';
      return advance(state, false);
    }
    state.mixUpsUsed += 1;
    const speaker = state.players[other(asker)].computer ? state.players[other(asker)].name : 'Listener';
    state.repair = {
      intendedCardId: intended.id,
      heardCardId: heard.id,
      received: got,
      check: fillCheck(state.config.repairCheck, heard.text, intended.text),
      speaker,
      strategyId: null,
      strategyLabel: null,
      kind: null
    };
    state.phase = 'repair-choose';
    state.message = speaker + ' checks what you meant.';
    return state;
  }

  function chooseRepair(state, strategyId) {
    if (state.phase !== 'repair-choose' || !state.repair) return state;
    const strategy = state.config.repairStrategies.find((item) => item.id === strategyId);
    if (!strategy) return state;
    state.repair.strategyId = strategy.id;
    state.repair.strategyLabel = strategy.label;
    state.repair.kind = strategy.kind;
    state.message = strategy.hint || strategy.label;
    if (strategy.kind === 'show') state.phase = 'repair-show';
    else if (strategy.kind === 'meaning') state.phase = 'repair-meaning';
    else state.phase = 'repair-say';
    return state;
  }

  function recordRepair(state, success, repairHeardId) {
    const intended = state.cards[state.repair.intendedCardId];
    const original = state.cards[state.repair.heardCardId];
    const repairHeard = repairHeardId ? state.cards[repairHeardId] : null;
    state.repairs.push({
      kind: 'repair',
      playerId: state.request.asker,
      strategyId: state.repair.strategyId,
      strategyLabel: state.repair.strategyLabel,
      strategyKind: state.repair.kind,
      success: success === true,
      intendedWordId: intended.wordId,
      intendedText: intended.text,
      heardWordId: original.wordId,
      heardText: original.text,
      repairHeardWordId: repairHeard ? repairHeard.wordId : null,
      repairHeardText: repairHeard ? repairHeard.text : null,
      check: state.repair.check,
      setId: intended.setId,
      level: state.levelId,
      at: new Date(state.now).toISOString()
    });
    if (success) {
      const got = giveCard(state, state.request.asker, intended.id);
      state.outcome = state.repair.kind === 'show'
        ? 'Showing or pointing worked. The listener accepts it.'
        : 'The repair worked.';
      if (got === 'opponent' || got === 'yard') state.outcome += ' The ' + intended.text + ' carriage moves across.';
    } else {
      state.outcome = 'The repair did not get the message across. Play continues.';
    }
    state.message = state.outcome;
    state.repair = null;
    state.pendingHeardId = null;
    return advance(state, false);
  }

  function finishShowRepair(state) {
    if (state.phase !== 'repair-show' || !state.repair || state.repair.kind !== 'show') return state;
    return recordRepair(state, true, null);
  }

  function finishMeaningRepair(state, worked) {
    if (state.phase !== 'repair-meaning' || !state.repair) return state;
    return recordRepair(state, worked === true, null);
  }

  function allTrainsComplete(state) {
    return state.setIds.every((setId) => state.players.child.complete.includes(setId) || state.players.opponent.complete.includes(setId));
  }

  function isTimeUp(state, now) {
    const time = now == null ? state.now : now;
    return state.startedAt != null && time - state.startedAt >= state.roundMs;
  }

  function computerAct(state) {
    const asks = legalAsks(state, 'opponent');
    if (!asks.length) return state;
    const counts = {};
    state.players.opponent.hand.forEach((id) => {
      const card = state.cards[id];
      if (card && card.kind === 'train') counts[card.setId] = (counts[card.setId] || 0) + 1;
    });
    const best = asks.slice().sort((left, right) => {
      const diff = (counts[state.cards[right].setId] || 0) - (counts[state.cards[left].setId] || 0);
      if (diff) return diff;
      return left < right ? -1 : 1;
    })[0];
    return beginAsk(state, 'opponent', best);
  }

  function advance(state, bonus) {
    if (!bonus) state.turn = other(state.turn);
    state.request = null;
    state.pendingHeardId = null;
    for (let guard = 0; guard < 8; guard += 1) {
      if (state.phase === 'ended') return state;
      if (isTimeUp(state)) return endRound(state, 'time');
      if (allTrainsComplete(state)) return endRound(state, 'all-trains');
      const playerId = state.turn;
      if (!legalAsks(state, playerId).length) {
        if (state.yard.length && !state.players[playerId].hand.some((id) => state.cards[id].kind === 'train' && state.setIds.includes(state.cards[id].setId))) {
          drawOne(state, playerId);
          state.message = state.players[playerId].name + ' draws one card.';
          if (legalAsks(state, playerId).length) break;
        }
        state.turn = other(playerId);
        continue;
      }
      if (state.players[playerId].computer) return computerAct(state);
      state.phase = 'choose';
      state.request = null;
      return state;
    }
    if (state.players[state.turn].computer && legalAsks(state, state.turn).length) return computerAct(state);
    if (!state.players[state.turn].computer && legalAsks(state, state.turn).length) {
      state.phase = 'choose';
      return state;
    }
    return endRound(state, 'no-moves');
  }

  function answerAsk(state, saysHasIt) {
    if (state.phase !== 'respond' || !state.request) return state;
    const asker = state.request.asker;
    const answerer = other(asker);
    const cardId = state.request.cardId;
    const has = state.players[answerer].hand.includes(cardId);
    if (saysHasIt !== has) {
      state.message = has
        ? 'That carriage is in your hand. It can move across.'
        : 'That carriage is not in your hand. Check again.';
      return state;
    }
    if (has) {
      moveCard(state, cardId, answerer, asker);
      state.message = 'The ' + state.cards[cardId].text + ' carriage moves to ' + state.players[asker].name + '.';
      return advance(state, true);
    }
    const drawn = drawOne(state, asker);
    state.message = 'Not in this hand. ' + state.players[asker].name + ' draws one card.';
    return advance(state, drawn === cardId);
  }

  function setLevel(state, levelId) {
    if (!state.config.levels.some((level) => level.id === levelId)) return state;
    state.levelId = levelId;
    return state;
  }

  function endRound(state, reason, now) {
    if (state.phase === 'ended') return state;
    state.phase = 'ended';
    state.endReason = reason || 'stopped';
    state.endedAt = typeof now === 'number' ? now : state.now;
    state.now = state.endedAt;
    state.request = null;
    state.message = 'Round finished.';
    return state;
  }

  function tick(state, now) {
    state.now = now;
    if (state.phase === 'choose' && isTimeUp(state, now)) return endRound(state, 'time', now);
    return state;
  }

  function levelById(state, levelId) {
    return state.config.levels.find((level) => level.id === levelId) || state.config.levels[0];
  }

  function promptFor(state) {
    const level = levelById(state, state.levelId);
    if (state.phase === 'repair-choose' && state.repair) return state.repair.check;
    const lines = [];
    if (state.repair && state.repair.strategyId) {
      const strategy = state.config.repairStrategies.find((item) => item.id === state.repair.strategyId);
      if (strategy && strategy.hint) lines.push(strategy.hint);
    }
    lines.push(level.prompt);
    if (state.request && state.request.wild && WILDS[state.request.wild]) lines.push(WILDS[state.request.wild].instruction);
    else if (state.pendingWild && WILDS[state.pendingWild]) lines.push(WILDS[state.pendingWild].instruction);
    return lines.join(' ');
  }

  function buildResults(state, now) {
    const end = state.endedAt != null ? state.endedAt : (typeof now === 'number' ? now : state.now);
    const words = state.trainCards.map((card) => ({
      id: card.wordId,
      cardId: card.id,
      setId: card.setId,
      text: card.text,
      nonword: card.nonword,
      attempts: 0,
      correct: 0,
      incorrect: 0,
      repairAttempts: 0,
      repairSuccesses: 0
    }));
    const byCard = Object.fromEntries(words.map((word) => [word.cardId, word]));
    state.attempts.forEach((attempt) => {
      const word = byCard[attempt.setId + ':' + attempt.intendedWordId];
      if (!word) return;
      word.attempts += 1;
      if (attempt.correct) word.correct += 1;
      else word.incorrect += 1;
    });
    state.repairs.forEach((repair) => {
      const word = byCard[repair.setId + ':' + repair.intendedWordId];
      if (!word) return;
      word.repairAttempts += 1;
      if (repair.success) word.repairSuccesses += 1;
    });
    const repairSuccesses = state.repairs.filter((repair) => repair.success).length;
    const repairByStrategy = {};
    state.repairs.forEach((repair) => {
      const row = repairByStrategy[repair.strategyId] || { id: repair.strategyId, label: repair.strategyLabel, attempts: 0, successes: 0 };
      row.attempts += 1;
      if (repair.success) row.successes += 1;
      repairByStrategy[repair.strategyId] = row;
    });
    return {
      gameId: 'all-aboard',
      configId: state.config.id,
      version: '1.0.0',
      level: state.levelId,
      durationMs: Math.max(0, end - state.startedAt),
      startedAt: new Date(state.startedAt).toISOString(),
      endedAt: new Date(end).toISOString(),
      outcome: state.endReason,
      attempts: state.attempts.slice(),
      attemptCount: state.attempts.length,
      correct: state.attempts.filter((attempt) => attempt.correct).length,
      incorrect: state.attempts.filter((attempt) => !attempt.correct).length,
      repairs: state.repairs.slice(),
      repairAttempts: state.repairs.length,
      repairSuccesses,
      repairByStrategy,
      words,
      trainsCompleted: {
        child: state.players.child.complete.slice(),
        opponent: state.players.opponent.complete.slice()
      }
    };
  }

  function resultsMessage(state, now, resultsOrigin) {
    return {
      source: 'all-aboard',
      type: 'all-aboard-results',
      resultsOrigin: resultsOrigin || (state.config && state.config.resultsOrigin) || '*',
      payload: buildResults(state, now)
    };
  }

  function selectConfigSource(sources) {
    const found = sources || {};
    if (found.injected) return { source: 'init', config: found.injected };
    if (found.fetched) return { source: 'url', config: found.fetched };
    return { source: 'embedded', config: found.embedded };
  }

  function hearChoices(state) {
    const intended = state.request && state.cards[state.request.cardId];
    const primary = [];
    const secondary = [];
    state.trainCards.forEach((card) => {
      if (intended && card.setId === intended.setId) primary.push(card);
      else secondary.push(card);
    });
    return { primary, secondary };
  }

  return {
    PRACTICE_LEVELS,
    DEFAULT_REPAIR_CHECK,
    DEFAULT_REPAIR_STRATEGIES,
    WILDS,
    validateConfig,
    normaliseConfig,
    createGame,
    legalAsks,
    playWild,
    beginAsk,
    beginListening,
    proposeHeard,
    confirmHeard,
    listenAgain,
    chooseRepair,
    finishShowRepair,
    finishMeaningRepair,
    backToStrategies,
    answerAsk,
    setLevel,
    endRound,
    tick,
    isTimeUp,
    promptFor,
    buildResults,
    resultsMessage,
    selectConfigSource,
    hearChoices,
    onResults: null
  };
});
