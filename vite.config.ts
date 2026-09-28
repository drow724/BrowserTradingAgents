import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';

const version = (pkg: string) =>
  JSON.parse(readFileSync(`node_modules/${pkg}/package.json`, 'utf8')).version as string;

export default defineConfig({
  root: 'harness',
  build: { outDir: '../dist', emptyOutDir: true },
  define: {
    __BTA_REVISION__: JSON.stringify(execSync('git rev-parse HEAD').toString().trim()),
    __AKARISP_VERSION__: JSON.stringify(version('akarisp')),
    __LANGCHAIN_CORE_VERSION__: JSON.stringify(version('@langchain/core')),
  },
});
