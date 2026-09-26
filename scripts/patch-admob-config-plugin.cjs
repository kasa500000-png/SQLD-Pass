'use strict';
// SDK 16.4 imports an undeclared package. Use Expo's public re-export instead.
// Fail closed when the pinned upstream changes; do not silence Expo Doctor.
const fs = require('node:fs');
const path = require('node:path');
const root = path.dirname(require.resolve('react-native-google-mobile-ads/package.json'));
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
if (pkg.version !== '16.4.0') throw new Error('Review the AdMob config-plugin compatibility patch for the new SDK.');
const files = ['plugin/src/index.ts', 'plugin/build/index.js', 'plugin/build/index.d.ts'];
const edits = files.map(file => {
  const target = path.join(root, file), source = fs.readFileSync(target, 'utf8');
  const old = /(['"])@expo\/config-plugins\1/g;
  if (!old.test(source) && !source.includes('expo/config-plugins')) throw new Error(`Unexpected upstream plugin: ${file}`);
  return {target, source: source.replace(old, '$1expo/config-plugins$1')};
});
for (const edit of edits) fs.writeFileSync(edit.target, edit.source);
console.log('AdMob 16.4 config plugin uses expo/config-plugins.');
