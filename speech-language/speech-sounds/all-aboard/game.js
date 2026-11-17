/* All Aboard v2. The child plays. A parent sits beside and taps how it went. */
(function () {
  'use strict';
  const words = window.AboardWords;
  const $ = (id) => document.getElementById(id);
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const KEY = 'all-aboard-v2';
  let store = load();
  let set = words.sets[0];
  let level = 'word';
  let screen = 'home';
  let roundNo = 1;
  let phase = 'pick';
  let slots = 4;
  let used = {};
  let current = null;
  let queue = [];
  let step = 0;
  let tiles = [];
  let strategy = null;
  let splitOff = false;
  let usedHelp = false;
  let sessionTickets = 0;
  let roundCounts = { 1: 0, 2: 0, 3: 0 };
  let carriages = [];
  let yayWord = null;
  let pickedMystery = null;
  let reveal = '';

  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (saved && typeof saved.tickets === 'number' && Array.isArray(saved.attempts)) return saved;
    } catch (error) { /* keep a fresh box */ }
    return { tickets: 0, shopOptIn: false, attempts: [], ratings: [] };
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (error) { /* private mode */ }
  }
  function shuffle(list) {
    const copy = list.slice();
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      const hold = copy[i];
      copy[i] = copy[j];
      copy[j] = hold;
    }
    return copy;
  }
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
  function showName(id) {
    if (id === 'smill') return 'Smill';
    if (id === 'smin') return 'Smin';
    return id;
  }
  function line(item) {
    if (level === 'phrase') return item.phrase;
    if (level === 'sentence') return item.sentence;
    return item.text;
  }
  function byId(id) {
    return set.words.find((item) => item.id === id);
  }

  function drawTrain() {
    const box = $('train');
    box.replaceChildren();
    const cars = h('div', { class: 'cars' });
    for (let i = 0; i < 4; i += 1) {
      const wrap = h('div', { style: 'position:relative;height:100%' });
      wrap.append(h('img', { class: 'carriage', src: 'assets/carriage.webp', alt: '' }));
      if (carriages[i]) {
        wrap.append(h('img', {
          src: 'assets/cv_card_' + carriages[i] + '.webp',
          alt: showName(carriages[i]),
          style: 'position:absolute;left:10%;width:80%;top:6%;height:58%;object-fit:contain'
        }));
      }
      cars.append(wrap);
    }
    box.append(cars);
    box.append(h('img', { class: 'engine', src: 'assets/engine.webp', alt: '' }));
  }

  function ticketPill() {
    const pill = $('tickets');
    pill.replaceChildren();
    pill.append(h('img', { src: 'assets/ticket.webp', alt: '' }));
    pill.append(h('span', { text: '× ' + (screen === 'home' || screen === 'grown' ? store.tickets : sessionTickets) }));
  }

  function setDad(on) {
    $('dad').hidden = !on;
    $('grown').hidden = on;
    $('split').checked = splitOff;
  }

  function score(support) {
    if (!current || screen === 'yay') return;
    const entry = {
      round: roundNo,
      word: current.id,
      level: level,
      support: usedHelp ? 'help' : support,
      splitOff: $('split').checked,
      strategy: strategy,
      at: new Date().toISOString()
    };
    store.attempts.push(entry);
    store.tickets += 1;
    sessionTickets += 1;
    roundCounts[roundNo] += 1;
    save();
    if (roundNo === 1) {
      used[current.onset] = true;
      slots -= 1;
    }
    carriages.push(current.id);
    yayWord = current;
    screen = 'yay';
    phase = 'yay';
    render();
    setTimeout(nextStep, reduce ? 350 : 1200);
  }

  function nextStep() {
    yayWord = null;
    usedHelp = false;
    strategy = null;
    splitOff = false;
    if (roundNo === 1) {
      if (slots <= 0) return startRound(2);
      phase = 'pick';
      current = null;
      screen = 'r1';
    } else {
      step += 1;
      if (step >= 4) return roundNo === 2 ? startRound(3) : finishRounds();
      current = queue[step];
      phase = 'pick';
      tiles = shuffle(words.tilePool);
      screen = roundNo === 2 ? 'r2' : 'r3';
    }
    render();
  }

  function startRound(number) {
    roundNo = number;
    step = 0;
    phase = 'pick';
    current = null;
    strategy = null;
    usedHelp = false;
    splitOff = false;
    carriages = [];
    if (number === 1) {
      slots = 4;
      used = {};
      sessionTickets = 0;
      roundCounts = { 1: 0, 2: 0, 3: 0 };
      screen = 'r1';
    } else if (number === 2) {
      queue = shuffle(set.words);
      current = queue[0];
      tiles = shuffle(words.tilePool);
      screen = 'r2';
    } else {
      queue = shuffle(set.words);
      current = queue[0];
      screen = 'r3';
    }
    render();
  }

  function finishRounds() {
    screen = 'tickets';
    pickedMystery = null;
    reveal = '';
    render();
  }

  function backCard(on) {
    const button = h('button', { type: 'button', class: 'back', on: on, 'aria-label': 'Face-down card ' + set.face });
    button.append(h('img', { src: 'assets/engine.webp', alt: '' }));
    button.append(h('span', { text: set.face }));
    return button;
  }

  function onsetRow() {
    const row = h('div', { class: 'onsets' });
    ['b', 'f', 'sp', 'sm'].forEach((onset) => {
      const button = h('button', {
        type: 'button',
        class: 'onset' + (used[onset] ? ' used' : ''),
        text: onset,
        style: 'background:' + words.onsetColour[onset],
        'aria-label': 'Sound ' + onset,
        on: used[onset] ? null : () => chooseOnset(onset)
      });
      row.append(button);
    });
    return row;
  }

  function chooseOnset(onset) {
    if (phase === 'say' || phase === 'help' || used[onset]) return;
    current = set.words.find((item) => item.onset === onset);
    phase = 'say';
    render();
  }

  function cueText() {
    if (phase === 'say' && current) return line(current);
    if (phase === 'onset') return 'Now pick a sound!';
    if (screen === 'r2') return 'Which sound comes first?';
    if (screen === 'r3') return 'Pick a way, then say it.';
    return 'Pick a card, then pick a sound!';
  }
  function sayBubble() {
    const box = h('div', { class: 'say' });
    box.append(h('div', { class: 'bubble', text: cueText() }));
    box.append(h('div', { class: 'mouth', text: 'then say it!' }));
    return box;
  }

  function hintPanel() {
    const parts = [current.onset, set.rhyme];
    const box = h('div', { class: 'hint' });
    box.append(h('h3', { text: 'Dad hint. No rush!' }));
    box.append(h('div', { text: 'Model it:' }));
    box.append(h('div', { class: 'model', text: '“' + line(current) + '”' }));
    box.append(h('div', { text: 'or split the sound off:' }));
    const row = h('div', { class: 'split' });
    row.append(h('span', { class: 'chip', text: parts[0] }));
    row.append(h('span', { text: '…' }));
    row.append(h('span', { class: 'chip dark', text: parts[1] }));
    box.append(row);
    box.append(h('p', { text: 'Then he has another go and keeps the card.' }));
    box.append(h('button', { type: 'button', class: 'help-btn', text: 'Keep the card', on: () => score('help') }));
    return box;
  }

  function cluePanel() {
    const box = h('div', { class: 'hint' });
    box.append(h('h3', { text: 'Dad help: another way' }));
    const grid = h('div', { class: 'q' });
    current.clues.forEach((pair) => {
      grid.append(h('b', { text: pair[0] }));
      grid.append(h('span', { text: pair[1] }));
    });
    box.append(grid);
    box.append(h('button', { type: 'button', class: 'help-btn', text: 'Keep the card', on: () => score('help') }));
    return box;
  }

  function renderRound1() {
    const stage = h('div', { class: 'playfield' + (phase === 'help' ? ' wide' : '') });
    const main = h('div', { class: 'play-main' });
    const row = h('div', { class: 'cards' });
    const showing = (phase === 'say' || phase === 'help') && current;
    if (showing) {
      const shown = h('div', { class: 'back', style: 'background:#fff' });
      shown.append(h('img', { src: 'assets/cv_card_' + current.id + '.webp', alt: showName(current.id) }));
      row.append(shown);
    }
    const backs = showing ? Math.max(0, slots - 1) : slots;
    for (let i = 0; i < backs; i += 1) {
      row.append(backCard(() => { phase = 'onset'; render(); }));
    }
    main.append(row);
    if (phase !== 'help') main.append(onsetRow());
    stage.append(main);
    const side = h('div', { class: 'play-side' });
    side.append(phase === 'help' ? hintPanel() : sayBubble());
    stage.append(side);
    return stage;
  }

  function renderRound2() {
    const stage = h('div', { class: 'playfield' + (phase === 'help' ? ' wide' : '') });
    const main = h('div', { class: 'play-main rowish' });
    const pic = h('div', { class: 'pic-only' });
    pic.append(h('img', { src: 'assets/cv_pic_' + current.id + '.webp', alt: '' }));
    pic.append(h('div', { class: 'caption', text: '?' }));
    main.append(pic);
    const grid = h('div', { class: 'tiles' });
    tiles.forEach((tile) => {
      grid.append(h('button', {
        type: 'button',
        class: 'tile',
        text: tile,
        'aria-label': 'Sound ' + tile,
        on: () => pickTile(tile, grid)
      }));
    });
    main.append(grid);
    stage.append(main);
    const side = h('div', { class: 'play-side' });
    side.append(phase === 'help' ? hintPanel() : sayBubble());
    stage.append(side);
    return stage;
  }

  function pickTile(tile, grid) {
    if (phase !== 'pick') return;
    if (tile !== current.onset) {
      const button = [...grid.children].find((item) => item.textContent === tile);
      if (button) {
        button.classList.remove('bad');
        void button.offsetWidth;
        button.classList.add('bad');
      }
      $('live').textContent = 'Which sound comes first?';
      return;
    }
    phase = 'say';
    render();
  }

  function renderRound3() {
    const stage = h('div', { class: 'playfield' + (phase === 'help' ? ' wide' : '') });
    const main = h('div', { class: 'play-main rowish' });
    const card = h('div', { class: 'float-card' });
    card.append(h('img', { src: 'assets/cv_card_' + current.id + '.webp', alt: showName(current.id) }));
    main.append(card);
    const strats = h('div', { class: 'strats' });
    [['show', 'Show it', 'assets/cv_strat_show.webp'], ['another-way', 'Say it another way', 'assets/cv_strat_tell.webp']].forEach((item) => {
      const button = h('button', {
        type: 'button',
        class: 'strat' + (item[0] === 'another-way' ? ' tell' : '') + (strategy === item[0] ? ' on' : ''),
        'aria-label': item[1],
        on: () => { strategy = item[0]; phase = 'say'; render(); }
      });
      button.append(h('img', { src: item[2], alt: '' }));
      strats.append(button);
    });
    main.append(strats);
    stage.append(main);
    const side = h('div', { class: 'play-side' });
    side.append(phase === 'help' ? cluePanel() : sayBubble());
    stage.append(side);
    return stage;
  }

  function renderGrown() {
    const panel = h('div', { class: 'panel' });
    panel.append(h('h2', { text: 'Grown-ups corner' }));
    panel.append(h('h3', { text: '1. Pick a level' }));
    const levels = h('div', { class: 'levels' });
    const sample = set.words[0];
    words.levels.forEach((item) => {
      const button = h('button', { type: 'button', class: 'level' + (level === item.id ? ' on' : ''), on: () => { level = item.id; render(); } });
      button.append(h('b', { text: item.label }));
      button.append(h('img', { src: 'assets/cv_pic_' + sample.id + '.webp', alt: '' }));
      const frame = item.id === 'word' ? sample.text : item.id === 'phrase' ? sample.phrase : sample.sentence;
      button.append(h('span', { class: 'frame', text: '“' + frame + '”' }));
      button.append(h('span', { class: 'note', text: item.note }));
      levels.append(button);
    });
    panel.append(levels);
    panel.append(h('h3', { text: '2. Pick a train' }));
    const trains = h('div', { class: 'trains' });
    words.sets.forEach((item) => {
      const button = h('button', {
        type: 'button',
        class: 'train-pick' + (set.id === item.id ? ' on' : ''),
        on: () => { set = item; render(); }
      });
      button.append(h('img', { src: 'assets/engine.webp', alt: '', style: 'height:36px' }));
      button.append(h('span', { text: item.words.map((word) => showName(word.id)).join(' ') }));
      trains.append(button);
    });
    panel.append(trains);
    const shop = h('div', { class: 'shop' });
    shop.append(h('img', { src: 'assets/ticket.webp', alt: '' }));
    const copy = h('div', {});
    copy.append(h('strong', { text: 'Swap tickets for coins in the My Base shop' }));
    copy.append(h('div', { class: 'note', text: store.shopOptIn ? 'Opt-in saved on this tablet. Coins are not linked yet.' : 'Off for now. Tickets are just for fun and stay on this tablet.' }));
    shop.append(copy);
    const toggle = h('button', {
      type: 'button',
      class: 'switch' + (store.shopOptIn ? ' on' : ''),
      'aria-pressed': store.shopOptIn ? 'true' : 'false',
      'aria-label': 'Swap tickets for coins',
      on: () => { store.shopOptIn = !store.shopOptIn; save(); render(); }
    });
    toggle.append(h('i', {}));
    shop.append(toggle);
    panel.append(shop);
    panel.append(h('button', { type: 'button', class: 'play-btn', style: 'position:static;transform:none;margin-top:12px', text: 'Close', on: () => { screen = 'home'; render(); } }));
    return panel;
  }

  function renderTickets() {
    const panel = h('div', { class: 'panel tickets' });
    panel.append(h('h2', { text: 'You won ' + sessionTickets + ' tickets!' }));
    panel.append(h('p', { text: 'Round 1: ' + roundCounts[1] + '   Round 2: ' + roundCounts[2] + '   Round 3: ' + roundCounts[3] }));
    panel.append(h('h2', { text: 'Now pick a ticket!' }));
    const row = h('div', { class: 'mystery' });
    const prizes = ['A wave from the pig', 'A toot from the train', 'A ride with Station Pup'];
    prizes.forEach((prize, index) => {
      const button = h('button', { type: 'button', 'aria-label': 'Mystery ticket ' + (index + 1), on: () => { pickedMystery = index; reveal = prize; render(); } });
      button.append(h('img', { src: 'assets/ticket.webp', alt: '' }));
      if (pickedMystery !== index) button.append(h('span', { text: '?', style: 'position:absolute;inset:0;display:grid;place-items:center;font-size:42px;color:#e23b3b' }));
      button.style.position = 'relative';
      row.append(button);
    });
    panel.append(row);
    if (reveal) panel.append(h('p', { class: 'reveal', text: reveal }));
    panel.append(h('p', { class: 'note', text: 'Ticket box: ' + store.tickets + '. Saved on this tablet, not linked to coins.' }));
    panel.append(h('button', { type: 'button', class: 'play-btn', style: 'position:static;transform:none', text: 'Next', on: () => { screen = 'rate'; render(); } }));
    return panel;
  }

  function renderRate() {
    const panel = h('div', { class: 'panel tickets' });
    panel.append(h('h2', { text: 'Did you like it?' }));
    const row = h('div', { class: 'faces' });
    [['yes', 'Yes!', '☺'], ['ok', 'Okay', '–'], ['no', 'Not really', '☹']].forEach((item) => {
      const wrap = h('div', {});
      wrap.append(h('button', {
        type: 'button',
        class: 'face ' + item[0],
        text: item[2],
        'aria-label': item[1],
        on: () => {
          store.ratings.push({ rating: item[1], at: new Date().toISOString() });
          save();
          screen = 'home';
          render();
        }
      }));
      wrap.append(h('div', { class: 'caption', text: item[1] }));
      row.append(wrap);
    });
    panel.append(row);
    return panel;
  }

  function render() {
    $('title').textContent = screen === 'home' || screen === 'grown' ? 'All Aboard!' : screen === 'r2' ? 'Round 2: Which sound?' : screen === 'r3' ? 'Round 3: Fix-It practice' : screen === 'yay' ? 'Round ' + roundNo : 'Round 1: Pick a sound';
    if (screen === 'tickets') $('title').textContent = 'Tickets';
    if (screen === 'rate') $('title').textContent = 'Did you like it?';
    document.body.dataset.screen = screen;
    document.body.dataset.phase = phase;
    document.querySelector('.world').classList.toggle('sheet', screen === 'grown' || screen === 'tickets' || screen === 'rate');
    ticketPill();
    setDad(screen === 'r1' || screen === 'r2' || screen === 'r3' || screen === 'yay');
    $('pig').style.visibility = (screen === 'home' || screen === 'yay' || screen === 'tickets' || screen === 'rate') ? 'visible' : 'hidden';
    drawTrain();
    const stage = $('stage');
    stage.replaceChildren();
    if (screen === 'home') stage.append(h('button', { type: 'button', class: 'play-btn', id: 'play', text: '▶  Play', on: () => startRound(1) }));
    else if (screen === 'grown') stage.append(renderGrown());
    else if (screen === 'r1') stage.append(renderRound1());
    else if (screen === 'r2') stage.append(renderRound2());
    else if (screen === 'r3') stage.append(renderRound3());
    else if (screen === 'yay') {
      const stack = h('div', { class: 'play-main' });
      stack.append(h('div', { class: 'yay', text: 'Yay! You got it!' }));
      if (yayWord) {
        const card = h('div', { class: 'float-card' });
        card.append(h('img', { src: 'assets/cv_card_' + yayWord.id + '.webp', alt: showName(yayWord.id) }));
        stack.append(card);
      }
      stack.append(h('div', { class: 'bubble', text: '+1 ticket' }));
      stage.append(stack);
    } else if (screen === 'tickets') stage.append(renderTickets());
    else if (screen === 'rate') stage.append(renderRate());
    $('live').textContent = $('title').textContent;
  }

  $('grown').addEventListener('click', () => { screen = screen === 'grown' ? 'home' : 'grown'; render(); });
  $('own').addEventListener('click', () => score('independent'));
  $('with').addEventListener('click', () => score('help'));
  $('split').addEventListener('change', () => { splitOff = $('split').checked; });
  $('help').addEventListener('click', () => {
    if (!current) {
      $('live').textContent = 'Pick a card, then pick a sound.';
      return;
    }
    usedHelp = true;
    phase = 'help';
    render();
  });
  render();

  window.Aboard = {
    preview(name) {
      set = words.sets[0];
      level = 'word';
      carriages = ['bell', 'fell'];
      sessionTickets = name === 'tickets' ? 12 : name === 'home' || name === 'grown' || name === 'round1' ? 0 : 3;
      roundCounts = { 1: 4, 2: 4, 3: 4 };
      used = { b: true };
      slots = 4;
      current = byId('spell');
      queue = set.words;
      step = 0;
      tiles = words.tilePool.slice();
      strategy = 'another-way';
      if (name === 'home') { screen = 'home'; carriages = []; sessionTickets = store.tickets; }
      if (name === 'grown') screen = 'grown';
      if (name === 'round1') { screen = 'r1'; phase = 'pick'; current = null; carriages = []; slots = 4; used = {}; }
      if (name === 'hint') { screen = 'r1'; phase = 'help'; roundNo = 1; slots = 4; }
      if (name === 'yay') { screen = 'yay'; yayWord = byId('spell'); roundNo = 1; }
      if (name === 'round2') { set = words.sets[1]; screen = 'r2'; phase = 'pick'; roundNo = 2; current = byId('bill'); tiles = words.tilePool.slice(); carriages = []; }
      if (name === 'round3') { set = words.sets[1]; screen = 'r3'; phase = 'help'; roundNo = 3; current = byId('spill'); carriages = ['fill', 'spin']; }
      if (name === 'tickets') { screen = 'tickets'; pickedMystery = null; reveal = ''; store.tickets = Math.max(store.tickets, 24); }
      if (name === 'rate') screen = 'rate';
      render();
    }
  };
})();
