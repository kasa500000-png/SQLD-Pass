'use strict';
const {withProjectBuildGradle} = require('expo/config-plugins');
// Expo's property selects stdlib/KSP, but RN's unversioned buildscript otherwise
// loads Kotlin 2.1.20 before the modules. GMA 25.4 needs 2.3 metadata support.
module.exports = config => withProjectBuildGradle(config, mod => {
  const before = "classpath('org.jetbrains.kotlin:kotlin-gradle-plugin')";
  const after = 'classpath("org.jetbrains.kotlin:kotlin-gradle-plugin:${findProperty(\'android.kotlinVersion\')}")';
  const source = mod.modResults.contents;
  if (!source.includes(before) && !source.includes(after)) throw new Error('Review the Kotlin buildscript override for this Expo template.');
  mod.modResults.contents = source.replace(before, after);
  return mod;
});
