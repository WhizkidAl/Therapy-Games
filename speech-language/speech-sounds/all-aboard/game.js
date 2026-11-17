/* All Aboard v2. The child plays. A parent sits beside and taps how it went. */
(function () {
  'use strict';
  const words = window.AboardWords;
  const collect = window.AboardCollect;
  const $ = (id) => document.getElementById(id);
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const KEY = 'all-aboard-v2';
  const sheets = ['grown', 'tickets', 'rate', 'award', 'album', 'progress', 'how'];
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
  let session = null;
  let doneStrats = { key: false, show: false, way: false };
  let fly = null;
  let returnTo = 'home';

  function load() {
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (error) { saved = null; }
    if (!saved || typeof saved.tickets !== 'number' || !Array.isArray(saved.attempts)) {
      saved = { tickets: 0, shopOptIn: false, attempts: [], ratings: [] };
    }
    if (!saved.collection) saved.collection = { animals: [], trains: [] };
    if (!Array.isArray(saved.collection.animals)) saved.collection.animals = [];
    if (!Array.isArray(saved.collection.trains)) saved.collection.trains = [];
    if (!Array.isArray(saved.sessions)) saved.sessions = [];
    if (!Array.isArray(saved.ratings)) saved.ratings = [];
    if (!saved.roundsOn) saved.roundsOn = { 1: true, 2: true, 3: true };
    if (typeof saved.practiceWord !== 'string') saved.practiceWord = '';
    if (saved.sessions.length === 0 && saved.attempts.length) {
      saved.sessions.push({
        id: 'earlier',
        at: saved.attempts[0].at || new Date().toISOString(),
        level: saved.attempts[0].level || 'word',
        setId: '',
        rounds: [1, 2, 3],
        rating: saved.ratings.length ? saved.ratings[saved.ratings.length - 1].rating : '',
        awards: [],
        attempts: saved.attempts.slice(),
        animals: saved.collection.animals.length,
        trains: saved.collection.trains.length
      });
    }
    return saved;
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
    if (!item) return '';
    if (level === 'phrase') return item.phrase;
    if (level === 'sentence') return item.sentence;
    return item.text;
  }
  function byId(id) {
    return set.words.find((item) => item.id === id);
  }
  function selectedRounds() {
    return [1, 2, 3].filter((n) => store.roundsOn[n]);
  }
  function practiceText() {
    const custom = (store.practiceWord || '').trim();
    if (custom) return custom;
    return set.words[0].text;
  }
  function round3Item() {
    const typed = practiceText();
    const match = set.words.find((item) => item.text.toLowerCase() === typed.toLowerCase() || line(item).toLowerCase() === typed.toLowerCase());
    if (match) return match;
    const base = set.words[0];
    return { id: base.id, onset: base.onset, text: typed, phrase: typed, sentence: typed, clues: base.clues };
  }
  function countLine() {
    return store.collection.animals.length + ' of 24 animals, ' + store.collection.trains.length + ' of 24 trains';
  }
  function ensureDeal() {
    if (!store.deal) store.deal = { animals: [], trains: [] };
    let changed = false;
    ['animals', 'trains'].forEach((kind) => {
      const ids = collect[kind].map((item) => item.id);
      const known = new Set(ids);
      const kept = (store.deal[kind] || []).filter((id) => known.has(id));
      if (!store.deal[kind] || store.deal[kind].length === 0) {
        store.deal[kind] = shuffle(ids);
        changed = true;
      } else if (kept.length !== ids.length) {
        ids.forEach((id) => { if (!kept.includes(id)) kept.push(id); });
        store.deal[kind] = kept;
        changed = true;
      }
    });
    if (changed) save();
  }
  function nextItem(kind) {
    ensureDeal();
    const have = new Set(store.collection[kind]);
    const id = store.deal[kind].find((item) => !have.has(item));
    if (!id) return null;
    return collect[kind].find((item) => item.id === id) || null;
  }
  function persistSession() {
    if (!session) return;
    session.animals = store.collection.animals.length;
    session.trains = store.collection.trains.length;
    const index = store.sessions.findIndex((item) => item.id === session.id);
    if (index >= 0) store.sessions[index] = session;
    else store.sessions.push(session);
    save();
  }
  function howText(support) {
    return support === 'help' ? 'with support' : 'on his own';
  }
  function strategyName(id) {
    if (id === 'key') return 'Say the key word';
    if (id === 'show') return 'Show or point';
    if (id === 'way') return 'Say it another way';
    return '';
  }
  function weekKey(iso) {
    const date = new Date(iso);
    const day = (date.getDay() + 6) % 7;
    const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate() - day);
    return monday.toISOString().slice(0, 10);
  }
  function weekLabel(key) {
    const date = new Date(key + 'T00:00:00');
    return 'Week of ' + date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  function whenLabel(iso) {
    return new Date(iso).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' });
  }

  function drawTrain() {
    const box = $('train');
    box.replaceChildren();
    const cars = h('div', { class: 'cars' });
    for (let i = 0; i < 4; i += 1) {
      const wrap = h('div', { style: 'position:relative' });
      wrap.append(h('img', { class: 'carriage', src: 'assets/carriage.webp', alt: '' }));
      const pane = h('div', { class: 'car-window' });
      if (carriages[i]) {
        pane.append(h('img', { src: 'assets/cv_card_' + carriages[i] + '.webp', alt: showName(carriages[i]) }));
      }
      wrap.append(pane);
      cars.append(wrap);
    }
    box.append(cars);
    box.append(h('img', { class: 'engine', src: 'assets/engine.webp', alt: '' }));
  }

  function ticketPill() {
    const pill = $('tickets');
    pill.replaceChildren();
    pill.append(h('img', { src: 'assets/ticket.webp', alt: '' }));
    const total = (screen === 'home' || screen === 'grown' || screen === 'album' || screen === 'progress' || screen === 'how') ? store.tickets : sessionTickets;
    pill.append(h('span', { text: '× ' + total }));
  }

  function setDad(on) {
    $('dad').hidden = !on;
    $('grown').hidden = on || screen === 'award';
    $('split').checked = splitOff;
    $('word-set').hidden = !(screen === 'r3' || screen === 'grown');
    const box = $('word-box');
    if (document.activeElement !== box) box.value = practiceText();
  }

  function record(support) {
    const entry = {
      round: roundNo,
      word: roundNo === 3 ? practiceText() : current.id,
      level: level,
      support: usedHelp ? 'help' : support,
      splitOff: $('split').checked,
      strategy: roundNo === 3 ? strategy : '',
      at: new Date().toISOString()
    };
    store.attempts.push(entry);
    roundCounts[roundNo] += 1;
    if (session) session.attempts.push(entry);
    persistSession();
  }

  function armFly(done) {
    const job = fly;
    let finished = false;
    const once = () => { if (finished) return; finished = true; done(); };
    if (reduce || !job) { once(); return; }
    requestAnimationFrame(() => {
      const card = document.querySelector('.fly-card');
      const windows = document.querySelectorAll('.car-window');
      const target = windows[job.index] || windows[windows.length - 1];
      if (!card || !target) { setTimeout(once, 280); return; }
      const from = card.getBoundingClientRect();
      const to = target.getBoundingClientRect();
      const dx = (to.left + to.width / 2) - (from.left + from.width / 2);
      const dy = (to.top + to.height / 2) - (from.top + from.height / 2);
      const anim = card.animate([
        { transform: 'translate(0px, 0px) scale(1)' },
        { transform: 'translate(' + Math.round(dx) + 'px, ' + Math.round(dy) + 'px) scale(0.22)' }
      ], { duration: 700, easing: 'ease-in', fill: 'forwards' });
      anim.onfinish = once;
      setTimeout(once, 1000);
    });
  }

  function placeCard(id) {
    if (carriages.length < 4) carriages.push(id);
    fly = null;
  }

  function afterCard() {
    yayWord = null;
    usedHelp = false;
    strategy = null;
    splitOff = false;
    if (roundNo === 1) {
      if (slots <= 0) return finishThisRound();
      phase = 'pick';
      current = null;
      screen = 'r1';
    } else if (roundNo === 2) {
      step += 1;
      if (step >= 4) return finishThisRound();
      current = queue[step];
      phase = 'pick';
      tiles = shuffle(words.tilePool);
      screen = 'r2';
    } else if (doneStrats.key && doneStrats.show && doneStrats.way) {
      return finishThisRound();
    } else {
      phase = 'pick';
      strategy = null;
      screen = 'r3';
    }
    render();
  }

  function score(support) {
    if (!current || screen === 'yay' || screen === 'award') return;
    if (roundNo === 3 && !strategy) {
      $('live').textContent = 'Pick a strategy card first.';
      return;
    }
    if (roundNo === 3 && doneStrats[strategy]) return;
    record(support);
    if (roundNo === 1) {
      used[current.onset] = true;
      slots -= 1;
    }
    if (roundNo === 3) doneStrats[strategy] = true;
    const pictured = current.id;
    yayWord = current;
    fly = { id: pictured, index: carriages.length };
    screen = 'yay';
    phase = 'yay';
    render();
    armFly(() => {
      placeCard(pictured);
      afterCard();
    });
  }

  function finishThisRound() {
    screen = 'award';
    phase = 'pick';
    yayWord = null;
    render();
  }

  function takeTicket(kind) {
    const item = nextItem(kind);
    if (item) {
      store.collection[kind].push(item.id);
      store.tickets += 1;
      sessionTickets += 1;
      if (session) session.awards.push({ kind: kind, id: item.id, label: item.label });
      persistSession();
    }
    const list = selectedRounds();
    const index = list.indexOf(roundNo);
    if (index >= 0 && index < list.length - 1) startRound(list[index + 1]);
    else { screen = 'rate'; render(); }
  }

  function startRound(number) {
    roundNo = number;
    step = 0;
    phase = 'pick';
    strategy = null;
    usedHelp = false;
    splitOff = false;
    carriages = [];
    doneStrats = { key: false, show: false, way: false };
    fly = null;
    if (number === 1) {
      slots = 4;
      used = {};
      current = null;
      screen = 'r1';
    } else if (number === 2) {
      queue = shuffle(set.words);
      current = queue[0];
      tiles = shuffle(words.tilePool);
      screen = 'r2';
    } else {
      current = round3Item();
      screen = 'r3';
    }
    render();
  }

  function startPractice() {
    if (!selectedRounds().length) store.roundsOn[1] = true;
    sessionTickets = 0;
    roundCounts = { 1: 0, 2: 0, 3: 0 };
    session = {
      id: String(Date.now()),
      at: new Date().toISOString(),
      level: level,
      setId: set.id,
      rounds: selectedRounds().slice(),
      rating: '',
      awards: [],
      attempts: [],
      animals: store.collection.animals.length,
      trains: store.collection.trains.length
    };
    persistSession();
    startRound(selectedRounds()[0]);
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
      row.append(h('button', {
        type: 'button',
        class: 'onset' + (used[onset] ? ' used' : ''),
        text: onset,
        style: 'background:' + words.onsetColour[onset],
        'aria-label': 'Sound ' + onset,
        on: used[onset] ? null : () => chooseOnset(onset)
      }));
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
    if (screen === 'r3') return strategy ? strategyName(strategy) : 'Pick a way, then say it.';
    return 'Pick a card, then pick a sound!';
  }
  function sayBubble() {
    const box = h('div', { class: 'say' });
    box.append(h('div', { class: 'bubble', text: cueText() }));
    if (screen !== 'r3' || strategy) box.append(h('div', { class: 'mouth', text: strategy === 'show' ? 'then show it!' : 'then say it!' }));
    return box;
  }
  function hintPanel() {
    const parts = [current.onset, set.rhyme];
    const box = h('div', { class: 'hint' });
    box.append(h('h3', { text: 'Dad tips. No rush!' }));
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
    box.append(h('h3', { text: 'Dad tips: another way' }));
    const grid = h('div', { class: 'q' });
    (current.clues || []).forEach((pair) => {
      grid.append(h('b', { text: pair[0] }));
      grid.append(h('span', { text: pair[1] }));
    });
    box.append(grid);
    box.append(h('button', { type: 'button', class: 'help-btn', text: 'Keep the card', on: () => score('help') }));
    return box;
  }
  function gesturePanel() {
    const box = h('div', { class: 'hint' });
    box.append(h('h3', { text: 'Show or point' }));
    box.append(h('p', { text: 'This one is a gesture. He can point to the picture or show what it is. When he does, tap Got it.' }));
    box.append(h('button', { type: 'button', class: 'got', text: 'Got it', on: () => score('independent') }));
    return box;
  }

  function renderRound1() {
    const stage = h('div', { class: 'playfield' + (phase === 'help' ? ' wide' : '') });
    const main = h('div', { class: 'play-main' });
    const row = h('div', { class: 'cards' });
    const showing = (phase === 'say' || phase === 'help') && current;
    if (showing) {
      const shown = h('div', { class: 'back face' });
      shown.append(h('img', { src: 'assets/cv_card_' + current.id + '.webp', alt: showName(current.id) }));
      row.append(shown);
    }
    const backs = showing ? Math.max(0, slots - 1) : slots;
    for (let i = 0; i < backs; i += 1) row.append(backCard(() => { phase = 'onset'; render(); }));
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
    const main = h('div', { class: 'play-main' });
    const band = h('div', { class: 'play-main rowish fit' });
    const card = h('div', { class: 'float-card' });
    card.append(h('img', { src: 'assets/cv_card_' + current.id + '.webp', alt: showName(current.id) }));
    card.append(h('div', { class: 'caption', text: practiceText() }));
    band.append(card);
    const strats = h('div', { class: 'strats' });
    [['key', 'Say the key word', 'assets/strat-key-word.png'], ['show', 'Show or point', 'assets/strat-show-point.png'], ['way', 'Say it another way', 'assets/strat-another-way.png']].forEach((item) => {
      const button = h('button', {
        type: 'button',
        class: 'strat ' + item[0] + (strategy === item[0] ? ' on' : '') + (doneStrats[item[0]] ? ' done' : ''),
        'aria-label': item[1],
        on: () => {
          if (doneStrats[item[0]]) return;
          strategy = item[0];
          phase = 'say';
          render();
        }
      });
      button.append(h('img', { src: item[2], alt: '' }));
      if (item[0] === 'show') button.append(h('img', { class: 'pip', src: 'assets/cv_pic_' + current.id + '.webp', alt: '' }));
      if (doneStrats[item[0]]) button.append(h('span', { class: 'tick', text: '✓' }));
      strats.append(button);
    });
    band.append(strats);
    main.append(band);
    if (strategy === 'show' && phase !== 'help') main.append(h('button', { type: 'button', class: 'got', text: 'Got it', on: () => score('independent') }));
    stage.append(main);
    const side = h('div', { class: 'play-side' });
    if (phase === 'help') side.append(strategy === 'way' ? cluePanel() : strategy === 'show' ? gesturePanel() : hintPanel());
    else side.append(sayBubble());
    stage.append(side);
    return stage;
  }

  function renderHome() {
    const wrap = h('div', { class: 'play-main' });
    wrap.append(h('button', { type: 'button', class: 'play-btn', id: 'play', text: '▶  Play', on: startPractice }));
    wrap.append(h('p', { class: 'count-pill', text: countLine() }));
    const today = selectedRounds().map((n) => 'Round ' + n).join(', ');
    wrap.append(h('p', { class: 'note', text: 'Today: ' + (today || 'choose a round') }));
    wrap.append(h('button', { type: 'button', class: 'nav-btn', text: 'My collection', on: () => openSheet('album') }));
    return wrap;
  }

  function openSheet(name) {
    returnTo = screen === 'grown' ? 'grown' : 'home';
    screen = name;
    render();
  }

  function renderGrown() {
    const panel = h('div', { class: 'panel' });
    panel.append(h('h2', { text: 'Grown-ups corner' }));
    panel.append(h('h3', { text: 'Rounds to play' }));
    const rounds = h('div', { class: 'rounds' });
    [1, 2, 3].forEach((number) => {
      rounds.append(h('button', {
        type: 'button',
        class: 'round-pick' + (store.roundsOn[number] ? ' on' : ''),
        text: 'Round ' + number,
        'aria-pressed': store.roundsOn[number] ? 'true' : 'false',
        on: () => {
          const next = !store.roundsOn[number];
          if (!next && selectedRounds().length === 1) return;
          store.roundsOn[number] = next;
          save();
          render();
        }
      }));
    });
    panel.append(rounds);
    panel.append(h('p', { class: 'note', text: 'Any mix is fine. Round 3 uses the word box above. Change that word whenever you like.' }));
    const links = h('div', { class: 'nav-row' });
    links.append(h('button', { type: 'button', class: 'nav-btn', text: 'How to play', on: () => openSheet('how') }));
    links.append(h('button', { type: 'button', class: 'nav-btn', text: 'Progress', on: () => openSheet('progress') }));
    links.append(h('button', { type: 'button', class: 'nav-btn', text: 'My collection', on: () => openSheet('album') }));
    links.append(h('button', { type: 'button', class: 'play-btn slim', text: 'Close', on: () => { screen = 'home'; render(); } }));
    panel.append(links);
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
      trains.append(h('button', {
        type: 'button',
        class: 'train-pick' + (set.id === item.id ? ' on' : ''),
        on: () => {
          set = item;
          if (!store.practiceWord || words.sets.some((group) => group.words.some((word) => word.text === store.practiceWord))) store.practiceWord = '';
          save();
          render();
        }
      }, [
        h('img', { src: 'assets/engine.webp', alt: '', style: 'height:36px' }),
        h('span', { text: item.words.map((word) => showName(word.id)).join(' ') })
      ]));
    });
    panel.append(trains);
    const shop = h('div', { class: 'shop' });
    shop.append(h('img', { src: 'assets/ticket.webp', alt: '' }));
    const copy = h('div', {});
    copy.append(h('strong', { text: 'Swap tickets for coins in the My Base shop' }));
    copy.append(h('div', { class: 'note', text: store.shopOptIn ? 'Opt-in saved on this tablet. Coins are not linked yet.' : 'Off for now. Tickets stay on this tablet.' }));
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
    return panel;
  }

  function renderAward() {
    const panel = h('div', { class: 'panel tickets' });
    panel.append(h('h2', { text: 'A ticket for you!' }));
    panel.append(h('p', { text: 'The engineer has one ticket. Pick a picture he does not have yet.' }));
    const row = h('div', { class: 'mystery' });
    [['animals', 'Animal ticket'], ['trains', 'Train ticket']].forEach((pair) => {
      const item = nextItem(pair[0]);
      const button = h('button', { type: 'button', 'aria-label': pair[1], on: () => takeTicket(pair[0]) });
      button.style.position = 'relative';
      button.append(h('img', { src: item ? 'assets/collect/' + (pair[0] === 'animals' ? 'animal-' : 'train-') + item.id + '.svg' : 'assets/ticket.webp', alt: '' }));
      button.append(h('div', { class: 'caption', text: item ? item.label : 'All collected' }));
      row.append(button);
    });
    panel.append(row);
    panel.append(h('p', { class: 'count-pill', text: countLine() }));
    panel.append(h('p', { class: 'note', text: 'Saved on this tablet.' }));
    return panel;
  }

  function renderAlbum() {
    const panel = h('div', { class: 'panel' });
    panel.append(h('h2', { text: 'My collection' }));
    panel.append(h('p', { class: 'count-pill', text: countLine() }));
    [['animals', 'Animals', 'animal-'], ['trains', 'Trains', 'train-']].forEach((group) => {
      panel.append(h('h3', { text: group[1] }));
      const grid = h('div', { class: 'album-grid' });
      collect[group[0]].forEach((item) => {
        const got = store.collection[group[0]].includes(item.id);
        const slot = h('div', { class: 'slot' + (got ? '' : ' wait') });
        slot.append(h('img', { src: 'assets/collect/' + group[2] + item.id + '.svg', alt: got ? item.label : '' }));
        slot.append(h('div', { text: item.label }));
        grid.append(slot);
      });
      panel.append(grid);
    });
    panel.append(h('p', { class: 'note', text: 'Saved on this tablet.' }));
    panel.append(h('button', { type: 'button', class: 'play-btn slim', text: 'Close', on: () => { screen = returnTo; render(); } }));
    return panel;
  }

  function renderProgress() {
    const panel = h('div', { class: 'panel how' });
    panel.append(h('h2', { text: 'Progress' }));
    panel.append(h('p', { class: 'note', text: 'Saved on this tablet. This is not sent anywhere until you export it.' }));
    const weeks = {};
    store.sessions.forEach((item) => {
      const key = weekKey(item.at);
      if (!weeks[key]) weeks[key] = [];
      weeks[key].push(item);
    });
    const keys = Object.keys(weeks).sort().reverse();
    if (!keys.length) panel.append(h('p', { text: 'No practice yet.' }));
    keys.forEach((key) => {
      const block = h('div', { class: 'week' });
      block.append(h('h3', { text: weekLabel(key) }));
      weeks[key].slice().reverse().forEach((item) => {
        const card = h('div', { class: 'sess' });
        const rounds = (item.rounds || []).map((n) => 'Round ' + n).join(', ');
        card.append(h('div', { text: whenLabel(item.at) + ' · ' + (item.level || 'word') + ' · ' + rounds }));
        (item.attempts || []).forEach((attempt) => {
          const bits = ['Round ' + attempt.round, attempt.word, howText(attempt.support)];
          if (attempt.splitOff) bits.push('sound split off');
          if (attempt.strategy) bits.push(strategyName(attempt.strategy));
          card.append(h('div', { text: bits.join(' · ') }));
        });
        card.append(h('div', { text: 'Rating: ' + (item.rating || 'not yet') + ' · ' + (item.animals || 0) + ' of 24 animals, ' + (item.trains || 0) + ' of 24 trains' }));
        block.append(card);
      });
      panel.append(block);
    });
    const row = h('div', { class: 'nav-row' });
    row.append(h('button', { type: 'button', class: 'nav-btn', text: 'Export', on: exportCsv }));
    row.append(h('button', { type: 'button', class: 'play-btn slim', text: 'Close', on: () => { screen = returnTo; render(); } }));
    panel.append(row);
    return panel;
  }

  function csvCell(value) {
    const text = value == null ? '' : String(value);
    return /[",\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
  }
  function exportCsv() {
    const rows = [['week', 'date', 'rounds', 'level', 'word', 'how', 'sound split off', 'strategy', 'rating', 'animals', 'trains']];
    store.sessions.forEach((item) => {
      const shared = [
        weekLabel(weekKey(item.at)),
        item.at,
        (item.rounds || []).join(' '),
        item.level || '',
        item.rating || '',
        item.animals || 0,
        item.trains || 0
      ];
      const attempts = item.attempts && item.attempts.length ? item.attempts : [null];
      attempts.forEach((attempt) => {
        rows.push([
          shared[0], shared[1], shared[2], shared[3],
          attempt ? attempt.word : '',
          attempt ? howText(attempt.support) : '',
          attempt && attempt.splitOff ? 'yes' : '',
          attempt && attempt.strategy ? strategyName(attempt.strategy) : '',
          shared[4], shared[5], shared[6]
        ]);
      });
    });
    const csv = rows.map((row) => row.map(csvCell).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const link = h('a', { href: URL.createObjectURL(blob), download: 'all-aboard-progress.csv' });
    document.body.append(link);
    link.click();
    link.remove();
  }

  function renderHow() {
    const panel = h('div', { class: 'panel how' });
    panel.append(h('h2', { text: 'How to play' }));
    [
      'Choose the rounds in Grown-ups. Round 1, Round 2 and Round 3 can be on together, or just the ones you want today.',
      'Sit beside him. When he says it by himself, tap Got it on his own. If you had to model it, tap Got it with help. Tick needed the sound split off when you broke the first sound away from the rest.',
      'Tips shows a model, or another way to say the word. He still keeps that turn.',
      'Round 3 has three cards: Say the key word, Show or point, and Say it another way. Type the word in the box and change it whenever you like. Show or point is a gesture. When he does it, tap Got it. The round is done when each card has a tick.',
      'At the end of a round the engineer gives one ticket. He picks an animal ticket or a train ticket and gets a new picture. My collection shows every picture, and how many he has.',
      'Progress lists each week: the date, the rounds, the level, each word, and the smiley. It is saved on this tablet. Export downloads a file you can send to the therapist.'
    ].forEach((copy) => panel.append(h('p', { text: copy })));
    panel.append(h('button', { type: 'button', class: 'play-btn slim', text: 'Close', on: () => { screen = returnTo; render(); } }));
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
          if (session) {
            session.rating = item[1];
            persistSession();
          }
          store.ratings.push({ rating: item[1], at: new Date().toISOString() });
          save();
          session = null;
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

  function renderYay() {
    const stack = h('div', { class: 'play-main' });
    stack.append(h('div', { class: 'yay', text: 'Yay! You got it!' }));
    if (yayWord) {
      const card = h('div', { class: 'float-card fly-card' });
      card.append(h('img', { src: 'assets/cv_card_' + yayWord.id + '.webp', alt: showName(yayWord.id) }));
      stack.append(card);
    }
    return stack;
  }

  function render() {
    const titles = {
      home: 'All Aboard!',
      grown: 'All Aboard!',
      r1: 'Round 1: Pick a sound',
      r2: 'Round 2: Which sound?',
      r3: 'Round 3: Fix-It practice',
      yay: 'Round ' + roundNo,
      award: 'Your ticket',
      album: 'My collection',
      progress: 'Progress',
      how: 'How to play',
      rate: 'Did you like it?'
    };
    $('title').textContent = titles[screen] || 'All Aboard!';
    document.body.dataset.screen = screen;
    document.body.dataset.phase = phase;
    document.querySelector('.world').classList.toggle('sheet', sheets.includes(screen));
    ticketPill();
    setDad(screen === 'r1' || screen === 'r2' || screen === 'r3' || screen === 'yay');
    $('pig').style.visibility = ['home', 'yay', 'tickets', 'rate', 'award'].includes(screen) ? 'visible' : 'hidden';
    drawTrain();
    const stage = $('stage');
    stage.replaceChildren();
    if (screen === 'home') stage.append(renderHome());
    else if (screen === 'grown') stage.append(renderGrown());
    else if (screen === 'r1') stage.append(renderRound1());
    else if (screen === 'r2') stage.append(renderRound2());
    else if (screen === 'r3') stage.append(renderRound3());
    else if (screen === 'yay') stage.append(renderYay());
    else if (screen === 'award') stage.append(renderAward());
    else if (screen === 'album') stage.append(renderAlbum());
    else if (screen === 'progress') stage.append(renderProgress());
    else if (screen === 'how') stage.append(renderHow());
    else if (screen === 'rate') stage.append(renderRate());
    $('live').textContent = $('title').textContent;
  }

  $('grown').addEventListener('click', () => { screen = screen === 'grown' ? 'home' : 'grown'; render(); });
  $('own').addEventListener('click', () => score('independent'));
  $('with').addEventListener('click', () => score('help'));
  $('split').addEventListener('change', () => { splitOff = $('split').checked; });
  $('tips').addEventListener('click', () => {
    if (screen === 'r3' && !strategy) {
      $('live').textContent = 'Pick a strategy card first.';
      return;
    }
    if (!current) {
      $('live').textContent = 'Pick a card, then pick a sound.';
      return;
    }
    usedHelp = true;
    phase = 'help';
    render();
  });
  $('word-box').addEventListener('input', () => {
    store.practiceWord = $('word-box').value;
    if (screen === 'r3') current = round3Item();
    save();
  });
  ensureDeal();
  render();

  window.Aboard = {
    preview(name) {
      set = words.sets[0];
      level = 'word';
      carriages = ['bell', 'fell'];
      sessionTickets = 2;
      roundCounts = { 1: 4, 2: 4, 3: 2 };
      used = {};
      slots = 4;
      current = byId('spell');
      queue = set.words;
      step = 0;
      tiles = words.tilePool.slice();
      strategy = null;
      doneStrats = { key: false, show: false, way: false };
      fly = null;
      phase = 'pick';
      store.practiceWord = 'spell';
      store.roundsOn = { 1: true, 2: true, 3: true };
      store.collection = { animals: ['cat', 'dog', 'hen', 'duck', 'frog', 'lion', 'owl'], trains: ['steam', 'tram', 'express', 'metro'] };
      store.sessions = [
        {
          id: 'week-a',
          at: '2026-11-10T04:00:00.000Z',
          level: 'word',
          rounds: [1, 2],
          rating: 'Yes!',
          awards: [],
          attempts: [
            { round: 1, word: 'bell', support: 'independent', splitOff: false, strategy: '' },
            { round: 1, word: 'spell', support: 'help', splitOff: true, strategy: '' }
          ],
          animals: 3,
          trains: 1
        },
        {
          id: 'week-b',
          at: '2026-11-17T04:00:00.000Z',
          level: 'phrase',
          rounds: [1, 2, 3],
          rating: 'Okay',
          awards: [],
          attempts: [
            { round: 3, word: 'spell', support: 'independent', splitOff: false, strategy: 'key' },
            { round: 3, word: 'spell', support: 'independent', splitOff: false, strategy: 'show' }
          ],
          animals: 7,
          trains: 4
        }
      ];
      if (name === 'home') { screen = 'home'; carriages = []; sessionTickets = store.tickets; }
      if (name === 'grown') screen = 'grown';
      if (name === 'round1') { screen = 'r1'; phase = 'pick'; current = null; carriages = []; slots = 4; used = {}; }
      if (name === 'card') { screen = 'r1'; phase = 'say'; roundNo = 1; current = byId('bell'); slots = 4; carriages = []; }
      if (name === 'hint') { screen = 'r1'; phase = 'help'; roundNo = 1; slots = 4; current = byId('spell'); }
      if (name === 'yay') { screen = 'yay'; yayWord = null; roundNo = 1; carriages = ['bell', 'fell', 'spell']; }
      if (name === 'round2') { set = words.sets[1]; screen = 'r2'; phase = 'pick'; roundNo = 2; current = byId('bill'); tiles = words.tilePool.slice(); carriages = []; }
      if (name === 'round3') { set = words.sets[0]; screen = 'r3'; phase = 'say'; roundNo = 3; current = byId('spell'); strategy = 'show'; doneStrats = { key: true, show: false, way: false }; carriages = ['spell']; }
      if (name === 'award') { screen = 'award'; roundNo = 1; }
      if (name === 'album') { screen = 'album'; returnTo = 'home'; }
      if (name === 'progress') { screen = 'progress'; returnTo = 'grown'; }
      if (name === 'how') { screen = 'how'; returnTo = 'grown'; }
      if (name === 'rate') screen = 'rate';
      render();
    }
  };
})();
