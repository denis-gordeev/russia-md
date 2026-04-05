import { execFile as execFileCallback } from 'child_process';
import assert from 'assert/strict';
import { cp, mkdir, mkdtemp, rename, rm, writeFile } from 'fs/promises';
import os from 'os';
import path from 'path';
import { promisify } from 'util';

const execFile = promisify(execFileCallback);
const repoRoot = process.cwd();
const validatorPath = path.join(repoRoot, 'scripts', 'validate-skill-examples.mjs');
const fixturesRoot = path.join(repoRoot, 'scripts', 'fixtures', 'skill-validator');

async function runCase(caseName, { args = [], expectSuccess, expectedText }) {
  const fixtureRoot = path.join(fixturesRoot, caseName);

  try {
    const { stdout, stderr } = await execFile('node', [validatorPath, ...args], {
      cwd: repoRoot,
      env: {
        ...process.env,
        SKILL_VALIDATOR_ROOT: fixtureRoot
      }
    });

    if (!expectSuccess) {
      throw new Error(`Expected ${caseName} to fail, but it succeeded.\n${stdout}\n${stderr}`);
    }

    if (expectedText) {
      assert.match(`${stdout}\n${stderr}`, expectedText);
    }
  } catch (error) {
    if (expectSuccess) {
      throw error;
    }

    const combinedOutput = `${error.stdout ?? ''}\n${error.stderr ?? ''}`;
    assert.notEqual(error.code, 0, `${caseName} should exit with a non-zero code`);
    assert.match(combinedOutput, expectedText);
  }
}

async function withTempGitFixture(caseName, mutateFixture, assertion) {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'skill-validator-fixture-'));
  const fixtureRoot = path.join(fixturesRoot, caseName);

  await cp(fixtureRoot, tempRoot, { recursive: true });
  await execFile('git', ['init'], { cwd: tempRoot });
  await execFile('git', ['add', '.'], { cwd: tempRoot });
  await execFile(
    'git',
    ['-c', 'user.name=Codex', '-c', 'user.email=codex@example.com', 'commit', '-m', 'fixture baseline'],
    { cwd: tempRoot }
  );

  await mutateFixture(tempRoot);
  await assertion(tempRoot);
}

async function main() {
  await runCase('valid-minimal', {
    expectSuccess: true,
    expectedText: /Validated 1 skill example contract\(s\) and repository markdown links\./
  });

  await runCase('valid-frontmatter', {
    expectSuccess: true,
    expectedText: /Validated 1 skill example contract\(s\) and repository markdown links\./
  });

  await runCase('valid-minimal', {
    args: ['--paths', 'skills/test-skill/SKILL.md,README.md'],
    expectSuccess: true,
    expectedText: /Validated 1 skill example contract\(s\) and changed repository markdown links\./
  });

  await runCase('valid-minimal', {
    args: ['--paths', 'README.md'],
    expectSuccess: true,
    expectedText:
      /No changed skill folders detected; validating changed repository markdown links only\.[\s\S]*Validated 0 skill example contract\(s\) and changed repository markdown links\./
  });

  await runCase('valid-minimal', {
    args: ['--paths', 'notes/todo.txt'],
    expectSuccess: true,
    expectedText:
      /Ignoring scoped repo paths outside skill bundles and tracked markdown docs: "notes\/todo\.txt"\.[\s\S]*No skill folders or repository markdown docs matched the selected --paths input; nothing to validate\./
  });

  await runCase('valid-minimal', {
    args: ['--paths', 'notes/missing.txt'],
    expectSuccess: true,
    expectedText:
      /Scoped input paths did not match repository entries: "notes\/missing\.txt"\.[\s\S]*No skill folders or repository markdown docs matched the selected --paths input; nothing to validate\./
  });

  await runCase('valid-minimal', {
    args: ['--paths', 'README.md,notes/todo.txt,notes/missing.txt'],
    expectSuccess: true,
    expectedText:
      /No changed skill folders detected; validating changed repository markdown links only\.[\s\S]*Scoped input paths did not match repository entries: "notes\/missing\.txt"\.[\s\S]*Ignoring scoped repo paths outside skill bundles and tracked markdown docs: "notes\/todo\.txt"\.[\s\S]*Validated 0 skill example contract\(s\) and changed repository markdown links\./
  });

  await withTempGitFixture(
    'valid-minimal',
    async (tempRoot) => {
      await mkdir(path.join(tempRoot, 'notes'), { recursive: true });
      await writeFile(path.join(tempRoot, 'notes', 'extra.txt'), 'todo\n');
    },
    async (tempRoot) => {
      const { stdout, stderr } = await execFile('node', [validatorPath, '--changed'], {
        cwd: repoRoot,
        env: {
          ...process.env,
          SKILL_VALIDATOR_ROOT: tempRoot
        }
      });

      assert.match(
        `${stdout}\n${stderr}`,
        /Ignoring scoped repo paths outside skill bundles and tracked markdown docs: "notes\/extra\.txt"\.[\s\S]*No changed skill folders or tracked repository markdown docs detected; nothing to validate\./
      );
    }
  );

  await withTempGitFixture(
    'valid-minimal',
    async (tempRoot) => {
      await mkdir(path.join(tempRoot, 'notes'), { recursive: true });
      await writeFile(path.join(tempRoot, 'notes', 'extra.txt'), 'todo\n');
      await execFile('git', ['add', 'notes/extra.txt'], { cwd: tempRoot });
    },
    async (tempRoot) => {
      const { stdout, stderr } = await execFile('node', [validatorPath, '--staged'], {
        cwd: repoRoot,
        env: {
          ...process.env,
          SKILL_VALIDATOR_ROOT: tempRoot
        }
      });

      assert.match(
        `${stdout}\n${stderr}`,
        /Ignoring scoped repo paths outside skill bundles and tracked markdown docs: "notes\/extra\.txt"\.[\s\S]*No changed skill folders or tracked repository markdown docs detected; nothing to validate\./
      );
    }
  );

  await withTempGitFixture(
    'valid-minimal',
    async (tempRoot) => {
      await rm(path.join(tempRoot, 'docs', 'guide.md'));
    },
    async (tempRoot) => {
      await assert.rejects(
        execFile('node', [validatorPath, '--changed'], {
          cwd: repoRoot,
          env: {
            ...process.env,
            SKILL_VALIDATOR_ROOT: tempRoot
          }
        }),
        (error) => {
          const combinedOutput = `${error.stdout ?? ''}\n${error.stderr ?? ''}`;

          assert.notEqual(error.code, 0, 'deleted markdown --changed case should exit non-zero');
          assert.match(
            combinedOutput,
            /Deleted tracked repository markdown docs detected; validating all skill folders and repository markdown links to re-check inbound links\./
          );
          assert.match(
            combinedOutput,
            /skills\/shared\/references\/overview\.md:4: broken local link "\.\.\/\.\.\/\.\.\/docs\/guide\.md#fixture-guide"/
          );
          return true;
        }
      );
    }
  );

  await withTempGitFixture(
    'valid-minimal',
    async (tempRoot) => {
      await rename(path.join(tempRoot, 'docs', 'guide.md'), path.join(tempRoot, 'docs', 'renamed-guide.md'));
      await execFile('git', ['add', '-A', 'docs'], { cwd: tempRoot });
    },
    async (tempRoot) => {
      await assert.rejects(
        execFile('node', [validatorPath, '--changed'], {
          cwd: repoRoot,
          env: {
            ...process.env,
            SKILL_VALIDATOR_ROOT: tempRoot
          }
        }),
        (error) => {
          const combinedOutput = `${error.stdout ?? ''}\n${error.stderr ?? ''}`;

          assert.notEqual(error.code, 0, 'renamed markdown --changed case should exit non-zero');
          assert.match(
            combinedOutput,
            /Renamed tracked repository markdown docs detected; validating all skill folders and repository markdown links to re-check inbound links\./
          );
          assert.match(
            combinedOutput,
            /skills\/shared\/references\/overview\.md:4: broken local link "\.\.\/\.\.\/\.\.\/docs\/guide\.md#fixture-guide"/
          );
          return true;
        }
      );
    }
  );

  await withTempGitFixture(
    'valid-minimal',
    async (tempRoot) => {
      await rename(path.join(tempRoot, 'docs', 'guide.md'), path.join(tempRoot, 'docs', 'renamed-guide.md'));
      await execFile('git', ['add', '-A', 'docs'], { cwd: tempRoot });
    },
    async (tempRoot) => {
      await assert.rejects(
        execFile('node', [validatorPath, '--staged'], {
          cwd: repoRoot,
          env: {
            ...process.env,
            SKILL_VALIDATOR_ROOT: tempRoot
          }
        }),
        (error) => {
          const combinedOutput = `${error.stdout ?? ''}\n${error.stderr ?? ''}`;

          assert.notEqual(error.code, 0, 'renamed markdown --staged case should exit non-zero');
          assert.match(
            combinedOutput,
            /Renamed tracked repository markdown docs detected; validating all skill folders and repository markdown links to re-check inbound links\./
          );
          assert.match(
            combinedOutput,
            /skills\/shared\/references\/overview\.md:4: broken local link "\.\.\/\.\.\/\.\.\/docs\/guide\.md#fixture-guide"/
          );
          return true;
        }
      );
    }
  );

  await withTempGitFixture(
    'valid-minimal',
    async (tempRoot) => {
      await rm(path.join(tempRoot, 'docs', 'guide.md'));
      await execFile('git', ['add', '-u', 'docs/guide.md'], { cwd: tempRoot });
    },
    async (tempRoot) => {
      await assert.rejects(
        execFile('node', [validatorPath, '--staged'], {
          cwd: repoRoot,
          env: {
            ...process.env,
            SKILL_VALIDATOR_ROOT: tempRoot
          }
        }),
        (error) => {
          const combinedOutput = `${error.stdout ?? ''}\n${error.stderr ?? ''}`;

          assert.notEqual(error.code, 0, 'deleted markdown --staged case should exit non-zero');
          assert.match(
            combinedOutput,
            /Deleted tracked repository markdown docs detected; validating all skill folders and repository markdown links to re-check inbound links\./
          );
          assert.match(
            combinedOutput,
            /skills\/shared\/references\/overview\.md:4: broken local link "\.\.\/\.\.\/\.\.\/docs\/guide\.md#fixture-guide"/
          );
          return true;
        }
      );
    }
  );

  await runCase('invalid-icon-path', {
    expectSuccess: false,
    expectedText: /interface\.icon must point to \.svg, \.png, \.jpg, \.jpeg, \.webp/
  });

  await runCase('broken-anchor', {
    expectSuccess: false,
    expectedText: /skills\/test-skill\/SKILL\.md:4: broken local anchor/
  });

  await runCase('multiple-markdown-errors', {
    expectSuccess: false,
    expectedText:
      /README\.md:4: broken local anchor .*missing #missing-anchor[\s\S]*docs\/guide\.md:4: broken local link "\.\.\/missing\.md"/
  });

  await runCase('missing-shared-schema', {
    expectSuccess: false,
    expectedText: /Missing required file: skills\/shared\/schemas\/agent-metadata\.schema\.json/
  });

  console.log('Validator fixture checks passed.');
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
