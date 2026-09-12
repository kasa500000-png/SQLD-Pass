'use strict';
const path = require('node:path');
const {materialize} = require('./materialize-content.cjs');
// Internal/test APKs must contain the real learning content too. Draft is not the same as missing.
materialize(path.resolve(__dirname,'..'),{required:true});
if (process.env.EXPO_PUBLIC_APP_ENV === 'production') require('./release-gate.cjs');
else console.log('SQLD Pass internal build: complete draft content verified; publication approval remains required.');
require('./check-ads.cjs');
