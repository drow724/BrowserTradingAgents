import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';

const version = (pkg: string) =>
  JSON.parse(readFileSync(`node_modules/${pkg}/package.json`, 'utf8')).version as string;

// "+dirty" when the code that gets bundled differs from HEAD, so evidence never overstates its revision.
const git = (cmd: string) => execSync(`git ${cmd}`).toString().trim();
const codePaths = 'src test harness e2e package.json package-lock.json vite.config.ts';
const revision = git('rev-parse HEAD') + (git(`status --porcelain -- ${codePaths}`) ? '+dirty' : '');

export default defineConfig({
  root: 'harness',
  build: { outDir: '../dist', emptyOutDir: true },
  define: {
    __BTA_REVISION__: JSON.stringify(revision),
    __AKARISP_VERSION__: JSON.stringify(version('akarisp')),
    __LANGCHAIN_CORE_VERSION__: JSON.stringify(version('@langchain/core')),
  },
});
