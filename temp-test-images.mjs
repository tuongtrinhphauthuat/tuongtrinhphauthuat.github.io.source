import { parseImageRows } from './src/services/imageService.js';

const sample = `https://i.imgur.com/xtZV4C6.png
https://i.imgur.com/LetjM6p.png [$ben$=trái]
[$ben$=phải] https://i.imgur.com/9bC6MA6.png
[$ben$=hai bên] https://i.imgur.com/rhNUkAh.png`;

const parsed = parseImageRows(sample, { idPrefix: 'test' });
console.log(parsed);
