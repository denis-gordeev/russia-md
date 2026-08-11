import assert from 'node:assert/strict';
import { execFile as execFileCallback } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

const execFile = promisify(execFileCallback);
const repoRoot = process.cwd();
const scripts = [
  {
    path: path.join(repoRoot, 'scripts', 'test-frontmatter.mjs'),
    expected: /russia-knowledge\/Art\/пример\.md: missing or invalid "title"/,
  },
  {
    path: path.join(repoRoot, 'scripts', 'check-internal-references.mjs'),
    expected:
      /russia-knowledge\/Art\/пример\.md:\d+:\d+: internal link target does not exist: \/society\/missing/,
  },
];

async function expectValidationFailure(script, cwd, expected) {
  try {
    const result = await execFile('node', [script, '--staged'], { cwd });
    assert.fail(
      `Expected ${path.basename(script)} to reject the staged Cyrillic path.\n${result.stdout}\n${result.stderr}`,
    );
  } catch (error) {
    if (error.code === 'ERR_ASSERTION') {
      throw error;
    }

    assert.notEqual(error.code, 0);
    assert.match(`${error.stdout ?? ''}\n${error.stderr ?? ''}`, expected);
  }
}

const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'russia-md-git-paths-'));

try {
  const articleDir = path.join(tempRoot, 'russia-knowledge', 'Art');
  const relativeArticlePath = 'russia-knowledge/Art/пример.md';
  await mkdir(articleDir, { recursive: true });
  await writeFile(
    path.join(tempRoot, relativeArticlePath),
    `---
description: 'Тест выборочной проверки'
date: '2026-08-11'
tags: ['тест']
---

[Несуществующая статья](/society/missing)
`,
  );

  await execFile('git', ['init'], { cwd: tempRoot });
  await execFile('git', ['config', 'user.name', 'Codex Test'], {
    cwd: tempRoot,
  });
  await execFile('git', ['config', 'user.email', 'codex@example.com'], {
    cwd: tempRoot,
  });
  await execFile('git', ['add', relativeArticlePath], { cwd: tempRoot });

  for (const script of scripts) {
    await expectValidationFailure(script.path, tempRoot, script.expected);
  }

  console.log('Non-ASCII Git path checks passed.');
} finally {
  await rm(tempRoot, { recursive: true, force: true });
}
