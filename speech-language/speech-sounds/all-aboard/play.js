/* All Aboard! page controller. The only network request is an optional
   ?config= URL. Results are handed to the host and are not stored. */
(function () {
  'use strict';
  const engine = window.AllAboard;
  const $ = (id) => document.getElementById(id);
  let config = null;
  let configErrors = [];
  let configSource = 'embedded';
  let state = null;
  let pendingConfig = null;
  let published = false;
  let passOpen = false;
  let timer = null;
  let musicOn = false;
  let audioCtx = null;
  let lastPhase = '';

  function h(tag, props, children) {
    const el = document.createElement(tag);
    Object.entries(props || {}).forEach(([key, value]) => {
      if (value == null || value === false) return;
      if (key === 'class') el.className = value;
      else if (key === 'text') el.textContent = value;
      else if (key === 'on' && typeof value === 'function') el.addEventListener('click', value);
      else el.setAttribute(key, String(value));
    });
    (children || []).forEach((child) => { if (child) el.append(child); });
    return el;
  }

  function safeImage(src) {
    if (!src || typeof src !== 'string') return '';
    if (/^https:\/\/[^\s]+$/.test(src)) return src;
    if (/^(?:[A-Za-z0-9._-]+\/)*[A-Za-z0-9._-]+\.(?:png|jpe?g|gif|webp|svg)$/.test(src)) return src;
    return '';
  }

  function inkOn(hex) {
    const value = parseInt(String(hex || '').slice(1), 16);
    if (!Number.isFinite(value)) return '#1b2430';
    const r = (value >> 16) & 255;
    const g = (value >> 8) & 255;
    const b = value & 255;
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 > 0.62 ? '#1b2430' : '#fffdf8';
  }

  function applyTheme() {
    const theme = (config && config.theme) || {};
    const map = { trainColour: '--train', carriageColour: '--carriage', background: '--bg', ink: '--ink', accent: '--accent', card: '--card', focus: '--focus' };
    Object.entries(map).forEach(([key, cssName]) => {
      if (theme[key]) document.documentElement.style.setProperty(cssName, theme[key]);
    });
  }

  function picture(kind) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 120 90');
    svg.setAttribute('aria-hidden', 'true');
    const add = (name, attrs) => {
      const node = document.createElementNS('http://www.w3.org/2000/svg', name);
      Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
      svg.append(node);
    };
    if (kind === 'show') {
      add('rect', { x: '58', y: '16', width: '46', height: '58', rx: '8', fill: '#fffdf8', stroke: '#1b2430', 'stroke-width': '4' });
      add('path', { d: 'M18 62c8-18 16-28 28-24 4 10-2 18-8 24', fill: '#f8d7cf', stroke: '#1b2430', 'stroke-width': '4', 'stroke-linecap': 'round' });
      add('path', { d: 'M34 58l22-8', fill: 'none', stroke: '#9f1d1d', 'stroke-width': '6', 'stroke-linecap': 'round' });
    } else if (kind === 'meaning') {
      add('rect', { x: '8', y: '14', width: '46', height: '34', rx: '10', fill: '#fffdf8', stroke: '#1b2430', 'stroke-width': '4' });
      add('rect', { x: '66', y: '40', width: '46', height: '34', rx: '10', fill: '#f8d7cf', stroke: '#1b2430', 'stroke-width': '4' });
      add('path', { d: 'M54 30h14M68 30l-6-6M68 30l-6 6', fill: 'none', stroke: '#0e6b4c', 'stroke-width': '4', 'stroke-linecap': 'round' });
    } else {
      add('rect', { x: '16', y: '12', width: '88', height: '52', rx: '16', fill: '#fffdf8', stroke: '#1b2430', 'stroke-width': '4' });
      add('path', { d: 'M36 64l-8 14 20-14', fill: '#fffdf8', stroke: '#1b2430', 'stroke-width': '4' });
      add('circle', { cx: '60', cy: '38', r: '8', fill: '#9f1d1d' });
    }
    return svg;
  }

  function cardFace(card, className) {
    const button = h('div', { class: 'cardface ' + (className || '') + (card.role === 'engine' ? ' engine' : '') });
    const image = safeImage(card.image);
    if (image) {
      const img = h('img', { src: image, alt: '' });
      button.append(img);
    } else button.append(h('span', { class: 'emoji', text: card.emoji || '🚃' }));
    button.append(h('strong', { text: card.text }));
    if (card.nonword) button.append(h('small', { text: 'Not a real word' }));
    button.append(h('small', { text: card.role === 'engine' ? 'Engine' : 'Carriage' }));
    return button;
  }

  function wordButton(card, onClick, label) {
    const button = h('button', { type: 'button', class: 'choice', on: onClick });
    button.append(cardFace(card));
    if (label) button.append(h('span', { class: 'action-label', text: label }));
    return button;
  }

  function strategyButton(strategy) {
    const button = h('button', {
      type: 'button',
      class: 'strategy',
      on: () => act((current) => engine.chooseRepair(current, strategy.id))
    });
    const image = safeImage(strategy.image);
    const frame = h('span', { class: 'strategy-art' });
    if (image) frame.append(h('img', { src: image, alt: '' }));
    else frame.append(picture(strategy.kind));
    button.append(frame);
    button.append(h('strong', { text: strategy.label }));
    if (strategy.hint) button.append(h('small', { text: strategy.hint }));
    return button;
  }

  function act(change) {
    const previousTurn = state && state.turn;
    const previousPhase = state && state.phase;
    try {
      state = change(state);
    } catch (error) {
      $('live').textContent = error.message;
      return;
    }
    const twoHumans = state && !state.players.opponent.computer;
    if (!(twoHumans && state.phase === 'choose')) passOpen = false;
    else if (state.turn !== previousTurn || previousPhase !== 'choose') passOpen = true;
    render();
  }

  function publish(current) {
    const message = engine.resultsMessage(current, Date.now(), config && config.resultsOrigin);
    if (typeof engine.onResults === 'function') {
      try { engine.onResults(message.payload); } catch (error) { /* The host's save must not break play. */ }
    }
    window.dispatchEvent(new CustomEvent('all-aboard-results', { detail: message }));
    window.postMessage(message, window.location.origin);
    if (window.parent !== window) window.parent.postMessage(message, message.resultsOrigin || '*');
  }

  function clockText() {
    if (!state) return '';
    const left = Math.max(0, state.roundMs - (Date.now() - state.startedAt));
    const seconds = Math.ceil(left / 1000);
    return Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0');
  }

  function ensureTimer() {
    if (timer) return;
    timer = setInterval(() => {
      if (!state || state.phase === 'ended') return;
      const before = state.phase;
      state = engine.tick(state, Date.now());
      if (state.phase !== before) render();
      else {
        const clock = $('clock');
        if (clock) clock.textContent = clockText();
      }
    }, 1000);
  }

  function stopTimer() {
    clearInterval(timer);
    timer = null;
  }

  function fillLevel() {
    const select = $('level');
    const levels = (config && config.levels) || engine.PRACTICE_LEVELS;
    const selected = state ? state.levelId : (config && config.defaultLevel) || levels[0].id;
    select.replaceChildren();
    levels.forEach((level) => {
      const option = h('option', { value: level.id, text: level.label });
      if (level.id === selected) option.selected = true;
      select.append(option);
    });
  }

  function renderPrint() {
    const sheet = $('print-sheet');
    sheet.replaceChildren();
    if (!config) return;
    sheet.append(h('h1', { text: config.title || 'All Aboard!' }));
    sheet.append(h('p', { text: 'Playing cards for All Aboard. Companion task cards for this game are printed separately and are not part of this page.' }));
    config.sets.forEach((set) => {
      const block = h('section', {});
      block.append(h('h2', { text: set.name }));
      const grid = h('div', { class: 'sheet' });
      set.words.forEach((word) => {
        const card = h('article', { class: 'paper-card' + (word.role === 'engine' ? ' engine' : '') });
        card.append(h('p', { class: 'role', text: word.role === 'engine' ? 'Engine' : 'Carriage' }));
        card.append(h('p', { class: 'emoji', text: word.emoji || '' }));
        card.append(h('p', { class: 'word', text: word.text }));
        if (word.nonword) card.append(h('p', { text: 'Not a real word' }));
        card.append(h('p', { text: set.name }));
        grid.append(card);
      });
      block.append(grid);
      sheet.append(block);
    });
  }

  function renderSetup() {
    const setup = $('setup');
    setup.hidden = false;
    $('play').hidden = true;
    $('done').hidden = true;
    $('end').hidden = true;
    $('clock').hidden = true;
    setup.replaceChildren();
    setup.append(h('p', { class: 'lead', text: 'Collect a whole train. A train is one contrast set: the first word is the engine and the others are carriages.' }));
    setup.append(h('ol', { class: 'steps' }, [
      h('li', { text: 'Ask for a missing carriage by saying its word.' }),
      h('li', { text: 'The listener taps the word they heard. There is no speech recognition.' }),
      h('li', { text: 'A different word moves that carriage. Then there is one polite check and one repair.' })
    ]));
    if (configErrors.length) {
      const box = h('div', { class: 'banner' });
      box.append(h('p', { text: 'These settings could not be used.' }));
      configErrors.forEach((error) => box.append(h('p', { text: error })));
      box.append(h('button', { type: 'button', class: 'primary', text: 'Use the demo trains', on: () => useConfig(JSON.parse($('embedded-config').textContent), 'embedded') }));
      setup.append(box);
    }
    if (pendingConfig) setup.append(h('p', { class: 'banner', text: 'New settings are waiting for the next round.' }));
    if (!config) return;
    const form = h('div', { class: 'panel' });
    form.append(h('p', { class: 'hint', text: 'Settings from ' + ({ embedded: 'the built-in demo', url: 'a config link', init: 'the host app' }[configSource] || configSource) + '.' }));
    form.append(h('h2', { text: 'Trains this round' }));
    config.sets.forEach((set) => {
      const label = h('label', { class: 'tick' });
      const input = h('input', { type: 'checkbox', value: set.id });
      input.checked = true;
      label.append(input);
      const words = set.words.map((word) => word.text + (word.nonword ? ' (not a real word)' : '')).join(' · ');
      label.append(h('span', { text: set.name + ' — ' + words }));
      form.append(label);
    });
    form.append(h('h2', { text: 'Who has the other cards?' }));
    [{ id: 'computer', label: 'Station guard (this device)' }, { id: 'human', label: 'Another person on this device' }].forEach((item) => {
      const label = h('label', { class: 'tick' });
      const input = h('input', { type: 'radio', name: 'opponent', value: item.id });
      input.checked = item.id === (config.players.opponent || 'computer');
      label.append(input, h('span', { text: item.label }));
      form.append(label);
    });
    form.append(h('p', { class: 'hint', text: 'A round is about ' + config.roundMinutes + ' minutes. Level ' + ($('level').selectedOptions[0] ? $('level').selectedOptions[0].textContent : '') + ' changes the words on the card.' }));
    form.append(h('button', { type: 'button', class: 'primary', text: 'All aboard', on: startRound }));
    setup.append(form);
  }

  function startRound() {
    if (!config) return;
    const setIds = [...document.querySelectorAll('#setup input[type="checkbox"]:checked')].map((input) => input.value);
    const opponent = (document.querySelector('#setup input[name="opponent"]:checked') || {}).value || 'computer';
    if (!setIds.length) {
      $('live').textContent = 'Choose at least one train.';
      return;
    }
    published = false;
    passOpen = false;
    try {
      state = engine.createGame(config, { setIds, opponent, levelId: $('level').value, now: Date.now() });
    } catch (error) {
      $('live').textContent = error.message;
      return;
    }
    if (!state.players.opponent.computer && state.phase === 'choose') passOpen = true;
    ensureTimer();
    render();
  }

  function trainsFor(playerId) {
    const wrap = h('div', {});
    wrap.append(h('h2', { text: 'Your train' }));
    const legal = new Set(engine.legalAsks(state, playerId));
    const player = state.players[playerId];
    state.setIds.forEach((setId) => {
      const set = state.setsById[setId];
      if (player.complete.includes(setId)) {
        wrap.append(h('p', { class: 'complete', text: set.name + ' is complete.' }));
        return;
      }
      const row = h('div', { class: 'train' });
      set.words.forEach((word) => {
        const card = state.cards[set.id + ':' + word.id];
        if (player.hand.includes(card.id)) row.append(cardFace(card, 'held'));
        else if (legal.has(card.id)) row.append(wordButton(card, () => act((current) => engine.beginAsk(current, playerId, card.id)), 'Ask'));
      });
      if (row.childElementCount) {
        wrap.append(h('h3', { text: set.name }));
        wrap.append(row);
      }
    });
    return wrap;
  }

  function wildBar() {
    const bar = h('div', { class: 'wilds' });
    Object.values(engine.WILDS).forEach((wild) => {
      if (!state.wildsAvailable[wild.id]) return;
      bar.append(h('button', {
        type: 'button',
        class: 'wild' + (state.pendingWild === wild.id || (wild.id === 'swap-track' && state.switchArmed) ? ' on' : ''),
        text: wild.emoji + ' ' + wild.name,
        on: () => act((current) => engine.playWild(current, wild.id))
      }));
    });
    return bar.childElementCount ? bar : null;
  }

  function hearScreen(repair) {
    const box = h('div', { class: 'listener' });
    box.append(h('h2', { text: 'What did you hear?' }));
    box.append(h('p', { text: 'Listener: tap the word you heard. The asked-for word is hidden on this step.' }));
    const choices = engine.hearChoices(state);
    const primary = h('div', { class: 'choices' });
    choices.primary.forEach((card) => primary.append(wordButton(card, () => act((current) => engine.proposeHeard(current, card.id)))));
    box.append(primary);
    if (choices.secondary.length) {
      box.append(h('h3', { text: 'A different train' }));
      const secondary = h('div', { class: 'choices' });
      choices.secondary.forEach((card) => secondary.append(wordButton(card, () => act((current) => engine.proposeHeard(current, card.id)))));
      box.append(secondary);
    }
    box.append(h('button', { type: 'button', class: 'secondary', text: 'I did not catch it', on: () => act((current) => engine.listenAgain(current)) }));
    if (repair) box.append(h('button', { type: 'button', class: 'secondary', text: 'Pick a different repair', on: () => act((current) => engine.backToStrategies(current)) }));
    return box;
  }

  function confirmScreen(repair) {
    const heard = state.cards[state.pendingHeardId];
    const box = h('div', { class: 'listener' });
    box.append(h('h2', { text: 'Did you hear this word?' }));
    box.append(cardFace(heard, 'hero'));
    const row = h('div', { class: 'row' });
    row.append(h('button', { type: 'button', class: 'primary', text: 'Yes, I heard ' + heard.text, on: () => act((current) => engine.confirmHeard(current, true)) }));
    row.append(h('button', { type: 'button', class: 'secondary', text: 'No, let me listen again', on: () => act((current) => engine.confirmHeard(current, false)) }));
    box.append(row);
    if (repair) box.append(h('button', { type: 'button', class: 'secondary', text: 'Pick a different repair', on: () => act((current) => engine.backToStrategies(current)) }));
    return box;
  }

  function renderPlay() {
    $('setup').hidden = true;
    $('done').hidden = true;
    $('play').hidden = false;
    $('end').hidden = false;
    $('clock').hidden = false;
    $('clock').textContent = clockText();
    const play = $('play');
    play.replaceChildren();
    if (state.outcome) play.append(h('p', { class: 'banner', text: state.outcome }));
    if (passOpen) {
      const who = state.players[state.turn].name;
      play.append(h('div', { class: 'cover' }, [
        h('h2', { text: 'Pass the tablet to ' + who }),
        h('p', { text: 'Hide the carriages until it is their turn.' }),
        h('button', { type: 'button', class: 'primary', text: who + ' is ready', on: () => { passOpen = false; render(); } })
      ]));
      return;
    }
    const phase = state.phase;
    if (phase === 'choose') {
      const playerId = state.turn;
      const otherId = playerId === 'child' ? 'opponent' : 'child';
      play.append(h('p', { class: 'prompt', text: engine.promptFor(state) }));
      if (state.message) play.append(h('p', { text: state.message }));
      play.append(trainsFor(playerId));
      if (!state.players[playerId].computer) play.append(wildBar());
      play.append(h('p', { class: 'hint', text: state.players[otherId].name + ' has ' + state.players[otherId].hand.length + ' cards. Yard: ' + state.yard.length + '.' }));
      return;
    }
    if (phase === 'say' || phase === 'repair-say') {
      const card = state.cards[phase === 'say' ? state.request.cardId : state.repair.intendedCardId];
      play.append(h('p', { class: 'prompt', text: engine.promptFor(state) }));
      play.append(cardFace(card, 'hero'));
      play.append(h('button', {
        type: 'button',
        class: 'primary',
        text: phase === 'say' ? 'I have said it' : 'I have said the key word',
        on: () => act((current) => engine.beginListening(current))
      }));
      if (phase === 'repair-say') play.append(h('button', { type: 'button', class: 'secondary', text: 'Pick a different repair', on: () => act((current) => engine.backToStrategies(current)) }));
      return;
    }
    if (phase === 'hear') { play.append(hearScreen(false)); return; }
    if (phase === 'repair-hear') { play.append(hearScreen(true)); return; }
    if (phase === 'confirm') { play.append(confirmScreen(false)); return; }
    if (phase === 'repair-confirm') { play.append(confirmScreen(true)); return; }
    if (phase === 'repair-choose') {
      play.append(h('h2', { text: state.repair.speaker + ' says' }));
      play.append(h('p', { class: 'check-line', text: state.repair.check }));
      const pair = h('div', { class: 'choices' });
      pair.append(cardFace(state.cards[state.repair.heardCardId]));
      pair.append(cardFace(state.cards[state.repair.intendedCardId]));
      play.append(pair);
      play.append(h('h2', { text: 'Pick one way to repair' }));
      const strategies = h('div', { class: 'strategies' });
      state.config.repairStrategies.forEach((strategy) => strategies.append(strategyButton(strategy)));
      play.append(strategies);
      return;
    }
    if (phase === 'repair-show') {
      const card = state.cards[state.repair.intendedCardId];
      play.append(h('p', { class: 'prompt', text: engine.promptFor(state) }));
      play.append(cardFace(card, 'hero'));
      play.append(h('button', { type: 'button', class: 'primary', text: 'I pointed to ' + card.text, on: () => act((current) => engine.finishShowRepair(current)) }));
      play.append(h('button', { type: 'button', class: 'secondary', text: 'Pick a different repair', on: () => act((current) => engine.backToStrategies(current)) }));
      return;
    }
    if (phase === 'repair-meaning') {
      play.append(h('p', { class: 'prompt', text: engine.promptFor(state) }));
      play.append(h('p', { text: 'Listener: did the new way make the meaning clear?' }));
      const row = h('div', { class: 'row' });
      row.append(h('button', { type: 'button', class: 'primary', text: 'Yes, the meaning is clear', on: () => act((current) => engine.finishMeaningRepair(current, true)) }));
      row.append(h('button', { type: 'button', class: 'secondary', text: 'Not yet', on: () => act((current) => engine.finishMeaningRepair(current, false)) }));
      play.append(row);
      play.append(h('button', { type: 'button', class: 'secondary', text: 'Pick a different repair', on: () => act((current) => engine.backToStrategies(current)) }));
      return;
    }
    if (phase === 'respond') {
      const card = state.cards[state.request.cardId];
      play.append(h('h2', { text: state.players[state.request.asker].name + ' asks for' }));
      play.append(cardFace(card, 'hero'));
      const row = h('div', { class: 'row' });
      row.append(h('button', { type: 'button', class: 'primary', text: 'I have ' + card.text, on: () => act((current) => engine.answerAsk(current, true)) }));
      row.append(h('button', { type: 'button', class: 'secondary', text: 'Not in my hand', on: () => act((current) => engine.answerAsk(current, false)) }));
      play.append(row);
      return;
    }
    play.append(h('p', { text: state.message || 'Ready.' }));
  }

  function renderDone() {
    stopTimer();
    $('setup').hidden = true;
    $('play').hidden = true;
    $('done').hidden = false;
    $('end').hidden = true;
    const results = engine.buildResults(state, Date.now());
    const done = $('done');
    done.replaceChildren();
    done.append(h('h2', { text: 'The train is in' }));
    done.append(h('p', { text: 'Level ' + results.level + ' · ' + Math.round(results.durationMs / 1000) + ' seconds · ' + (results.outcome || 'finished') }));
    const stats = h('div', { class: 'stats' });
    [
      [results.attemptCount, 'Asks'],
      [results.correct, 'Same word'],
      [results.incorrect, 'Different word'],
      [results.repairAttempts, 'Repairs'],
      [results.repairSuccesses, 'Repairs that worked']
    ].forEach(([value, label]) => {
      const stat = h('div', { class: 'stat' });
      stat.append(h('strong', { text: String(value) }), h('span', { text: label }));
      stats.append(stat);
    });
    done.append(stats);
    if (results.repairs.length) {
      done.append(h('h3', { text: 'Repair' }));
      results.repairs.forEach((repair) => {
        done.append(h('p', { text: repair.strategyLabel + ' · ' + (repair.success ? 'worked' : 'did not get the message across') + ' · meant ' + repair.intendedText + ', heard ' + repair.heardText }));
      });
    }
    done.append(h('p', { class: 'hint', text: 'If a family app is hosting this page, the results were handed back just now. This game does not save them.' }));
    const row = h('div', { class: 'row' });
    row.append(h('button', { type: 'button', class: 'primary', text: 'Play this round again', on: () => { state = null; published = false; render(); } }));
    done.append(row);
  }

  function render() {
    applyTheme();
    renderPrint();
    fillLevel();
    $('music').setAttribute('aria-pressed', musicOn ? 'true' : 'false');
    $('music').textContent = musicOn ? 'Music on' : 'Music off';
    if (state && state.phase === 'say' && lastPhase !== 'say' && state.request && state.request.wild === 'disco') dance();
    lastPhase = state ? state.phase : '';
    if (state && state.phase === 'ended' && !published) {
      published = true;
      publish(state);
    }
    $('live').textContent = state ? (state.message || '') : (configErrors[0] || '');
    if (!state) { renderSetup(); return; }
    if (state.phase === 'ended') { renderDone(); return; }
    renderPlay();
  }

  function dance() {
    if (!musicOn) return;
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) return;
    if (!audioCtx) audioCtx = new Context();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    [523, 659, 784, 659].forEach((freq, index) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      gain.gain.value = 0.04;
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      const start = audioCtx.currentTime + index * 0.16;
      osc.start(start);
      osc.stop(start + 0.14);
    });
  }

  function useConfig(raw, source) {
    const checked = engine.validateConfig(raw);
    configSource = source;
    if (!checked.ok) {
      config = null;
      configErrors = checked.errors;
    } else {
      config = checked.config;
      configErrors = [];
      musicOn = config.music === true;
    }
    if (!state) render();
  }

  function acceptExternal(raw) {
    if (state && state.phase !== 'ended') {
      pendingConfig = raw;
      $('live').textContent = 'New settings will load on the next round.';
      return;
    }
    pendingConfig = null;
    state = null;
    published = false;
    useConfig(raw, 'init');
  }

  async function boot() {
    const embedded = JSON.parse($('embedded-config').textContent);
    const injected = window.AllAboardConfig || null;
    let fetched = null;
    if (!injected) {
      const url = new URLSearchParams(location.search).get('config');
      if (url) {
        try {
          const response = await fetch(url);
          if (!response.ok) throw new Error('The config link did not load.');
          fetched = await response.json();
        } catch (error) {
          configErrors = [error.message + ' The demo trains are ready instead.'];
        }
      }
    }
    const selected = engine.selectConfigSource({ injected, fetched, embedded });
    const checked = engine.validateConfig(selected.config);
    configSource = selected.source;
    if (!checked.ok) {
      config = null;
      configErrors = configErrors.concat(checked.errors);
    } else {
      config = checked.config;
      musicOn = config.music === true;
    }
    engine.start = acceptExternal;
    window.addEventListener('message', (event) => {
      const data = event.data;
      if (!data || data.type !== 'all-aboard-config' || !data.config || typeof data.config !== 'object') return;
      acceptExternal(data.config);
    });
    $('level').addEventListener('change', () => {
      if (state && state.phase !== 'ended') act((current) => engine.setLevel(current, $('level').value));
    });
    $('music').addEventListener('click', () => { musicOn = !musicOn; if (musicOn) dance(); render(); });
    $('print').addEventListener('click', () => window.print());
    $('end').addEventListener('click', () => { if (state && state.phase !== 'ended') act((current) => engine.endRound(current, 'stopped', Date.now())); });
    render();
  }

  boot();
})();
