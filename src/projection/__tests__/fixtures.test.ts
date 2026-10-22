import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { composeManagedBlock } from '../composer.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const computedRoot = join(__dirname, '../../..');
const root = (() => {
  try {
    if (existsSync(join(computedRoot, 'package.json'))) return computedRoot;
  } catch {
    // ignore
  }
  return process.cwd();
})();

describe('prompt projection fixtures', () => {
  it('golden managed block matches composed projection independent of package version', () => {
    const golden = readFileSync(join(root, 'tests/fixtures/prompt-projection/claude-managed-block.golden'), 'utf8');
    const docsRaw = readFileSync(join(root, 'docs/CLAUDE.md'), 'utf8');
    const versionPlaceholder = '<version>';
    const expected = composeManagedBlock({ canonicalDocsRaw: docsRaw, version: versionPlaceholder });
    expect(golden).toBe(expected);
  });
  it('canonical docs version matches package.json', () => {
    const docsRaw = readFileSync(join(root, 'docs/CLAUDE.md'), 'utf8');
    const pkgVer = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version as string;
    expect(docsRaw).toContain(`<!-- OMC:VERSION:${pkgVer} -->`);
  });
  it('normalized body fixture matches docs canonical body', () => {
    const docsRaw = readFileSync(join(root, 'docs/CLAUDE.md'), 'utf8');
    const START='<!-- OMC:START -->'; const END='<!-- OMC:END -->';
    const s=docsRaw.indexOf(START); const e=docsRaw.indexOf(END);
    const se=docsRaw.indexOf('\n', s);
    let body=docsRaw.slice(se+1, e);
    body=body.replace(/<!-- OMC:VERSION:[^\s]*? -->\r?\n?/g,'');
    body=body.replace(/\r\n/g,'\n');
    if(body.length && !body.endsWith('\n')) body+='\n';
    const normalized = readFileSync(join(root, 'tests/fixtures/prompt-projection/claude-body.normalized'), 'utf8');
    expect(body).toBe(normalized);
    expect(createHash('sha256').update(body).digest('hex')).toBe(createHash('sha256').update(normalized).digest('hex'));
  });
  it('transaction fixture documents required phases', () => {
    const fixture = JSON.parse(readFileSync(join(root, 'tests/fixtures/prompt-projection/transaction-backup-rollback.json'), 'utf8'));
    expect(fixture.phases).toEqual(expect.arrayContaining(['validation','backup','mutation','rollback']));
    expect(fixture.guards).toEqual(expect.arrayContaining(['exclusiveVerifiedBackup','atomicWrite']));
  });
});
