import { execFile as execFileCallback } from 'child_process';
import assert from 'assert/strict';
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
    expectedText: /No skill folders or repository markdown docs matched the selected --paths input; nothing to validate\./
  });

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
