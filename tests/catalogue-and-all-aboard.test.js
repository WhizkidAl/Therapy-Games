const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const words = require(path.join(root, 'speech-language/speech-sounds/all-aboard/words.js'));
const catalogue = require(path.join(root, 'catalogue.json'));
const schema = require(path.join(root, 'catalogue.schema.json'));
const gameDir = path.join(root, 'speech-language/speech-sounds/all-aboard');

const banned = ['fan', 'feet', 'fish', 'fork', 'spoon', 'spot', 'spider', 'space', 'smile', 'small', 'smash', 'smudge', 'van', 'vest', 'vase', 'vet', 'bat', 'bus', 'boat', 'ship', 'shoe', 'jump', 'jam', 'stop', 'star', 'snap', 'snow', 'stars'];

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

test('each practice word has a word, phrase and sentence frame', () => {
  assert.equal(words.sets.length, 3);
  const ids = words.sets.flatMap((set) => set.words.map((item) => item.id));
  assert.deepEqual(ids, ['bell', 'fell', 'spell', 'smell', 'bill', 'fill', 'spill', 'smill', 'bin', 'fin', 'spin', 'smin']);
  words.sets.forEach((set) => {
    assert.equal(set.words.length, 4);
    set.words.forEach((item) => {
      assert.equal(item.onset + set.rhyme, item.id);
      assert.ok(item.phrase.length > item.text.length);
      assert.ok(item.sentence.endsWith('.'));
      assert.equal(item.clues.length, 4);
    });
  });
});

test('collectable tickets are two sets of 24 and avoid the probe list', () => {
  const collect = require(path.join(gameDir, 'collect.js'));
  assert.equal(collect.animals.length, 24);
  assert.equal(collect.trains.length, 24);
  const blob = collect.animals.concat(collect.trains).map((item) => item.id + ' ' + item.label).join('\n');
  banned.forEach((word) => {
    assert.equal(new RegExp('\\b' + word + '\\b', 'i').test(blob), false, word);
  });
  const ids = new Set(collect.animals.concat(collect.trains).map((item) => item.id));
  assert.equal(ids.size, 48);
});

test('the game files do not use the probe-word list', () => {
  const names = fs.readdirSync(gameDir).filter((name) => /\.(html|js|json|css|sql|md)$/.test(name));
  const blob = names.map((name) => fs.readFileSync(path.join(gameDir, name), 'utf8')).join('\n');
  banned.forEach((word) => {
    assert.equal(new RegExp('\\b' + word + '\\b', 'i').test(blob), false, word);
  });
  assert.equal(blob.includes('say it again'), false);
  assert.equal(blob.includes('slow down'), false);
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
  assert.deepEqual(aboard.levelsSupported, ['word', 'phrase', 'sentence']);
  assert.ok(catalogue.games.some((game) => game.supports_repair === false));
});
