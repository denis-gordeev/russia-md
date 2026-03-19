import { readdir, readFile, stat } from 'fs/promises';
import path from 'path';

const root = process.cwd();
const skillsDir = path.join(root, 'skills');

async function listSkillDirs(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory() && entry.name !== 'shared')
    .map((entry) => path.join(dir, entry.name))
    .sort();
}

function fail(message) {
  throw new Error(message);
}

function validateValue(value, schema, currentPath) {
  const allowedTypes = Array.isArray(schema.type) ? schema.type : schema.type ? [schema.type] : [];

  if (allowedTypes.length > 0) {
    const matched = allowedTypes.some((type) => matchesType(value, type));
    if (!matched) {
      fail(`${currentPath}: expected type ${allowedTypes.join(' | ')}, got ${describeType(value)}`);
    }
  }

  if (schema.enum && !schema.enum.includes(value)) {
    fail(`${currentPath}: expected one of ${schema.enum.join(', ')}, got ${JSON.stringify(value)}`);
  }

  if (typeof value === 'number') {
    if (typeof schema.minimum === 'number' && value < schema.minimum) {
      fail(`${currentPath}: expected >= ${schema.minimum}, got ${value}`);
    }
    if (typeof schema.maximum === 'number' && value > schema.maximum) {
      fail(`${currentPath}: expected <= ${schema.maximum}, got ${value}`);
    }
  }

  if (typeof value === 'string' && schema.format === 'uri') {
    try {
      new URL(value);
    } catch {
      fail(`${currentPath}: expected a valid URI, got ${JSON.stringify(value)}`);
    }
  }

  if (Array.isArray(value) && schema.items) {
    value.forEach((item, index) => validateValue(item, schema.items, `${currentPath}[${index}]`));
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
  }
}

function matchesType(value, type) {
  switch (type) {
    case 'array':
      return Array.isArray(value);
    case 'object':
      return value !== null && typeof value === 'object' && !Array.isArray(value);
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

async function validateSkillDir(skillDir) {
  const skillName = path.basename(skillDir);
  const schemaPath = path.join(skillDir, 'schemas', 'output.schema.json');
  const examplePath = path.join(skillDir, 'examples', 'output.json');
  const skillPath = path.join(skillDir, 'SKILL.md');

  await ensureExists(skillPath);
  await ensureExists(schemaPath);
  await ensureExists(examplePath);

  const [schemaRaw, exampleRaw, skillRaw] = await Promise.all([
    readFile(schemaPath, 'utf8'),
    readFile(examplePath, 'utf8'),
    readFile(skillPath, 'utf8')
  ]);

  const schema = JSON.parse(schemaRaw);
  const example = JSON.parse(exampleRaw);

  validateValue(example, schema, `${skillName}.output`);

  if (!skillRaw.includes('schemas/output.schema.json')) {
    fail(`${path.relative(root, skillPath)}: missing bundled resource reference to schemas/output.schema.json`);
  }

  if (!skillRaw.includes('examples/output.json')) {
    fail(`${path.relative(root, skillPath)}: missing bundled resource reference to examples/output.json`);
  }
}

async function main() {
  const skillDirs = await listSkillDirs(skillsDir);

  if (skillDirs.length === 0) {
    fail('No skill directories found.');
  }

  for (const skillDir of skillDirs) {
    await validateSkillDir(skillDir);
  }

  console.log(`Validated ${skillDirs.length} skill example contract(s).`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
