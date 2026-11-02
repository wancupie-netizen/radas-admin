import {validPixelId,type Settings} from './page-model';
const js=(v:unknown)=>JSON.stringify(v).replace(/</g,'\\u003c').replace(/>/g,'\\u003e').replace(/&/g,'\\u0026');
export function metaPixelHTML(s:Settings,slug?:string){
 if(s.metaPixelEnabled!=='on'||!s.metaPixelId||!validPixelId(s.metaPixelId)||!slug)return '';
 const id=js(s.metaPixelId),payload=js({content_ids:[slug],content_type:'product',value:Number(s.price),currency:'MYR',num_items:1});
 return `<script data-radas-meta-pixel>(function(){
 if(!['radas.my','www.radas.my'].includes(location.hostname)||location.pathname!=='/p/'+${js(slug)}||window.__radasMetaPixel)return;
 window.__radasMetaPixel=true;
 !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=true;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=true;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
 fbq('set','autoConfig',false,${id});fbq('init',${id});fbq('trackSingle',${id},'PageView');
 var sent=false;document.addEventListener('click',function(event){if(!event.isTrusted||sent)return;var link=event.target&&event.target.closest&&event.target.closest('.cta[href="#tempah"],.fallback a');if(!link)return;sent=true;fbq('trackSingle',${id},'InitiateCheckout',${payload});});
 })();</script>`;
}
