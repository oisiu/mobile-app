const { readFileSync } = require('node:fs');
const { createRequire } = require('node:module');
const { resolve } = require('node:path');

const projectRequire = createRequire(resolve('package.json'));
const pairs = [
  ['react', 'react-test-renderer'],
  ['vitest', '@vitest/coverage-v8'],
];
let failed = false;

for (const [runtime, companion] of pairs) {
  try {
    const version = name => {
      const value = JSON.parse(readFileSync(projectRequire.resolve(`${name}/package.json`), 'utf8')).version;
      if (typeof value !== 'string' || !value) throw new Error(`Missing version for ${name}`);
      return value;
    };
    const runtimeVersion = version(runtime), companionVersion = version(companion);
    if (runtimeVersion !== companionVersion) {
      console.error(`Dependency compatibility: ${runtime}@${runtimeVersion} and ${companion}@${companionVersion} must use the same exact version. Update them together; do not bypass this check.`);
      failed = true;
    }
  } catch (error) {
    console.error(`Dependency compatibility: cannot check ${runtime} / ${companion}. Install dependencies with the frozen lockfile first. ${error.message}`);
    failed = true;
  }
}

if (failed) process.exitCode = 1;
else console.log('Dependency compatibility passed: React/test renderer and Vitest/coverage versions match.');
