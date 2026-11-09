const test=require('node:test'),assert=require('node:assert/strict');
const {configureDelegate,configureInfoPlist}=require('../plugins/withAdPrivacy.cjs');

test('non-tracking build removes stale ATT declaration and preserves UMP app configuration',()=>{
  const plist={NSUserTrackingUsageDescription:'old text',GADApplicationIdentifier:'app-id',GADDelayAppMeasurementInit:true};
  assert.deepEqual(configureInfoPlist(plist),{GADApplicationIdentifier:'app-id',GADDelayAppMeasurementInit:true});
  assert.deepEqual(configureInfoPlist(plist),plist);
});

test('privacy configuration precedes React startup and is idempotent',()=>{
  const source='import Expo\nfunc start() {\n    let delegate = ReactNativeDelegate()\n}\n';
  const result=configureDelegate(source);
  assert.ok(result.indexOf('setPublisherFirstPartyIDEnabled(false)')<result.indexOf('let delegate'));
  assert.equal(configureDelegate(result),result);
  assert.ok(!result.includes('.start('));
});
test('unknown native entry point cannot silently omit privacy configuration',()=>{
  assert.throws(()=>configureDelegate('import Expo\n'),/Review SQLD Pass ad privacy hook/);
});
