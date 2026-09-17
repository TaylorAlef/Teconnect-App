import fs from 'node:fs';
import path from 'node:path';

const requiredFiles = [
  'src/globalization/globalization.js',
  'src/globalization/messages.js',
  'src/globalization/countryCatalog.js',
  'public/global-locale-runtime.js',
];

for (const file of requiredFiles) {
  const fullPath = path.resolve(process.cwd(), file);
  if (!fs.existsSync(fullPath)) throw new Error(`Globalization file missing: ${file}`);
}

const source = fs.readFileSync(path.resolve(process.cwd(), 'src/globalization/globalization.js'), 'utf8');
const requiredTokens = ['SUPPORTED_LOCALES', 'COUNTRY_DEFAULTS', 'resolveGlobalPreferences', 'formatCurrency', 'formatDateTime', 'applyDocumentLocale'];
for (const token of requiredTokens) {
  if (!source.includes(token)) throw new Error(`Globalization token missing: ${token}`);
}

const messages = fs.readFileSync(path.resolve(process.cwd(), 'src/globalization/messages.js'), 'utf8');
for (const locale of ['pt-PT', 'en-US', 'es-ES', 'fr-FR', 'de-DE']) {
  if (!messages.includes(`'${locale}'`)) throw new Error(`Locale missing from messages: ${locale}`);
}

const runtime = fs.readFileSync(path.resolve(process.cwd(), 'public/global-locale-runtime.js'), 'utf8');
if (!runtime.includes("document.documentElement.lang")) throw new Error('Global locale runtime is not applying document language');

console.log('Globalization foundation guard: OK');
