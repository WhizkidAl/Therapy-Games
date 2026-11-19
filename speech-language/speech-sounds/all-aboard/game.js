/* All Aboard v2. The child plays. A parent sits beside and taps how it went. */
(function () {
  'use strict';
  const words = window.AboardWords;
  const collect = window.AboardCollect;
  const $ = (id) => document.getElementById(id);
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const KEY = 'wk-games-all-aboard-v3-review';
  const sheets = ['grown', 'tickets', 'rate', 'award', 'album', 'progress', 'how'];
  let store = load();
  let set = words.sets.find(item => item.id === store.setId) || words.sets[0];
  let level = words.levels.some(item => item.id === store.level) ? store.level : 'word';
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
  let responseNote = '';
  let responseSaved = true;
  let introOpen = false;
  let storageOK = true;
  let usedHelp = false;
  let sessionTickets = 0;
  let roundCounts = { 1: 0, 2: 0, 3: 0 };
  let carriages = [];
  let yayWord = null;
  let session = null;
  let doneStrats = { key: false, show: false, way: false };
  let fly = null;
  let returnTo = 'home';
  let table = [];
  let hunt = null;
  let turn = 'child';
  let hands = { child: [], dad: [] };
  let findStep = 'play';
  let openUid = null;
  let findTimer = 0;
  let dealing = false;
  let talk = { text: '', who: 'pup' };

  function load() {
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(KEY) || localStorage.getItem('all-aboard-v2') || 'null'); } catch (error) { saved = null; }
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
    if (!saved.findOn) saved.findOn = { ell: true, ill: false, in: false };
    if (saved.findCount !== 2) saved.findCount = 1;
    if (typeof saved.muted !== 'boolean') saved.muted = false;
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
    saved.collection = AboardSummary.cleanCollection(saved.collection, collect);
    const bonus = saved.sessions.reduce((n,s)=>n+(s.awards||[]).filter(a=>a.id==='bonus' && (!saved.collectionResetAt || new Date(a.at||s.at)>new Date(saved.collectionResetAt))).length,0);
    saved.tickets = saved.collection.animals.length + saved.collection.trains.length + bonus;
    if(typeof saved.effectsOn!=='boolean')saved.effectsOn=true;
    return saved;
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(store)); storageOK = true; } catch (error) { storageOK = false; }
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
    if (id === 'boke') return 'Boke';
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
    return { id: null, onset: '', text: typed, phrase: typed, sentence: typed, clues: [['Group','What kind of thing is it?'],['Action','What does it do?'],['Place','Where would you find it?'],['Appearance','What does it look like?']] };
  }
  function countLine() {
    return 'Animals: '+store.collection.animals.length+' / '+collect.animals.length+' · Vehicles: '+store.collection.trains.length+' / '+collect.trains.length;
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
    return ({ independent: 'on his own', help: 'with help', separated: 'needed sounds separated', not_yet: 'not yet' })[support] || 'not recorded';
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
    return monday.getFullYear() + '-' + String(monday.getMonth()+1).padStart(2,'0') + '-' + String(monday.getDate()).padStart(2,'0');
  }
  function weekLabel(key) {
    const date = new Date(key + 'T00:00:00');
    return 'Week of ' + date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  function whenLabel(iso) {
    return new Date(iso).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' });
  }
  function say(lines) {
    const last = lines[lines.length - 1];
    talk = { text: last.text, who: last.who, screen: screen };
    if (store.muted || !window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      const voices = window.speechSynthesis.getVoices();
      const au = voices.find((item) => /en-AU/i.test(item.lang)) || voices.find((item) => /^en/i.test(item.lang));
      lines.forEach((line) => {
        const utter = new SpeechSynthesisUtterance(line.text);
        utter.lang = 'en-AU';
        utter.rate = 0.95;
        if (au) utter.voice = au;
        window.speechSynthesis.speak(utter);
      });
    } catch (error) { /* this browser has no speech */ }
  }
  function showTalk() {
    const node = $('talk');
    if (!node) return;
    if (!talk.text || talk.screen !== screen) {
      node.hidden = true;
      return;
    }
    node.hidden = false;
    node.className = 'talk ' + (talk.who === 'pig' ? 'pig' : 'pup');
    node.textContent = talk.text;
  }
  function familiesInPlay() {
    const chosen = words.sets.filter((item) => store.findOn[item.id]);
    const count = store.findCount === 2 ? 2 : 1;
    const list = (chosen.length ? chosen : [words.sets[0]]).slice(0, count);
    return list.length ? list : [words.sets[0]];
  }
  function beginFind() {
    clearTimeout(findTimer);
    const deck = [];
    familiesInPlay().forEach((group) => group.words.forEach((item) => deck.push(item)));
    table = shuffle(deck).map((item, index) => ({
      uid: item.id + '-' + index,
      item: item,
      down: false,
      gone: false,
      n: index + 1
    }));
    hands = { child: [], dad: [] };
    turn = 'child';
    openUid = null;
    hunt = null;
    current = null;
    findStep = 'deal';
    dealing = true;
    roundNo = 1;
    screen = 'r1';
    carriages = [];
    say([{ text: 'Look at the cards!', who: 'pig' }]);
    render();
  }
  function hideDeal() {
    if (screen !== 'r1' || findStep !== 'deal') return;
    dealing = false;
    table.forEach(card => { card.down = true; });
    nextHunt(true);
  }

  function nextHunt(first) {
    const left = table.filter((card) => !card.gone);
    if (!left.length) {
      findStep = 'over';
      const child = hands.child.length;
      const dad = hands.dad.length;
      let text = 'A draw! You both did so well.';
      if (child > dad) text = 'Player 1 wins! You both did so well.';
      if (dad > child) text = 'Dad wins! You both did so well.';
      say([{ text: text, who: 'pig' }]);
      render();
      return;
    }
    hunt = left[Math.floor(Math.random() * left.length)].item;
    findStep = 'play';
    openUid = null;
    current = null;
    const whoLine = turn === 'child' ? "Player 1's go!" : "Dad's go!";
    say([
      { text: first ? "Player 1's go!" : whoLine, who: turn === 'child' ? 'pig' : 'pup' },
      { text: 'Find ' + showName(hunt.id) + '!', who: 'pup' }
    ]);
    render();
  }
  function passTurn() {
    turn = turn === 'child' ? 'dad' : 'child';
    findStep = 'play';
    openUid = null;
    say([
      { text: turn === 'child' ? "Player 1's go!" : "Dad's go!", who: turn === 'child' ? 'pig' : 'pup' },
      { text: 'Find ' + showName(hunt.id) + '!', who: 'pup' }
    ]);
    render();
  }
  function onFindTap(uid) {
    if (screen !== 'r1') return;
    const card = table.find((item) => item.uid === uid);
    if (!card || card.gone) return;
    if (findStep === 'miss') {
      if (card.uid !== openUid || turn === 'child') return;
      card.down = true;
      passTurn();
      return;
    }
    if (findStep !== 'play') return;
    card.down = false;
    openUid = card.uid;
    if (session && turn === 'child') {
      if (!session.listening) session.listening = [];
      session.listening.push({target:hunt.id,selected:card.item.id,correct:card.item.id===hunt.id,at:new Date().toISOString()});
      persistSession();
    }
    if (hunt && card.item.id === hunt.id) {
      findStep = 'mark';
      AboardFeedback.play(true,store);
      current = card.item;
      say([{ text: turn === 'child' ? 'You found it! Now say the whole word: ' + showName(current.id) + '.' : 'You found it!', who: 'pig' }]);
      render();
      return;
    }
    findStep = 'miss';
    AboardFeedback.play(false,store);
    current = card.item;
    say([{ text: 'Uh oh! What word is it?', who: 'pup' }]);
    render();
  }

  function drawTrain() {
    const box = $('train'); box.replaceChildren();
    const cars = h('div', {class:'cars'});
    const live = ['r1','r2','r3','yay'].includes(screen);
    const held = live && roundNo===1 ? hands.child.map(id=>({id,owner:'Player 1'})).concat(hands.dad.map(id=>({id,owner:'Grown-up'}))) : live ? carriages.map(id=>({id,owner:''})) : [];
    const count = Math.max(4,held.length);
    for(let i=0;i<count;i++) {
      const wrap=h('div',{class:'car-unit'});
      wrap.append(h('img',{class:'carriage',src:'assets/carriage.webp',alt:''}));
      wrap.append(h('span',{class:'stand-aim'}));
      if(held[i]) {
        wrap.append(h('img',{class:'stood',src:'assets/cv_card_'+held[i].id+'.webp',alt:showName(held[i].id)}));
        if(held[i].owner) wrap.append(h('span',{class:'car-owner',text:held[i].owner}));
      }
      cars.append(wrap);
    }
    box.append(cars); box.append(h('img',{class:'engine',src:'assets/engine.webp',alt:''}));
  }

  function fitTrainSpace(){
    const world=document.querySelector('.world');if(!world)return;
    if(!['r1','r2','r3','yay'].includes(screen)){world.style.removeProperty('padding-bottom');return;}
    const bounds=[...document.querySelectorAll('.train,.train .stood')].map(el=>el.getBoundingClientRect());
    const top=Math.min(...bounds.map(r=>r.top));
    world.style.paddingBottom=Math.ceil(window.innerHeight-top+12)+'px';
  }
  window.addEventListener('resize',()=>requestAnimationFrame(fitTrainSpace));
  function ticketPill() {
    const pill = $('tickets');
    pill.replaceChildren();
    pill.append(h('img', { src: 'assets/ticket.webp', alt: '' }));
    const total = (screen === 'home' || screen === 'grown' || screen === 'album' || screen === 'progress' || screen === 'how') ? store.tickets : sessionTickets;
    pill.append(h('span', { text: store.tickets + ' tickets earned in this browser' }));
    if(session && ['r1','r2','r3','yay','award','rate'].includes(screen))pill.append(h('span',{class:'game-ticket-count',text:sessionTickets+' earned this game'}));
  }

  function setDad(on) {
    $('dad').hidden = !on || (roundNo === 1 && turn === 'dad');
    $('grown').hidden = on || screen === 'award';
    const ready = (screen === 'r1' && ['mark','miss'].includes(findStep)) || (screen === 'r2' && ['say','help'].includes(phase)) || (screen === 'r3' && !!strategy && !introOpen && responseSaved);
    ['own','with','split','not-yet'].forEach(id => { $(id).disabled = !ready; });
    $('tips').disabled = !current || (roundNo===3&&!strategy);
    $('dad-prompt').textContent = ready ? (roundNo === 3 ? 'Dad: how did this strategy go? Choose one to save.' : 'Dad: how did the whole word go? Choose one to save.') : (roundNo===3 && strategy && !responseSaved ? 'Dad: press Save response, then choose how it went.' : 'Dad: wait for the word or strategy, then choose one.');
    $('word-set').hidden = !(screen === 'r3' || screen === 'grown');
    const box = $('word-box');
    if (document.activeElement !== box) box.value = practiceText();
  }

  function record(support) {
    const entry = {
      round: roundNo,
      word: roundNo === 3 ? practiceText() : current.id,
      level: level,
      onset: roundNo === 3 ? null : current.onset,
      support: support,
      splitOff: support === 'separated',
      tipsOpened: usedHelp,
      response: roundNo === 3 ? responseNote.trim() : '',
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
        { transform: 'translate(' + Math.round(dx) + 'px, ' + Math.round(dy) + 'px) scale(0.48)' }
      ], { duration: 700, easing: 'ease-in', fill: 'forwards' });
      anim.onfinish = once;
      setTimeout(once, 1000);
    });
  }

  function placeCard(id) {
    if (id && carriages.length < 4) carriages.push(id);
    fly = null;
  }

  function afterCard() {
    yayWord = null;
    usedHelp = false;
    strategy = null;
    responseNote = '';
    responseSaved = true;
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
      promptFirstSound();
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
    if (roundNo === 2 && !['say','help'].includes(phase)) return;
    if (roundNo === 3 && (introOpen || !responseSaved)) return;
    if (!current || screen === 'yay' || screen === 'award') return;
    if (roundNo === 3 && !strategy) {
      $('live').textContent = 'Pick a strategy card first.';
      return;
    }
    if (roundNo === 3 && doneStrats[strategy]) return;
    if (roundNo!==1 || turn==='child') AboardFeedback.play(support!=='not_yet',store);
    if (roundNo === 1) {
      if (findStep === 'miss') {
        if (turn === 'child') record(support);
        const missed = table.find(item => item.uid === openUid);
        if (missed) missed.down = true;
        current = null; usedHelp = false; splitOff = false; phase = 'pick';
        passTurn(); return;
      }
      if (findStep !== 'mark') return;
      if (turn === 'child') record(support);
      const found = table.find((item) => item.uid === openUid);
      if (found) {
        found.gone = true;
        hands[turn].push(found.item.id);
      }
      const pictured = current.id;
      const who = turn;
      const index = (who === 'child' ? 0 : 2) + ((hands[who].length - 1) % 2);
      yayWord = current;
      fly = { id: pictured, index: index };
      screen = 'yay';
      phase = 'yay';
      render();
      armFly(() => {
        fly = null; usedHelp = false; splitOff = false; strategy = null;
        turn = who === 'child' ? 'dad' : 'child';
        screen = 'r1';
        phase = 'pick';
        nextHunt(false);
      });
      return;
    }
    record(support);
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
    clearTimeout(findTimer);
    screen = 'award';
    phase = 'pick';
    yayWord = null;
    say([{ text: 'A ticket for you!', who: 'pig' }]);
    render();
  }

  function takeTicket(kind) {
    if(screen !== 'award') return;
    if(session?.awards.some(a=>a.round===roundNo)) return;
    const item = nextItem(kind);
    if (item) {
      store.collection[kind].push(item.id);
      
      if (session) session.awards.push({ kind: kind, id: item.id, label: item.label, round:roundNo,at:new Date().toISOString() });
      persistSession();
    }
    store.tickets += 1; sessionTickets += 1;
    if (!item && session) session.awards.push({kind:kind,id:'bonus',label:'Bonus ticket',round:roundNo,at:new Date().toISOString()});
    persistSession();
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
      beginFind();
      return;
    } else if (number === 2) {
      queue = shuffle(set.words);
      current = queue[0];
      tiles = shuffle(words.tilePool);
      screen = 'r2';
    } else {
      current = round3Item();
      screen = 'r3';
    }
    if (number === 2) promptFirstSound();
    if (number === 3) { responseNote = ''; responseSaved=true; introOpen = !store.repairIntroSeen; say([{ text: 'Round 3. Choose a way to help me understand.', who: 'pup' }]); }
    render();
  }

  function promptFirstSound() {
    say([{ text: showName(current.id) + '. Which sound comes first in ' + showName(current.id) + '?', who: 'pup' }]);
  }

  function startPractice() {
    store.resume = null;
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
      status: 'in-progress',
      listening: [],
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
    if (screen === 'r2' && phase === 'say') return 'Now say the whole word: ' + showName(current.id);
    if (screen === 'r3') return strategy === 'show' ? 'Show it, point or act it out.' : strategy === 'way' ? 'Use another word or tell me about it.' : strategy === 'key' ? 'Say the important word: ' + practiceText() : 'Choose a way to help me understand.';
    if (phase === 'say' && current) return line(current);
    if (phase === 'onset') return 'Now pick a sound!';
    if (screen === 'r2') return showName(current.id) + ': which sound comes first?';
    if (screen === 'r3') return strategy ? strategyName(strategy) : 'Pick a way, then say it.';
    return 'Pick a card, then pick a sound!';
  }
  function sayBubble() {
    const box = h('div', { class: 'say' });
    box.append(h('div', { class: 'bubble', text: cueText() }));
    if (screen !== 'r3' && phase === 'say') box.append(h('div', { class: 'mouth', text: strategy === 'show' ? 'then show it!' : 'then say it!' }));
    return box;
  }
  function hintPanel() {
    if(!current.id)return h('div',{class:'hint-panel',text:'Dad: model the key word clearly, then let your child try it. Choose how much help was needed.'});
    const family = words.sets.find(group => group.words.some(item => item.id === current.id)) || set;
    const parts = [current.onset, family.rhyme];
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
    box.append(h('p',{text:'Dad: choose one result in the bar above to save this turn.'}));
    return box;
  }
  function cluePanel() {
    const box = h('div', { class: 'hint' });
    box.append(h('h3', { text: 'Dad tips: another way' }));
    box.append(h('p',{text:'A synonym is another word with a similar meaning, like spoke / talked. If there is no easy synonym, give a clue: the group it belongs to, what it does, where it is, or what it looks like.'}));
    const grid = h('div', { class: 'q' });
    (current.clues || []).forEach((pair) => {
      grid.append(h('b', { text: pair[0] }));
      grid.append(h('span', { text: pair[1] }));
    });
    box.append(grid);
    box.append(h('p',{text:'Dad: choose one result in the bar above to save this turn.'}));
    return box;
  }
  function gesturePanel() {
    const box = h('div', { class: 'hint' });
    box.append(h('h3', { text: 'Show or point' }));
    box.append(h('p', { text: 'This one is a gesture. He can point to the picture or show what it is. Dad records how it went using the choices above.' }));
    box.append(h('p',{text:'Dad: choose one result in the bar above.'}));
    return box;
  }

  function renderRound1() {
    const stage = h('div', { class: 'find-board' });
    if (findStep === 'over') {
      const box = h('div', { class: 'over' });
      const child = hands.child.length;
      const dad = hands.dad.length;
      let title = 'A draw!';
      if (child > dad) title = 'Player 1 wins!';
      if (dad > child) title = 'Dad wins!';
      box.append(h('h2', { text: title }));
      box.append(h('p', { text: 'You both did so well.' }));
      box.append(h('p', { text: 'Player 1 ' + child + '    Dad ' + dad }));
      box.append(h('button', { type: 'button', class: 'play-btn slim', text: 'Tickets', on: finishThisRound }));
      stage.append(box);
      return stage;
    }
    const turns = h('div', { class: 'turns' });
    [['child', 'Player 1\'s go', 'assets/pig.webp'], ['dad', 'Dad\'s go', 'assets/pup.webp']].forEach((item) => {
      const pill = h('div', { class: 'turn' + (turn === item[0] ? ' on' : '') });
      pill.append(h('img', { src: item[2], alt: '' }));
      pill.append(h('span', { text: item[1] }));
      turns.append(pill);
    });
    stage.append(turns);

    if (findStep === 'deal') {
      stage.append(h('div', { class: 'count-pill', text: 'Look at every picture. Remember where it is.' }));
      stage.append(h('button', {type:'button',class:'nav-btn',id:'ready-cards',text:'Ready - turn the cards over',on:hideDeal}));
    }
    const row = h('div', { class: 'find-row' + (findStep==='play'?' awaiting-card':'') });
    table.forEach((card, index) => {
      if (card.gone) {
        row.append(h('div', { class: 'find-card gone', 'aria-hidden': 'true' }));
        return;
      }
      const button = h('button', {
        type: 'button',
        class: 'find-card' + (card.down ? ' down' : '') + (dealing && !reduce ? ' deal' : ''),
        style: findStep === 'deal' ? 'animation-delay:' + (index * 90) + 'ms' : '',
        'aria-label': card.down ? 'Card ' + card.n : showName(card.item.id),
        'aria-disabled': findStep!=='play'?'true':'false',
        on: () => onFindTap(card.uid)
      });
      const inner = h('span', { class: 'inner' });
      const face = h('span', { class: 'face' });
      face.append(h('img', { src: 'assets/cv_card_' + card.item.id + '.webp', alt: '' }));
      face.append(h('span', { class: 'num', text: String(card.n) }));
      const back = h('span', { class: 'backface' });
      back.append(h('img', { src: 'assets/engine.webp', alt: '' }));
      back.append(h('span', { class: 'num', text: String(card.n) }));
      inner.append(face);
      inner.append(back);
      button.append(inner);
      row.append(button);
    });
    stage.append(row);
    if (findStep === 'miss') stage.append(h('p', { class: 'count-pill', text: turn === 'child' ? 'Say this word. Grown-up, mark how it went.' : 'Name this word, then tap the card.' }));
    if (findStep === 'mark' && turn === 'child') stage.append(h('p', { class: 'count-pill', text: 'Say the whole word. Dad, choose how it went above.' }));
    if (findStep === 'mark' && turn === 'dad') stage.append(h('button', {type:'button',class:'nav-btn',text:'Keep this card',on:()=>score('independent')}));
    if (phase === 'help' && current) stage.append(hintPanel());
    return stage;
  }

  function renderRound2() {
    const stage = h('div', { class: 'playfield' + (phase === 'help' ? ' wide' : '') });
    const main = h('div', { class: 'play-main rowish' });
    const pic = h('div', { class: 'pic-only' });
    pic.append(h('img', { src: 'assets/cv_pic_' + current.id + '.webp', alt: '' }));
    pic.append(h('div', { class: 'caption', text: '?' }));
    main.append(pic);
    main.append(h('button',{type:'button',class:'nav-btn',text:'Hear the word',on:()=>{say([{text:showName(current.id),who:'pup'}]);showTalk();}}));
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
    if(session){if(!session.soundChoices)session.soundChoices=[];session.soundChoices.push({word:current.id,selected:tile,correct:tile===current.onset,at:new Date().toISOString()});persistSession();}
    AboardFeedback.play(tile===current.onset,store);
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
    say([{ text: 'Now say the whole word: ' + showName(current.id) + '.', who: 'pup' }]);
    render();
  }

  function renderRound3() {
    if (introOpen) return repairLesson();
    const stage = h('div', { class: 'playfield' + (phase === 'help' ? ' wide' : '') });
    const main = h('div', { class: 'play-main' });
    main.append(h('p',{class:'round3-instruction',text:!strategy ? (Object.values(doneStrats).some(Boolean)?'Choose another card without a tick.':'1. Touch a repair card. Then use that way to help Dad understand.') : '2. '+(strategy==='key'?'Say the important word.':strategy==='show'?'Point to it, show it, or act it out.':'Use different words, or describe it.')+' 3. Dad: save a note if useful, then choose how it went.'}));
    const band = h('div', { class: 'play-main rowish fit' });
    const card = h('div', { class: 'float-card' });
    if(current.id)card.append(h('img', { src: 'assets/cv_card_' + current.id + '.webp', alt: showName(current.id) }));
    card.append(h('div', { class: 'caption', text: practiceText() }));
    band.append(card);
    const strats = h('div', { class: 'strats' + (!strategy?' awaiting-strategy':'') });
    [['key', 'Say the key word'], ['show', 'Show or point'], ['way', 'Say it another way']].forEach((item) => {
      const button = h('button', {
        type: 'button',
        class: 'strat ' + item[0] + (strategy === item[0] ? ' on' : '') + (doneStrats[item[0]] ? ' done' : ''),
        'aria-label': item[1],
        disabled: doneStrats[item[0]],
        on: () => {
          if (doneStrats[item[0]]) return;
          strategy = item[0];
          responseNote = '';
          responseSaved=true;
          phase = 'say';
          render();
        }
      });
      button.append(h('span', {class:'repair-art repair-'+item[0],role:'img','aria-label':item[1]+' original printed card'}));
      if (doneStrats[item[0]]) button.append(h('span', { class: 'tick', text: '✓' }));
      strats.append(button);
    });
    band.append(strats);
    main.append(band);
    main.append(h('p',{class:'count-pill',text:'A tick means this strategy has been practised.'}));
    if (strategy) {
      const label=h('label',{class:'response-label',text:strategy==='way'?'Dad: what other words did he use? (optional)':strategy==='show'?'Dad: what did he show or do? (optional)':'Dad: what key word did he say? (optional)'});
      const input=h('input',{id:'response-note',type:'text',maxlength:200,value:responseNote,'aria-label':'What he said or did'});
      input.addEventListener('input',()=>{responseNote=input.value;responseSaved=!responseNote.trim();setDad(true);checkpoint();const status=$('note-status');if(status)status.textContent=responseSaved?'No note added. Choose how it went above.':'Press Save response or Enter to keep this note.';});
      const form=h('form',{class:'response-form'});label.append(input);form.append(label);
      form.append(h('button',{type:'submit',class:'nav-btn',id:'save-response',text:'Save response'}));
      form.append(h('span',{id:'note-status',role:'status',text:responseSaved&&responseNote?'Response saved. Choose how it went above.':'Optional: add words or a gesture, then press Save response.'}));
      form.addEventListener('submit',e=>{e.preventDefault();responseSaved=true;checkpoint();render();});main.append(form);
    }
    main.append(h('button',{type:'button',class:'nav-btn',text:'Learn with Station Pup',on:()=>{introOpen=true;render();}}));
    stage.append(main);
    const side = h('div', { class: 'play-side' });
    if (phase === 'help') side.append(strategy === 'way' ? cluePanel() : strategy === 'show' ? gesturePanel() : hintPanel());
    else side.append(sayBubble());
    stage.append(side);
    return stage;
  }


  function repairLesson() {
    const panel=h('div',{class:'panel lesson'});
    panel.append(h('h2',{text:'Station Pup: help me understand'}));
    const intro='If I do not understand, choose a way to help me. Say the key word. Or show me: point to the picture, or use your hands to act it out. Or say it another way. You can use a word with a similar meaning, like talked for spoke. Or tell me what it does, where it is, or what it looks like. Dad can give a model and help you choose.';
    panel.append(h('p',{text:intro}));
    const rows=[['Say the key word','Choose the important word and say it.'],['Show or point','Point to the object or picture, or act out what it does.'],['Say it another way','Use a synonym, or describe its group, action, place, appearance or parts.']];
    rows.forEach(([title,text])=>{panel.append(h('h3',{text:title}));panel.append(h('p',{text:text}));});
    panel.append(h('p',{text:'Example: bell → something that rings. Spoke → talked. A useful description counts; it does not have to be a single synonym.'}));
    panel.append(h('button',{type:'button',class:'nav-btn',text:'Listen to Station Pup',on:()=>{say([{text:intro,who:'pup'}]);showTalk();}}));
    panel.append(h('button',{type:'button',class:'nav-btn',text:'Skip / start practice',on:()=>{introOpen=false;store.repairIntroSeen=true;save();if(window.speechSynthesis)window.speechSynthesis.cancel();talk={text:''};render();}}));
    return panel;
  }
  function checkpoint() {
    if(!session || !['r1','r2','r3','yay','award','rate'].includes(screen)) return;
    store.resume={sessionId:session.id,setId:set.id,level,screen,roundNo,phase,slots,used,current,queue,step,tiles,strategy,responseNote,responseSaved,introOpen,usedHelp,sessionTickets,roundCounts,carriages,yayWord,doneStrats,table,hunt,turn,hands,findStep,openUid,talk};
    save();
  }
  function resumePractice() {
    const r=store.resume;if(!r)return;
    session=store.sessions.find(s=>s.id===r.sessionId);if(!session){store.resume=null;save();render();return;}
    set=words.sets.find(s=>s.id===r.setId)||words.sets[0];
    store.roundsOn = {1:session.rounds.includes(1),2:session.rounds.includes(2),3:session.rounds.includes(3)};
    ({level,screen,roundNo,phase,slots,used,current,queue,step,tiles,strategy,responseNote,responseSaved,introOpen,usedHelp,sessionTickets,roundCounts,carriages,yayWord,doneStrats,table,hunt,turn,hands,findStep,openUid,talk}=r);
    dealing=false;
    if(typeof responseSaved!=='boolean')responseSaved=true;
    if(screen==='yay') {
      if(roundNo===1){turn=turn==='child'?'dad':'child';screen='r1';phase='pick';nextHunt(false);}
      else {if(yayWord)placeCard(yayWord.id);afterCard();}
      return;
    }
    render();
  }

  function renderHome() {
    const wrap = h('div', { class: 'play-main' });
    if(store.resume) wrap.append(h('button',{type:'button',class:'play-btn',id:'resume',text:'Continue Round '+store.resume.roundNo,on:resumePractice}));
    wrap.append(h('h2',{class:'home-heading',text:'Which game shall we play?'}));
    const choices=h('div',{class:'home-rounds'});
    const names={1:'Find the card',2:'First sounds',3:'Fix-It practice'};
    [1,2,3].forEach(n=>{
      const button=h('button',{type:'button',class:'round-launch',id:'round-start-'+n,on:()=>startChosenRounds([n])});
      button.append(h('strong',{text:'Play Round '+n}));
      button.append(h('span',{text:names[n]}));choices.append(button);
    });
    wrap.append(choices);
    wrap.append(h('button', { type: 'button', class: 'play-btn slim', id: 'play', text: 'Play all rounds', on: ()=>startChosenRounds([1,2,3]) }));
    wrap.append(h('button',{type:'button',class:'nav-btn',text:'Dad: progress summary',on:()=>openSheet('progress')}));
    const last=store.sessions.at(-1);
    if(last) wrap.append(h('p',{class:'count-pill',text:'Last practice: '+whenLabel(last.at)+' · '+last.attempts.length+' recorded turns · '+(last.status==='completed'?'finished':'in progress')}));
    wrap.append(h('p',{class:'note',text:storageOK?'Progress and tickets stay in this browser on this device.':'Saving is unavailable in this browser. Export progress before closing.'}));
    wrap.append(h('p', { class: 'count-pill', text: countLine() }));
    const today = selectedRounds().map((n) => 'Round ' + n).join(', ');
    wrap.append(h('p', { class: 'note', text: 'Pick one game above, or play all three in order.' }));
    wrap.append(h('button', { type: 'button', class: 'nav-btn', text: 'My collection', on: () => openSheet('album') }));
    return wrap;
  }

  function openSheet(name) {
    returnTo = screen === 'grown' ? 'grown' : 'home';
    screen = name;
    render();
  }

  function startChosenRounds(numbers) {
    store.roundsOn={1:numbers.includes(1),2:numbers.includes(2),3:numbers.includes(3)};
    save();
    startPractice();
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
    panel.append(h('button',{type:'button',class:'nav-btn',id:'play-selected',text:'Start selected rounds',on:startPractice}));
    panel.append(h('p', { class: 'note', text: 'Any mix is fine. Round 3 uses the word box above. Change that word whenever you like.' }));
    panel.append(h('h3', { text: 'Round 1 families' }));
    const families = h('div', { class: 'rounds' });
    words.sets.forEach((item) => {
      families.append(h('button', {
        type: 'button',
        class: 'round-pick' + (store.findOn[item.id] ? ' on' : ''),
        text: item.words.map((word) => showName(word.id)).join(' '),
        'aria-pressed': store.findOn[item.id] ? 'true' : 'false',
        on: () => {
          const next = !store.findOn[item.id];
          const onCount = words.sets.filter((group) => store.findOn[group.id]).length;
          if (!next && onCount === 1) return;
          if (next) {
            const active = words.sets.filter(group => store.findOn[group.id]);
            while (active.length >= store.findCount) store.findOn[active.shift().id] = false;
          }
          store.findOn[item.id] = next;
          const now = words.sets.filter((group) => store.findOn[group.id]).length;
          if (now < 2) store.findCount = 1;
          save();
          render();
        }
      }));
    });
    panel.append(families);
    const counts = h('div', { class: 'rounds' });
    [1, 2].forEach((count) => {
      counts.append(h('button', {
        type: 'button',
        class: 'round-pick' + (store.findCount === count ? ' on' : ''),
        text: count + ' set' + (count > 1 ? 's' : '') + ' (' + (count * 4) + ' cards)',
        on: () => {
          if (count === 2) {
            const on = words.sets.filter((group) => store.findOn[group.id]);
            if (on.length < 2) {
              const extra = words.sets.find((group) => !store.findOn[group.id]);
              if (extra) store.findOn[extra.id] = true;
            }
          }
          store.findCount = count;
          if (count === 1) { const active=words.sets.filter(group=>store.findOn[group.id]); active.slice(1).forEach(group=>store.findOn[group.id]=false); }
          save();
          render();
        }
      }));
    });
    panel.append(counts);
    const voiceRow = h('div', { class: 'shop' });
    voiceRow.append(h('strong', { text: 'Pup and pig talk' }));
    const mute = h('button', {
      type: 'button',
      class: 'switch' + (store.muted ? '' : ' on'),
      'aria-pressed': store.muted ? 'false' : 'true',
      'aria-label': 'Talking on or off',
      on: () => {
        store.muted = !store.muted;
        if (store.muted && window.speechSynthesis) window.speechSynthesis.cancel();
        save();
        render();
      }
    });
    mute.append(h('i', {}));
    voiceRow.append(mute);
    panel.append(voiceRow);
    const effects=h('div',{class:'shop'});
    effects.append(h('button',{type:'button',class:'nav-btn',text:store.effectsOn?'Game sounds & celebrations: on':'Game sounds & celebrations: off',on:()=>{store.effectsOn=!store.effectsOn;save();render();}}));
    const volumeLabel=h('label',{text:'Effect volume '});const volume=h('input',{type:'range',min:0,max:1,step:.05,value:store.effectsVolume??.55,'aria-label':'Effect volume'});
    volume.addEventListener('input',()=>{store.effectsVolume=Number(volume.value);save();});volumeLabel.append(volume);effects.append(volumeLabel);panel.append(effects);
    const reset=h('details',{class:'ticket-reset'});reset.append(h('summary',{text:'Clear test tickets'}));reset.append(h('p',{text:'This clears only the ticket collection in this browser. Speech practice records stay saved.'}));
    const confirm=h('input',{type:'checkbox',id:'confirm-tickets'});const label=h('label',{text:' I want to begin a fresh ticket collection. '});label.prepend(confirm);reset.append(label);
    reset.append(h('button',{type:'button',class:'nav-btn',text:'Clear ticket collection',on:()=>{if(!confirm.checked)return;store.collection={animals:[],trains:[]};store.tickets=0;store.deal={animals:[],trains:[]};store.collectionResetAt=new Date().toISOString();sessionTickets=0;if(store.resume)store.resume.sessionTickets=0;save();render();}}));panel.append(reset);
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
      const button = h('button', { type: 'button', class: 'level' + (level === item.id ? ' on' : ''), on: () => { level = item.id; store.level = level; save(); render(); } });
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
          store.setId = item.id;
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
    panel.append(h('p', { text: 'You finished a round! Choose an animal or train ticket for your collection.' }));
    const row = h('div', { class: 'mystery' });
    [['animals', 'Animal ticket'], ['trains', 'Train ticket']].forEach((pair) => {
      const item = nextItem(pair[0]);
      const button = h('button', { type: 'button', 'aria-label': pair[1], on: () => takeTicket(pair[0]) });
      button.style.position = 'relative';
      button.append(h('img', { src: item ? 'assets/collect/' + (pair[0] === 'animals' ? 'animal-' : 'train-') + item.id + '.svg' : 'assets/ticket.webp', alt: '' }));
      button.append(h('div', { class: 'caption', text: item ? item.label : 'Bonus ticket' }));
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
    panel.append(h('p', { class: 'note', text: 'Saved in this browser only. Online progress saving is not connected in this test version.' }));
    const report=AboardSummary.summarise(store.sessions);
    if(report.empty)panel.append(h('p',{text:'Play a game and record how the turns went. A summary will appear here.'}));
    else {
      const summary=h('section',{class:'progress-summary'});
      summary.append(h('h3',{text:'Latest practice · '+whenLabel(report.latest.at)+(report.latest.status==='completed'?'':' · in progress')}));
      summary.append(h('p',{class:'summary-headline',text:'See which starting sounds are becoming easier, and where help or sound separation is still needed.'}));
      const soundGroups=AboardSummary.bySound(store.sessions,words);
      for(const practiceLevel of ['word','phrase','sentence']){
        const groups=soundGroups.filter(g=>g.level===practiceLevel);
        if(!groups.length)continue;
        summary.append(h('h3',{text:(practiceLevel==='word'?'Word':practiceLevel==='phrase'?'Phrase':'Sentence')+' level · progress by starting sound'}));
        groups.forEach(g=>{
          const block=h('section',{class:'sound-summary','data-sound':g.sound,'data-level':g.level});
          block.append(h('h4',{text:g.sound.toUpperCase()+' · '+g.words.map(w=>w.word).join(', ')}));
          const c=g.latest.counts;
          block.append(h('p',{text:'Latest practice ('+whenLabel(g.latest.at)+'): '+c.independent+'/'+g.latest.total+' without help; '+c.help+' with help; '+c.separated+' needed sounds separated; '+c.not_yet+' not yet.'}));
          if(g.previous)block.append(h('p',{class:'note',text:'Same words, same level: '+g.previous.counts.independent+'/'+g.previous.total+' without help on '+whenLabel(g.previous.at)+' → '+c.independent+'/'+g.latest.total+' in the latest practice. Sounds separated: '+g.previous.counts.separated+' → '+c.separated+'.'}));
          const wrap=h('div',{class:'sound-table-wrap'}),table=h('table',{class:'sound-table'}),head=h('tr',{});
          ['Word','Without help','With help','Sounds separated','Not yet','Latest try'].forEach(label=>head.append(h('th',{scope:'col',text:label})));table.append(head);
          g.words.forEach(w=>{const row=h('tr',{});row.append(h('th',{scope:'row',text:w.word}));[w.counts.independent,w.counts.help,w.counts.separated,w.counts.not_yet,howText(w.last)].forEach(value=>row.append(h('td',{text:String(value)})));table.append(row);});wrap.append(table);block.append(wrap);
          block.append(h('p',{class:'note',text:'Word rows count all recorded tries at this level. “Without help” records Dad’s rating for that try; it does not set a mastery target.'}));summary.append(block);
        });
      }
      if(!soundGroups.some(g=>g.level==='word'))summary.append(h('p',{text:'No word-level speech ratings yet. Phrase, sentence and repair practice are kept separate.'}));
      if(report.listening.total)summary.append(h('p',{text:'Finding pictures: '+report.listening.correct+' of '+report.listening.total+' listening choices matched the requested word.'}));
      if(report.sounds.total)summary.append(h('p',{text:'First sounds: '+report.sounds.correct+' of '+report.sounds.total+' sound choices matched. This includes choices before a correction.'}));
      if(report.strategies.length){summary.append(h('h3',{text:'Ways to help Dad understand'}));report.strategies.forEach(r=>summary.append(h('p',{text:strategyName(r.id)+': '+r.counts.independent+' without help, '+(r.counts.help+r.counts.separated)+' with support, '+r.counts.not_yet+' not yet.'})));}
      summary.append(h('h3',{text:'Last 7 days'}));summary.append(h('p',{text:report.recentGames+' completed games across '+report.recentDays+' practice days; '+report.recentTurns+' recorded turns.'}));
      summary.append(h('p',{class:'note',text:'Based on Dad’s ratings, not automatic speech scoring. Different words and levels can need different amounts of help.'}));panel.append(summary);
    }
    const details=h('details',{class:'raw-records'});details.append(h('summary',{text:'Detailed records by week'}));
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
        const card = h('details', { class: 'sess' });
        card.append(h('summary',{text:whenLabel(item.at)+' · '+(item.attempts||[]).length+' recorded turns'}));
        if(item.listening?.length) card.append(h('div',{text:'Listening: '+item.listening.filter(a=>a.correct).length+' / '+item.listening.length+' correct selections'}));
        const rounds = (item.rounds || []).map((n) => 'Round ' + n).join(', ');
        card.append(h('div', { text: whenLabel(item.at) + ' · ' + (item.level || 'word') + ' · ' + rounds }));
        (item.attempts || []).forEach((attempt) => {
          const bits = ['Round ' + attempt.round, attempt.word, howText(attempt.support)];
          if (attempt.splitOff) bits.push('sound split off');
          if (attempt.strategy) bits.push(strategyName(attempt.strategy));
          if (attempt.response) bits.push('Said / did: '+attempt.response);
          card.append(h('div', { text: bits.join(' · ') }));
        });
        card.append(h('div', { text: 'Enjoyment: ' + (item.rating || 'not yet') + ' · Tickets earned this game: ' + (item.awards||[]).length }));
        block.append(card);
      });
      details.append(block);
    });
    panel.append(details);
    const row = h('div', { class: 'nav-row' });
    row.append(h('button', { type: 'button', class: 'nav-btn', text: 'Download optional backup', on: exportCsv }));
    row.append(h('button', { type: 'button', class: 'play-btn slim', text: 'Close', on: () => { screen = returnTo; render(); } }));
    panel.append(row);
    return panel;
  }

  function csvCell(value) {
    const text = value == null ? '' : String(value);
    return /[",\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
  }
  function exportCsv() {
    const rows = [['week', 'date', 'rounds', 'level', 'word', 'how', 'sound split off', 'strategy', 'rating', 'animals', 'trains', 'said or did']];
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
          shared[4], shared[5], shared[6], attempt ? (attempt.response || '') : ''
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
      'On the home screen, choose Play Round 1, Play Round 2, Play Round 3, or Play all rounds. For another combination, open Choose rounds & settings, select the rounds, then Start selected rounds. Continue resumes an unfinished game; it does not begin at Round 1.',
      'Round 1 is find the card. The pictures stay face up until you tap Ready - turn the cards over. The pup asks for one word, such as Find spell. Tap a card. That card flips. If it is the one, he keeps it and you mark on his own, with help, or sound split off. If it is not, he says the word he turned over, the card flips back, and it is the other go. You take turns. The one with the most cards wins, and you both did well. One family is 4 cards. Two families is 8 cards.',
      'Sit beside him. When he says it by himself, tap Got it on his own. If you had to model it, tap Got it with help. Choose Needed sounds separated when you separated the first sound from the rest. Choose Not yet when it did not happen. Each choice saves and moves on.',
      'Tips shows a model, or another way to say the word. He still keeps that turn.',
      'Round 3 has three cards: Say the key word, Show or point, and Say it another way. Type the word in the box and change it whenever you like. Show or point is a gesture. Record the gesture using Dad’s choices. You can add what he said or did in the note field. The round is done when each card has a tick.',
      'At the end of a round the engineer gives one ticket. He picks an animal ticket or a train ticket and gets a new picture. My collection shows every picture, and how many he has.',
      'Progress lists each week: the date, rounds, level and recorded responses. This test version saves in this browser only; online saving is not connected. Download optional backup is available if you want your own copy.'
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
            session.status = 'completed';
            session.endedAt = new Date().toISOString();
            persistSession();
          }
          store.ratings.push({ rating: item[1], at: new Date().toISOString() });
          save();
          session = null;
          store.resume = null; save();
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
    stack.append(h('div', { class: 'yay', text: 'Thanks for practising!' }));
    if (yayWord && yayWord.id) {
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
      r1: 'Round 1: Find the card',
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
    document.querySelector('.train').style.zIndex = (screen === 'r1' || screen === 'r2' || screen === 'r3' || screen === 'yay') ? '7' : '5';
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
    requestAnimationFrame(fitTrainSpace);
    document.querySelectorAll('.train img').forEach(img=>img.addEventListener('load',fitTrainSpace,{once:true}));
    showTalk();
    $('live').textContent = talk.text || $('title').textContent;
    $('pause-game').hidden = !['r1','r2','r3','award','rate'].includes(screen);
    checkpoint();
  }

  $('grown').addEventListener('click', () => { screen = screen === 'grown' ? 'home' : 'grown'; render(); });
  $('own').addEventListener('click', () => score('independent'));
  $('with').addEventListener('click', () => score('help'));
  $('split').addEventListener('click', () => score('separated'));
  $('not-yet').addEventListener('click', () => score('not_yet'));
  $('pause-game').addEventListener('click',()=>{checkpoint();screen='home';talk={text:''};render();});
  $('tips').addEventListener('click', () => {
    if (screen === 'r1' && findStep !== 'mark' && findStep !== 'miss') {
      $('live').textContent = 'Find the card first.';
      return;
    }
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
  $('word-set').addEventListener('submit',e=>{
    e.preventDefault();const value=$('word-box').value.trim();if(!value)return;
    if(value!==practiceText()){store.practiceWord=value;responseNote='';responseSaved=true;strategy=null;doneStrats={key:false,show:false,way:false};if(screen==='r3')current=round3Item();}
    save();render();$('word-status').textContent='Word set: '+practiceText();
  });
  ensureDeal();
  render();

  window.Aboard = {exportData(){return JSON.parse(JSON.stringify(store));},version:'3.4.0-review'};
})();

