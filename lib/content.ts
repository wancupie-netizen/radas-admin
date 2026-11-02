import { env } from 'cloudflare:workers';
import initial from '../app/default-content.json';
import { getChatGPTUser } from '../app/chatgpt-auth';
export type Block={id:string;type:'text'|'image'|'offer'|'checkout'|'faq';title:string;body:string;src:string};
export type Content={revision:string;blocks:Block[]};
export const bucket=()=>{const b=(env as Cloudflare.Env).BUCKET;if(!b)throw new Error('Storage unavailable');return b};
export async function owner(){const u=await getChatGPTUser();return !!u?.userId && u.email.toLowerCase()==='wancupie@gmail.com'}
export async function readContent(key='published'):Promise<Content>{const obj=await bucket().get(`content/${key}.json`);return obj?await obj.json():initial as Content}
export function validate(v:any):Content|null{if(!v||typeof v.revision!=='string'||!Array.isArray(v.blocks)||v.blocks.length<1||v.blocks.length>80)return null;const ids=new Set();let checkouts=0;for(const b of v.blocks){if(!b||typeof b.id!=='string'||b.id.length>100||ids.has(b.id)||!['text','image','offer','checkout','faq'].includes(b.type))return null;ids.add(b.id);for(const k of ['title','body','src'])if(typeof b[k]!=='string')return null;if(b.title.length>500||b.body.length>20000||b.src.length>500)return null;if(b.src&&!/^\/(?:assets|media)\/[a-zA-Z0-9._-]+$/.test(b.src))return null;if(b.type==='checkout')checkouts++}return checkouts===1?{revision:v.revision,blocks:v.blocks.map(({id,type,title,body,src}:Block)=>({id,type,title,body,src}))}:null}
export function sameOrigin(req:Request){return req.headers.get('origin')===new URL(req.url).origin}
