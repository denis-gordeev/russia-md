import { execFile as execFileCallback } from 'child_process';
import { readdir, readFile, stat } from 'fs/promises';
import { promisify } from 'util';
import path from 'path';
import matter from 'gray-matter';
import YAML from 'yaml';

const configuredRoot = process.env.SKILL_VALIDATOR_ROOT;
const root = configuredRoot ? path.resolve(configuredRoot) : process.cwd();
const skillsDir = path.join(root, 'skills');
const agentMetadataSchemaPath = path.join(
  skillsDir,
  'shared',
  'schemas',
  'agent-metadata.schema.json',
);
const markdownLinkPattern = /(?<!!)\[[^\]]+\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
const markdownAnchorCache = new Map();
const fullSkillValidationTriggers = [
  '.github/workflows/deploy.yml',
  '.github/workflows/skills.yml',
  'package-lock.json',
  'package.json',
  'scripts/validate-skill-examples.mjs',
];
const documentPaths = [
  path.join(root, 'README.md'),
  path.join(skillsDir, 'shared', 'references'),
  path.join(root, 'docs'),
];
const execFile = promisify(execFileCallback);

function parseCliArgs(argv) {
  const options = {
    changed: false,
    staged: false,
    paths: [],
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--changed') {
      options.changed = true;
      continue;
    }

    if (arg === '--staged') {
      options.staged = true;
      continue;
    }

    if (arg === '--paths') {
      const value = argv[index + 1];

      if (!value || value.startsWith('--')) {
        fail('Expected a comma-separated path list after --paths');
      }

      options.paths.push(
        ...value
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
      );
      index += 1;
      continue;
    }

    fail(`Unknown argument: ${arg}`);
  }

  if (options.changed && options.staged) {
    fail('Use either --changed or --staged, not both at once');
  }

  if (options.paths.length > 0 && (options.changed || options.staged)) {
    fail('Use --paths by itself, without --changed or --staged');
  }

  return options;
}

async function listSkillDirs(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory() && entry.name !== 'shared')
    .map((entry) => path.join(dir, entry.name))
    .sort();
}

async function listMarkdownFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        return listMarkdownFiles(fullPath);
      }

      return entry.name.endsWith('.md') ? [fullPath] : [];
    }),
  );

  return files.flat().sort();
}

function fail(message) {
  throw new Error(message);
}

function validateValue(value, schema, currentPath) {
  const allowedTypes = Array.isArray(schema.type)
    ? schema.type
    : schema.type
      ? [schema.type]
      : [];

  if (allowedTypes.length > 0) {
    const matched = allowedTypes.some((type) => matchesType(value, type));
    if (!matched) {
      fail(
        `${currentPath}: expected type ${allowedTypes.join(' | ')}, got ${describeType(value)}`,
      );
    }
  }

  if (schema.enum && !schema.enum.includes(value)) {
    fail(
      `${currentPath}: expected one of ${schema.enum.join(', ')}, got ${JSON.stringify(value)}`,
    );
  }

  if (typeof value === 'number') {
    if (typeof schema.minimum === 'number' && value < schema.minimum) {
      fail(`${currentPath}: expected >= ${schema.minimum}, got ${value}`);
    }
    if (typeof schema.maximum === 'number' && value > schema.maximum) {
      fail(`${currentPath}: expected <= ${schema.maximum}, got ${value}`);
    }
  }

  if (typeof value === 'string') {
    if (
      typeof schema.minLength === 'number' &&
      value.length < schema.minLength
    ) {
      fail(
        `${currentPath}: expected length >= ${schema.minLength}, got ${value.length}`,
      );
    }

    if (
      typeof schema.maxLength === 'number' &&
      value.length > schema.maxLength
    ) {
      fail(
        `${currentPath}: expected length <= ${schema.maxLength}, got ${value.length}`,
      );
    }

    if (schema.pattern) {
      const pattern = new RegExp(schema.pattern);
      if (!pattern.test(value)) {
        fail(
          `${currentPath}: expected to match ${schema.pattern}, got ${JSON.stringify(value)}`,
        );
      }
    }
  }

  if (typeof value === 'string' && schema.format === 'uri') {
    try {
      new URL(value);
    } catch {
      fail(
        `${currentPath}: expected a valid URI, got ${JSON.stringify(value)}`,
      );
    }
  }

  if (Array.isArray(value) && schema.items) {
    value.forEach((item, index) =>
      validateValue(item, schema.items, `${currentPath}[${index}]`),
    );
  }

  if (value && typeof value === 'object' && !Array.isArray(value)) {
    if (Array.isArray(schema.required)) {
      for (const key of schema.required) {
        if (!(key in value)) {
          fail(`${currentPath}: missing required property ${key}`);
        }
      }
    }

    if (schema.properties) {
      for (const [key, propertySchema] of Object.entries(schema.properties)) {
        if (key in value) {
          validateValue(value[key], propertySchema, `${currentPath}.${key}`);
        }
      }
    }

    const definedProperties = new Set(Object.keys(schema.properties ?? {}));

    if (schema.additionalProperties === false) {
      for (const key of Object.keys(value)) {
        if (!definedProperties.has(key)) {
          fail(`${currentPath}: unexpected property ${key}`);
        }
      }
    } else if (
      schema.additionalProperties &&
      typeof schema.additionalProperties === 'object'
    ) {
      for (const [key, propertyValue] of Object.entries(value)) {
        if (!definedProperties.has(key)) {
          validateValue(
            propertyValue,
            schema.additionalProperties,
            `${currentPath}.${key}`,
          );
        }
      }
    }
  }
}

function matchesType(value, type) {
  switch (type) {
    case 'array':
      return Array.isArray(value);
    case 'object':
      return (
        value !== null && typeof value === 'object' && !Array.isArray(value)
      );
    case 'null':
      return value === null;
    default:
      return typeof value === type;
  }
}

function describeType(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

async function ensureExists(filePath) {
  try {
    await stat(filePath);
  } catch {
    fail(`Missing required file: ${path.relative(root, filePath)}`);
  }
}

async function pathExists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

function shouldSkipLink(target) {
  return (
    target.startsWith('http://') ||
    target.startsWith('https://') ||
    target.startsWith('mailto:') ||
    target.startsWith('tel:')
  );
}

function resolveRepoPath(fromFile, target) {
  if (target.startsWith('/')) {
    return path.join(root, target.slice(1));
  }

  return path.resolve(path.dirname(fromFile), target);
}

function normalizeLinkTarget(rawTarget) {
  const [targetWithoutHash] = rawTarget.split('#', 1);
  return targetWithoutHash.replace(/\\/g, '/');
}

function countLines(value) {
  if (value.length === 0) {
    return 0;
  }

  return value.split(/\r?\n/).length;
}

function getMarkdownBodyInfo(markdownRaw) {
  const parsed = matter(markdownRaw);
  const contentStartIndex = markdownRaw.indexOf(parsed.content);
  const bodyStartLine =
    contentStartIndex === -1
      ? 1
      : countLines(markdownRaw.slice(0, contentStartIndex)) + 1;

  return {
    content: parsed.content,
    bodyStartLine,
  };
}

function getLineNumberForIndex(content, index, bodyStartLine) {
  const prefix = content.slice(0, index);
  return bodyStartLine + countLines(prefix);
}

function extractLinkFragment(rawTarget) {
  const hashIndex = rawTarget.indexOf('#');
  if (hashIndex === -1) {
    return '';
  }

  return rawTarget.slice(hashIndex + 1).trim();
}

function createMarkdownSlug(value) {
  return value
    .replace(/<[^>]+>/g, '')
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{Letter}\p{Number}\s-]/gu, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function computeLevenshteinDistance(left, right) {
  if (left === right) {
    return 0;
  }

  if (left.length === 0) {
    return right.length;
  }

  if (right.length === 0) {
    return left.length;
  }

  let previousRow = Array.from(
    { length: right.length + 1 },
    (_, index) => index,
  );

  for (let leftIndex = 0; leftIndex < left.length; leftIndex += 1) {
    const currentRow = [leftIndex + 1];

    for (let rightIndex = 0; rightIndex < right.length; rightIndex += 1) {
      const substitutionCost = left[leftIndex] === right[rightIndex] ? 0 : 1;
      currentRow.push(
        Math.min(
          currentRow[rightIndex] + 1,
          previousRow[rightIndex + 1] + 1,
          previousRow[rightIndex] + substitutionCost,
        ),
      );
    }

    previousRow = currentRow;
  }

  return previousRow[right.length];
}

function getNearestAnchorSuggestion(fragment, anchors) {
  if (!fragment || anchors.size === 0) {
    return null;
  }

  let bestMatch = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const anchor of anchors) {
    const distance = computeLevenshteinDistance(fragment, anchor);

    if (distance < bestDistance) {
      bestDistance = distance;
      bestMatch = anchor;
    }
  }

  const similarityThreshold = Math.max(2, Math.ceil(fragment.length * 0.4));

  if (bestMatch && bestDistance <= similarityThreshold) {
    return bestMatch;
  }

  return null;
}

async function getMarkdownAnchors(markdownPath) {
  const cachedAnchors = markdownAnchorCache.get(markdownPath);

  if (cachedAnchors) {
    return cachedAnchors;
  }

  const markdownRaw = await readFile(markdownPath, 'utf8');
  const { content } = getMarkdownBodyInfo(markdownRaw);
  const anchors = new Set();
  const slugCounts = new Map();
  const lines = content.split(/\r?\n/);
  let activeFence = null;

  for (const line of lines) {
    const fenceMatch = line.match(/^(```+|~~~+)/);

    if (fenceMatch) {
      const currentFence = fenceMatch[1][0];

      if (activeFence === currentFence) {
        activeFence = null;
      } else if (!activeFence) {
        activeFence = currentFence;
      }

      continue;
    }

    if (activeFence) {
      continue;
    }

    const headingMatch = line.match(/^#{1,6}\s+(.*?)\s*#*\s*$/);
    if (headingMatch) {
      const baseSlug = createMarkdownSlug(headingMatch[1]);

      if (baseSlug) {
        const nextCount = slugCounts.get(baseSlug) ?? 0;
        const uniqueSlug =
          nextCount === 0 ? baseSlug : `${baseSlug}-${nextCount}`;

        slugCounts.set(baseSlug, nextCount + 1);
        anchors.add(uniqueSlug);
      }
    }

    for (const idMatch of line.matchAll(/\bid=["']([^"']+)["']/g)) {
      anchors.add(idMatch[1].trim());
    }
  }

  markdownAnchorCache.set(markdownPath, anchors);
  return anchors;
}

async function validateMarkdownLinks(markdownPath) {
  const markdownRaw = await readFile(markdownPath, 'utf8');
  const { content, bodyStartLine } = getMarkdownBodyInfo(markdownRaw);
  const matches = [...content.matchAll(markdownLinkPattern)];
  const errors = [];

  for (const match of matches) {
    const rawTarget = match[1];
    const lineNumber = getLineNumberForIndex(
      content,
      match.index ?? 0,
      bodyStartLine,
    );

    if (!rawTarget || shouldSkipLink(rawTarget)) {
      continue;
    }

    const normalizedTarget = normalizeLinkTarget(rawTarget);

    const resolvedTarget = normalizedTarget
      ? resolveRepoPath(markdownPath, normalizedTarget)
      : markdownPath;

    if (!(await pathExists(resolvedTarget))) {
      errors.push(
        `${path.relative(root, markdownPath)}:${lineNumber}: broken local link ${JSON.stringify(rawTarget)}`,
      );
      continue;
    }

    const fragment = extractLinkFragment(rawTarget);
    const shouldValidateFragment =
      fragment.length > 0 &&
      (rawTarget.startsWith('#') ||
        path.extname(resolvedTarget).toLowerCase() === '.md');

    if (!shouldValidateFragment) {
      continue;
    }

    const decodedFragment = decodeURIComponent(fragment);
    const anchors = await getMarkdownAnchors(resolvedTarget);

    if (!anchors.has(decodedFragment)) {
      const suggestedAnchor = getNearestAnchorSuggestion(
        decodedFragment,
        anchors,
      );
      const suggestionSuffix = suggestedAnchor
        ? `; nearest anchor: #${suggestedAnchor}`
        : '';

      errors.push(
        `${path.relative(root, markdownPath)}:${lineNumber}: broken local anchor ${JSON.stringify(rawTarget)} (missing #${decodedFragment}${suggestionSuffix})`,
      );
    }
  }

  return errors;
}

async function validateSkillIconPath(skillDir, agentMetadataPath, iconPath) {
  const normalizedIconPath = iconPath.trim();

  if (normalizedIconPath.length === 0) {
    fail(
      `${path.relative(root, agentMetadataPath)}: interface.icon must not be empty`,
    );
  }

  if (/^(https?:)?\/\//.test(normalizedIconPath)) {
    fail(
      `${path.relative(root, agentMetadataPath)}: interface.icon must reference a repo asset, not a remote URL`,
    );
  }

  const resolvedIconPath = normalizedIconPath.startsWith('/')
    ? path.join(root, normalizedIconPath.slice(1))
    : path.resolve(skillDir, normalizedIconPath);

  if (!(await pathExists(resolvedIconPath))) {
    fail(
      `${path.relative(root, agentMetadataPath)}: interface.icon points to missing asset ${JSON.stringify(iconPath)}`,
    );
  }

  const extension = path.extname(resolvedIconPath).toLowerCase();
  const allowedExtensions = new Set(['.svg', '.png', '.jpg', '.jpeg', '.webp']);

  if (!allowedExtensions.has(extension)) {
    fail(
      `${path.relative(root, agentMetadataPath)}: interface.icon must point to ${Array.from(allowedExtensions).join(', ')}`,
    );
  }
}

function parseGitStatusPaths(statusOutput) {
  const changedPaths = new Set();

  for (const line of statusOutput.split('\n').filter(Boolean)) {
    const statusPath = line.slice(3).trim();
    const candidatePaths = statusPath.split(' -> ').map((item) => item.trim());

    for (const candidatePath of candidatePaths) {
      const normalizedPath = candidatePath.replace(/\\/g, '/');

      if (normalizedPath.length > 0) {
        changedPaths.add(normalizedPath);
      }
    }
  }

  return changedPaths;
}

async function getChangedRepoPaths() {
  let stdout = '';

  try {
    ({ stdout } = await execFile(
      'git',
      ['status', '--porcelain', '--untracked-files=all', '--', '.'],
      {
        cwd: root,
      },
    ));
  } catch (error) {
    fail(`Unable to inspect changed files via git: ${error.message}`);
  }

  return parseGitStatusPaths(stdout);
}

async function getStagedRepoPaths() {
  let stdout = '';

  try {
    ({ stdout } = await execFile(
      'git',
      ['diff', '--cached', '--name-only', '--diff-filter=ACMR', '--', '.'],
      {
        cwd: root,
      },
    ));
  } catch (error) {
    fail(`Unable to inspect staged files via git: ${error.message}`);
  }

  return new Set(
    stdout
      .split('\n')
      .map((line) => line.trim().replace(/\\/g, '/'))
      .filter(Boolean),
  );
}

function isWithinRepoSubtree(repoPath, subtreePath) {
  return repoPath === subtreePath || repoPath.startsWith(`${subtreePath}/`);
}

async function expandTrackedMarkdownDirectory(repoPath, absolutePath) {
  if (
    !isWithinRepoSubtree(repoPath, 'docs') &&
    !isWithinRepoSubtree(repoPath, 'skills/shared/references')
  ) {
    return null;
  }

  const markdownFiles = await listMarkdownFiles(absolutePath);
  return markdownFiles.map((markdownPath) =>
    path.relative(root, markdownPath).replace(/\\/g, '/'),
  );
}

function shouldValidateAllSkillsForPath(changedPath) {
  return (
    changedPath.startsWith('skills/shared/schemas/') ||
    fullSkillValidationTriggers.some(
      (triggerPath) => changedPath === triggerPath,
    )
  );
}

async function getRepoPathsFromCli(paths) {
  const repoPaths = new Set();

  for (const candidatePath of paths
    .map((item) => item.trim())
    .filter(Boolean)) {
    const absolutePath = path.resolve(root, candidatePath);
    const relativePath = path.relative(root, absolutePath);

    if (relativePath.startsWith('..')) {
      fail(
        `Path ${JSON.stringify(candidatePath)} is outside the repository root`,
      );
    }

    const normalizedPath = relativePath.replace(/\\/g, '/');

    if (!(await pathExists(absolutePath))) {
      repoPaths.add(normalizedPath);
      continue;
    }

    const absolutePathStats = await stat(absolutePath);

    if (!absolutePathStats.isDirectory()) {
      repoPaths.add(normalizedPath);
      continue;
    }

    const expandedMarkdownPaths = await expandTrackedMarkdownDirectory(
      normalizedPath,
      absolutePath,
    );

    if (expandedMarkdownPaths && expandedMarkdownPaths.length > 0) {
      expandedMarkdownPaths.forEach((repoPath) => repoPaths.add(repoPath));
      continue;
    }

    repoPaths.add(normalizedPath);
  }

  return repoPaths;
}

async function getValidationInputPaths(cliOptions) {
  if (cliOptions.paths.length > 0) {
    return getRepoPathsFromCli(cliOptions.paths);
  }

  if (cliOptions.staged) {
    return getStagedRepoPaths();
  }

  if (cliOptions.changed) {
    return getChangedRepoPaths();
  }

  return null;
}

function collectMarkdownDocsWithin(basePath, repoPaths) {
  const matchedDocs = new Set();
  const normalizedBasePath = `${basePath.replace(/\\/g, '/')}/`;

  for (const repoPath of repoPaths) {
    if (repoPath === basePath && repoPath.endsWith('.md')) {
      matchedDocs.add(path.join(root, repoPath));
      continue;
    }

    if (repoPath.startsWith(normalizedBasePath) && repoPath.endsWith('.md')) {
      matchedDocs.add(path.join(root, repoPath));
    }
  }

  return matchedDocs;
}

function isSkillPath(repoPath) {
  if (!repoPath.startsWith('skills/')) {
    return false;
  }

  const [, skillName] = repoPath.split('/');
  return Boolean(skillName) && skillName !== 'shared';
}

function isRepositoryMarkdownPath(repoPath) {
  return (
    repoPath === 'README.md' ||
    (repoPath.startsWith('docs/') && repoPath.endsWith('.md')) ||
    (repoPath.startsWith('skills/shared/references/') &&
      repoPath.endsWith('.md'))
  );
}

async function classifyCliSelection(repoPaths) {
  const ignoredMarkdownPaths = [];
  const ignoredNonMarkdownPaths = [];
  const unmatchedPaths = [];

  for (const repoPath of [...repoPaths].sort()) {
    if (isSkillPath(repoPath) || isRepositoryMarkdownPath(repoPath)) {
      continue;
    }

    const absolutePath = path.join(root, repoPath);

    if (!(await pathExists(absolutePath))) {
      unmatchedPaths.push(repoPath);
      continue;
    }

    if (repoPath.endsWith('.md')) {
      ignoredMarkdownPaths.push(repoPath);
      continue;
    }

    ignoredNonMarkdownPaths.push(repoPath);
  }

  return {
    ignoredMarkdownPaths,
    ignoredNonMarkdownPaths,
    unmatchedPaths,
  };
}

function formatSelectedPathDiagnostics({
  ignoredMarkdownPaths,
  ignoredNonMarkdownPaths,
  unmatchedPaths,
}) {
  const maxDisplayedPaths = 3;
  const summarizePaths = (paths) => {
    if (paths.length <= maxDisplayedPaths) {
      return paths.join(', ');
    }

    const displayedPaths = paths.slice(0, maxDisplayedPaths).join(', ');
    const omittedCount = paths.length - maxDisplayedPaths;
    return `${displayedPaths}, ... (+${omittedCount} more)`;
  };
  const details = [];

  if (ignoredNonMarkdownPaths.length > 0) {
    details.push(
      `ignored existing non-markdown path(s): ${summarizePaths(ignoredNonMarkdownPaths)}`,
    );
  }

  if (ignoredMarkdownPaths.length > 0) {
    details.push(
      `ignored existing markdown path(s) outside tracked docs: ${summarizePaths(ignoredMarkdownPaths)}`,
    );
  }

  if (unmatchedPaths.length > 0) {
    details.push(`unmatched path(s): ${summarizePaths(unmatchedPaths)}`);
  }

  return details.length > 0 ? `${details.join('; ')}.` : null;
}

async function resolveValidationTargets(allSkillDirs, cliOptions) {
  const changedRepoPaths = await getValidationInputPaths(cliOptions);

  if (!changedRepoPaths) {
    return {
      changedRepoPaths: null,
      noOpMessage: null,
      repositoryMarkdownPaths: null,
      skillDirsToValidate: allSkillDirs,
    };
  }

  const selectedPathDiagnostics =
    cliOptions.paths.length > 0
      ? await classifyCliSelection(changedRepoPaths)
      : null;
  const changedSkillNames = new Set();
  let validateAllSkills = false;

  for (const changedPath of changedRepoPaths) {
    if (shouldValidateAllSkillsForPath(changedPath)) {
      validateAllSkills = true;
      break;
    }

    if (!changedPath.startsWith('skills/')) {
      continue;
    }

    const [, skillName] = changedPath.split('/');

    if (skillName && skillName !== 'shared') {
      changedSkillNames.add(skillName);
    }
  }

  let repositoryMarkdownPaths;

  if (validateAllSkills) {
    repositoryMarkdownPaths = null;
  } else {
    repositoryMarkdownPaths = new Set();

    for (const documentPath of documentPaths) {
      const repoDocumentPath = path
        .relative(root, documentPath)
        .replace(/\\/g, '/');
      const documentStats = await stat(documentPath);

      if (documentStats.isDirectory()) {
        for (const markdownPath of collectMarkdownDocsWithin(
          repoDocumentPath,
          changedRepoPaths,
        )) {
          repositoryMarkdownPaths.add(markdownPath);
        }
        continue;
      }

      if (changedRepoPaths.has(repoDocumentPath)) {
        repositoryMarkdownPaths.add(documentPath);
      }
    }
  }

  if (validateAllSkills) {
    console.log(
      'Shared validation inputs changed; validating all skill folders.',
    );
    return {
      changedRepoPaths,
      noOpMessage: null,
      repositoryMarkdownPaths,
      skillDirsToValidate: allSkillDirs,
    };
  }

  if (changedSkillNames.size === 0) {
    if (repositoryMarkdownPaths.size === 0) {
      if (cliOptions.paths.length > 0) {
        const noOpReason = selectedPathDiagnostics
          ? formatSelectedPathDiagnostics(selectedPathDiagnostics)
          : null;

        return {
          changedRepoPaths,
          noOpMessage: noOpReason
            ? `No skill folders or repository markdown docs matched the selected --paths input; nothing to validate (${noOpReason})`
            : 'No skill folders or repository markdown docs matched the selected --paths input; nothing to validate.',
          repositoryMarkdownPaths,
          skillDirsToValidate: [],
        };
      }

      return {
        changedRepoPaths,
        noOpMessage:
          'No changed skill folders or tracked repository markdown docs detected; nothing to validate.',
        repositoryMarkdownPaths,
        skillDirsToValidate: [],
      };
    } else {
      if (selectedPathDiagnostics) {
        const scopedSelectionMessage = formatSelectedPathDiagnostics(
          selectedPathDiagnostics,
        );

        if (scopedSelectionMessage) {
          console.log(
            `Additional --paths selection details: ${scopedSelectionMessage}`,
          );
        }
      }

      console.log(
        'No changed skill folders detected; validating changed repository markdown links only.',
      );
    }

    return {
      changedRepoPaths,
      noOpMessage: null,
      repositoryMarkdownPaths,
      skillDirsToValidate: [],
    };
  }

  if (selectedPathDiagnostics) {
    const scopedSelectionMessage = formatSelectedPathDiagnostics(
      selectedPathDiagnostics,
    );

    if (scopedSelectionMessage) {
      console.log(
        `Additional --paths selection details: ${scopedSelectionMessage}`,
      );
    }
  }

  return {
    changedRepoPaths,
    noOpMessage: null,
    repositoryMarkdownPaths,
    skillDirsToValidate: allSkillDirs.filter((skillDir) =>
      changedSkillNames.has(path.basename(skillDir)),
    ),
  };
}

async function validateRepositoryDocs(markdownPaths = null) {
  const markdownFiles = markdownPaths ? [...markdownPaths] : [];
  const errors = [];

  if (!markdownPaths) {
    for (const documentPath of documentPaths) {
      const documentStats = await stat(documentPath);

      if (documentStats.isDirectory()) {
        markdownFiles.push(...(await listMarkdownFiles(documentPath)));
        continue;
      }

      markdownFiles.push(documentPath);
    }
  }

  for (const markdownPath of markdownFiles.sort()) {
    errors.push(...(await validateMarkdownLinks(markdownPath)));
  }

  return errors;
}

async function validateSkillDir(skillDir) {
  const skillName = path.basename(skillDir);
  const schemaPath = path.join(skillDir, 'schemas', 'output.schema.json');
  const examplePath = path.join(skillDir, 'examples', 'output.json');
  const skillPath = path.join(skillDir, 'SKILL.md');
  const agentMetadataPath = path.join(skillDir, 'agents', 'openai.yaml');
  const referencesDir = path.join(skillDir, 'references');
  const referenceNotesPath = path.join(referencesDir, 'integration-notes.md');

  await ensureExists(skillPath);
  await ensureExists(schemaPath);
  await ensureExists(examplePath);
  await ensureExists(agentMetadataPath);
  await ensureExists(referencesDir);
  await ensureExists(referenceNotesPath);
  await ensureExists(agentMetadataSchemaPath);

  const [
    schemaRaw,
    exampleRaw,
    skillRaw,
    agentMetadataRaw,
    agentMetadataSchemaRaw,
  ] = await Promise.all([
    readFile(schemaPath, 'utf8'),
    readFile(examplePath, 'utf8'),
    readFile(skillPath, 'utf8'),
    readFile(agentMetadataPath, 'utf8'),
    readFile(agentMetadataSchemaPath, 'utf8'),
  ]);

  const schema = JSON.parse(schemaRaw);
  const example = JSON.parse(exampleRaw);
  const agentMetadataSchema = JSON.parse(agentMetadataSchemaRaw);
  const agentMetadata = YAML.parse(agentMetadataRaw);

  validateValue(example, schema, `${skillName}.output`);
  validateValue(agentMetadata, agentMetadataSchema, `${skillName}.agent`);
  const markdownErrors = await validateMarkdownLinks(skillPath);

  if (!skillRaw.includes('schemas/output.schema.json')) {
    fail(
      `${path.relative(root, skillPath)}: missing bundled resource reference to schemas/output.schema.json`,
    );
  }

  if (!skillRaw.includes('examples/output.json')) {
    fail(
      `${path.relative(root, skillPath)}: missing bundled resource reference to examples/output.json`,
    );
  }

  if (!skillRaw.includes('references/integration-notes.md')) {
    fail(
      `${path.relative(root, skillPath)}: missing bundled resource reference to references/integration-notes.md`,
    );
  }

  if (agentMetadata.name !== skillName) {
    fail(
      `${path.relative(root, agentMetadataPath)}: expected name ${JSON.stringify(skillName)}`,
    );
  }

  if (!agentMetadata.interface.default_prompt.includes(`$${skillName}`)) {
    fail(
      `${path.relative(root, agentMetadataPath)}: interface.default_prompt must mention $${skillName} for discoverability`,
    );
  }

  if (agentMetadata.interface.icon) {
    await validateSkillIconPath(
      skillDir,
      agentMetadataPath,
      agentMetadata.interface.icon,
    );
  }

  return markdownErrors;
}

async function main() {
  const cliOptions = parseCliArgs(process.argv.slice(2));
  const skillDirs = await listSkillDirs(skillsDir);
  const markdownErrors = [];

  if (skillDirs.length === 0) {
    fail('No skill directories found.');
  }

  const { skillDirsToValidate, repositoryMarkdownPaths, noOpMessage } =
    await resolveValidationTargets(skillDirs, cliOptions);

  if (noOpMessage) {
    console.log(noOpMessage);
    return;
  }

  for (const skillDir of skillDirsToValidate) {
    markdownErrors.push(...(await validateSkillDir(skillDir)));
  }

  markdownErrors.push(
    ...(await validateRepositoryDocs(repositoryMarkdownPaths)),
  );

  if (markdownErrors.length > 0) {
    fail(markdownErrors.join('\n'));
  }

  const markdownScopeLabel = repositoryMarkdownPaths
    ? 'changed repository markdown links'
    : 'repository markdown links';
  console.log(
    `Validated ${skillDirsToValidate.length} skill example contract(s) and ${markdownScopeLabel}.`,
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
