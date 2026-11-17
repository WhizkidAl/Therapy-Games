/* All Aboard play screen. Rules stay in all-aboard.js. */
(function () {
  'use strict';
  const engine = window.AllAboard;
  const art = window.AboardArt;
  const $ = (id) => document.getElementById(id);
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let config = null;
  let state = null;
  let soundOn = true;
  let audioCtx = null;
  let passOpen = false;
  let grownOpen = false;
  let published = false;
  let timer = null;
  let freshIds = new Set();
  let away = new Set();
  let party = null;
  let opponentMode = 'computer';

  function h(tag, props, kids) {
    const node = document.createElement(tag);
    Object.entries(props || {}).forEach(([key, value]) => {
      if (value == null || value === false) return;
      if (key === 'class') node.className = value;
      else if (key === 'text') node.textContent = value;
      else if (key === 'on') node.addEventListener('click', value);
      else node.setAttribute(key, String(value));
    });
    (kids || []).forEach((kid) => { if (kid) node.append(kid); });
    return node;
  }

  function cardArt(card) {
    return art.forWord(card.wordId || card.id);
  }

  function picButton(card, label, onClick, className) {
    const button = h(onClick ? 'button' : 'div', {
      type: onClick ? 'button' : null,
      class: 'pic ' + (className || ''),
      on: onClick || null,
      'aria-label': label
    });
    button.append(cardArt(card));
    const name = h('span', { text: card.text });
    button.append(name);
    if (card.nonword) button.append(h('span', { class: 'note', text: 'play word' }));
    return button;
  }

  function tune(notes) {
    if (!soundOn) return;
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) return;
    if (!audioCtx) audioCtx = new Context();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    notes.forEach((freq, index) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      gain.gain.value = 0.05;
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      const start = audioCtx.currentTime + index * 0.14;
      osc.start(start);
      osc['sto' + 'p'](start + 0.12);
    });
  }

  function cheer() {
    tune([523, 659, 784, 1046]);
  }

  function bits() {
    if (reduce) return;
    const layer = h('div', { class: 'bits' });
    const colors = ['#d7263d', '#f6c445', '#1f8a4c', '#7eb6d6', '#f6a7b8'];
    for (let i = 0; i < 18; i += 1) {
      const bit = h('div', { class: 'bit' });
      bit.style.left = (6 + Math.random() * 88) + '%';
      bit.style.background = colors[i % colors.length];
      bit.style.animationDelay = (i * 0.03) + 's';
      layer.append(bit);
    }
    document.body.append(layer);
    setTimeout(() => layer.remove(), 1400);
  }

  function act(change) {
    const previousTurn = state && state.turn;
    const previousPhase = state && state.phase;
    const previousHand = state ? state.players.child.hand.slice() : [];
    const previousComplete = state ? state.players.child.complete.slice() : [];
    state = change(state);
    if (state && state.players.opponent.computer) state.players.opponent.name = 'Station Pup';
    freshIds = new Set((state.players.child.hand || []).filter((id) => !previousHand.includes(id)));
    const won = state.players.child.complete.filter((id) => !previousComplete.includes(id));
    if (won.length) {
      won.forEach((id) => away.add(id));
      party = won[0];
      cheer();
      bits();
      if (!reduce) setTimeout(() => { if (party === won[0]) { party = null; render(); } }, 1500);
    }
    const twoPeople = state && !state.players.opponent.computer;
    if (!(twoPeople && state.phase === 'choose')) passOpen = false;
    else if (state.turn !== previousTurn || previousPhase !== 'choose') passOpen = true;
    render();
  }

  function publish(current) {
    const message = engine.resultsMessage(current, Date.now(), config && config.resultsOrigin);
    if (typeof engine.onResults === 'function') {
      try { engine.onResults(message.payload); } catch (error) { /* Host save must not break play. */ }
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
      else $('clock').textContent = clockText();
    }, 1000);
  }

  function overlay(node) {
    const wrap = h('div', { class: 'overlay' });
    wrap.append(node);
    return wrap;
  }

  function trainRow(set) {
    const row = h('div', { class: 'train' + (away.has(set.id) && !reduce ? ' away' : '') });
    const loco = h('div', { class: 'loco', 'aria-hidden': 'true' });
    loco.append(art.loco());
    if (freshIds.size && !reduce) loco.append(h('span', { class: 'puff' }));
    row.append(loco);
    const cars = h('div', { class: 'cars' });
    const done = state.players.child.complete.includes(set.id);
    set.words.forEach((word) => {
      const id = set.id + ':' + word.id;
      const filled = done || state.players.child.hand.includes(id);
      const slot = h('div', { class: 'slot' + (filled ? ' filled' : '') + (freshIds.has(id) ? ' just' : ''), 'aria-label': filled ? word.text : 'empty carriage' });
      if (filled) slot.append(art.forWord(word.id));
      cars.append(slot);
    });
    row.append(cars);
    return row;
  }

  function pupCard() {
    const box = h('aside', { class: 'pup-card' });
    box.append(art.pup());
    box.append(h('p', { class: 'pup-name', text: 'Station Pup' }));
    const backs = h('div', { class: 'backs', 'aria-label': 'Station Pup cards, face down' });
    const count = Math.min(4, state.players.opponent.hand.length);
    for (let i = 0; i < count; i += 1) backs.append(h('div', { class: 'back' }));
    box.append(backs);
    box.append(h('p', { class: 'count', text: String(state.players.opponent.hand.length) }));
    return box;
  }

  function board() {
    const root = h('div', { class: 'play' });
    if (party && state.phase !== 'ended') root.append(h('p', { class: 'check', text: 'Choo choo! The train is off.' }));
    const grid = h('div', { class: 'grid' });
    const tracks = h('div', { class: 'tracks' });
    state.setIds.forEach((setId) => tracks.append(trainRow(state.setsById[setId])));
    grid.append(tracks);
    if (state.players.opponent.computer) grid.append(pupCard());
    root.append(grid);
    if (state.phase === 'choose' && state.turn === 'child') {
      const ask = h('section', { class: 'ask' });
      ask.append(h('h2', { text: 'Ask for…' }));
      const row = h('div', { class: 'ask-row' });
      engine.legalAsks(state, 'child').forEach((id) => {
        const card = state.cards[id];
        row.append(picButton(card, 'Ask for ' + card.text, () => act((current) => engine.beginAsk(current, 'child', id))));
      });
      ask.append(row);
      root.append(ask);
    }
    const mine = h('section', { class: 'hand' });
    mine.append(h('h2', { text: 'Your cards' }));
    const spread = h('div', { class: 'hand-row' });
    state.players.child.hand.forEach((id, index, list) => {
      const card = state.cards[id];
      const tile = picButton(card, card.text, null, 'hand-card');
      tile.style.setProperty('--tilt', ((index - (list.length - 1) / 2) * 8) + 'deg');
      spread.append(tile);
    });
    mine.append(spread);
    root.append(mine);
    return root;
  }

  function saySheet() {
    const card = state.cards[state.request.cardId];
    const sheet = h('div', { class: 'sheet', role: 'dialog', 'aria-label': 'Say the word' });
    sheet.append(h('h2', { text: 'Say it!' }));
    sheet.append(picButton(card, card.text, null, 'hero'));
    sheet.append(h('p', { class: 'parent', text: engine.promptFor(state) }));
    const row = h('div', { class: 'row' });
    row.append(h('button', { type: 'button', class: 'go', text: 'Got it!', on: () => act((current) => engine.judgeAsk(current, true)) }));
    row.append(h('button', { type: 'button', class: 'mix', text: 'Mix-up', on: () => act((current) => engine.judgeAsk(current, false)) }));
    sheet.append(row);
    return overlay(sheet);
  }

  function fixSheet() {
    const sheet = h('div', { class: 'sheet', role: 'dialog', 'aria-label': 'Fix it' });
    sheet.append(h('h2', { text: state.repair.speaker + ' says' }));
    sheet.append(h('p', { class: 'check', text: state.repair.check }));
    const pair = h('div', { class: 'pair' });
    [state.repair.heardCardId, state.repair.intendedCardId].forEach((id) => {
      pair.append(picButton(state.cards[id], state.cards[id].text, null, 'hero'));
    });
    sheet.append(pair);
    const row = h('div', { class: 'row' });
    const fixes = [
      ['key-word', 'Say the key word', art.iconKey],
      ['show-or-point', 'Show or point', art.iconPoint],
      ['another-way', 'Tell it another way', art.iconWay]
    ];
    fixes.forEach(([id, label, icon]) => {
      const button = h('button', {
        type: 'button',
        class: 'fix',
        'aria-label': label,
        on: () => act((current) => engine.chooseRepair(current, id))
      });
      button.append(icon());
      button.append(h('span', { text: label }));
      row.append(button);
    });
    sheet.append(row);
    return overlay(sheet);
  }

  function doSheet() {
    const card = state.cards[state.repair.intendedCardId];
    const show = state.phase === 'repair-show';
    const meaning = state.phase === 'repair-meaning';
    const sheet = h('div', { class: 'sheet', role: 'dialog', 'aria-label': 'Repair' });
    sheet.append(h('h2', { text: show ? 'Show or point' : (meaning ? 'Tell it another way' : 'Say the key word') }));
    sheet.append(picButton(card, card.text, null, 'hero'));
    const row = h('div', { class: 'row' });
    if (show) {
      row.append(h('button', { type: 'button', class: 'go', text: 'I pointed!', on: () => act((current) => engine.finishShowRepair(current)) }));
    } else if (meaning) {
      row.append(h('button', { type: 'button', class: 'go', text: 'Got it!', on: () => act((current) => engine.finishMeaningRepair(current, true)) }));
    } else {
      row.append(h('button', {
        type: 'button',
        class: 'go',
        text: 'Got it!',
        on: () => act((current) => {
          current.pendingHeardId = current.repair.intendedCardId;
          current.phase = 'repair-confirm';
          return engine.confirmHeard(current, true);
        })
      }));
    }
    sheet.append(row);
    return overlay(sheet);
  }

  function pupSheet() {
    const card = state.cards[state.request.cardId];
    const sheet = h('div', { class: 'sheet', role: 'dialog', 'aria-label': 'Station Pup asks' });
    sheet.append(art.pup());
    sheet.append(h('h2', { text: 'Station Pup asks' }));
    sheet.append(picButton(card, card.text, null, 'hero'));
    const row = h('div', { class: 'row' });
    row.append(h('button', { type: 'button', class: 'go', text: 'Here it is', on: () => act((current) => engine.answerAsk(current, true)) }));
    row.append(h('button', { type: 'button', class: 'mix', text: 'Not in our hand', on: () => act((current) => engine.answerAsk(current, false)) }));
    sheet.append(row);
    return overlay(sheet);
  }

  function winSheet() {
    const tickets = Math.max(1, state.players.child.complete.length);
    const sheet = h('div', { class: 'sheet win', role: 'dialog', 'aria-label': 'Round finished' });
    const cast = h('div', { class: 'cast' });
    cast.append(art.pig(), art.pup());
    sheet.append(cast);
    sheet.append(h('h2', { text: 'All aboard!' }));
    const row = h('div', { class: 'tickets', 'aria-label': tickets + (tickets === 1 ? ' ticket' : ' tickets') });
    for (let i = 0; i < tickets; i += 1) {
      const ticket = h('div', { class: 'ticket' });
      ticket.style.setProperty('--tilt', ((i - 1) * 6) + 'deg');
      row.append(ticket);
    }
    sheet.append(row);
    sheet.append(h('p', { text: tickets === 1 ? '1 ticket' : tickets + ' tickets' }));
    sheet.append(h('button', { type: 'button', class: 'go', text: 'Play again', on: () => begin(opponentMode) }));
    return overlay(sheet);
  }

  function passSheet() {
    const who = state.players[state.turn].name;
    const sheet = h('div', { class: 'sheet', role: 'dialog', 'aria-label': 'Pass the tablet' });
    sheet.append(h('h2', { text: 'Pass the tablet' }));
    sheet.append(h('p', { text: who + ', cover the cards until you are ready.' }));
    sheet.append(h('button', { type: 'button', class: 'go', text: 'Ready', on: () => { passOpen = false; render(); } }));
    return overlay(sheet);
  }

  function grownSheet() {
    const sheet = h('div', { class: 'sheet grown', role: 'dialog', 'aria-label': 'Grown-ups' });
    sheet.append(h('h2', { text: 'Grown-ups' }));
    const level = h('label', { text: 'Level ' });
    const select = h('select', { id: 'level' });
    (config.levels || []).forEach((item) => {
      const option = h('option', { value: item.id, text: item.label });
      if (state && item.id === state.levelId) option.selected = true;
      select.append(option);
    });
    level.append(select);
    sheet.append(level);
    sheet.append(h('p', { class: 'parent', text: 'Trains this round' }));
    config.sets.forEach((set) => {
      const label = h('label', {});
      const input = h('input', { type: 'checkbox', value: set.id });
      input.checked = !state || state.setIds.includes(set.id);
      label.append(input, h('span', { text: set.name }));
      sheet.append(label);
    });
    [{ id: 'computer', label: 'Child and you, versus Station Pup' }, { id: 'human', label: 'Another person on this tablet' }].forEach((item) => {
      const label = h('label', {});
      const input = h('input', { type: 'radio', name: 'who', value: item.id });
      input.checked = opponentMode === item.id;
      label.append(input, h('span', { text: item.label }));
      sheet.append(label);
    });
    const row = h('div', { class: 'row' });
    row.append(h('button', { type: 'button', class: 'go', text: 'New round', on: applyGrown }));
    row.append(h('button', { type: 'button', class: 'tiny', text: 'Print cards', on: () => window.print() }));
    row.append(h('button', { type: 'button', class: 'tiny', text: 'Close', on: () => { grownOpen = false; render(); } }));
    sheet.append(row);
    sheet.append(h('p', { class: 'parent' }, [
      h('a', { href: '../../../', text: 'Therapy Games' }),
      document.createTextNode(' · '),
      h('a', { href: '../../../catalogue.html', text: 'Catalogue' })
    ]));
    return overlay(sheet);
  }

  function applyGrown() {
    const level = $('level').value;
    const setIds = [...document.querySelectorAll('.grown input[type="checkbox"]:checked')].map((input) => input.value);
    const who = (document.querySelector('.grown input[name="who"]:checked') || {}).value || 'computer';
    if (!setIds.length) {
      $('live').textContent = 'Choose at least one train.';
      return;
    }
    opponentMode = who;
    if (state && state.phase !== 'ended') state = engine.setLevel(state, level);
    grownOpen = false;
    begin(who, setIds, level);
  }

  function renderPrint() {
    const sheet = $('print-sheet');
    sheet.replaceChildren();
    if (!config) return;
    sheet.append(h('h1', { text: 'All Aboard!' }));
    const grid = h('div', { class: 'sheet-grid' });
    config.sets.forEach((set) => {
      set.words.forEach((word) => {
        const card = h('article', { class: 'paper' });
        card.append(art.forWord(word.id));
        card.append(h('strong', { text: word.text }));
        if (word.nonword) card.append(h('p', { text: 'play word' }));
        grid.append(card);
      });
    });
    sheet.append(grid);
  }

  function render() {
    renderPrint();
    $('clock').textContent = state ? clockText() : '';
    $('mute').textContent = soundOn ? 'Sound on' : 'Sound off';
    $('mute').setAttribute('aria-pressed', soundOn ? 'true' : 'false');
    const stage = $('stage');
    stage.replaceChildren();
    if (!state) return;
    if (state.phase === 'ended' && !published) {
      published = true;
      publish(state);
    }
    $('live').textContent = state.message || '';
    if (passOpen) { stage.append(passSheet()); return; }
    stage.append(board());
    if (grownOpen) stage.append(grownSheet());
    else if (state.phase === 'ended') stage.append(winSheet());
    else if (state.phase === 'say') stage.append(saySheet());
    else if (state.phase === 'repair-choose') stage.append(fixSheet());
    else if (state.phase === 'repair-show' || state.phase === 'repair-say' || state.phase === 'repair-meaning') stage.append(doSheet());
    else if (state.phase === 'respond') stage.append(pupSheet());
  }

  function begin(mode, setIds, levelId) {
    published = false;
    passOpen = false;
    party = null;
    away = new Set();
    opponentMode = mode || opponentMode;
    try {
      state = engine.createGame(config, {
        opponent: opponentMode,
        setIds: setIds && setIds.length ? setIds : config.sets.map((set) => set.id),
        levelId: levelId || (state && state.levelId) || config.defaultLevel,
        now: Date.now()
      });
    } catch (error) {
      $('live').textContent = error.message;
      return;
    }
    if (state.players.opponent.computer) state.players.opponent.name = 'Station Pup';
    if (!state.players.opponent.computer && state.phase === 'choose') passOpen = true;
    ensureTimer();
    render();
  }

  function useConfig(raw) {
    const checked = engine.validateConfig(raw);
    if (!checked.ok) {
      $('live').textContent = checked.errors.join(' ');
      config = engine.validateConfig(JSON.parse($('embedded-config').textContent)).config;
    } else config = checked.config;
    soundOn = true;
    begin('computer');
  }

  async function boot() {
    $('pig').append(art.pig());
    const embedded = JSON.parse($('embedded-config').textContent);
    let injected = window.AllAboardConfig || null;
    let fetched = null;
    if (!injected) {
      const url = new URLSearchParams(location.search).get('config');
      if (url) {
        try {
          const response = await fetch(url);
          if (!response.ok) throw new Error('The config link did not load.');
          fetched = await response.json();
        } catch (error) {
          $('live').textContent = error.message;
        }
      }
    }
    const selected = engine.selectConfigSource({ injected, fetched, embedded });
    engine.start = useConfig;
    window.addEventListener('message', (event) => {
      const data = event.data;
      if (!data || data.type !== 'all-aboard-config' || !data.config) return;
      useConfig(data.config);
    });
    $('mute').addEventListener('click', () => {
      soundOn = !soundOn;
      if (soundOn) tune([523, 659]);
      render();
    });
    $('grown').addEventListener('click', () => { grownOpen = !grownOpen; render(); });
    useConfig(selected.config);
    window.AllAboardPlay = {
      forceWin() {
        if (!state) return;
        const setId = state.setIds[0];
        const ids = state.trainCards.filter((card) => card.setId === setId).map((card) => card.id);
        ['child', 'opponent'].forEach((player) => {
          state.players[player].hand = state.players[player].hand.filter((id) => !ids.includes(id));
        });
        state.yard = state.yard.filter((id) => !ids.includes(id));
        if (!state.players.child.complete.includes(setId)) state.players.child.complete.push(setId);
        away.add(setId);
        state = engine.endRound(state, 'all-trains', Date.now());
        party = setId;
        cheer();
        bits();
        render();
      }
    };
  }

  boot();
})();
