import React,{createContext,useCallback,useContext,useMemo,useState} from 'react';
import {View,useWindowDimensions,type LayoutChangeEvent,type ViewProps} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {
  getResponsiveLayout,responsiveViewport,responsiveWindowKey,
  type ResponsiveLayout,type ResponsiveMeasurement,
} from '../ui/responsive-layout';

const LayoutContext = createContext<ResponsiveLayout|null>(null);

/** Place inside SafeAreaView and KeyboardAvoidingView so onLayout measures usable space. */
export function ResponsiveLayoutProvider({appScale,children}:React.PropsWithChildren<{appScale:number}>){
  const {width:windowWidth,height:windowHeight,fontScale}=useWindowDimensions();
  const {top,bottom,left,right}=useSafeAreaInsets();
  const [measured,setMeasured]=useState<ResponsiveMeasurement|null>(null);
  const windowKey=responsiveWindowKey(windowWidth,windowHeight,{top,bottom,left,right});
  const onLayout=useCallback((event:LayoutChangeEvent)=>{
    const {width,height}=event.nativeEvent.layout;
    if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)return;
    setMeasured(previous=>previous?.windowKey===windowKey&&previous.width===width&&previous.height===height?
      previous:{width,height,windowKey});
  },[windowKey]);
  const {width,height}=responsiveViewport(windowWidth,windowHeight,{top,bottom,left,right},measured);
  const layout=useMemo(()=>getResponsiveLayout({width,height,appScale,systemFontScale:fontScale}),
    [width,height,appScale,fontScale]);
  return <View onLayout={onLayout} collapsable={false} style={{flex:1,width:'100%',minWidth:0}}>
    <LayoutContext.Provider value={layout}>{children}</LayoutContext.Provider>
  </View>;
}

export function useResponsiveLayout():ResponsiveLayout{
  const layout=useContext(LayoutContext);
  if(!layout)throw new Error('ResponsiveLayoutProvider is required for native app screens.');
  return layout;
}

export type ResponsiveFrameKind='content'|'reading'|'header'|'footer'|'navigation';
export function ResponsiveFrame({kind='content',style,children,...props}:ViewProps&{kind?:ResponsiveFrameKind}){
  const layout=useResponsiveLayout();
  const maxWidth=kind==='reading'?layout.readingMaxWidth:
    kind==='header'?layout.headerMaxWidth:kind==='footer'?layout.footerMaxWidth:
      kind==='navigation'?layout.navigationMaxWidth:layout.contentMaxWidth;
  // Padding belongs to the consumer, keeping header, footer and scroll insets independent.
  return <View {...props} style={[style,{width:'100%',maxWidth,alignSelf:'center',minWidth:0}]}>{children}</View>;
}
