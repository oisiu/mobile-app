const { execFileSync } = require('node:child_process');
const { setTimeout } = require('node:timers/promises');

async function waitForCI({ repository, commit, listRuns, sleep = setTimeout, attempts = 90 }) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository) || !/^[a-f0-9]{40}$/.test(commit)) {
    throw new Error('CI requires a repository and an exact commit SHA.');
  }
  for (let attempt = 0; attempt < attempts; attempt++) {
    const runs = await listRuns(repository, commit);
    const run = runs.filter(candidate =>
      candidate.path === '.github/workflows/ci.yml' &&
      candidate.head_sha === commit && candidate.head_branch === 'main' &&
      ['push', 'workflow_dispatch'].includes(candidate.event)
    ).sort((a, b) => b.id - a.id)[0];
    if (run?.status === 'completed') {
      if (run.conclusion !== 'success') throw new Error(`CI run ${run.id} ended with ${run.conclusion}. Rerun CI on this commit before retrying the release.`);
      console.log(`CI run ${run.id} succeeded for ${commit}.`);
      return;
    }
    if (attempt + 1 < attempts) await sleep(20000);
  }
  throw new Error('Timed out waiting for CI on the release commit. Run CI on this commit before retrying the release.');
}

module.exports = { waitForCI };
if (require.main === module) {
  waitForCI({
    repository: process.env.GITHUB_REPOSITORY,
    commit: process.env.GITHUB_SHA,
    listRuns: (repository, commit) => JSON.parse(execFileSync('gh', [
      'api', `repos/${repository}/actions/workflows/ci.yml/runs?head_sha=${commit}&branch=main&per_page=100`,
    ], { encoding: 'utf8' })).workflow_runs,
  }).catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
