import test from 'node:test';
import assert from 'node:assert/strict';
import jpeg from 'jpeg-js';
import { polishHero, shrink } from '../lib/studio/sharpen.js';

const jpegUri = (w, h) => {
  const data = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i++) data.set([(i * 7) % 256, (i * 13) % 256, (i * 3) % 256, 255], i * 4);
  return `data:image/jpeg;base64,${Buffer.from(jpeg.encode({ data, width: w, height: h }, 90).data).toString('base64')}`;
};

test('polishHero shrinks big news photos to the post width and keeps the aspect', () => {
  const out = polishHero(jpegUri(2400, 1200));
  const img = jpeg.decode(Buffer.from(out.split(',')[1], 'base64'));
  assert.equal(img.width, 1080);
  assert.equal(img.height, 540);
});

test('polishHero leaves small photos at their size and other formats untouched', () => {
  const img = jpeg.decode(Buffer.from(polishHero(jpegUri(600, 400)).split(',')[1], 'base64'));
  assert.equal(img.width, 600);
  assert.equal(polishHero('data:image/png;base64,AAAA'), 'data:image/png;base64,AAAA');
  assert.equal(polishHero('data:image/jpeg;base64,notajpeg'), 'data:image/jpeg;base64,notajpeg');
});

test('shrink averages pixels', () => {
  const src = new Uint8ClampedArray([0, 0, 0, 255, 200, 200, 200, 255]);
  const { data, width } = shrink(src, 2, 1, 1);
  assert.equal(width, 1);
  assert.equal(data[0], 100);
});
