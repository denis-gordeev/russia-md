import assert from 'node:assert/strict';
import { execFile as execFileCallback } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

const execFile = promisify(execFileCallback);
const repoRoot = process.cwd();
const validator = path.join(
  repoRoot,
  'scripts',
  'check-internal-references.mjs',
);
const tempRoot = await mkdtemp(
  path.join(os.tmpdir(), 'russia-md-content-references-'),
);
const articleDir = path.join(tempRoot, 'russia-knowledge', 'Art');
const articlePath = path.join(articleDir, 'example.md');

async function runValidator() {
  return execFile('node', [validator], { cwd: tempRoot });
}

try {
  await mkdir(articleDir, { recursive: true });
  await writeFile(
    articlePath,
    `---
title: 'Link validation fixture'
description: 'Exercises whitespace handling in markdown link destinations.'
date: '2026-08-15'
tags: ['test']
---

[first](https://example.com/a ) and [second]( https://example.com/b)
`,
  );

  await assert.rejects(runValidator(), (error) => {
    assert.match(
      `${error.stdout ?? ''}\n${error.stderr ?? ''}`,
      /example\.md:\d+:\d+: 2 HTTP\(S\) markdown link destination\(s\) contain unencoded whitespace/,
    );
    return true;
  });

  await writeFile(
    articlePath,
    `---
title: 'Link validation fixture'
description: 'Exercises whitespace handling in markdown link destinations.'
date: '2026-08-15'
tags: ['test']
---

[encoded](https://example.com/a%20b) and [CommonMark](<https://example.com/a b>)
`,
  );

  const result = await runValidator();
  assert.match(result.stdout, /Internal reference validation passed/);

  console.log('Content reference validator checks passed.');
} finally {
  await rm(tempRoot, { recursive: true, force: true });
}
