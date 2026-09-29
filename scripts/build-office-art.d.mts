// Types for test/office-art.test.ts (the generator itself is plain Node JavaScript).
export function pixels(name: string, rows: string[], size: [number, number], colour: (ch: string) => number[] | undefined): Buffer;
export function png(w: number, h: number, rgba: Buffer): Buffer;
export function build(read?: (file: string) => string): Map<string, Buffer>;
