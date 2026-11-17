/* Original pictures for All Aboard. No outside images. */
(function () {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';

  function el(name, attrs, kids) {
    const node = document.createElementNS(NS, name);
    Object.entries(attrs || {}).forEach(([key, value]) => node.setAttribute(key, value));
    (kids || []).forEach((kid) => node.append(kid));
    return node;
  }

  function svg(kids) {
    return el('svg', { viewBox: '0 0 160 140', 'aria-hidden': 'true' }, kids);
  }

  function pig() {
    return svg([
      el('ellipse', { cx: '82', cy: '126', rx: '46', ry: '8', fill: '#e7c8a0' }),
      el('path', { d: 'M28 78c2 28 18 42 52 42s50-16 52-42c-8 10-24 16-52 16S36 88 28 78z', fill: '#f6a7b8' }),
      el('circle', { cx: '78', cy: '62', r: '36', fill: '#f7b4c2', stroke: '#7a3144', 'stroke-width': '3' }),
      el('ellipse', { cx: '48', cy: '48', rx: '12', ry: '16', fill: '#f7b4c2', stroke: '#7a3144', 'stroke-width': '3' }),
      el('ellipse', { cx: '108', cy: '48', rx: '12', ry: '16', fill: '#f7b4c2', stroke: '#7a3144', 'stroke-width': '3' }),
      el('path', { d: 'M46 18h68l-8 16H54z', fill: '#d7263d' }),
      el('rect', { x: '40', y: '30', width: '80', height: '12', rx: '4', fill: '#d7263d' }),
      el('rect', { x: '58', y: '33', width: '44', height: '6', rx: '3', fill: '#f6c445' }),
      el('circle', { cx: '64', cy: '60', r: '4', fill: '#3b241c' }),
      el('circle', { cx: '94', cy: '60', r: '4', fill: '#3b241c' }),
      el('ellipse', { cx: '79', cy: '74', rx: '14', ry: '10', fill: '#f28aa0', stroke: '#7a3144', 'stroke-width': '3' }),
      el('circle', { cx: '74', cy: '74', r: '2', fill: '#7a3144' }),
      el('circle', { cx: '84', cy: '74', r: '2', fill: '#7a3144' }),
      el('path', { d: 'M66 86c8 8 18 8 26 0', fill: 'none', stroke: '#7a3144', 'stroke-width': '3', 'stroke-linecap': 'round' }),
      el('path', { d: 'M112 70c16 2 22 14 16 24', fill: 'none', stroke: '#f6a7b8', 'stroke-width': '8', 'stroke-linecap': 'round' })
    ]);
  }

  function pup() {
    return svg([
      el('ellipse', { cx: '80', cy: '126', rx: '48', ry: '8', fill: '#e7c8a0' }),
      el('ellipse', { cx: '80', cy: '92', rx: '40', ry: '30', fill: '#f0c49a', stroke: '#6b3b22', 'stroke-width': '3' }),
      el('circle', { cx: '80', cy: '58', r: '32', fill: '#f3ccaa', stroke: '#6b3b22', 'stroke-width': '3' }),
      el('ellipse', { cx: '52', cy: '40', rx: '14', ry: '20', fill: '#e0a56e', stroke: '#6b3b22', 'stroke-width': '3' }),
      el('ellipse', { cx: '108', cy: '40', rx: '14', ry: '20', fill: '#e0a56e', stroke: '#6b3b22', 'stroke-width': '3' }),
      el('path', { d: 'M52 22h56l-6 14H58z', fill: '#d7263d' }),
      el('rect', { x: '46', y: '32', width: '68', height: '10', rx: '4', fill: '#d7263d' }),
      el('circle', { cx: '66', cy: '56', r: '4', fill: '#3b241c' }),
      el('circle', { cx: '94', cy: '56', r: '4', fill: '#3b241c' }),
      el('ellipse', { cx: '80', cy: '68', rx: '8', ry: '6', fill: '#c47b55' }),
      el('path', { d: 'M70 76c6 6 14 6 20 0', fill: 'none', stroke: '#6b3b22', 'stroke-width': '3', 'stroke-linecap': 'round' }),
      el('path', { d: 'M118 96c14 8 18 4 16-8', fill: '#f0c49a', stroke: '#6b3b22', 'stroke-width': '3' })
    ]);
  }

  function loco() {
    return svg([
      el('rect', { x: '18', y: '78', width: '124', height: '36', rx: '10', fill: '#d7263d', stroke: '#6e1220', 'stroke-width': '3' }),
      el('rect', { x: '78', y: '36', width: '52', height: '46', rx: '8', fill: '#b81d32', stroke: '#6e1220', 'stroke-width': '3' }),
      el('rect', { x: '88', y: '46', width: '28', height: '20', rx: '4', fill: '#d7f3ff', stroke: '#24556e', 'stroke-width': '3' }),
      el('circle', { cx: '46', cy: '114', r: '14', fill: '#3b241c' }),
      el('circle', { cx: '108', cy: '114', r: '14', fill: '#3b241c' }),
      el('circle', { cx: '46', cy: '114', r: '6', fill: '#f6c445' }),
      el('circle', { cx: '108', cy: '114', r: '6', fill: '#f6c445' }),
      el('rect', { x: '24', y: '48', width: '18', height: '30', rx: '4', fill: '#6e1220' }),
      el('ellipse', { cx: '33', cy: '40', rx: '10', ry: '6', fill: '#f4f7fb', opacity: '0.9' })
    ]);
  }

  const words = {
    bell: () => svg([
      el('path', { d: 'M80 18v16', stroke: '#8a5a12', 'stroke-width': '6', 'stroke-linecap': 'round' }),
      el('circle', { cx: '80', cy: '16', r: '8', fill: '#f6c445', stroke: '#8a5a12', 'stroke-width': '3' }),
      el('path', { d: 'M46 92c0-28 14-48 34-48s34 20 34 48H46z', fill: '#e23b2f', stroke: '#6e1220', 'stroke-width': '3' }),
      el('rect', { x: '40', y: '90', width: '80', height: '14', rx: '6', fill: '#f6c445', stroke: '#8a5a12', 'stroke-width': '3' }),
      el('circle', { cx: '80', cy: '78', r: '8', fill: '#f6c445', stroke: '#8a5a12', 'stroke-width': '3' })
    ]),
    fell: () => svg([
      el('path', { d: 'M80 16c28 18 40 36 28 62-22-8-36 8-42 28 12-30-6-46-28-58 22 6 34-8 42-32z', fill: '#e07a2f', stroke: '#8a3e12', 'stroke-width': '3' }),
      el('path', { d: 'M80 36c6 16 6 28 0 42', fill: 'none', stroke: '#8a3e12', 'stroke-width': '3' }),
      el('path', { d: 'M48 108h64', stroke: '#c9844a', 'stroke-width': '4', 'stroke-linecap': 'round', 'stroke-dasharray': '2 8' })
    ]),
    spell: () => svg([
      el('path', { d: 'M28 46h104v62H28z', fill: '#fffdf8', stroke: '#3b241c', 'stroke-width': '3' }),
      el('path', { d: 'M80 46v62', stroke: '#3b241c', 'stroke-width': '3' }),
      el('path', { d: 'M36 62h32M36 76h28M88 62h32M88 76h26', stroke: '#7eb6d6', 'stroke-width': '4', 'stroke-linecap': 'round' }),
      el('circle', { cx: '48', cy: '28', r: '6', fill: '#7d5cff' }),
      el('circle', { cx: '80', cy: '20', r: '7', fill: '#f6c445' }),
      el('circle', { cx: '112', cy: '30', r: '5', fill: '#2f9e6b' })
    ]),
    smell: () => svg([
      el('path', { d: 'M80 28c22 0 36 18 36 40 0 28-16 46-36 46S44 96 44 68c0-22 14-40 36-40z', fill: '#f6c7a8', stroke: '#8a5340', 'stroke-width': '3' }),
      el('ellipse', { cx: '80', cy: '78', rx: '16', ry: '12', fill: '#e7a88a', stroke: '#8a5340', 'stroke-width': '3' }),
      el('circle', { cx: '74', cy: '78', r: '3', fill: '#8a5340' }),
      el('circle', { cx: '86', cy: '78', r: '3', fill: '#8a5340' }),
      el('path', { d: 'M118 40c12-8 18-8 22 2', fill: 'none', stroke: '#2f9e6b', 'stroke-width': '3', 'stroke-linecap': 'round' }),
      el('path', { d: 'M122 54c10-4 16-2 18 6', fill: 'none', stroke: '#2f9e6b', 'stroke-width': '3', 'stroke-linecap': 'round' })
    ]),
    bill: () => svg([
      el('rect', { x: '22', y: '40', width: '116', height: '64', rx: '10', fill: '#d7f3df', stroke: '#1f6b45', 'stroke-width': '3' }),
      el('circle', { cx: '80', cy: '72', r: '16', fill: 'none', stroke: '#1f6b45', 'stroke-width': '3' }),
      el('circle', { cx: '40', cy: '56', r: '5', fill: '#1f6b45' }),
      el('circle', { cx: '120', cy: '88', r: '5', fill: '#1f6b45' })
    ]),
    fill: () => svg([
      el('path', { d: 'M46 48h68l-8 62H54z', fill: '#7eb6d6', stroke: '#24556e', 'stroke-width': '3' }),
      el('path', { d: 'M50 78h60', stroke: '#2f7eb0', 'stroke-width': '8' }),
      el('path', { d: 'M70 18c8 10 8 16 0 26', fill: 'none', stroke: '#2f7eb0', 'stroke-width': '4', 'stroke-linecap': 'round' })
    ]),
    spill: () => svg([
      el('path', { d: 'M36 70h52l8 28H44z', fill: '#f6c445', stroke: '#8a5a12', 'stroke-width': '3' }),
      el('path', { d: 'M88 78c18 6 30 8 40 2', fill: 'none', stroke: '#2f7eb0', 'stroke-width': '6', 'stroke-linecap': 'round' }),
      el('ellipse', { cx: '108', cy: '108', rx: '28', ry: '12', fill: '#7eb6d6', stroke: '#24556e', 'stroke-width': '3' })
    ]),
    smill: () => svg([
      el('circle', { cx: '80', cy: '78', r: '40', fill: '#f6a7b8', stroke: '#7a3144', 'stroke-width': '3' }),
      el('circle', { cx: '52', cy: '48', r: '12', fill: '#f6a7b8', stroke: '#7a3144', 'stroke-width': '3' }),
      el('circle', { cx: '108', cy: '48', r: '12', fill: '#f6a7b8', stroke: '#7a3144', 'stroke-width': '3' }),
      el('circle', { cx: '66', cy: '74', r: '4', fill: '#3b241c' }),
      el('circle', { cx: '94', cy: '74', r: '4', fill: '#3b241c' }),
      el('path', { d: 'M66 90c8 8 20 8 28 0', fill: 'none', stroke: '#7a3144', 'stroke-width': '3', 'stroke-linecap': 'round' }),
      el('circle', { cx: '80', cy: '28', r: '10', fill: '#f6c445', stroke: '#8a5a12', 'stroke-width': '3' })
    ]),
    bin: () => svg([
      el('path', { d: 'M40 48h80l-8 68H48z', fill: '#d7263d', stroke: '#6e1220', 'stroke-width': '3' }),
      el('rect', { x: '34', y: '36', width: '92', height: '16', rx: '6', fill: '#6e1220' }),
      el('rect', { x: '70', y: '28', width: '20', height: '12', rx: '3', fill: '#3b241c' }),
      el('path', { d: 'M64 64v32M80 64v32M96 64v32', stroke: '#f8d7cf', 'stroke-width': '4', 'stroke-linecap': 'round' })
    ]),
    fin: () => svg([
      el('path', { d: 'M36 108c18-52 40-70 88-78-8 24-6 40 8 58-28 4-52 8-70 28-8-4-16-6-26-8z', fill: '#f08a3c', stroke: '#8a3e12', 'stroke-width': '3' }),
      el('path', { d: 'M58 96c16-20 34-32 58-40', fill: 'none', stroke: '#fff4e4', 'stroke-width': '4', 'stroke-linecap': 'round' })
    ]),
    spin: () => svg([
      el('path', { d: 'M80 28l18 46H62z', fill: '#d7263d', stroke: '#6e1220', 'stroke-width': '3' }),
      el('ellipse', { cx: '80', cy: '78', rx: '36', ry: '14', fill: '#f6c445', stroke: '#8a5a12', 'stroke-width': '3' }),
      el('ellipse', { cx: '80', cy: '78', rx: '16', ry: '6', fill: '#fff4e4' }),
      el('path', { d: 'M80 92v22', stroke: '#6b3b22', 'stroke-width': '4', 'stroke-linecap': 'round' })
    ]),
    smin: () => svg([
      el('circle', { cx: '80', cy: '80', r: '36', fill: '#8fd0b0', stroke: '#1f6b45', 'stroke-width': '3' }),
      el('circle', { cx: '56', cy: '50', r: '12', fill: '#8fd0b0', stroke: '#1f6b45', 'stroke-width': '3' }),
      el('circle', { cx: '104', cy: '50', r: '12', fill: '#8fd0b0', stroke: '#1f6b45', 'stroke-width': '3' }),
      el('circle', { cx: '68', cy: '76', r: '4', fill: '#173628' }),
      el('circle', { cx: '92', cy: '76', r: '4', fill: '#173628' }),
      el('path', { d: 'M68 92c8 6 16 6 24 0', fill: 'none', stroke: '#173628', 'stroke-width': '3', 'stroke-linecap': 'round' }),
      el('path', { d: 'M62 34h36l-4 12H66z', fill: '#d7263d' })
    ]),
    key: () => svg([
      el('circle', { cx: '58', cy: '58', r: '26', fill: '#f6c445', stroke: '#8a5a12', 'stroke-width': '3' }),
      el('circle', { cx: '58', cy: '58', r: '10', fill: '#fff4e4' }),
      el('rect', { x: '78', y: '52', width: '58', height: '12', rx: '4', fill: '#f6c445', stroke: '#8a5a12', 'stroke-width': '3' }),
      el('rect', { x: '116', y: '64', width: '10', height: '16', fill: '#f6c445', stroke: '#8a5a12', 'stroke-width': '3' })
    ]),
    tea: () => svg([
      el('path', { d: 'M40 48h72v40c0 16-14 28-36 28S40 104 40 88z', fill: '#fffdf8', stroke: '#3b241c', 'stroke-width': '3' }),
      el('path', { d: 'M112 58h16c8 0 14 8 14 16s-8 16-16 16h-12', fill: 'none', stroke: '#3b241c', 'stroke-width': '4' }),
      el('path', { d: 'M48 36c6-10 8-10 10 0M70 32c6-10 8-10 10 0', fill: 'none', stroke: '#c9844a', 'stroke-width': '3', 'stroke-linecap': 'round' })
    ])
  };

  function forWord(id) {
    if (words[id]) return words[id]();
    return svg([
      el('rect', { x: '36', y: '28', width: '88', height: '84', rx: '16', fill: '#d7263d', stroke: '#6e1220', 'stroke-width': '3' }),
      el('text', { x: '80', y: '82', 'text-anchor': 'middle', 'font-size': '42', fill: '#fffdf8', 'font-family': 'system-ui' }, [document.createTextNode((id || '?').slice(0, 1).toUpperCase())])
    ]);
  }

  function iconKey() {
    return svg([
      el('rect', { x: '28', y: '36', width: '104', height: '62', rx: '18', fill: '#fffdf8', stroke: '#3b241c', 'stroke-width': '4' }),
      el('path', { d: 'M48 98l-8 16 24-16', fill: '#fffdf8', stroke: '#3b241c', 'stroke-width': '4' }),
      el('circle', { cx: '80', cy: '66', r: '10', fill: '#d7263d' })
    ]);
  }

  function iconPoint() {
    return svg([
      el('rect', { x: '86', y: '28', width: '40', height: '78', rx: '8', fill: '#fffdf8', stroke: '#3b241c', 'stroke-width': '4' }),
      el('path', { d: 'M28 88c10-24 22-32 36-24 4 14-4 22-10 30', fill: '#f6c7a8', stroke: '#8a5340', 'stroke-width': '4', 'stroke-linecap': 'round' }),
      el('path', { d: 'M52 84l28-10', fill: 'none', stroke: '#d7263d', 'stroke-width': '6', 'stroke-linecap': 'round' })
    ]);
  }

  function iconWay() {
    return svg([
      el('rect', { x: '16', y: '28', width: '58', height: '40', rx: '12', fill: '#fffdf8', stroke: '#3b241c', 'stroke-width': '4' }),
      el('rect', { x: '86', y: '70', width: '58', height: '40', rx: '12', fill: '#f8d7cf', stroke: '#3b241c', 'stroke-width': '4' }),
      el('path', { d: 'M74 48h16M90 48l-8-8M90 48l-8 8', fill: 'none', stroke: '#1f6b45', 'stroke-width': '4', 'stroke-linecap': 'round' })
    ]);
  }

  window.AboardArt = { pig, pup, loco, forWord, iconKey, iconPoint, iconWay };
})();
