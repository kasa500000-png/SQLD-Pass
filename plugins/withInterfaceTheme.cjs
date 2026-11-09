const {withAndroidStyles}=require('expo/config-plugins');
module.exports=config=>withAndroidStyles(config,config=>{
 const theme=config.modResults.resources.style?.find(style=>style.$?.name==='AppTheme');
 if(theme){theme.item=theme.item??[];const existing=theme.item.find(item=>item.$?.name==='colorAccent');
  if(existing)existing._='#2457D6';else theme.item.push({$:{name:'colorAccent'},_:'#2457D6'});}
 return config;
});
