const path = require('node:path');
const {checkContentRelease} = require('../config/release-config.cjs');
checkContentRelease(path.resolve(__dirname, '..'));
console.log('SQLD Pass production release gate passed.');
