/* Word frames for All Aboard v2. Generic practice sets only. */
(function (root, factory) {
  const data = factory();
  if (typeof module === 'object' && module.exports) module.exports = data;
  if (root) root.AboardWords = data;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function word(id, onset, phrase, sentence, clues) {
    return { id: id, onset: onset, text: id, phrase: phrase, sentence: sentence, clues: clues };
  }
  return {
    levels: [
      { id: 'word', label: 'Word', note: 'He says the word' },
      { id: 'phrase', label: 'Phrase', note: 'Word + a few words' },
      { id: 'sentence', label: 'Sentence', note: 'A whole sentence' }
    ],
    tilePool: ['b', 'sp', 'm', 'f', 'sm', 'l', 's', 'p'],
    onsetColour: { b: '#e23b3b', f: '#2f9e4f', sp: '#f0a202', sm: '#3d6fd6', m: '#f4efe4', l: '#f4efe4', s: '#f4efe4', p: '#f4efe4' },
    sets: [
      {
        id: 'ell',
        rhyme: 'ell',
        face: '_ell',
        words: [
          word('bell', 'b', 'ring the bell', 'I can ring the bell.', [
            ['What is it?', 'a bell'],
            ['What does it do?', 'it rings'],
            ['What does it look like?', 'gold and round'],
            ['Where is it?', 'on the card']
          ]),
          word('fell', 'f', 'the teddy fell', 'The teddy fell down.', [
            ['What is it?', 'a teddy'],
            ['What does it do?', 'he tumbles'],
            ['What does it look like?', 'brown and soft'],
            ['Where is it?', 'on the floor']
          ]),
          word('spell', 'sp', 'a magic spell', 'I can do a spell.', [
            ['What is it?', 'a magic trick'],
            ['What does it do?', 'it changes letters'],
            ['What does it look like?', 'a hat and a wand'],
            ['Where is it?', 'in a book']
          ]),
          word('smell', 'sm', 'smell the flower', 'I can smell the flower.', [
            ['What is it?', 'a flower'],
            ['What does it do?', 'it has a scent'],
            ['What does it look like?', 'pink petals'],
            ['Where is it?', 'in her hand']
          ])
        ]
      },
      {
        id: 'ill',
        rhyme: 'ill',
        face: '_ill',
        words: [
          word('bill', 'b', 'read the bill', 'I can read the bill.', [
            ['What is it?', 'a paper bill'],
            ['What does it do?', 'it shows a cost'],
            ['What does it look like?', 'a long note'],
            ['Where is it?', 'on the table']
          ]),
          word('fill', 'f', 'fill the cup', 'I can fill the cup.', [
            ['What is it?', 'a jug and a cup'],
            ['What does it do?', 'water goes in'],
            ['What does it look like?', 'blue water'],
            ['Where is it?', 'in the cup']
          ]),
          word('spill', 'sp', 'spill the milk', 'I can spill the milk.', [
            ['What is it?', 'milk, a drink'],
            ['What does it do?', 'it goes everywhere'],
            ['What does it look like?', 'white, wet'],
            ['Where is it?', 'on the floor']
          ]),
          word('smill', 'sm', 'meet Smill', 'I can see Smill.', [
            ['What is it?', 'Smill, a friend'],
            ['What does it do?', 'he waves'],
            ['What does it look like?', 'purple and fuzzy'],
            ['Where is it?', 'on the card']
          ])
        ]
      },
      {
        id: 'in',
        rhyme: 'in',
        face: '_in',
        words: [
          word('bin', 'b', 'in the bin', 'I can use the bin.', [
            ['What is it?', 'a bin'],
            ['What does it do?', 'it holds rubbish'],
            ['What does it look like?', 'green and tall'],
            ['Where is it?', 'by the door']
          ]),
          word('fin', 'f', 'a swim fin', 'I can see a fin.', [
            ['What is it?', 'a fin'],
            ['What does it do?', 'it helps a turn'],
            ['What does it look like?', 'grey and pointy'],
            ['Where is it?', 'in the water']
          ]),
          word('spin', 'sp', 'spin the top', 'I can spin the top.', [
            ['What is it?', 'a top'],
            ['What does it do?', 'it spins'],
            ['What does it look like?', 'bright colours'],
            ['Where is it?', 'on the floor']
          ]),
          word('smin', 'sm', 'meet Smin', 'I can see Smin.', [
            ['What is it?', 'Smin, a friend'],
            ['What does it do?', 'he waves'],
            ['What does it look like?', 'blue and round'],
            ['Where is it?', 'on the card']
          ])
        ]
      }
    ]
  };
});
