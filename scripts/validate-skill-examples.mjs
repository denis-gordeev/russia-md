import { execFile as execFileCallback } from 'child_process';
import { readdir, readFile, stat } from 'fs/promises';
import { promisify } from 'util';
import { pathToFileURL } from 'url';
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
const explicitHtmlIdPattern = /(?<![-:])\bid\s*=\s*["']([^"']*)["']/g;
const markdownAnchorCache = new Map();
const fullSkillValidationTriggers = [
  '.github/workflows/deploy.yml',
  '.github/workflows/skills.yml',
  'package-lock.json',
  'package.json',
  'scripts/validate-skill-examples.mjs',
];
const defaultMaxReportedMarkdownErrors = 10;
const defaultMaxReportedHiddenMarkdownSources = 5;
const maxSuggestedAnchors = 5;
const documentPaths = [
  path.join(root, 'README.md'),
  path.join(skillsDir, 'shared', 'references'),
  path.join(root, 'docs'),
];
const execFile = promisify(execFileCallback);

function parseCliArgs(argv) {
  const options = {
    changed: false,
    markdownErrorLimit: null,
    markdownHiddenFileLimit: null,
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

    if (arg === '--markdown-error-limit') {
      const value = argv[index + 1];

      if (!value || value.startsWith('--')) {
        fail('Expected a non-negative integer after --markdown-error-limit');
      }

      options.markdownErrorLimit = parseMarkdownErrorLimit(
        value,
        '--markdown-error-limit',
      );
      index += 1;
      continue;
    }

    if (arg === '--markdown-hidden-file-limit') {
      const value = argv[index + 1];

      if (!value || value.startsWith('--')) {
        fail(
          'Expected a non-negative integer after --markdown-hidden-file-limit',
        );
      }

      options.markdownHiddenFileLimit = parseMarkdownErrorLimit(
        value,
        '--markdown-hidden-file-limit',
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

function parseMarkdownErrorLimit(value, sourceLabel) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  if (!/^\d+$/.test(value)) {
    fail(`${sourceLabel} must be a non-negative integer`);
  }

  return Number(value);
}

function resolveMarkdownErrorLimit(cliLimit) {
  if (cliLimit !== null) {
    return cliLimit;
  }

  const envLimit = parseMarkdownErrorLimit(
    process.env.SKILL_VALIDATOR_MAX_MARKDOWN_ERRORS,
    'SKILL_VALIDATOR_MAX_MARKDOWN_ERRORS',
  );

  return envLimit ?? defaultMaxReportedMarkdownErrors;
}

function resolveHiddenMarkdownFileLimit(cliLimit) {
  if (cliLimit !== null) {
    return cliLimit;
  }

  const envLimit = parseMarkdownErrorLimit(
    process.env.SKILL_VALIDATOR_MAX_HIDDEN_MARKDOWN_FILES,
    'SKILL_VALIDATOR_MAX_HIDDEN_MARKDOWN_FILES',
  );

  return envLimit ?? defaultMaxReportedHiddenMarkdownSources;
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

function formatYamlErrorLocation(error) {
  if (!Array.isArray(error?.linePos) || error.linePos.length === 0) {
    return '';
  }

  const [{ line, col }] = error.linePos;

  if (typeof line !== 'number' || typeof col !== 'number') {
    return '';
  }

  return `:${line}:${col}`;
}

function parseYamlDocument(yamlRaw, yamlPath) {
  try {
    return YAML.parse(yamlRaw);
  } catch (error) {
    const location = formatYamlErrorLocation(error);
    fail(
      `${path.relative(root, yamlPath)}${location}: invalid YAML (${error.message})`,
    );
  }
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

function countNewlines(value) {
  return (value.match(/\r?\n/g) ?? []).length;
}

function getMarkdownBodyInfo(markdownRaw, markdownPath) {
  let parsed;

  try {
    parsed = matter(markdownRaw);
  } catch (error) {
    const pathLabel = markdownPath
      ? path.relative(root, markdownPath)
      : 'markdown document';
    fail(`${pathLabel}: invalid YAML front matter (${error.message})`);
  }

  const contentStartIndex = markdownRaw.indexOf(parsed.content);
  const bodyStartLine =
    contentStartIndex === -1
      ? 1
      : countNewlines(markdownRaw.slice(0, contentStartIndex)) + 1;

  return {
    content: parsed.content,
    bodyStartLine,
  };
}

function getLineNumberForIndex(content, index, bodyStartLine) {
  const prefix = content.slice(0, index);
  const newlineCount = countNewlines(prefix);
  return bodyStartLine + newlineCount;
}

function extractLinkFragment(rawTarget) {
  const hashIndex = rawTarget.indexOf('#');
  if (hashIndex === -1) {
    return '';
  }

  return rawTarget.slice(hashIndex + 1).trim();
}

function decodeLinkFragment(fragment) {
  try {
    return decodeURIComponent(fragment);
  } catch {
    return null;
  }
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

export function getNearestAnchorSuggestions(fragment, anchors) {
  if (!fragment || anchors.size === 0) {
    return [];
  }

  const similarityThreshold = Math.max(2, Math.ceil(fragment.length * 0.4));
  const familySizes = new Map();
  const matches = [];

  for (const anchor of anchors) {
    const family = getAnchorSuggestionFamily(anchor);
    familySizes.set(family, (familySizes.get(family) ?? 0) + 1);
  }

  for (const anchor of anchors) {
    const distance = computeLevenshteinDistance(fragment, anchor);

    if (distance <= similarityThreshold) {
      const family = getAnchorSuggestionFamily(anchor);
      matches.push({
        anchor,
        distance,
        family,
        familyDistance: computeLevenshteinDistance(fragment, family),
        familySize: familySizes.get(family) ?? 1,
        familyVariantRank: getAnchorSuggestionFamilyVariantRank(anchor, family),
      });
    }
  }

  matches.sort((left, right) => {
    if (left.familyDistance !== right.familyDistance) {
      return left.familyDistance - right.familyDistance;
    }

    if (left.familySize !== right.familySize) {
      return right.familySize - left.familySize;
    }

    if (left.familyVariantRank !== right.familyVariantRank) {
      return left.familyVariantRank - right.familyVariantRank;
    }

    if (left.distance !== right.distance) {
      return left.distance - right.distance;
    }

    return left.anchor.localeCompare(right.anchor);
  });

  return matches.map(({ anchor }) => anchor);
}

function getAnchorSuggestionFamily(anchor) {
  return anchor.replace(/-\d+$/, '');
}

function getAnchorSuggestionFamilyVariantRank(anchor, family) {
  if (anchor === family) {
    return 0;
  }

  const numericSuffixMatch = anchor.match(
    new RegExp(`^${escapeRegExpForRegex(family)}-(\\d+)$`),
  );
  if (numericSuffixMatch) {
    return Number.parseInt(numericSuffixMatch[1], 10);
  }

  return Number.MAX_SAFE_INTEGER;
}

function escapeRegExpForRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function formatNearestAnchorSuggestions(suggestions) {
  if (suggestions.length === 0) {
    return '';
  }

  if (suggestions.length === 1) {
    return `; nearest anchor: #${suggestions[0]}`;
  }

  const visibleSuggestions = suggestions.slice(0, maxSuggestedAnchors);
  const remainingCount = suggestions.length - visibleSuggestions.length;
  const truncatedSuffix =
    remainingCount > 0 ? `, ... (+${remainingCount} more)` : '';

  return `; nearest anchors: ${visibleSuggestions
    .map((suggestion) => `#${suggestion}`)
    .join(', ')}${truncatedSuffix}`;
}

function maskAnchorLikeHtmlInMarkdownSyntax(line, state) {
  const masked = line.split('');
  let index = 0;

  const maskRange = (start, end) => {
    for (let maskIndex = start; maskIndex < end; maskIndex += 1) {
      masked[maskIndex] = ' ';
    }
  };

  while (index < line.length) {
    if (state.inHtmlComment) {
      const commentEnd = line.indexOf('-->', index);
      const endIndex = commentEnd === -1 ? line.length : commentEnd + 3;
      maskRange(index, endIndex);
      index = endIndex;

      if (commentEnd === -1) {
        break;
      }

      state.inHtmlComment = false;
      continue;
    }

    if (line.startsWith('<!--', index)) {
      state.inHtmlComment = true;
      continue;
    }

    if (line[index] === '`') {
      let delimiterEnd = index + 1;

      while (line[delimiterEnd] === '`') {
        delimiterEnd += 1;
      }

      const delimiter = line.slice(index, delimiterEnd);
      const closingIndex = line.indexOf(delimiter, delimiterEnd);
      const endIndex =
        closingIndex === -1 ? line.length : closingIndex + delimiter.length;
      maskRange(index, endIndex);
      index = endIndex;
      continue;
    }

    index += 1;
  }

  return masked.join('');
}

function getMarkdownHeadingDefinition(line, previousSetextHeading) {
  const atxHeadingMatch = line.match(/^#{1,6}\s+(.*?)\s*#*\s*$/);

  if (atxHeadingMatch) {
    return { lineOffset: 0, text: atxHeadingMatch[1] };
  }

  if (/^ {0,3}(?:=+|-+)\s*$/.test(line) && previousSetextHeading) {
    return { lineOffset: -1, text: previousSetextHeading };
  }

  return null;
}

function getSetextHeadingCandidate(line, syntaxMaskedLine, inHtmlComment) {
  const leadingSpaces = line.length - line.trimStart().length;

  if (
    inHtmlComment ||
    leadingSpaces > 3 ||
    syntaxMaskedLine.trim() === '' ||
    /^#{1,6}\s/.test(line) ||
    /^ {0,3}(?:=+|-+)\s*$/.test(line)
  ) {
    return null;
  }

  return line.trim();
}

async function getMarkdownAnchors(markdownPath) {
  const cachedAnchors = markdownAnchorCache.get(markdownPath);

  if (cachedAnchors) {
    return cachedAnchors;
  }

  const markdownRaw = await readFile(markdownPath, 'utf8');
  const { content } = getMarkdownBodyInfo(markdownRaw, markdownPath);
  const anchors = new Set();
  const slugCounts = new Map();
  const lines = content.split(/\r?\n/);
  const ignoredSyntaxState = { inHtmlComment: false };
  let activeFence = null;
  let previousSetextHeading = null;

  for (const line of lines) {
    const fenceMatch = ignoredSyntaxState.inHtmlComment
      ? null
      : line.match(/^(```+|~~~+)/);

    if (fenceMatch) {
      const currentFence = fenceMatch[1][0];

      if (activeFence === currentFence) {
        activeFence = null;
      } else if (!activeFence) {
        activeFence = currentFence;
      }

      previousSetextHeading = null;
      continue;
    }

    if (activeFence) {
      previousSetextHeading = null;
      continue;
    }

    const wasInHtmlComment = ignoredSyntaxState.inHtmlComment;
    const explicitAnchorLine = maskAnchorLikeHtmlInMarkdownSyntax(
      line,
      ignoredSyntaxState,
    );

    const headingDefinition = getMarkdownHeadingDefinition(
      line,
      previousSetextHeading,
    );
    if (headingDefinition) {
      const baseSlug = createMarkdownSlug(headingDefinition.text);

      if (baseSlug) {
        const nextCount = slugCounts.get(baseSlug) ?? 0;
        const uniqueSlug =
          nextCount === 0 ? baseSlug : `${baseSlug}-${nextCount}`;

        slugCounts.set(baseSlug, nextCount + 1);
        anchors.add(uniqueSlug);
      }
    }

    for (const idMatch of explicitAnchorLine.matchAll(explicitHtmlIdPattern)) {
      const anchor = idMatch[1].trim();

      if (anchor) {
        anchors.add(anchor);
      }
    }

    previousSetextHeading = getSetextHeadingCandidate(
      line,
      explicitAnchorLine,
      wasInHtmlComment || ignoredSyntaxState.inHtmlComment,
    );
  }

  markdownAnchorCache.set(markdownPath, anchors);
  return anchors;
}

function findAnchorDefinitionErrors(markdownPath, content, bodyStartLine) {
  const explicitDefinitionLines = new Map();
  const headingDefinitionLines = new Map();
  const slugCounts = new Map();
  const errors = [];
  const lines = content.split(/\r?\n/);
  const ignoredSyntaxState = { inHtmlComment: false };
  let activeFence = null;
  let previousSetextHeading = null;

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex];
    const fenceMatch = ignoredSyntaxState.inHtmlComment
      ? null
      : line.match(/^(```+|~~~+)/);

    if (fenceMatch) {
      const currentFence = fenceMatch[1][0];

      if (activeFence === currentFence) {
        activeFence = null;
      } else if (!activeFence) {
        activeFence = currentFence;
      }

      previousSetextHeading = null;
      continue;
    }

    if (activeFence) {
      previousSetextHeading = null;
      continue;
    }

    const wasInHtmlComment = ignoredSyntaxState.inHtmlComment;
    const explicitAnchorLine = maskAnchorLikeHtmlInMarkdownSyntax(
      line,
      ignoredSyntaxState,
    );
    const lineNumber = bodyStartLine + lineIndex;
    const headingDefinition = getMarkdownHeadingDefinition(
      line,
      previousSetextHeading,
    );

    if (headingDefinition) {
      const baseSlug = createMarkdownSlug(headingDefinition.text);

      if (baseSlug) {
        const nextCount = slugCounts.get(baseSlug) ?? 0;
        const uniqueSlug =
          nextCount === 0 ? baseSlug : `${baseSlug}-${nextCount}`;
        const explicitDefinitionLine = explicitDefinitionLines.get(uniqueSlug);
        const headingLineNumber = lineNumber + headingDefinition.lineOffset;

        slugCounts.set(baseSlug, nextCount + 1);
        headingDefinitionLines.set(uniqueSlug, headingLineNumber);

        if (explicitDefinitionLine !== undefined) {
          errors.push(
            `${path.relative(root, markdownPath)}:${headingLineNumber}: generated heading anchor ${JSON.stringify(uniqueSlug)} collides with explicit HTML anchor defined on line ${explicitDefinitionLine}`,
          );
        }
      }
    }

    for (const idMatch of explicitAnchorLine.matchAll(explicitHtmlIdPattern)) {
      const anchor = idMatch[1].trim();

      if (!anchor) {
        errors.push(
          `${path.relative(root, markdownPath)}:${lineNumber}: empty or whitespace-only explicit HTML anchor id`,
        );
        continue;
      }

      const firstDefinitionLine = explicitDefinitionLines.get(anchor);

      if (firstDefinitionLine !== undefined) {
        errors.push(
          `${path.relative(root, markdownPath)}:${lineNumber}: duplicate explicit HTML anchor ${JSON.stringify(anchor)} (first defined on line ${firstDefinitionLine})`,
        );
        continue;
      }

      explicitDefinitionLines.set(anchor, lineNumber);

      const headingDefinitionLine = headingDefinitionLines.get(anchor);
      if (headingDefinitionLine !== undefined) {
        errors.push(
          `${path.relative(root, markdownPath)}:${lineNumber}: explicit HTML anchor ${JSON.stringify(anchor)} collides with generated heading anchor defined on line ${headingDefinitionLine}`,
        );
      }
    }

    previousSetextHeading = getSetextHeadingCandidate(
      line,
      explicitAnchorLine,
      wasInHtmlComment || ignoredSyntaxState.inHtmlComment,
    );
  }

  return errors;
}

async function validateMarkdownLinks(markdownPath) {
  const markdownRaw = await readFile(markdownPath, 'utf8');
  const { content, bodyStartLine } = getMarkdownBodyInfo(
    markdownRaw,
    markdownPath,
  );
  const matches = [...content.matchAll(markdownLinkPattern)];
  const errors = findAnchorDefinitionErrors(
    markdownPath,
    content,
    bodyStartLine,
  );

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

    const decodedFragment = decodeLinkFragment(fragment);

    if (decodedFragment === null) {
      errors.push(
        `${path.relative(root, markdownPath)}:${lineNumber}: malformed percent-encoding in local anchor ${JSON.stringify(rawTarget)} (fragment #${fragment})`,
      );
      continue;
    }

    const anchors = await getMarkdownAnchors(resolvedTarget);

    if (!anchors.has(decodedFragment)) {
      const suggestedAnchors = getNearestAnchorSuggestions(
        decodedFragment,
        anchors,
      );
      const suggestionSuffix = formatNearestAnchorSuggestions(suggestedAnchors);

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
      [
        '-c',
        'core.quotepath=false',
        'status',
        '--porcelain',
        '--untracked-files=all',
        '--',
        '.',
      ],
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
      [
        '-c',
        'core.quotepath=false',
        'diff',
        '--cached',
        '--name-only',
        '--diff-filter=ACMR',
        '--',
        '.',
      ],
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
  const formatPathList = (paths) => {
    const maxVisiblePaths = 5;

    if (paths.length <= maxVisiblePaths) {
      return paths.join(', ');
    }

    const remainingCount = paths.length - maxVisiblePaths;
    return `${paths.slice(0, maxVisiblePaths).join(', ')}, ... (+${remainingCount} more)`;
  };
  const details = [];

  if (ignoredNonMarkdownPaths.length > 0) {
    details.push(
      `ignored existing non-markdown path(s): ${formatPathList(ignoredNonMarkdownPaths)}`,
    );
  }

  if (ignoredMarkdownPaths.length > 0) {
    details.push(
      `ignored existing markdown path(s) outside tracked docs: ${formatPathList(ignoredMarkdownPaths)}`,
    );
  }

  if (unmatchedPaths.length > 0) {
    details.push(`unmatched path(s): ${formatPathList(unmatchedPaths)}`);
  }

  return details.length > 0 ? `${details.join('; ')}.` : null;
}

function groupMarkdownErrorsBySource(errors) {
  const groupedErrors = [];
  const groupBySource = new Map();

  for (const error of errors) {
    const separatorIndex = error.indexOf(':');
    const sourcePath =
      separatorIndex === -1 ? '' : error.slice(0, separatorIndex);
    const existingGroup = groupBySource.get(sourcePath);

    if (existingGroup) {
      existingGroup.push(error);
      continue;
    }

    const newGroup = [error];
    groupBySource.set(sourcePath, newGroup);
    groupedErrors.push(newGroup);
  }

  return groupedErrors;
}

function formatTruncatedMarkdownGroupSummaries(
  hiddenErrorsBySource,
  maxVisibleSources,
) {
  if (hiddenErrorsBySource.length === 0) {
    return null;
  }

  const visibleSources =
    maxVisibleSources === 0
      ? hiddenErrorsBySource
      : hiddenErrorsBySource.slice(0, maxVisibleSources);
  const remainingSourceCount =
    hiddenErrorsBySource.length - visibleSources.length;
  const sourceSummary = visibleSources
    .map(({ sourcePath, count }) => `${sourcePath || '<unknown>'} (+${count})`)
    .join(', ');
  const truncatedSuffix =
    remainingSourceCount > 0
      ? `, ... (+${remainingSourceCount} more file(s))`
      : '';
  const limitLabel =
    maxVisibleSources === 0
      ? 'showing all hidden source files'
      : `showing up to ${maxVisibleSources} hidden source file(s)`;

  return `... hidden markdown validation errors by file (${limitLabel}): ${sourceSummary}${truncatedSuffix}.`;
}

function formatMarkdownErrors(
  errors,
  maxReportedMarkdownErrors,
  maxReportedHiddenMarkdownSources,
) {
  if (
    maxReportedMarkdownErrors === 0 ||
    errors.length <= maxReportedMarkdownErrors
  ) {
    return errors.join('\n');
  }

  const visibleErrors = [];
  const groupedErrors = groupMarkdownErrorsBySource(errors);

  for (const group of groupedErrors) {
    if (
      visibleErrors.length === 0 &&
      group.length > maxReportedMarkdownErrors
    ) {
      visibleErrors.push(...group.slice(0, maxReportedMarkdownErrors));
      break;
    }

    if (visibleErrors.length + group.length > maxReportedMarkdownErrors) {
      break;
    }

    visibleErrors.push(...group);
  }

  const remainingCount = errors.length - visibleErrors.length;
  const hiddenErrorsBySource = groupedErrors
    .map((group) => {
      const hiddenCount = group.filter(
        (error) => !visibleErrors.includes(error),
      ).length;
      return {
        count: hiddenCount,
        sourcePath: group[0]?.split(':', 1)[0] ?? '',
      };
    })
    .filter(({ count }) => count > 0);
  const hiddenGroupSummary = formatTruncatedMarkdownGroupSummaries(
    hiddenErrorsBySource,
    maxReportedHiddenMarkdownSources,
  );

  return [
    ...visibleErrors,
    `... truncated ${remainingCount} additional markdown validation error(s).`,
    ...(hiddenGroupSummary ? [hiddenGroupSummary] : []),
  ].join('\n');
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
  const agentMetadata = parseYamlDocument(agentMetadataRaw, agentMetadataPath);

  validateValue(example, schema, `${skillName}.output`);
  validateValue(agentMetadata, agentMetadataSchema, `${skillName}.agent`);
  const markdownErrors = [
    ...(await validateMarkdownLinks(skillPath)),
    ...(await validateMarkdownLinks(referenceNotesPath)),
  ];

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
  const markdownErrorLimit = resolveMarkdownErrorLimit(
    cliOptions.markdownErrorLimit,
  );
  const hiddenMarkdownFileLimit = resolveHiddenMarkdownFileLimit(
    cliOptions.markdownHiddenFileLimit,
  );
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
    fail(
      formatMarkdownErrors(
        markdownErrors,
        markdownErrorLimit,
        hiddenMarkdownFileLimit,
      ),
    );
  }

  const markdownScopeLabel = repositoryMarkdownPaths
    ? 'changed repository markdown links'
    : 'repository markdown links';
  console.log(
    `Validated ${skillDirsToValidate.length} skill example contract(s) and ${markdownScopeLabel}.`,
  );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
