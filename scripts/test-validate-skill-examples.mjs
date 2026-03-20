import { execFile as execFileCallback } from 'child_process';
import assert from 'assert/strict';
import path from 'path';
import { promisify } from 'util';

const execFile = promisify(execFileCallback);
const repoRoot = process.cwd();
const validatorPath = path.join(repoRoot, 'scripts', 'validate-skill-examples.mjs');
const fixturesRoot = path.join(repoRoot, 'scripts', 'fixtures', 'skill-validator');

async function runCase(caseName, { expectSuccess, expectedText }) {
  const fixtureRoot = path.join(fixturesRoot, caseName);

  try {
    const { stdout, stderr } = await execFile('node', [validatorPath], {
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

  await runCase('invalid-icon-path', {
    expectSuccess: false,
    expectedText: /interface\.icon must point to \.svg, \.png, \.jpg, \.jpeg, \.webp/
  });

  await runCase('broken-anchor', {
    expectSuccess: false,
    expectedText: /broken local anchor/
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
