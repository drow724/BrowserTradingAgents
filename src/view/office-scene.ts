// Feature 009 office scene (contracts/office-view.md): layout and sprite geometry as data only, so the
// temporary upstream art (MD-6) can be replaced with new files and new numbers, not renderer changes
// (FR-027). Units are world pixels; the renderer scales the whole world. No ROLES import: the renderer is
// given the roles, which keeps LangGraph out of this module's bundle.
export const WORLD = { w: 320, h: 192 };
const ART = '/office-art/';

// A character sheet: `row` is the facing used (0 = down); `stand` the idle frame; `work` the typing frames.
export type SheetLayout = { src: string; frameW: number; frameH: number; row: number; stand: number; work: number[] };
const SHEETS: SheetLayout[] = Array.from({ length: 6 }, (_, i) =>
  ({ src: `${ART}characters/char_${i}.png`, frameW: 16, frameH: 32, row: 0, stand: 1, work: [3, 4] }));
// Role i (ROLES order): sheet i % 6; roles 7–8 hue-shifted 180° (the Feature 008 identity rule).
export const character = (i: number) => ({ sheet: SHEETS[i % SHEETS.length], hueShift: i < SHEETS.length ? 0 : 180 });

// Eight desks, two rows of four; the character sits behind the desk, the PC stands on it.
export const DESKS = Array.from({ length: 8 }, (_, i) => ({ x: 28 + (i % 4) * 72, y: 76 + Math.floor(i / 4) * 64 }));
export const SEAT = { x: 8, y: -12 }, PC = { x: 26, y: -10 }, TAG = { x: 24, y: 30 };

export const SPRITES = {
  desk: `${ART}furniture/DESK/DESK_FRONT.png`,
  pcOff: `${ART}furniture/PC/PC_FRONT_OFF.png`,
  pcOn1: `${ART}furniture/PC/PC_FRONT_ON_1.png`,
  pcOn2: `${ART}furniture/PC/PC_FRONT_ON_2.png`,
  pcOn3: `${ART}furniture/PC/PC_FRONT_ON_3.png`,
  board: `${ART}furniture/WHITEBOARD/WHITEBOARD.png`,
  painting: `${ART}furniture/LARGE_PAINTING/LARGE_PAINTING.png`,
  clock: `${ART}furniture/CLOCK/CLOCK.png`,
  shelf: `${ART}furniture/DOUBLE_BOOKSHELF/DOUBLE_BOOKSHELF.png`,
  bigPlant: `${ART}furniture/LARGE_PLANT/LARGE_PLANT.png`,
  plant: `${ART}furniture/PLANT/PLANT.png`,
};
export const PC_ON = ['pcOn1', 'pcOn2', 'pcOn3'] as const;
export const DECOR: { sprite: keyof typeof SPRITES; x: number; y: number }[] = [
  { sprite: 'board', x: 40, y: 8 }, { sprite: 'painting', x: 104, y: 8 }, { sprite: 'clock', x: 160, y: 6 },
  { sprite: 'shelf', x: 250, y: 12 }, { sprite: 'bigPlant', x: 2, y: 142 }, { sprite: 'plant', x: 300, y: 52 },
];
// Wall band and a two-tone wooden floor, drawn as colours (the upstream floor tiles are grey tint masks).
export const ROOM = { wall: '#3b3551', wallEdge: '#2a2540', wallH: 44, tile: 16, floor: ['#7d6444', '#8a6f4d'] };
