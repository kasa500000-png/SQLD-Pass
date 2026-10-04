import React,{useState,useSyncExternalStore} from 'react';
import {Platform,Pressable,ScrollView,Switch,View} from 'react-native';
import DateTimePicker,{DateTimePickerAndroid} from '@react-native-community/datetimepicker';
import type {Controller} from '../core/controller';
import {reminderTimeLabel,type RemindersController} from '../core/reminders';
import {light,dark} from '../ui/nodes';
import {AppText as Text} from './Typography';
import {LearningIcon} from './LearningIcon';
import {openReminderSystemSettings} from './reminders';
import {useResponsiveLayout} from './ResponsiveLayout';

export function ReminderSettings({c,reminders}:{c:Controller;reminders:RemindersController}) {
  const state=useSyncExternalStore(reminders.subscribe,reminders.getSnapshot,reminders.getSnapshot);
  const [picker,setPicker]=useState(false),[localError,setLocalError]=useState('');
  const [pickerValue,setPickerValue]=useState(new Date());
  const layout=useResponsiveLayout();
  const colors=c.isDark?dark:light,scale=c.state.settings.fontScale;
  const p=state.preferences;
  const date=new Date();date.setHours(p.hour,p.minute,0,0);
  const textStyle={color:colors.ink,fontSize:16*scale,lineHeight:24*scale};
  const mutedStyle={color:colors.muted,fontSize:14*scale,lineHeight:21*scale};
  const openTime=()=>{
    setLocalError('');
    try {
      if(Platform.OS==='android')DateTimePickerAndroid.open({value:date,mode:'time',is24Hour:true,
        onChange:(event,selected)=>{if(event.type==='set'&&selected)void reminders.setTime(selected.getHours(),selected.getMinutes());}});
      else {setPickerValue(date);setPicker(true);}
    }catch{setLocalError('시간 선택기를 열지 못했습니다. 다시 시도해 주세요.');}
  };
  const status=state.status==='scheduled'?'매일 복습 알림을 보내요.':state.status==='paused'?'실전 시험 중에는 알림을 쉬어요.':
    state.status==='denied'?'시스템에서 알림이 꺼져 있어요.':state.status==='unavailable'?'알림 예약을 확인하지 못했어요.':'원할 때 켜 주세요.';
  return <ScrollView testID="reminder-settings" style={{flex:1}} keyboardShouldPersistTaps="handled"
    contentContainerStyle={{width:'100%',maxWidth:layout.readingMaxWidth,alignSelf:'center',paddingHorizontal:layout.horizontalPadding,paddingVertical:20,gap:20,paddingBottom:36}}>
    <View style={{flexDirection:'row',alignItems:'center',gap:12}}>
      <Pressable onPress={()=>c.back()} accessibilityRole="button" accessibilityLabel="뒤로" testID="reminder-back"
        style={{minWidth:48,minHeight:48,justifyContent:'center',alignItems:'center'}}>
        <LearningIcon name="chevron-left" size={24} color={colors.ink}/>
      </Pressable>
      <Text accessibilityRole="header" style={{color:colors.ink,fontSize:24*scale,fontWeight:'800',flexShrink:1}}>학습 알림</Text>
    </View>
    <View style={{padding:layout.stackRows?14:20,borderRadius:18,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.line,gap:14}}>
      <View style={{flexDirection:'row',alignItems:'center',gap:12}}>
        <LearningIcon name="bell" color={colors.blue} size={24}/>
        <View style={{flex:1,gap:4}}>
          <Text style={{...textStyle,fontWeight:'700'}}>매일 복습 알림</Text>
          <Text style={mutedStyle}>{status}</Text>
        </View>
        <Switch testID="reminder-enabled" accessibilityLabel="매일 복습 알림" value={p.enabled}
          disabled={!state.ready||state.busy} onValueChange={enabled=>{void reminders.setEnabled(enabled);}}
          trackColor={{false:colors.line,true:colors.blue}} thumbColor="#FFFFFF"/>
      </View>
      <View style={{height:1,backgroundColor:colors.line}}/>
      <Pressable testID="reminder-time" accessibilityRole="button" accessibilityLabel={`알림 시간 ${reminderTimeLabel(p.hour,p.minute)}`}
        disabled={!state.ready||state.busy} onPress={openTime}
        style={{minHeight:52,flexDirection:layout.stackRows?'column':'row',alignItems:layout.stackRows?'flex-start':'center',justifyContent:'space-between',gap:8,opacity:state.busy?0.5:1}}>
        <Text style={textStyle}>알림 시간</Text>
        <View style={{flexDirection:'row',alignItems:'center',gap:8,flexShrink:1}}>
          <Text style={{...textStyle,color:colors.blue,fontWeight:'700',flexShrink:1}}>{reminderTimeLabel(p.hour,p.minute)}</Text>
          <LearningIcon name="chevron-right" color={colors.muted} size={20}/>
        </View>
      </Pressable>
      {picker&&Platform.OS==='ios'?<ScrollView horizontal showsHorizontalScrollIndicator style={{flexGrow:0}}
        contentContainerStyle={{flexGrow:1,justifyContent:'center',alignItems:'center'}} accessibilityLabel="알림 시간 선택">
        <DateTimePicker testID="reminder-time-picker" value={pickerValue} mode="time" display="spinner"
          themeVariant={c.isDark?'dark':'light'} onChange={(_event,selected)=>{if(selected)setPickerValue(selected);}}/>
      </ScrollView>:null}
      {picker&&Platform.OS==='ios'?<Pressable accessibilityRole="button" onPress={()=>{setPicker(false);void reminders.setTime(pickerValue.getHours(),pickerValue.getMinutes());}} style={{minHeight:48,justifyContent:'center'}}>
        <Text style={{...textStyle,textAlign:'center',color:colors.blue,fontWeight:'700'}}>완료</Text>
      </Pressable>:null}
    </View>
    <Text style={mutedStyle}>기기의 현재 시간대 기준이에요. 시간대를 바꾼 뒤 앱을 열면 갱신하며, 절전 상태에서는 알림이 늦어질 수 있어요.</Text>
    {state.error||localError?<Text accessibilityRole="alert" style={{...textStyle,color:colors.red}}>{localError||state.error}</Text>:null}
    {state.status==='denied'?<Pressable testID="reminder-system-settings" accessibilityRole="button"
      onPress={()=>{void openReminderSystemSettings().catch(()=>setLocalError('시스템 설정을 열지 못했습니다. 기기 설정에서 알림을 확인해 주세요.'));}}
      style={{minHeight:48,padding:12,borderRadius:12,backgroundColor:colors.blueSoft}}>
      <Text style={{...textStyle,color:colors.blue,fontWeight:'700',textAlign:'center'}}>시스템 알림 설정 열기</Text>
    </Pressable>:null}
    {state.status==='unavailable'?<Pressable testID="reminder-retry" accessibilityRole="button" disabled={state.busy}
      onPress={()=>{void reminders.refresh();}} style={{minHeight:48,padding:12,borderRadius:12,backgroundColor:colors.blueSoft}}>
      <Text style={{...textStyle,color:colors.blue,fontWeight:'700',textAlign:'center'}}>다시 시도</Text>
    </Pressable>:null}
  </ScrollView>;
}
