const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const engine = require(path.join(root, 'speech-language/speech-sounds/all-aboard/all-aboard.js'));
const demo = require(path.join(root, 'speech-language/speech-sounds/all-aboard/demo-config.json'));
const catalogue = require(path.join(root, 'catalogue.json'));
const schema = require(path.join(root, 'catalogue.schema.json'));

const BANNED = /try again|say it again|say it slowly/i;

function validateSchema(schemaNode, data, rootSchema) {
  const rootNode = rootSchema || schemaNode;
  if (schemaNode.$ref) {
    let target = rootNode;
    schemaNode.$ref.replace(/^#\//, '').split('/').forEach((part) => { target = target[part]; });
    return validateSchema(target, data, rootNode);
  }
  const errors = [];
  if (schemaNode.enum && !schemaNode.enum.includes(data)) errors.push('not in enum');
  if (schemaNode.type === 'object') {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return ['expected object'];
    (schemaNode.required || []).forEach((key) => {
      if (data[key] === undefined) errors.push('missing ' + key);
    });
    Object.keys(data).forEach((key) => {
      if (!schemaNode.properties[key]) {
        if (schemaNode.additionalProperties === false) errors.push('unexpected ' + key);
      } else {
        validateSchema(schemaNode.properties[key], data[key], rootNode).forEach((error) => errors.push(key + ': ' + error));
      }
    });
  } else if (schemaNode.type === 'array') {
    if (!Array.isArray(data)) return ['expected array'];
    if (schemaNode.minItems != null && data.length < schemaNode.minItems) errors.push('minItems');
    data.forEach((item, index) => {
      validateSchema(schemaNode.items, item, rootNode).forEach((error) => errors.push('[' + index + '] ' + error));
    });
  } else if (schemaNode.type === 'string') {
    if (typeof data !== 'string') return ['expected string'];
    if (schemaNode.minLength != null && data.length < schemaNode.minLength) errors.push('minLength');
    if (schemaNode.pattern && !new RegExp(schemaNode.pattern).test(data)) errors.push('pattern');
  } else if (schemaNode.type === 'boolean') {
    if (typeof data !== 'boolean') errors.push('expected boolean');
  }
  return errors;
}

function fresh() {
  return engine.createGame(demo, { now: 1_000, rng: () => 0, opponent: 'computer', levelId: '1' });
}

function place(state, layout) {
  const idOf = (text) => {
    const card = state.trainCards.find((item) => item.text === text);
    if (!card) throw new Error('No card for ' + text);
    return card.id;
  };
  const placed = {};
  Object.entries(layout).forEach(([owner, texts]) => { placed[owner] = texts.map(idOf); });
  const moving = new Set(Object.values(placed).flat());
  ['child', 'opponent'].forEach((player) => {
    state.players[player].hand = state.players[player].hand.filter((id) => !moving.has(id));
    state.players[player].complete = state.players[player].complete.filter(() => false);
  });
  state.yard = state.yard.filter((id) => !moving.has(id));
  Object.entries(placed).forEach(([owner, ids]) => {
    if (owner === 'yard') state.yard.push(...ids);
    else state.players[owner].hand.push(...ids);
  });
  state.phase = 'choose';
  state.turn = 'child';
  state.request = null;
  state.repair = null;
  state.pendingHeardId = null;
  return state;
}

function cardId(state, text) {
  return state.trainCards.find((card) => card.text === text).id;
}

function askHeard(state, intended, heard) {
  state = engine.beginAsk(state, 'child', cardId(state, intended));
  state = engine.beginListening(state);
  state = engine.proposeHeard(state, cardId(state, heard));
  return engine.confirmHeard(state, true);
}

test('demo config loads and keeps the three repair choices', () => {
  const checked = engine.validateConfig(demo);
  assert.equal(checked.ok, true, checked.errors.join('; '));
  assert.deepEqual(checked.config.repairStrategies.map((item) => item.label), ['Say the key word', 'Show or point', 'Tell it another way']);
  assert.deepEqual(checked.config.repairStrategies.map((item) => item.kind), ['speech', 'show', 'meaning']);
  assert.equal(checked.config.repairCheck, 'I heard {heard}. Do you mean {heard} or {intended}?');
  assert.equal(checked.config.maxMixUps, 1);
  assert.equal(BANNED.test(JSON.stringify(checked.config.repairStrategies)), false);
  assert.equal(BANNED.test(checked.config.repairCheck), false);
  const nonwords = checked.config.sets.flatMap((set) => set.words.filter((word) => word.nonword).map((word) => word.text));
  assert.deepEqual(nonwords, ['smill', 'smin']);
  const minimal = checked.config.sets.find((set) => set.approach === 'minimal-pairs');
  assert.equal(minimal.words.length, 2);
  assert.equal(checked.config.sets.filter((set) => set.approach === 'multiple-oppositions').length, 3);
});

test('omitted repair settings use the clinician defaults', () => {
  const raw = JSON.parse(JSON.stringify(demo));
  delete raw.repairStrategies;
  delete raw.repairCheck;
  delete raw.maxMixUps;
  const checked = engine.validateConfig(raw);
  assert.equal(checked.ok, true);
  assert.equal(checked.config.repairStrategies[1].id, 'show-or-point');
  assert.equal(checked.config.maxMixUps, 1);
});

test('repetition cues and the old prompt list are rejected', () => {
  const slow = JSON.parse(JSON.stringify(demo));
  slow.repairStrategies[0].hint = 'Say it slowly';
  assert.equal(engine.validateConfig(slow).ok, false);
  const again = JSON.parse(JSON.stringify(demo));
  again.repairCheck = 'Try again: {heard} or {intended}';
  assert.equal(engine.validateConfig(again).ok, false);
  const old = JSON.parse(JSON.stringify(demo));
  old.repairPrompts = ['Say it again'];
  assert.equal(engine.validateConfig(old).ok, false);
});

test('config source prefers an injected object, then a fetched one', () => {
  assert.equal(engine.selectConfigSource({ injected: { id: 'a' }, fetched: { id: 'b' }, embedded: { id: 'c' } }).source, 'init');
  assert.equal(engine.selectConfigSource({ fetched: { id: 'b' }, embedded: { id: 'c' } }).source, 'url');
  assert.equal(engine.selectConfigSource({ embedded: demo }).source, 'embedded');
});

test('a mix-up moves the heard card, checks politely, and scores the chosen repair', () => {
  let state = place(fresh(), { child: ['fell'], opponent: ['bell', 'spell'] });
  state = askHeard(state, 'spell', 'bell');
  assert.equal(state.phase, 'repair-choose');
  assert.equal(state.repair.check, 'I heard bell. Do you mean bell or spell?');
  assert.equal(state.players.child.hand.includes(cardId(state, 'bell')), true);
  state = engine.chooseRepair(state, 'show-or-point');
  assert.equal(state.phase, 'repair-show');
  state = engine.finishShowRepair(state);
  const results = engine.buildResults(state, 5_000);
  assert.equal(results.level, '1');
  assert.equal(results.durationMs, 4_000);
  assert.equal(results.incorrect, 1);
  assert.equal(results.repairAttempts, 1);
  assert.equal(results.repairSuccesses, 1);
  assert.equal(results.repairs[0].strategyId, 'show-or-point');
  assert.equal(results.repairs[0].success, true);
  assert.equal(results.repairByStrategy['show-or-point'].successes, 1);
  const spell = results.words.find((word) => word.text === 'spell');
  assert.equal(spell.incorrect, 1);
  assert.equal(spell.repairSuccesses, 1);
});

test('saying the key word is scored from what the listener heard', () => {
  let state = place(fresh(), { child: ['fell'], opponent: ['bell', 'spell'] });
  state = askHeard(state, 'spell', 'bell');
  state = engine.chooseRepair(state, 'key-word');
  state = engine.beginListening(state);
  state = engine.proposeHeard(state, cardId(state, 'spell'));
  state = engine.confirmHeard(state, true);
  assert.equal(state.repairs[0].strategyId, 'key-word');
  assert.equal(state.repairs[0].success, true);
  state = place(fresh(), { child: ['fell'], opponent: ['bell', 'spell'] });
  state = askHeard(state, 'spell', 'bell');
  state = engine.chooseRepair(state, 'key-word');
  state = engine.beginListening(state);
  state = engine.proposeHeard(state, cardId(state, 'bell'));
  state = engine.confirmHeard(state, true);
  assert.equal(state.repairs[0].success, false);
});

test('telling it another way uses the listener meaning check', () => {
  let state = place(fresh(), { child: ['fell'], opponent: ['bell', 'spell'] });
  state = askHeard(state, 'spell', 'bell');
  state = engine.chooseRepair(state, 'another-way');
  state = engine.finishMeaningRepair(state, false);
  assert.equal(engine.buildResults(state).repairSuccesses, 0);
  assert.equal(state.repairs[0].strategyKind, 'meaning');
});

test('only one mix-up opens a repair', () => {
  let state = place(fresh(), { child: ['fell'], opponent: ['bell', 'spell'] });
  state = askHeard(state, 'spell', 'bell');
  state = engine.chooseRepair(state, 'show-or-point');
  state = engine.finishShowRepair(state);
  state = place(state, { child: ['bill'], opponent: ['fill', 'spill'] });
  state = askHeard(state, 'spill', 'fill');
  assert.notEqual(state.phase, 'repair-choose');
  assert.equal(state.repairs.length, 1);
  assert.equal(state.attempts.length, 2);
  assert.equal(state.players.child.hand.includes(cardId(state, 'fill')), true);
});

test('a matched word does not open a repair', () => {
  let state = place(fresh(), { child: ['fell'], opponent: ['spell'] });
  state = askHeard(state, 'spell', 'spell');
  assert.equal(state.repairs.length, 0);
  assert.equal(state.attempts[0].correct, true);
  assert.equal(engine.buildResults(state).correct, 1);
});

test('the page embeds the same demo config and does not store results', () => {
  const html = fs.readFileSync(path.join(root, 'speech-language/speech-sounds/all-aboard/index.html'), 'utf8');
  const play = fs.readFileSync(path.join(root, 'speech-language/speech-sounds/all-aboard/play.js'), 'utf8');
  const rules = fs.readFileSync(path.join(root, 'speech-language/speech-sounds/all-aboard/all-aboard.js'), 'utf8');
  const match = html.match(/<script type="application\/json" id="embedded-config">([\s\S]*?)<\/script>/);
  assert.ok(match, 'embedded config missing');
  assert.deepEqual(JSON.parse(match[1]), demo);
  assert.equal(html.includes('all-aboard.js'), true);
  [html, play, rules].forEach((source) => {
    assert.equal(source.includes('localStorage'), false);
    assert.equal(source.includes('indexedDB'), false);
    assert.equal(source.includes('supabase'), false);
  });
  assert.equal(rules.includes('fetch('), false);
});

test('catalogue matches its schema and lists real pages', () => {
  const errors = validateSchema(schema, catalogue);
  assert.deepEqual(errors, [], errors.join('; '));
  const ids = new Set();
  catalogue.games.forEach((game) => {
    assert.equal(ids.has(game.id), false, game.id);
    ids.add(game.id);
    assert.equal(fs.existsSync(path.join(root, game.path)), true, game.path);
    assert.equal(game.url.endsWith(game.path), true, game.url);
    assert.equal(game.status === 'released', false, game.id);
    assert.equal(new Set(game.presentationTags).size, game.presentationTags.length);
  });
  const aboard = catalogue.games.find((game) => game.id === 'all-aboard');
  assert.equal(aboard.supports_repair, true);
  assert.equal(aboard.configurable, true);
  assert.equal(aboard.status, 'built');
  assert.deepEqual(aboard.levelsSupported, ['1', '2', '3a', '3b', '4', '5']);
  assert.ok(catalogue.games.some((game) => game.supports_repair === false));
});
