/* Collectable ticket pictures. Generic animals and trains only. */
(function (root, factory) {
  const data = factory();
  if (typeof module === 'object' && module.exports) module.exports = data;
  if (root) root.AboardCollect = data;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function item(id, label) {
    return { id: id, label: label };
  }
  return {
    animals: [
      item('cat', 'Cat'), item('dog', 'Dog'), item('hen', 'Hen'), item('duck', 'Duck'),
      item('frog', 'Frog'), item('crab', 'Crab'), item('lion', 'Lion'), item('bear', 'Bear'),
      item('deer', 'Deer'), item('goat', 'Goat'), item('lamb', 'Lamb'), item('pony', 'Pony'),
      item('owl', 'Owl'), item('panda', 'Panda'), item('koala', 'Koala'), item('bunny', 'Bunny'),
      item('mouse', 'Mouse'), item('otter', 'Otter'), item('fox', 'Fox'), item('wolf', 'Wolf'),
      item('zebra', 'Zebra'), item('hippo', 'Hippo'), item('camel', 'Camel'), item('penguin', 'Penguin')
    ],
    trains: [
      item('steam', 'Steam'), item('freight', 'Freight'), item('express', 'High-speed'), item('tram', 'Tram'),
      item('monorail', 'Monorail'), item('cable', 'Cable car'), item('metro', 'Metro'), item('sleeper', 'Sleeper'),
      item('tanker', 'Tanker'), item('hopper', 'Hopper'), item('mail', 'Mail'), item('diesel', 'Diesel'),
      item('railcar', 'Railcar'), item('cog', 'Cog'), item('funicular', 'Funicular'), item('passenger', 'Passenger'),
      item('decker', 'Double-deck'), item('crane', 'Crane'), item('heritage', 'Heritage'), item('shunter', 'Shunter'),
      item('logging', 'Logging'), item('mine', 'Mine'), item('inspection', 'Inspection'), item('worker', 'Work train')
    ]
  };
});
