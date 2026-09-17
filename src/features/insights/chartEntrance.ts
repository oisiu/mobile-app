type EntranceNavigation={
  isFocused:()=>boolean;
  addListener:((event:'focus'|'blur'|'transitionStart',listener:()=>void)=>()=>void)&
    ((event:'transitionEnd',listener:(event:{data:{closing:boolean}})=>void)=>()=>void);
};

export function observeChartEntrance(navigation:EntranceNavigation,onReady:()=>void){
  let idle:number|undefined,timer:ReturnType<typeof setTimeout>|undefined;
  const cancel=()=>{if(idle!==undefined)cancelIdleCallback(idle);if(timer!==undefined)clearTimeout(timer);idle=undefined;timer=undefined};
  const reveal=()=>{cancel();if(navigation.isFocused())idle=requestIdleCallback(()=>{idle=undefined;if(navigation.isFocused())onReady()},{timeout:1000})};
  // Direct launches and disabled animations may not emit a transition event.
  const focus=()=>{cancel();timer=setTimeout(reveal,1000)};
  const unsubscribeFocus=navigation.addListener('focus',focus);
  const unsubscribeBlur=navigation.addListener('blur',cancel);
  const unsubscribeStart=navigation.addListener('transitionStart',cancel);
  const unsubscribeEnd=navigation.addListener('transitionEnd',event=>{if(!event.data.closing)reveal()});
  if(navigation.isFocused())focus();
  return()=>{cancel();unsubscribeFocus();unsubscribeBlur();unsubscribeStart();unsubscribeEnd()};
}
