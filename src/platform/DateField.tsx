import React,{useEffect,useRef,useState} from 'react';
import {Modal,Platform,Pressable,ScrollView,View} from 'react-native';
import DateTimePicker,{DateTimePickerAndroid} from '@react-native-community/datetimepicker';
import {dayKey,validTargetDate} from '../core/domain';
import {dark as darkPalette,light,type Node} from '../ui/nodes';
import {AppText as Text} from './Typography';

/** Dates are calendar days in the device's local timezone, never UTC timestamps. */
function localDate(value:string):Date {
  const [year,month,day]=value.split('-').map(Number);
  return new Date(year,month-1,day,12);
}

export function DateField({node,scale,dark}:{node:Node;scale:number;dark:boolean}){
  const p=dark?darkPalette:light;
  const minimum=node.minimumDate??dayKey(),minimumDate=localDate(minimum),maximumDate=new Date(2099,11,31,12);
  const initial=validTargetDate(node.value??'',minimum)&&node.value?localDate(node.value):minimumDate;
  const [draft,setDraft]=useState(initial),[open,setOpen]=useState(false),[error,setError]=useState('');
  const androidOpen=useRef(false);
  useEffect(()=>()=>{
    if(androidOpen.current){androidOpen.current=false;void DateTimePickerAndroid.dismiss('date').catch(()=>{});}
  },[]);
  function showPicker(){
    if(node.disabled)return;
    setError('');
    if(Platform.OS==='android'){
      androidOpen.current=true;
      try{DateTimePickerAndroid.open({value:initial,mode:'date',display:'calendar',minimumDate,maximumDate,
        positiveButton:{label:'선택'},negativeButton:{label:'취소'},
        onValueChange:(_event,date)=>{if(androidOpen.current){androidOpen.current=false;node.onChange?.(dayKey(date.getTime()));}},
        onDismiss:()=>{androidOpen.current=false;},
        onError:()=>{androidOpen.current=false;setError('달력을 열지 못했습니다. 다시 선택해 주세요.');}
      });}catch{androidOpen.current=false;setError('달력을 열지 못했습니다. 다시 선택해 주세요.');}
    }else{setDraft(initial);setOpen(true);}
  }
  const control={minHeight:52,padding:14,borderWidth:1,borderColor:p.line,borderRadius:12,justifyContent:'center' as const};
  return <View style={{gap:8}}>
    <Pressable testID={node.testId} accessibilityRole="button" accessibilityLabel={`${node.label}, ${node.value||'미설정'}`}
      accessibilityState={{disabled:!!node.disabled}} disabled={node.disabled} onPress={showPicker}
      style={[control,{backgroundColor:p.surface}]}>
      <Text style={{fontSize:16*scale,lineHeight:25*scale,color:node.value?p.ink:p.blue}}>{node.value||'시험일 선택'}</Text>
    </Pressable>
    {node.value?<Pressable testID={`${node.testId}-clear`} accessibilityRole="button" accessibilityLabel="시험일 비우기"
      disabled={node.disabled} accessibilityState={{disabled:!!node.disabled}} onPress={()=>{setError('');node.onChange?.('');}}
      style={{minHeight:48,padding:12,alignSelf:'flex-start',justifyContent:'center'}}>
      <Text style={{fontSize:14*scale,color:p.blue}}>시험일 비우기</Text>
    </Pressable>:null}
    {error?<Text accessibilityRole="alert" style={{fontSize:14*scale,lineHeight:22*scale,color:p.red}}>{error}</Text>:null}
    {Platform.OS==='ios'&&open?<Modal transparent visible animationType="fade" onRequestClose={()=>setOpen(false)}>
      <View accessibilityViewIsModal style={{flex:1,backgroundColor:'rgba(10,20,40,0.5)',justifyContent:'center',padding:20}}>
        <ScrollView style={{maxHeight:'90%',flexGrow:0,width:'100%',maxWidth:480,alignSelf:'center'}} contentContainerStyle={{padding:16,gap:12,backgroundColor:p.surface,borderRadius:16}}>
          <Text accessibilityRole="header" style={{fontSize:20*scale,color:p.ink,fontWeight:'700'}}>목표 시험일</Text>
          <DateTimePicker value={draft} mode="date" display="spinner" locale="ko-KR" minimumDate={minimumDate} maximumDate={maximumDate}
            themeVariant={dark?'dark':'light'} textColor={p.ink} onValueChange={(_event,date)=>setDraft(date)} />
          <Pressable accessibilityRole="button" accessibilityLabel="시험일 선택 완료" style={[control,{backgroundColor:p.blueSoft}]}
            onPress={()=>{node.onChange?.(dayKey(draft.getTime()));setOpen(false);}}>
            <Text style={{fontSize:16*scale,color:p.blue,textAlign:'center'}}>선택</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="시험일 선택 취소" style={control} onPress={()=>setOpen(false)}>
            <Text style={{fontSize:16*scale,color:p.ink,textAlign:'center'}}>취소</Text>
          </Pressable>
        </ScrollView>
      </View>
    </Modal>:null}
  </View>;
}
