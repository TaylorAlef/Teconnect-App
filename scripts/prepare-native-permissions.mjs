import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function patchIosPlist() {
  const plistPath = path.join(root, 'ios', 'App', 'App', 'Info.plist');
  if (!fs.existsSync(plistPath)) {
    throw new Error(`iOS Info.plist not found: ${plistPath}`);
  }

  let xml = fs.readFileSync(plistPath, 'utf8');
  const required = {
    NSLocationWhenInUseUsageDescription:
      'O Te-connect utiliza a localização para validar a assiduidade no local de trabalho autorizado.',
    NSLocationAlwaysAndWhenInUseUsageDescription:
      'O Te-connect utiliza a localização para apoiar a assiduidade quando essa permissão for necessária e autorizada.',
  };

  for (const [key, value] of Object.entries(required)) {
    if (xml.includes(`<key>${key}</key>`)) continue;
    const entry = `\n\t<key>${key}</key>\n\t<string>${value}</string>`;
    if (!xml.includes('\n</dict>')) throw new Error('iOS Info.plist structure is not compatible with permission patching.');
    xml = xml.replace(/\n<\/dict>/, `${entry}\n</dict>`);
  }

  fs.writeFileSync(plistPath, xml);
  console.log('iOS location permission descriptions prepared.');
}

function patchAndroidManifest() {
  const manifestPath = path.join(root, 'android', 'app', 'src', 'main', 'AndroidManifest.xml');
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`AndroidManifest.xml not found: ${manifestPath}`);
  }

  let xml = fs.readFileSync(manifestPath, 'utf8');
  const requiredPermissions = [
    'android.permission.ACCESS_COARSE_LOCATION',
    'android.permission.ACCESS_FINE_LOCATION',
  ];

  for (const permission of requiredPermissions) {
    if (xml.includes(`android:name=\"${permission}\"`)) continue;

    const entry = `    <uses-permission android:name=\"${permission}\" />\n`;
    const applicationTag = /(^|\n)([ \t]*)<application\b/m;
    if (!applicationTag.test(xml)) {
      throw new Error('AndroidManifest.xml does not contain an <application> tag for permission insertion.');
    }

    xml = xml.replace(applicationTag, (match, lineStart, indent) => `${lineStart}${entry}${indent}<application`);
  }

  fs.writeFileSync(manifestPath, xml);

  const missing = requiredPermissions.filter(
    (permission) => !xml.includes(`android:name=\"${permission}\"`),
  );

  if (missing.length) {
    throw new Error(
      `Android location permissions missing after patch: ${missing.join(', ')}. Manifest: ${manifestPath}`,
    );
  }

  console.log(`Android location permissions prepared in ${manifestPath}.`);
  for (const permission of requiredPermissions) {
    console.log(`Verified: ${permission}`);
  }
}

const platform = process.argv[2];
if (platform === 'ios') {
  patchIosPlist();
} else if (platform === 'android') {
  patchAndroidManifest();
} else {
  throw new Error('Usage: node scripts/prepare-native-permissions.mjs <ios|android>');
}
