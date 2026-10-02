const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { automaticReleaseTag, bump, tagVersion, releaseNotes, validateRun, productionRelease, prepareFiles, playClient, serviceCredentials, googleRequest } = require('../../scripts/release/android.cjs');

test('manual versions and untrusted tag input', () => {
  assert.equal(bump('1.6.0', 'patch'), '1.6.1');
  assert.equal(bump('1.6.0', 'minor'), '1.7.0');
  assert.equal(bump('1.6.0', 'major'), '2.0.0');
  assert.throws(() => bump('1.6.0', 'other'));
  assert.throws(() => tagVersion('v1.6.1; echo secret'));
  assert.throws(() => tagVersion('--help'));
});

test('release preparation updates both versions and independent Android code', () => {
  const original = process.cwd();
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'oisiu-release-test-'));
  try {
    process.chdir(directory);
    fs.mkdirSync('store/google-play/releases', { recursive: true });
    fs.writeFileSync('package.json', JSON.stringify({ version: '1.6.0', packageManager: 'pnpm@12.4.1' }));
    fs.writeFileSync('app.json', JSON.stringify({ expo: { version: '1.6.0', android: { versionCode: 7 } } }));
    assert.equal(prepareFiles('major'), '2.0.0');
    assert.equal(JSON.parse(fs.readFileSync('package.json')).version, '2.0.0');
    const config = JSON.parse(fs.readFileSync('app.json')).expo;
    assert.equal(config.version, '2.0.0');
    assert.equal(config.android.versionCode, 8);
    assert.equal(JSON.parse(fs.readFileSync('.github/releases/v2.0.0.json')).versionCode, 8);
    assert.throws(() => releaseNotes(fs.readFileSync('store/google-play/releases/2.0.0.txt', 'utf8')));
  } finally {
    process.chdir(original);
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('both translated release notes must be complete and within Play limits', () => {
  assert.equal(releaseNotes('<en-US>Fixed startup.</en-US><es-ES>Inicio corregido.</es-ES>').length, 2);
  assert.throws(() => releaseNotes('<en-US>Done.</en-US>'));
  assert.throws(() => releaseNotes('<en-US>TODO</en-US><es-ES>Listo.</es-ES>'));
  assert.throws(() => releaseNotes(`<en-US>${'x'.repeat(501)}</en-US><es-ES>Listo.</es-ES>`));
});

test('stages reject failed, automatic, wrong-branch, wrong-workflow, and wrong-commit runs', () => {
  const run = { path: '.github/workflows/build-android-release.yml', event: 'workflow_dispatch',
    head_branch: 'main', head_sha: 'abc', conclusion: 'success' };
  validateRun(run, run.path, 'abc');
  for (const change of [{ conclusion: 'failure' }, { conclusion: null }, { event: 'push' },
    { head_branch: 'other' }, { head_sha: 'def' }, { path: '.github/workflows/ci.yml' }]) {
    assert.throws(() => validateRun({ ...run, ...change }, run.path, 'abc'));
  }
});

test('production prevents downgrades and overwriting an active staged rollout', () => {
  productionRelease({ releases: [{ status: 'completed', versionCodes: ['7'] }] }, 8);
  assert.throws(() => productionRelease({ releases: [{ status: 'completed', versionCodes: ['9'] }] }, 8));
  for (const status of ['inProgress', 'halted']) {
    assert.throws(() => productionRelease({ releases: [{ status, versionCodes: ['7'] }] }, 8));
  }
});

test('all release workflows are manual and share a non-cancelling concurrency group', () => {
  for (const name of ['prepare-release', 'build-android-release', 'release-closed-testing', 'publish-production']) {
    const text = fs.readFileSync(`.github/workflows/${name}.yml`, 'utf8').replace(/\r\n/g, '\n');
    assert.match(text, /\n  workflow_dispatch:/);
    assert.doesNotMatch(text, /\n  (push|pull_request|workflow_run|schedule):/);
    assert.match(text, /group: android-release\n  cancel-in-progress: false/);
    assert.match(text, /needs: main-only/);
    assert.match(text, /name: Require manual dispatch from main/);
    assert.match(text, /\[ \"\$GITHUB_REF\" != refs\/heads\/main \]/);
    assert.match(text, /if: github.ref == 'refs\/heads\/main'/);
  }
});

test('Play requests use fixed Google endpoints, scoped JWT and distinguish media uploads', async () => {
  const { generateKeyPairSync } = require('node:crypto');
  const { Buffer } = require('node:buffer');
  const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const calls = [];
  const originalFetch = global.fetch;
  global.fetch = async (url, options) => {
    calls.push({ url, options });
    return { ok: true, json: async () => url.includes('oauth2') ? { access_token: 'test-token' } : { id: 'edit' } };
  };
  try {
    const client = await playClient({ client_email: 'test@example.invalid', private_key: privateKey });
    const jwt = calls[0].options.body.get('assertion');
    const claims = JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url').toString());
    assert.equal(claims.scope, 'https://www.googleapis.com/auth/androidpublisher');
    assert.equal(claims.aud, 'https://oauth2.googleapis.com/token');
    await client('edits', 'POST', {});
    await client('edits/edit/bundles?uploadType=media', 'POST', Buffer.from('bundle'), true);
    assert.equal(calls[1].url, 'https://androidpublisher.googleapis.com/androidpublisher/v3/applications/com.oisiu.app/edits');
    assert.match(calls[2].url, /\/upload\/androidpublisher\/v3\//);
    assert.equal(calls[2].options.headers['Content-Type'], 'application/octet-stream');
  } finally {
    global.fetch = originalFetch;
  }
});

// Load orchestration with a fake gh executable. Actual filesystem and crypto are used;
// all GitHub/Google operations stay local and no production credential is needed.
function publishingFixture(overrides = {}) {
  const vm = require('node:vm');
  const { generateKeyPairSync } = require('node:crypto');
  const { Buffer } = require('node:buffer');
  const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const commit = 'a'.repeat(40);
  const record = { schema: 1, version: '1.6.1', versionCode: 8, tag: 'v1.6.1', commit,
    sha256: require('node:crypto').createHash('sha256').update('fixture-bundle').digest('hex'), buildRunId: '100', notes: [{ language: 'en-US', text: 'Fixed.' }, { language: 'es-ES', text: 'Corregido.' }] };
  const proof = { tag: record.tag, versionCode: 8, sha256: record.sha256, track: 'alpha', runId: '101', workflowCommit: commit };
  const calls = [];
  const run = (workflow, extra = {}) => ({ path: `.github/workflows/${workflow}.yml`,
    event: 'workflow_dispatch', head_branch: 'main', head_sha: commit, conclusion: 'success', ...extra });
  const context = {
    module: { exports: {} }, console: { log() {}, error: console.error }, Buffer, URLSearchParams, AbortSignal,
    process: { env: { RELEASE_TAG: record.tag, CLOSED_TESTING_TRACK: 'alpha', TESTED: 'true',
      GITHUB_REPOSITORY: 'example/app', GITHUB_RUN_ID: '102', GITHUB_SHA: commit,
      GOOGLE_PLAY_SERVICE_ACCOUNT_JSON: JSON.stringify({ client_email: 'test@example.invalid',
        private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }) }), ...overrides.env } },
    require: name => name === 'node:child_process' ? { execFileSync: (command, args) => {
      assert.equal(command, 'gh');
      if (args[0] === 'api') {
        if (args[1].includes('actions/runs/100')) return JSON.stringify(run('build-android-release', overrides.buildRun));
        if (args[1].includes('actions/runs/101')) return JSON.stringify(run('release-closed-testing', overrides.closedRun));
        if (args[1].includes('git/ref/')) return JSON.stringify({ object: { type: 'commit', sha: overrides.tagCommit || commit } });
        throw new Error(`Unexpected GitHub API: ${args[1]}`);
      }
      if (args[1] === 'view') return JSON.stringify({ isDraft: true, assets: [] });
      if (args[1] === 'download') {
        const filename = args[args.indexOf('--pattern') + 1];
        if (filename === 'closed.json' && overrides.missingClosed) throw new Error('Closed testing record missing.');
        const directory = args[args.indexOf('--dir') + 1];
        if (filename === 'oisiu.aab') {
          fs.writeFileSync(path.join(directory, filename), overrides.corruptBundle ? 'corrupt' : 'fixture-bundle');
          return '';
        }
        const value = filename === 'build.json' ? record : { ...proof, ...overrides.proof };
        fs.writeFileSync(path.join(directory, filename), JSON.stringify(value));
        return '';
      }
      if (args[1] === 'upload') { calls.push({ githubUpload: args }); return ''; }
      throw new Error(`Unexpected gh command: ${args}`);
    } } : require(name),
    fetch: async (url, options) => {
      calls.push({ url, method: options.method, body: options.body });
      let body;
      if (url.includes('oauth2')) body = { access_token: 'fake-token' };
      else if (url.endsWith('/edits')) body = { id: 'edit' };
      else if (url.endsWith('/tracks/alpha')) body = { track: 'alpha', releases: [{ status: overrides.status || 'completed', versionCodes: [overrides.code || '8'] }] };
      else if (url.endsWith('/tracks/production') && options.method === 'GET') body = { track: 'production', releases: [{ status: 'completed', versionCodes: ['7'] }] };
      else if (url.includes('/upload/')) body = { versionCode: overrides.uploadCode || 8, sha256: overrides.uploadHash || record.sha256 };
      else if (url.endsWith('/bundles')) body = { bundles: overrides.newBundle ? [] : [{ versionCode: 8, sha256: overrides.bundleHash || record.sha256 }] };
      else body = {};
      if (overrides.failAt && url.endsWith(overrides.failAt)) return { ok: false, status: 403, json: async () => ({ error: { message: 'SENSITIVE_RESPONSE_SENTINEL' } }) };
      return { ok: true, json: async () => body };
    },
  };
  vm.runInNewContext(fs.readFileSync('scripts/release/android.cjs', 'utf8'), context);
  return { publish: context.module.exports.publish, calls };
}

test('production cannot skip successful build and closed testing records or human confirmation', async () => {
  for (const overrides of [{ missingClosed: true }, { buildRun: { conclusion: 'failure' } },
    { closedRun: { conclusion: 'failure' } }, { proof: { sha256: 'wrong' } },
    { tagCommit: 'c'.repeat(40) }, { env: { TESTED: 'false' } }]) {
    const fixture = publishingFixture(overrides);
    await assert.rejects(fixture.publish('production'));
    assert.equal(fixture.calls.length, 0, 'No Google call before prerequisites pass');
  }
});

test('production requires the selected version to be completed on the live closed track', async () => {
  for (const overrides of [{ status: 'draft' }, { code: '9' }]) {
    const fixture = publishingFixture(overrides);
    await assert.rejects(fixture.publish('production'));
    assert(!fixture.calls.some(call => call.method === 'PUT'));
    assert(!fixture.calls.some(call => call.url?.endsWith(':commit')));
  }
});

test('production promotes the tested version, validates, commits, and records without uploading an AAB', async () => {
  const fixture = publishingFixture();
  await fixture.publish('production');
  const writes = fixture.calls.filter(call => call.method === 'PUT');
  assert.equal(writes.length, 1);
  assert.match(writes[0].url, /\/tracks\/production$/);
  assert.deepEqual(JSON.parse(writes[0].body).releases[0].versionCodes, ['8']);
  assert(!fixture.calls.some(call => call.url?.includes('/upload/')));
  const endpoints = fixture.calls.filter(call => call.url).map(call => call.url);
  assert(endpoints.at(-2).endsWith(':validate'));
  assert(endpoints.at(-1).endsWith(':commit'));
  assert(fixture.calls.at(-1).githubUpload.includes('--clobber'));
});

test('closed testing safely resumes the same uploaded bundle and rejects a different checksum', async () => {
  const fixture = publishingFixture();
  await fixture.publish('closed');
  assert(fixture.calls.some(call => call.method === 'PUT' && call.url.endsWith('/tracks/alpha')));
  const mismatch = publishingFixture({ bundleHash: 'wrong' });
  await assert.rejects(mismatch.publish('closed'));
  assert(!mismatch.calls.some(call => call.method === 'PUT'));
});


test('malformed credential errors never echo secret JSON fragments', () => {
  const sentinel = 'SENSITIVE_PRIVATE_KEY_SENTINEL';
  assert.throws(() => serviceCredentials(`{"private_key":"${sentinel}`), error => {
    assert(!error.message.includes(sentinel));
    assert.match(error.message, /Invalid GOOGLE_PLAY_SERVICE_ACCOUNT_JSON/);
    return true;
  });
  assert.throws(() => serviceCredentials('null'));
});

test('subprocess failures cannot print command arguments or captured output', () => {
  const vm = require('node:vm');
  const sentinel = 'SENSITIVE_SUBPROCESS_OUTPUT_SENTINEL';
  const context = { module: { exports: {} }, process: { env: {} },
    require: name => name === 'node:child_process' ? { execFileSync: () => {
      const error = new Error(sentinel);
      error.status = 1;
      error.stderr = sentinel;
      throw error;
    } } : require(name) };
  vm.runInNewContext(fs.readFileSync('scripts/release/android.cjs', 'utf8'), context);
  assert.throws(() => context.module.exports.exec('jarsigner', [sentinel]), error => {
    assert(!error.message.includes(sentinel));
    assert.match(error.message, /Subprocess output withheld/);
    return true;
  });
});


test('new closed-testing uploads validate downloaded bytes and Google version/checksum before commit', async () => {
  const fixture = publishingFixture({ newBundle: true });
  await fixture.publish('closed');
  assert.equal(fixture.calls.filter(call => call.url?.includes('/upload/')).length, 1);
  assert(fixture.calls.some(call => call.url?.endsWith(':commit')));
  for (const overrides of [{ corruptBundle: true }, { uploadCode: 9 }, { uploadHash: 'wrong' }]) {
    const invalid = publishingFixture({ newBundle: true, ...overrides });
    await assert.rejects(invalid.publish('closed'));
    assert(!invalid.calls.some(call => call.method === 'PUT'));
    assert(!invalid.calls.some(call => call.url?.endsWith(':commit')));
  }
});

test('Play validation or commit failures never write a success record or echo the error body', async () => {
  for (const failAt of [':validate', ':commit']) {
    const fixture = publishingFixture({ failAt });
    await assert.rejects(fixture.publish('production'), error => {
      assert(!error.message.includes('SENSITIVE_RESPONSE_SENTINEL'));
      assert.match(error.message, /403/);
      return true;
    });
    assert(!fixture.calls.some(call => call.githubUpload));
    if (failAt === ':validate') assert(!fixture.calls.some(call => call.url?.endsWith(':commit')));
  }
});

test('newer closed versions are rejected before a bundle upload or track update', async () => {
  const fixture = publishingFixture({ code: '9', newBundle: true });
  await assert.rejects(fixture.publish('closed'));
  assert(!fixture.calls.some(call => call.url?.includes('/upload/') || call.method === 'PUT'));
});

test('Google redirect/network/JSON errors are sanitized and redirects are forbidden', async () => {
  const originalFetch = global.fetch;
  const sentinel = 'SENSITIVE_TOKEN_SENTINEL';
  try {
    for (const scenario of ['network', 'json', 'http']) {
      global.fetch = async (url, options) => {
        assert.equal(options.redirect, 'error');
        if (scenario === 'network') throw new Error(sentinel);
        return { ok: scenario !== 'http', status: 403, json: async () => { throw new Error(sentinel); } };
      };
      await assert.rejects(googleRequest('https://oauth2.googleapis.com/token', { method: 'POST' }), error => {
        assert(!error.message.includes(sentinel));
        return true;
      });
    }
  } finally { global.fetch = originalFetch; }
});

test('subprocess environments isolate signing credentials, service account JSON, and GitHub token', () => {
  const vm = require('node:vm');
  const calls = [];
  const context = { module: { exports: {} }, process: { env: {
    PATH: '/test/path', GH_TOKEN: 'github', GOOGLE_PLAY_SERVICE_ACCOUNT_JSON: 'private-json',
    ANDROID_KEYSTORE_BASE64: 'private-keystore', ANDROID_KEYSTORE_PASSWORD: 'store-password',
    ANDROID_KEY_PASSWORD: 'key-password', ANDROID_KEY_ALIAS: 'alias',
  } }, require: name => name === 'node:child_process' ? { execFileSync: (command, args, options) => {
    calls.push({ command, args, env: options.env }); return '';
  } } : require(name) };
  vm.runInNewContext(fs.readFileSync('scripts/release/android.cjs', 'utf8'), context);
  for (const command of ['gh', 'git', 'unzip', 'jarsigner']) context.module.exports.exec(command, []);
  for (const call of calls) {
    assert.equal(call.env.ANDROID_KEYSTORE_BASE64, undefined);
    assert.equal(call.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON, undefined);
    assert.equal(call.env.GH_TOKEN, call.command === 'gh' ? 'github' : undefined);
    assert.equal(call.env.ANDROID_KEYSTORE_PASSWORD, call.command === 'jarsigner' ? 'store-password' : undefined);
  }
});

test('actual workflow shell gates reject branches, tags, PRs and automatic events', () => {
  const { spawnSync, execFileSync } = require('node:child_process');
  // Windows does not put Git Bash on PATH; run the installed Git distribution.
  let bash = 'bash';
  if (process.platform === 'win32') {
    const gitRoot = path.resolve(execFileSync('git', ['--exec-path'], { encoding: 'utf8' }).trim(), '../../..');
    bash = ['bin/bash.exe', 'usr/bin/bash.exe', 'usr/bin/sh.exe']
      .map(file => path.join(gitRoot, file)).find(file => fs.existsSync(file)) || bash;
  }
  for (const name of ['prepare-release', 'build-android-release', 'release-closed-testing', 'publish-production']) {
    const text = fs.readFileSync(`.github/workflows/${name}.yml`, 'utf8').replace(/\r\n/g, '\n');
    const gate = text.match(/      - name: Reject branches, tags, and pull requests\n        run: \|\n([\s\S]*?)\n\n/)[1]
      .split('\n').map(line => line.slice(10)).join('\n');
    for (const [event, ref, status] of [['workflow_dispatch', 'refs/heads/main', 0],
      ['workflow_dispatch', 'refs/heads/feature', 1], ['workflow_dispatch', 'refs/tags/v1.6.1', 1],
      ['pull_request', 'refs/pull/12/merge', 1], ['push', 'refs/heads/main', 1]]) {
      const result = spawnSync(bash, ['-c', gate], { env: { ...process.env, GITHUB_EVENT_NAME: event, GITHUB_REF: ref } });
      assert.ifError(result.error);
      assert.equal(result.status, status, `${name}: ${event} ${ref}`);
    }
  }
});


test('preparation needs no automatic PR permission and provides a manual compare link', () => {
  const workflow = fs.readFileSync('.github/workflows/prepare-release.yml', 'utf8');
  assert.doesNotMatch(workflow, /pull-requests: write|gh pr create|gh pr review/);
  assert.match(workflow, /git push origin "\$RELEASE_BRANCH"/);
  assert.match(workflow, /\$GITHUB_STEP_SUMMARY/);
  assert.match(workflow, /compare\/main\.\.\.\$RELEASE_BRANCH\?expand=1/);
});


test('automatic selection requires the exact prepared main version and never falls back', () => {
  const manifest = { version: '1.6.2' };
  const config = { version: '1.6.2', android: { versionCode: 9 } };
  const record = { schema: 1, version: '1.6.2', versionCode: 9 };
  assert.equal(automaticReleaseTag(manifest, config, record), 'v1.6.2');
  for (const invalid of [undefined, { ...record, version: '1.6.1' }, { ...record, versionCode: 8 }, { ...record, schema: 2 }]) {
    assert.throws(() => automaticReleaseTag(manifest, config, invalid));
  }
  assert.throws(() => automaticReleaseTag(manifest, { ...config, version: '1.6.1' }, record));
  assert.throws(() => automaticReleaseTag({ version: '1.6.2\nBAD=1' }, config, record));
  for (const name of ['build-android-release', 'release-closed-testing', 'publish-production']) {
    const workflow = fs.readFileSync(`.github/workflows/${name}.yml`, 'utf8');
    assert.doesNotMatch(workflow, /release_tag:|inputs\.release_tag/);
    assert.match(workflow, /node scripts\/release\/android\.cjs select/);
  }
});

test('selection writes the validated version for later workflow steps and rejects missing preparation', () => {
  const { spawnSync } = require('node:child_process');
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'oisiu-select-test-'));
  const script = path.resolve('scripts/release/android.cjs');
  const environmentFile = path.join(directory, 'environment');
  const summaryFile = path.join(directory, 'summary');
  const env = { ...process.env, GITHUB_REPOSITORY: 'example/app', GITHUB_RUN_ID: '123',
    GITHUB_EVENT_NAME: 'workflow_dispatch', GITHUB_REF: 'refs/heads/main',
    GITHUB_ENV: environmentFile, GITHUB_STEP_SUMMARY: summaryFile };
  try {
    fs.writeFileSync(path.join(directory, 'package.json'), JSON.stringify({ version: '1.6.2' }));
    fs.writeFileSync(path.join(directory, 'app.json'), JSON.stringify({ expo: { version: '1.6.2', android: { versionCode: 9 } } }));
    const select = () => spawnSync(process.execPath, [script, 'select'], { cwd: directory, env, encoding: 'utf8' });
    assert.equal(select().status, 1);
    assert.equal(fs.existsSync(environmentFile), false);
    fs.mkdirSync(path.join(directory, '.github/releases'), { recursive: true });
    fs.writeFileSync(path.join(directory, '.github/releases/v1.6.2.json'), JSON.stringify({ schema: 1, version: '1.6.2', versionCode: 9 }));
    assert.equal(select().status, 0);
    assert.equal(fs.readFileSync(environmentFile, 'utf8'), 'RELEASE_TAG=v1.6.2\n');
    assert.match(fs.readFileSync(summaryFile, 'utf8'), /v1\.6\.2/);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
