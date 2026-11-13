import React,{useEffect,useRef} from 'react';
import {AppState,ScrollView,View,type ScrollViewProps} from 'react-native';
import type {ReadingOffset} from '../core/types';
import {restoredReadingOffset} from '../core/domain/reading';

interface Props extends ScrollViewProps {
  position?:ReadingOffset;
  anchorIndex?:number;
  onSave:(position:ReadingOffset)=>Promise<boolean>;
}

/** Reading history is saved when scrolling settles, on leaving, or on backgrounding. */
export function ReadingScrollView({position,anchorIndex,onSave,children,...props}:Props):React.JSX.Element {
  const scroll=useRef<ScrollView>(null),save=useRef(onSave);
  save.current=onSave;
  const anchor=useRef(position),latest=useRef<ReadingOffset|undefined>(undefined);
  const pendingAnchor=useRef(anchorIndex),anchorY=useRef<number|undefined>(undefined);
  const geometry=useRef({height:0,viewport:0});
  const sent=useRef<ReadingOffset|undefined>(undefined);
  const idle=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);
  const frame=useRef<number|undefined>(undefined),restoring=useRef(false);

  function cancelIdle(){if(idle.current!==undefined)clearTimeout(idle.current);idle.current=undefined;}
  function flush(){
    cancelIdle();
    const value=latest.current;
    if(!value||(sent.current?.offset===value.offset&&sent.current.contentHeight===value.contentHeight))return;
    sent.current=value;
    void save.current(value).then(ok=>{if(!ok&&sent.current===value)sent.current=undefined;});
  }
  function schedule(){cancelIdle();idle.current=setTimeout(flush,450);}
  function restore(){
    const {height,viewport}=geometry.current;
    if(height<=0||viewport<=0)return;
    if(pendingAnchor.current!==undefined&&anchorY.current===undefined)return;
    const offset=pendingAnchor.current!==undefined?Math.max(0,Math.min(anchorY.current!,height-viewport)):restoredReadingOffset(anchor.current,height,viewport);
    latest.current={offset,contentHeight:height};
    restoring.current=true;
    if(frame.current!==undefined)cancelAnimationFrame(frame.current);
    frame.current=requestAnimationFrame(()=>{
      if(pendingAnchor.current!==undefined){pendingAnchor.current=undefined;anchor.current={offset,contentHeight:height};}
      scroll.current?.scrollTo({y:offset,animated:false});
      // Ignore initial native zero-offset events while applying the saved position.
      frame.current=requestAnimationFrame(()=>{restoring.current=false;frame.current=undefined;schedule();});
    });
  }
  useEffect(()=>{
    const listener=AppState.addEventListener('change',state=>{if(state!=='active')flush();});
    return ()=>{listener.remove();if(frame.current!==undefined)cancelAnimationFrame(frame.current);flush();};
  },[]);

  return <ScrollView {...props} ref={scroll} scrollEventThrottle={100}
    onLayout={event=>{
      const viewport=event.nativeEvent.layout.height;
      if(geometry.current.viewport!==viewport){geometry.current.viewport=viewport;restore();}
    }}
    onContentSizeChange={(_width,height)=>{
      if(geometry.current.height!==height){geometry.current.height=height;restore();}
    }}
    onScrollBeginDrag={()=>{
      if(frame.current!==undefined)cancelAnimationFrame(frame.current);
      frame.current=undefined;restoring.current=false;pendingAnchor.current=undefined;cancelIdle();
    }}
    onScroll={event=>{
      if(restoring.current)return;
      const {contentOffset,contentSize,layoutMeasurement}=event.nativeEvent;
      if(contentSize.height<=0||layoutMeasurement.height<=0)return;
      const offset=Math.max(0,Math.min(contentOffset.y,contentSize.height-layoutMeasurement.height));
      latest.current={offset,contentHeight:contentSize.height};
      anchor.current=latest.current;schedule();
    }}
    onScrollEndDrag={schedule}
    onMomentumScrollEnd={flush}
  >{anchorIndex===undefined?children:React.Children.map(children,(child,index)=><View key={React.isValidElement(child)?child.key??index:index} onLayout={event=>{
    if(index===pendingAnchor.current){anchorY.current=event.nativeEvent.layout.y;restore();}
  }}>{child}</View>)}</ScrollView>;
}
