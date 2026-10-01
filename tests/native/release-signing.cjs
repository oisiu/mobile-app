const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { Buffer } = require('node:buffer');
const source = fs.readFileSync(require.resolve('../../scripts/release/android.cjs'), 'utf8');
const original = process.cwd();
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'oisiu-signing-smoke-'));
const commit = 'a'.repeat(40);
const signDirectories = [];
try {
  process.chdir(directory);
  fs.mkdirSync('.github/releases', { recursive: true });
  fs.mkdirSync('store/google-play/releases', { recursive: true });
  fs.mkdirSync('android/app/build/outputs/bundle/release', { recursive: true });
  fs.writeFileSync('package.json', JSON.stringify({ version: '1.6.1' }));
  fs.writeFileSync('app.json', JSON.stringify({ expo: { version: '1.6.1', android: { versionCode: 8 } } }));
  fs.writeFileSync('.github/releases/v1.6.1.json', JSON.stringify({ schema: 1, version: '1.6.1', versionCode: 8, prepareRunId: '10' }));
  fs.writeFileSync('store/google-play/releases/1.6.1.txt', '<en-US>Smoke test.</en-US><es-ES>Prueba.</es-ES>');
  const env = { ...process.env, GITHUB_REPOSITORY: 'example/app', GITHUB_RUN_ID: '11', GITHUB_SHA: commit,
    RELEASE_TAG: 'v1.6.1', ANDROID_KEYSTORE_PASSWORD: 'synthetic-test-password', ANDROID_KEY_PASSWORD: 'synthetic-test-password',
    ANDROID_KEY_ALIAS: 'synthetic-test-alias' };
  execFileSync('keytool', ['-genkeypair', '-alias', env.ANDROID_KEY_ALIAS, '-keyalg', 'RSA', '-validity', '1',
    '-dname', 'CN=Synthetic release test', '-keystore', 'synthetic.jks', '-storepass:env', 'ANDROID_KEYSTORE_PASSWORD',
    '-keypass:env', 'ANDROID_KEY_PASSWORD'], { env, stdio: 'pipe' });
  env.ANDROID_KEYSTORE_BASE64 = fs.readFileSync('synthetic.jks').toString('base64');
  fs.writeFileSync('payload.txt', 'Synthetic unsigned archive; not an Android application.');
  execFileSync('zip', ['-q', 'android/app/build/outputs/bundle/release/app-release.aab', 'payload.txt']);
  const context = { module: { exports: {} }, process: { env }, console, Buffer,
    require: name => name === 'node:fs' ? { ...fs, mkdtempSync: (...args) => {
      const value = fs.mkdtempSync(...args); signDirectories.push(value); return value;
    } } : name === 'node:child_process' ? { execFileSync: (command, args, options) => {
      if (command === 'git') return commit;
      if (command === 'gh') return JSON.stringify(args[1].endsWith('/pulls')
        ? [{ merged_at: 'test', base: { ref: 'main' }, head: { ref: 'codex/release-v1.6.1' } }]
        : { path: '.github/workflows/prepare-release.yml', event: 'workflow_dispatch', head_branch: 'main', conclusion: 'success' });
      return execFileSync(command, args, options);
    } } : require(name) };
  vm.runInNewContext(source, context);
  env.ANDROID_KEYSTORE_PASSWORD = 'incorrect-test-password';
  assert.throws(() => context.module.exports.buildMetadata(), /Subprocess output withheld/);
  assert(signDirectories.every(value => !fs.existsSync(value)));
  env.ANDROID_KEYSTORE_PASSWORD = 'synthetic-test-password';
  context.module.exports.buildMetadata();
  assert(fs.existsSync('release-output/oisiu.aab'));
  const record = fs.readFileSync('release-output/build.json', 'utf8');
  assert(!record.includes(env.ANDROID_KEYSTORE_PASSWORD));
  assert(!record.includes(env.ANDROID_KEYSTORE_BASE64));
  assert(!record.includes(env.ANDROID_KEY_ALIAS));
  assert(signDirectories.every(value => !fs.existsSync(value)));
  // Refuse the archive once already signed with the synthetic key.
  fs.copyFileSync('release-output/oisiu.aab', 'android/app/build/outputs/bundle/release/app-release.aab');
  assert.throws(() => context.module.exports.buildMetadata(), /Expected an unsigned bundle/);
  console.log('PASS: real JDK fixture signing, signature verification, credential-free metadata, temporary-key cleanup, and already-signed input rejection.');
} finally {
  process.chdir(original);
  fs.rmSync(directory, { recursive: true, force: true });
  for (const value of signDirectories) fs.rmSync(value, { recursive: true, force: true });
}
