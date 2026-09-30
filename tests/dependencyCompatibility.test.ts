import { mkdtempSync,mkdirSync,writeFileSync,rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname,join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe,expect,it } from 'vitest';

const script=fileURLToPath(new URL('../scripts/check-dependencies.cjs',import.meta.url));
function check(overrides:Record<string,string|null>={}){
  const cwd=mkdtempSync(join(tmpdir(),'oisiu-dependencies-'));
  try{
    writeFileSync(join(cwd,'package.json'),'{}');
    const versions:Record<string,string|null>={react:'19.2.3','react-test-renderer':'19.2.3',vitest:'5.0.2','@vitest/coverage-v8':'5.0.2',...overrides};
    for(const [name,version] of Object.entries(versions)){
      if(version===null)continue;
      const path=join(cwd,'node_modules',name,'package.json');mkdirSync(dirname(path),{recursive:true});writeFileSync(path,JSON.stringify({name,version}));
    }
    return spawnSync(process.execPath,[script],{cwd,encoding:'utf8'});
  }finally{rmSync(cwd,{recursive:true,force:true})}
}

describe('dependency compatibility gate',()=>{
  it('accepts aligned installed versions',()=>{const result=check();expect(result.status).toBe(0);expect(result.stdout).toContain('passed')});
  it('blocks the React/test renderer mismatch proposed in PR 21',()=>{const result=check({'react-test-renderer':'19.3.0'});expect(result.status).toBe(1);expect(result.stderr).toContain('react@19.2.3 and react-test-renderer@19.3.0')});
  it('blocks mismatched Vitest coverage even on a patch update',()=>{const result=check({'@vitest/coverage-v8':'5.0.1'});expect(result.status).toBe(1);expect(result.stderr).toContain('vitest@5.0.2 and @vitest/coverage-v8@5.0.1')});
  it('fails closed when a required dependency is missing',()=>{const result=check({'react-test-renderer':null});expect(result.status).toBe(1);expect(result.stderr).toContain('Install dependencies with the frozen lockfile first')});
  it('fails closed when installed manifests omit versions',()=>{const result=check({react:'','react-test-renderer':''});expect(result.status).toBe(1);expect(result.stderr).toContain('Missing version for react')});
  it('allows coordinated upgrades without hard-coded version pins',()=>{expect(check({react:'19.3.0','react-test-renderer':'19.3.0'}).status).toBe(0)});
});
