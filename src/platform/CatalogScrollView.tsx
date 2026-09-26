import React,{useEffect,useLayoutEffect,useRef} from 'react';
import {ScrollView,type NativeScrollEvent,type ScrollViewProps} from 'react-native';
import type {ReadingOffset} from '../core/types';
import {restoredReadingOffset} from '../core/domain/reading';

interface Props extends ScrollViewProps {
  context:string;
  position?:ReadingOffset;
  onRemember:(position:ReadingOffset)=>void;
}

/** Keeps list navigation in memory. Filter changes reset without remounting the search input. */
export function CatalogScrollView({context,position,onRemember,...props}:Props):React.JSX.Element {
  const scroll=useRef<ScrollView>(null),remember=useRef(onRemember);
  const currentContext=useRef(context),anchor=useRef(position);
  const geometry=useRef({height:0,viewport:0});
  const frame=useRef<number|undefined>(undefined),restoring=useRef(true);

  function cancelFrame(){if(frame.current!==undefined)cancelAnimationFrame(frame.current);frame.current=undefined;}
  function restore(){
    restoring.current=true;
    cancelFrame();
    const {height,viewport}=geometry.current;
    if(height<=0||viewport<=0)return;
    const offset=restoredReadingOffset(anchor.current,height,viewport);
    frame.current=requestAnimationFrame(()=>{
      scroll.current?.scrollTo({y:offset,animated:false});
      // Ignore initial zero-offset events until native scrolling has applied the position.
      frame.current=requestAnimationFrame(()=>{
        frame.current=undefined;restoring.current=false;
        anchor.current={offset,contentHeight:height};remember.current(anchor.current);
      });
    });
  }
  useLayoutEffect(()=>{
    remember.current=onRemember;
    if(currentContext.current!==context){currentContext.current=context;anchor.current=position;restore();}
  });
  useEffect(()=>()=>cancelFrame(),[]);

  function record(event:NativeScrollEvent){
    if(restoring.current)return;
    const {contentOffset,contentSize,layoutMeasurement}=event;
    if(contentSize.height<=0||layoutMeasurement.height<=0)return;
    const offset=Math.max(0,Math.min(contentOffset.y,contentSize.height-layoutMeasurement.height));
    anchor.current={offset,contentHeight:contentSize.height};
    remember.current(anchor.current);
  }
  return <ScrollView {...props} ref={scroll} scrollEventThrottle={100}
    onLayout={event=>{
      const viewport=event.nativeEvent.layout.height;
      if(geometry.current.viewport!==viewport){geometry.current.viewport=viewport;restore();}
    }}
    onContentSizeChange={(_width,height)=>{
      if(geometry.current.height!==height){geometry.current.height=height;restore();}
    }}
    onScrollBeginDrag={()=>{cancelFrame();restoring.current=false;}}
    onScroll={event=>record(event.nativeEvent)}
    onScrollEndDrag={event=>record(event.nativeEvent)}
    onMomentumScrollEnd={event=>record(event.nativeEvent)}
  />;
}
