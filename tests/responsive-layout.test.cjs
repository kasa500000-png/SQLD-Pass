'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const {getResponsiveLayout,responsiveViewport,responsiveWindowKey}=require('../.build/ui/responsive-layout');
const noInsets={top:0,bottom:0,left:0,right:0};

test('phone and medium tablet widths keep complete learning sections in one column',()=>{
  for(const width of [320,390,430,599,600,768,834,1024]){
    const layout=getResponsiveLayout({width,height:900});
    assert.equal(layout.sectionColumns,1,`width ${width}`);
    assert.equal(layout.columnWidth,layout.usableWidth);
    assert.ok(layout.usableWidth>0&&layout.usableWidth<width);
  }
  // A large phone can still retain short title/action rows side by side.
  assert.equal(getResponsiveLayout({width:430,height:900}).stackRows,false);
  assert.equal(getResponsiveLayout({width:320,height:900}).stackRows,true);
});

test('two columns require enough padded content width and retain readable minimum columns',()=>{
  assert.equal(getResponsiveLayout({width:1055,height:900}).sectionColumns,1);
  const threshold=getResponsiveLayout({width:1056,height:900});
  assert.equal(threshold.usableWidth,1000);assert.equal(threshold.sectionColumns,2);
  assert.ok(threshold.columnWidth>=400);
  const wide=getResponsiveLayout({width:2000,height:1200});
  assert.equal(wide.contentMaxWidth,1160);assert.equal(wide.usableWidth,1104);
  assert.equal(wide.columnWidth,544);assert.equal(wide.sectionColumns,2);
});

test('app and system text scale combine before choosing columns and action row wrapping',()=>{
  const large=getResponsiveLayout({width:1366,height:1024,appScale:1.1,systemFontScale:1.2});
  assert.equal(large.effectiveFontScale,1.32);
  assert.equal(large.sectionColumns,1);assert.equal(large.stackRows,true);
  const boundary=getResponsiveLayout({width:1366,height:1024,appScale:1,systemFontScale:1.3});
  assert.equal(boundary.sectionColumns,2);assert.equal(boundary.stackRows,false);
  assert.equal(getResponsiveLayout({width:1366,height:1024,appScale:1.31}).sectionColumns,1);
});

test('landscape or keyboard-shortened height reduces chrome padding without choosing two columns',()=>{
  const short=getResponsiveLayout({width:1366,height:499});
  assert.equal(short.compactHeight,true);assert.equal(short.compact,true);
  assert.equal(short.sectionColumns,1);
  assert.equal(short.headerVerticalPadding,6);assert.equal(short.footerVerticalPadding,6);
  assert.equal(short.navigationVerticalPadding,6);
  // Height alone does not force an otherwise roomy short action row into a stack.
  assert.equal(short.stackRows,false);
  assert.equal(getResponsiveLayout({width:1366,height:500}).sectionColumns,2);
});

test('reading measure grows modestly with text size and remains bounded separately from catalogs',()=>{
  const normal=getResponsiveLayout({width:1366,height:1024});
  assert.equal(normal.readingMaxWidth,760);
  assert.ok(Math.abs(getResponsiveLayout({width:1366,height:1024,appScale:1.1}).readingMaxWidth-836)<0.001);
  const enlarged=getResponsiveLayout({width:1366,height:1024,systemFontScale:2});
  assert.equal(enlarged.readingMaxWidth,840);
  assert.ok(enlarged.readingMaxWidth<enlarged.contentMaxWidth);
  for(const key of ['headerMaxWidth','footerMaxWidth','navigationMaxWidth'])assert.equal(normal[key],1160);
});

test('safe-area fallback and actual container measurement are not subtracted twice',()=>{
  const insets={top:24,bottom:20,left:32,right:32};
  assert.deepEqual(responsiveViewport(1366,1024,insets,null),{width:1302,height:980});
  const measured={width:420,height:480,windowKey:responsiveWindowKey(1366,1024,insets)};
  assert.deepEqual(responsiveViewport(1366,1024,insets,measured),{width:420,height:480});
  assert.equal(getResponsiveLayout(responsiveViewport(1366,1024,insets,measured)).sectionColumns,1);
});

test('rotation or changed insets discard stale measurements until the next actual layout',()=>{
  const measured={width:1302,height:980,windowKey:responsiveWindowKey(1366,1024,noInsets)};
  assert.deepEqual(responsiveViewport(1024,1366,noInsets,measured),{width:1024,height:1366});
  assert.deepEqual(responsiveViewport(1366,1024,{...noInsets,left:20},measured),{width:1346,height:1024});
});

test('invalid startup geometry falls back safely and tiny containers never get negative content width',()=>{
  const startup=getResponsiveLayout({width:NaN,height:0,appScale:Infinity,systemFontScale:-1});
  assert.equal(startup.width,320);assert.equal(startup.height,640);assert.equal(startup.effectiveFontScale,1);
  assert.equal(startup.sectionColumns,1);
  const tiny=getResponsiveLayout({width:20,height:100});
  assert.equal(tiny.usableWidth,10);assert.equal(tiny.columnWidth,10);
  assert.deepEqual(responsiveViewport(320,640,noInsets,{width:Infinity,height:500,windowKey:responsiveWindowKey(320,640,noInsets)}),{width:320,height:640});
});

function nativeFixture(){
  const window={width:1366,height:1024,fontScale:1},insets={...noInsets};
  let measured=null,current=null;
  const context={Provider:'provider',value:null};
  const react={createContext:()=>context,useContext:ctx=>ctx.value,useMemo:fn=>fn(),useCallback:fn=>fn,
    useState:()=>[measured,update=>{measured=typeof update==='function'?update(measured):update;}],
    createElement:(type,props,...children)=>({type,props:{...props,children}})};
  const js=ts.transpileModule(fs.readFileSync(path.resolve(__dirname,'../src/platform/ResponsiveLayout.tsx'),'utf8'),{
    compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.React,esModuleInterop:true}
  }).outputText;
  const module={exports:{}};
  vm.runInNewContext(js,{module,exports:module.exports,require:name=>{
    if(name==='react')return react;
    if(name==='react-native')return {View:'view',useWindowDimensions:()=>window};
    if(name==='react-native-safe-area-context')return {useSafeAreaInsets:()=>insets};
    if(name==='../ui/responsive-layout')return require('../.build/ui/responsive-layout');
    throw Error(`Unexpected dependency ${name}`);
  }});
  return {window,insets,api:module.exports,
    render(appScale=1){current=module.exports.ResponsiveLayoutProvider({appScale,children:'screen'});
      context.value=current.props.children[0].props.value;return context.value;},
    layout(width,height){current.props.onLayout({nativeEvent:{layout:{width,height}}});},
  };
}

test('actual RN provider follows split-window and keyboard layout instead of full window size',()=>{
  const f=nativeFixture();assert.equal(f.render().sectionColumns,2);
  f.layout(420,780);assert.equal(f.render().sectionColumns,1);assert.equal(f.api.useResponsiveLayout().width,420);
  f.layout(1366,400);const keyboard=f.render();assert.equal(keyboard.compactHeight,true);assert.equal(keyboard.sectionColumns,1);
  f.layout(1366,1024);assert.equal(f.render().sectionColumns,2);
});

test('RN provider updates font scale immediately and uses new rotation geometry before onLayout',()=>{
  const f=nativeFixture();f.render();f.layout(1366,1024);f.render();
  f.window.width=834;f.window.height=1194;assert.equal(f.render().width,834);assert.equal(f.api.useResponsiveLayout().sectionColumns,1);
  f.window.width=1366;f.window.height=1024;f.window.fontScale=1.2;
  assert.equal(f.render(1.1).sectionColumns,1);assert.equal(f.api.useResponsiveLayout().effectiveFontScale,1.32);
  const frame=f.api.ResponsiveFrame({kind:'reading',children:'body'});
  assert.equal(frame.props.style[1].maxWidth,840);assert.equal(frame.props.style[1].width,'100%');
});

test('native responsive hook requires its provider instead of silently guessing a tablet layout',()=>{
  assert.throws(()=>nativeFixture().api.useResponsiveLayout(),/ResponsiveLayoutProvider is required/);
});
