import * as SQLite from 'expo-sqlite';
import {Platform,Linking} from 'react-native';
import type * as NotificationTypes from 'expo-notifications';
import {
  RemindersController,STUDY_REMINDER_ID,STUDY_REMINDER_KIND,isStudyReminder,
  type ReminderBindings,type ReminderNotifications,type ReminderPermission,type ReminderPreferences,type ReminderRepository
} from '../core/reminders';

export const STUDY_REMINDER_CHANNEL='sqld-pass-study-reminders-v1';
type NotificationsSdk=Pick<typeof NotificationTypes,'IosAuthorizationStatus'|'AndroidImportance'|'SchedulableTriggerInputTypes'|
  'DEFAULT_ACTION_IDENTIFIER'|'setNotificationChannelAsync'|'setNotificationHandler'|'clearLastNotificationResponseAsync'|
  'addNotificationResponseReceivedListener'|'getLastNotificationResponseAsync'|'getPermissionsAsync'|'requestPermissionsAsync'|
  'getAllScheduledNotificationsAsync'|'cancelScheduledNotificationAsync'|'scheduleNotificationAsync'>;

class SqliteReminderRepository implements ReminderRepository {
  private database?:Promise<SQLite.SQLiteDatabase>;
  private open() {
    return this.database??=SQLite.openDatabaseAsync('sqld_pass.sqlite').then(async db=>{
      await db.execAsync(`PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS learning_reminder_preferences (
        slot TEXT PRIMARY KEY NOT NULL, payload TEXT NOT NULL
      );`);
      return db;
    }).catch(error=>{this.database=undefined;throw error;});
  }
  async load():Promise<unknown> {
    const db=await this.open(),row=await db.getFirstAsync<{payload:string}>(
      'SELECT payload FROM learning_reminder_preferences WHERE slot=?','current');
    return row?JSON.parse(row.payload):null;
  }
  async save(preferences:ReminderPreferences):Promise<void> {
    const db=await this.open();
    await db.runAsync('INSERT OR REPLACE INTO learning_reminder_preferences(slot,payload) VALUES (?,?)','current',JSON.stringify(preferences));
  }
}
function localTimezone():string {
  try{return Intl.DateTimeFormat().resolvedOptions().timeZone||'device-local';}catch{return 'device-local';}
}
function permissionResult(sdk:NotificationsSdk,p:NotificationTypes.NotificationPermissionsStatus):ReminderPermission {
  const ios=p.ios?.status;
  return {granted:Platform.OS==='ios'?ios===sdk.IosAuthorizationStatus.AUTHORIZED||ios===sdk.IosAuthorizationStatus.PROVISIONAL||
    ios===sdk.IosAuthorizationStatus.EPHEMERAL:p.granted,canAskAgain:p.canAskAgain};
}

class LocalNotifications implements ReminderNotifications {
  private sdk?:NotificationsSdk;
  private requireSdk(){if(!this.sdk)throw Error('Local notifications not initialized');return this.sdk;}
  private async loadSdk():Promise<NotificationsSdk> {
    if(this.sdk)return this.sdk;
    // The SDK barrel imports DevicePushTokenAutoRegistration.fx. Use only the pinned SDK's
    // local modules so a persisted push registration can never start a recovery request.
    const registration=require('expo-notifications/build/ServerRegistrationModule').default as {
      setRegistrationInfoAsync?:(value:string)=>Promise<unknown>
    };
    if(!registration.setRegistrationInfoAsync)throw Error('Local notification initialization unavailable');
    // SDK 57's iOS native setter requires String, so use a disabled registration on both OSes.
    await registration.setRegistrationInfoAsync(JSON.stringify({isEnabled:false}));
    this.sdk={
      ...require('expo-notifications/build/NotificationPermissions'),
      ...require('expo-notifications/build/NotificationPermissions.types'),
      ...require('expo-notifications/build/NotificationChannelManager.types'),
      ...require('expo-notifications/build/Notifications.types'),
      ...require('expo-notifications/build/NotificationsEmitter'),
      ...require('expo-notifications/build/NotificationsHandler'),
      setNotificationChannelAsync:require('expo-notifications/build/setNotificationChannelAsync').setNotificationChannelAsync,
      getAllScheduledNotificationsAsync:require('expo-notifications/build/getAllScheduledNotificationsAsync').getAllScheduledNotificationsAsync,
      cancelScheduledNotificationAsync:require('expo-notifications/build/cancelScheduledNotificationAsync').cancelScheduledNotificationAsync,
      scheduleNotificationAsync:require('expo-notifications/build/scheduleNotificationAsync').scheduleNotificationAsync
    } as NotificationsSdk;
    return this.sdk;
  }
  async initialize(onTap:()=>void,isExamActive:()=>boolean):Promise<()=>void> {
    const sdk=await this.loadSdk();
    if(Platform.OS==='android')await sdk.setNotificationChannelAsync(STUDY_REMINDER_CHANNEL,{
      name:'학습 알림',description:'선택한 시간의 복습 알림',importance:sdk.AndroidImportance.LOW,
      sound:null,enableVibrate:false,showBadge:false
    });
    sdk.setNotificationHandler({handleNotification:async notification=>{
      const own=isStudyReminder({identifier:notification.request.identifier,kind:notification.request.content.data?.kind});
      const show=own&&!isExamActive();
      return {shouldShowBanner:show,shouldShowList:show,shouldPlaySound:false,shouldSetBadge:false};
    }});
    let disposed=false,lastResponse='';
    const handle=(response:NotificationTypes.NotificationResponse|null)=>{
      if(disposed||!response||response.actionIdentifier!==sdk.DEFAULT_ACTION_IDENTIFIER)return;
      const notification=response.notification;
      if(!isStudyReminder({identifier:notification.request.identifier,kind:notification.request.content.data?.kind}))return;
      const key=`${notification.request.identifier}:${notification.date}`;
      if(key===lastResponse)return;lastResponse=key;onTap();
      void sdk.clearLastNotificationResponseAsync().catch(()=>{});
    };
    const listener=sdk.addNotificationResponseReceivedListener(handle);
    try{handle(await sdk.getLastNotificationResponseAsync());}
    catch {/* Missing launch response is not a scheduling failure. */}
    return ()=>{disposed=true;listener.remove();sdk.setNotificationHandler(null);};
  }
  async permission(){const sdk=this.requireSdk();return permissionResult(sdk,await sdk.getPermissionsAsync());}
  async requestPermission(){const sdk=this.requireSdk();return permissionResult(sdk,await sdk.requestPermissionsAsync({
    ios:{allowAlert:true,allowBadge:false,allowSound:false}
  }));}
  async scheduled(){return (await this.requireSdk().getAllScheduledNotificationsAsync()).map(request=>{
    const trigger=request.trigger as {hour?:number;minute?:number}|null;
    return {identifier:request.identifier,kind:request.content.data?.kind,timezone:request.content.data?.timezone,
      hour:trigger?.hour,minute:trigger?.minute};
  });}
  async cancel(identifier:string){await this.requireSdk().cancelScheduledNotificationAsync(identifier);}
  async schedule(preferences:ReminderPreferences){
    const sdk=this.requireSdk();
    await sdk.scheduleNotificationAsync({identifier:STUDY_REMINDER_ID,content:{
      title:'SQLD Pass',body:'잠깐 복습할 시간이에요.',sound:false,interruptionLevel:'passive',
      data:{kind:STUDY_REMINDER_KIND,route:'review',timezone:preferences.timezone}
    },trigger:{type:sdk.SchedulableTriggerInputTypes.DAILY,hour:preferences.hour,minute:preferences.minute,
      channelId:STUDY_REMINDER_CHANNEL}});
  }
}
export function createNativeReminders(bindings:ReminderBindings):RemindersController {
  return new RemindersController(new SqliteReminderRepository(),new LocalNotifications(),bindings,localTimezone);
}
export async function openReminderSystemSettings():Promise<void>{await Linking.openSettings();}
export {RemindersController} from '../core/reminders';
