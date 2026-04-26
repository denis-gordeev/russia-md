import { execFile as execFileCallback } from 'child_process';
import assert from 'assert/strict';
import { mkdtemp, cp, readFile, writeFile } from 'fs/promises';
import os from 'os';
import path from 'path';
import { promisify } from 'util';

const execFile = promisify(execFileCallback);
const repoRoot = process.cwd();
const validatorPath = path.join(
  repoRoot,
  'scripts',
  'validate-skill-examples.mjs',
);
const fixturesRoot = path.join(
  repoRoot,
  'scripts',
  'fixtures',
  'skill-validator',
);

async function runCase(caseName, { args = [], expectSuccess, expectedText }) {
  const fixtureRoot = path.join(fixturesRoot, caseName);

  try {
    const { stdout, stderr } = await execFile(
      'node',
      [validatorPath, ...args],
      {
        cwd: repoRoot,
        env: {
          ...process.env,
          SKILL_VALIDATOR_ROOT: fixtureRoot,
        },
      },
    );

    if (!expectSuccess) {
      throw new Error(
        `Expected ${caseName} to fail, but it succeeded.\n${stdout}\n${stderr}`,
      );
    }

    if (expectedText) {
      assert.match(`${stdout}\n${stderr}`, expectedText);
    }
  } catch (error) {
    if (expectSuccess) {
      throw error;
    }

    const combinedOutput = `${error.stdout ?? ''}\n${error.stderr ?? ''}`;
    assert.notEqual(
      error.code,
      0,
      `${caseName} should exit with a non-zero code`,
    );
    assert.match(combinedOutput, expectedText);
  }
}

async function initFixtureGitRepo(caseName) {
  const fixtureRoot = path.join(fixturesRoot, caseName);
  const tempRoot = await mkdtemp(
    path.join(os.tmpdir(), `skill-validator-${caseName}-`),
  );

  await cp(fixtureRoot, tempRoot, { recursive: true });
  await execFile('git', ['init'], { cwd: tempRoot });
  await execFile('git', ['config', 'user.name', 'Codex Test'], {
    cwd: tempRoot,
  });
  await execFile('git', ['config', 'user.email', 'codex@example.com'], {
    cwd: tempRoot,
  });
  await execFile('git', ['add', '.'], { cwd: tempRoot });
  await execFile('git', ['commit', '-m', 'Initial fixture state'], {
    cwd: tempRoot,
  });

  return tempRoot;
}

async function runGitCase({ caseName, args = [], mutate, expectedText }) {
  const fixtureRoot = await initFixtureGitRepo(caseName);

  if (mutate) {
    await mutate(fixtureRoot);
  }

  const { stdout, stderr } = await execFile('node', [validatorPath, ...args], {
    cwd: repoRoot,
    env: {
      ...process.env,
      SKILL_VALIDATOR_ROOT: fixtureRoot,
    },
  });

  assert.match(`${stdout}\n${stderr}`, expectedText);
}

async function main() {
  await runCase('valid-minimal', {
    expectSuccess: true,
    expectedText:
      /Validated 1 skill example contract\(s\) and repository markdown links\./,
  });

  await runCase('valid-frontmatter', {
    expectSuccess: true,
    expectedText:
      /Validated 1 skill example contract\(s\) and repository markdown links\./,
  });

  await runCase('valid-minimal', {
    args: ['--paths', 'skills/test-skill/SKILL.md,README.md'],
    expectSuccess: true,
    expectedText:
      /Validated 1 skill example contract\(s\) and changed repository markdown links\./,
  });

  await runCase('valid-minimal', {
    args: ['--paths', 'skills/test-skill'],
    expectSuccess: true,
    expectedText:
      /Validated 1 skill example contract\(s\) and changed repository markdown links\./,
  });

  await runCase('valid-minimal', {
    args: ['--paths', 'skills/test-skill/references'],
    expectSuccess: true,
    expectedText:
      /Validated 1 skill example contract\(s\) and changed repository markdown links\./,
  });

  await runCase('valid-minimal', {
    args: ['--paths', 'README.md'],
    expectSuccess: true,
    expectedText:
      /No changed skill folders detected; validating changed repository markdown links only\.[\s\S]*Validated 0 skill example contract\(s\) and changed repository markdown links\./,
  });

  await runCase('valid-minimal', {
    args: ['--paths', 'docs'],
    expectSuccess: true,
    expectedText:
      /No changed skill folders detected; validating changed repository markdown links only\.[\s\S]*Validated 0 skill example contract\(s\) and changed repository markdown links\./,
  });

  await runCase('valid-minimal', {
    args: ['--paths', 'skills/shared/references'],
    expectSuccess: true,
    expectedText:
      /No changed skill folders detected; validating changed repository markdown links only\.[\s\S]*Validated 0 skill example contract\(s\) and changed repository markdown links\./,
  });

  await runCase('valid-minimal', {
    args: ['--paths', 'docs,notes/todo.txt,missing.txt'],
    expectSuccess: true,
    expectedText:
      /Additional --paths selection details: ignored existing non-markdown path\(s\): notes\/todo\.txt; unmatched path\(s\): missing\.txt\.[\s\S]*No changed skill folders detected; validating changed repository markdown links only\.[\s\S]*Validated 0 skill example contract\(s\) and changed repository markdown links\./,
  });

  await runCase('valid-minimal', {
    args: ['--paths', 'notes/todo.txt'],
    expectSuccess: true,
    expectedText:
      /No skill folders or repository markdown docs matched the selected --paths input; nothing to validate \(ignored existing non-markdown path\(s\): notes\/todo\.txt\.\)/,
  });

  await runCase('valid-minimal', {
    args: ['--paths', 'notes/extra.md'],
    expectSuccess: true,
    expectedText:
      /No skill folders or repository markdown docs matched the selected --paths input; nothing to validate \(ignored existing markdown path\(s\) outside tracked docs: notes\/extra\.md\.\)/,
  });

  await runCase('valid-minimal', {
    args: ['--paths', 'missing.txt'],
    expectSuccess: true,
    expectedText:
      /No skill folders or repository markdown docs matched the selected --paths input; nothing to validate \(unmatched path\(s\): missing\.txt\.\)/,
  });

  await runCase('valid-minimal', {
    args: ['--paths', 'README.md,notes/todo.txt'],
    expectSuccess: true,
    expectedText:
      /Additional --paths selection details: ignored existing non-markdown path\(s\): notes\/todo\.txt\.[\s\S]*No changed skill folders detected; validating changed repository markdown links only\.[\s\S]*Validated 0 skill example contract\(s\) and changed repository markdown links\./,
  });

  await runCase('valid-minimal', {
    args: [
      '--paths',
      'missing-1.md,missing-2.md,missing-3.md,missing-4.md,missing-5.md,missing-6.md,missing-7.md',
    ],
    expectSuccess: true,
    expectedText:
      /No skill folders or repository markdown docs matched the selected --paths input; nothing to validate \(unmatched path\(s\): missing-1\.md, missing-2\.md, missing-3\.md, missing-4\.md, missing-5\.md, \.\.\. \(\+2 more\)\.\)/,
  });

  await runCase('valid-minimal', {
    args: [
      '--paths',
      'notes/todo.txt,notes/another.txt,notes/third.txt,notes/fourth.txt,notes/fifth.txt,notes/sixth.txt',
    ],
    expectSuccess: true,
    expectedText:
      /No skill folders or repository markdown docs matched the selected --paths input; nothing to validate \(ignored existing non-markdown path\(s\): notes\/another\.txt, notes\/fifth\.txt, notes\/fourth\.txt, notes\/sixth\.txt, notes\/third\.txt, \.\.\. \(\+1 more\)\.\)/,
  });

  await runGitCase({
    caseName: 'valid-minimal',
    args: ['--changed'],
    mutate: async (fixtureRoot) => {
      await writeFile(
        path.join(fixtureRoot, 'notes', 'todo.txt'),
        'updated outside tracked docs\n',
      );
    },
    expectedText:
      /No changed skill folders or tracked repository markdown docs detected; nothing to validate\./,
  });

  await runGitCase({
    caseName: 'valid-minimal',
    args: ['--staged'],
    mutate: async (fixtureRoot) => {
      const notesPath = path.join(fixtureRoot, 'notes', 'todo.txt');
      const current = await readFile(notesPath, 'utf8');
      await writeFile(notesPath, `${current}staged update\n`);
      await execFile('git', ['add', 'notes/todo.txt'], { cwd: fixtureRoot });
    },
    expectedText:
      /No changed skill folders or tracked repository markdown docs detected; nothing to validate\./,
  });

  await runCase('invalid-markdown-syntax', {
    expectSuccess: true,
    expectedText:
      /Validated 1 skill example contract\(s\) and repository markdown links\./,
  });

  await runCase('malformed-frontmatter', {
    expectSuccess: false,
    expectedText: /README\.md: invalid YAML front matter/,
  });

  await runCase('malformed-agent-metadata', {
    expectSuccess: false,
    expectedText:
      /skills\/test-skill\/agents\/openai\.yaml:10:1: invalid YAML \(Flow sequence in block collection must be sufficiently indented and end with a \]/,
  });

  await runCase('invalid-icon-path', {
    expectSuccess: false,
    expectedText:
      /interface\.icon must point to \.svg, \.png, \.jpg, \.jpeg, \.webp/,
  });

  await runCase('broken-anchor', {
    expectSuccess: false,
    expectedText:
      /skills\/test-skill\/SKILL\.md:4: broken local anchor .*nearest anchor: #guide/,
  });

  await runCase('broken-anchor-no-suggestion', {
    expectSuccess: false,
    expectedText:
      /skills\/test-skill\/SKILL\.md:4: broken local anchor "references\/integration-notes\.md#totally-missing-anchor" \(missing #totally-missing-anchor\)(?![\s\S]*nearest anchor)/,
  });

  await runCase('multiple-markdown-errors', {
    expectSuccess: false,
    expectedText:
      /README\.md:4: broken local anchor .*missing #missing-anchor[\s\S]*docs\/guide\.md:4: broken local link "\.\.\/missing\.md"/,
  });

  await runCase('truncated-markdown-errors', {
    expectSuccess: false,
    expectedText:
      /skills\/test-skill\/SKILL\.md:5: broken local anchor "references\/integration-notes\.md#missing-epsilon"[\s\S]*README\.md:4: broken local anchor "skills\/shared\/references\/overview\.md#missing-alpha"[\s\S]*docs\/guide\.md:5: broken local anchor "\.\.\/skills\/shared\/references\/overview\.md#missing-delta"[\s\S]*\.\.\. truncated 2 additional markdown validation error\(s\)\./,
  });

  await runCase('missing-shared-schema', {
    expectSuccess: false,
    expectedText:
      /Missing required file: skills\/shared\/schemas\/agent-metadata\.schema\.json/,
  });

  console.log('Validator fixture checks passed.');
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
