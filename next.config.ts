import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import type { NextConfig } from 'next';

const version = (pkg: string) =>
  JSON.parse(readFileSync(`node_modules/${pkg}/package.json`, 'utf8')).version as string;

// "+dirty" when the code that gets bundled differs from HEAD, so evidence never overstates its revision.
const git = (cmd: string) => execSync(`git ${cmd}`).toString().trim();
const codePaths =
  'index.html src test harness e2e app components package.json package-lock.json vite.config.ts next.config.ts tsconfig.json playwright.config.ts';
const revision = git('rev-parse HEAD') + (git(`status --porcelain -- ${codePaths}`) ? '+dirty' : '');

// Next inserts define values as string literals: pass raw strings (quoting them would embed the quotes).
const config: NextConfig = {
  compiler: {
    define: {
      __BTA_REVISION__: revision,
      __AKARISP_VERSION__: version('akarisp'),
      __LANGCHAIN_CORE_VERSION__: version('@langchain/core'),
      __LANGGRAPH_VERSION__: version('@langchain/langgraph'),
    },
  },
};

export default config;
