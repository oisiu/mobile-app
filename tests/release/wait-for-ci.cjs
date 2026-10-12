const { test } = require('node:test');
const assert = require('node:assert/strict');
const { waitForCI } = require('../../scripts/release/wait-for-ci.cjs');
const commit = 'a'.repeat(40);
const run = { id: 10, path: '.github/workflows/ci.yml', head_sha: commit,
  head_branch: 'main', event: 'push', status: 'completed', conclusion: 'success' };
const options = { repository: 'example/app', commit, attempts: 2, sleep: async () => {} };

test('release waits through missing and running CI until the exact main commit succeeds', async () => {
  let calls = 0;
  await waitForCI({ ...options, attempts: 3, listRuns: async (repository, sha) => {
    assert.equal(repository, options.repository);
    assert.equal(sha, commit);
    calls++;
    return calls === 1 ? [] : [{ ...run, status: calls === 2 ? 'in_progress' : 'completed' }];
  } });
  assert.equal(calls, 3);
});

test('release rejects failed CI and does not fall back to an older successful run', async () => {
  for (const conclusion of ['failure', 'cancelled', 'skipped', 'timed_out']) {
    await assert.rejects(waitForCI({ ...options, listRuns: async () => [
      run, { ...run, id: 11, conclusion },
    ] }), /CI run 11 ended/);
  }
});

test('release ignores successful CI for another commit, branch, workflow, or PR', async () => {
  for (const change of [{ head_sha: 'b'.repeat(40) }, { head_branch: 'other' },
    { path: '.github/workflows/security.yml' }, { event: 'pull_request' }]) {
    await assert.rejects(waitForCI({ ...options, listRuns: async () => [{ ...run, ...change }] }), /Timed out/);
  }
  await waitForCI({ ...options, listRuns: async () => [{ ...run, event: 'workflow_dispatch' }] });
});

test('release fails closed when CI is absent or its API cannot be read', async () => {
  await assert.rejects(waitForCI({ ...options, listRuns: async () => [] }), /Timed out/);
  await assert.rejects(waitForCI({ ...options, listRuns: async () => { throw new Error('API unavailable'); } }), /API unavailable/);
});
