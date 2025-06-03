// utils/schemaValidator.js
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Update path to point to utils/schemas directory
const SCHEMAS_DIR = path.join(__dirname, 'schemas');

function loadSchema(schemaName) {
  try {
    const schemaPath = path.join(SCHEMAS_DIR, `${schemaName}_schema.json`);
    const schemaContent = fs.readFileSync(schemaPath, 'utf8');
    return JSON.parse(schemaContent);
  } catch (error) {
    console.error(`Error loading schema '${schemaName}':`, error);
    return null;
  }
}

export const validateSchema = (data, schemaName) => {
  const schema = loadSchema(schemaName);
  if (!schema) {
    return { valid: false, errors: [{ message: `Schema '${schemaName}' not found.` }] };
  }
  const validate = ajv.compile(schema);
  const valid = validate(data);
  return { valid, errors: validate.errors };
};