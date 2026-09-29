// Feature 008 (browser only): the Pixel Agents webview draws nothing until its host sends sprites as
// hex color grids (core/src/messages.ts @ 3537e140). Upstream decodes the PNGs in Node with pngjs; this
// re-implements the documented format with native createImageBitmap + canvas — no upstream code copied.
import type { PixelMessage } from './pixel-adapter.ts';

// Sheet geometry, as published at the pinned SHA (core/src/assets/constants.ts).
const CHAR = { w: 16, h: 32, frames: 7, dirs: ['down', 'up', 'right'] as const };
const WALL = { w: 16, h: 32, cols: 4, count: 16 };
const FLOOR = 16;
const ALPHA_MIN = 2;

type Img = { width: number; data: Uint8ClampedArray };
const hex = (v: number) => v.toString(16).padStart(2, '0').toUpperCase();

async function load(url: string): Promise<Img> {
  const bmp = await createImageBitmap(await (await fetch(url)).blob(), { premultiplyAlpha: 'none', colorSpaceConversion: 'none' });
  const ctx = new OffscreenCanvas(bmp.width, bmp.height).getContext('2d')!;
  ctx.drawImage(bmp, 0, 0);
  return { width: bmp.width, data: ctx.getImageData(0, 0, bmp.width, bmp.height).data };
}

// One w×h region as rows of '#RRGGBB' / '#RRGGBBAA' / '' (transparent).
function crop(img: Img, ox: number, oy: number, w: number, h: number): string[][] {
  return Array.from({ length: h }, (_, y) => Array.from({ length: w }, (_, x) => {
    const i = ((oy + y) * img.width + ox + x) * 4, d = img.data, a = d[i + 3];
    return a < ALPHA_MIN ? '' : `#${hex(d[i])}${hex(d[i + 1])}${hex(d[i + 2])}${a >= 255 ? '' : hex(a)}`;
  }));
}

export async function loadPixelAssets(base = '/pixel-agents/assets/') {
  const json = async <T>(f: string): Promise<T> => (await fetch(base + f)).json();
  const index = await json<{ floors: string[]; walls: string[]; characters: string[]; defaultLayout: string }>('asset-index.json');
  const catalog = await json<{ id: string; furniturePath: string; width: number; height: number }[]>('furniture-catalog.json');
  const characters = await Promise.all(index.characters.map(async (f) => {
    const img = await load(`${base}characters/${f}`);
    return Object.fromEntries(CHAR.dirs.map((dir, d) =>
      [dir, Array.from({ length: CHAR.frames }, (_, i) => crop(img, i * CHAR.w, d * CHAR.h, CHAR.w, CHAR.h))]));
  }));
  const floors = await Promise.all(index.floors.map(async (f) => crop(await load(`${base}floors/${f}`), 0, 0, FLOOR, FLOOR)));
  const walls = await Promise.all(index.walls.map(async (f) => {
    const img = await load(`${base}walls/${f}`);
    return Array.from({ length: WALL.count }, (_, m) => crop(img, (m % WALL.cols) * WALL.w, Math.floor(m / WALL.cols) * WALL.h, WALL.w, WALL.h));
  }));
  const sprites = Object.fromEntries(await Promise.all(catalog.map(async (c) =>
    [c.id, crop(await load(base + c.furniturePath), 0, 0, c.width, c.height)] as const)));
  const messages: PixelMessage[] = [
    { type: 'characterSpritesLoaded', characters },
    { type: 'floorTilesLoaded', sprites: floors },
    { type: 'wallTilesLoaded', sets: walls },
    { type: 'furnitureAssetsLoaded', catalog, sprites },
  ];
  return { messages, layout: await json<Record<string, unknown>>(index.defaultLayout) };
}
