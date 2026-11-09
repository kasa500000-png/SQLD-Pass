// Regression-only input for the retired 60-lesson engine and upgrade migration.
// Not imported by the app; new content tests use generated/content.json.
const fs=require('node:fs'),zlib=require('node:zlib');
module.exports=JSON.parse(zlib.gunzipSync(fs.readFileSync(require.resolve('./legacy-content.json.gz'))));
