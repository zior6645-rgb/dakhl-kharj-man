import type { Category, CurrencyCode, Transaction } from './types';

export interface CloudSession { accessToken:string; refreshToken:string; userId:string; email:string; expiresAt:number; }
export interface CloudConfig { url:string; key:string; }
const SESSION_KEY='cashio-cloud-session-v1';

function envValue(name:'VITE_SUPABASE_URL'|'VITE_SUPABASE_PUBLISHABLE_KEY'):string {
  try { return String(((import.meta as ImportMeta & {env?:Record<string,string|undefined>}).env?.[name]) ?? '').trim(); } catch { return ''; }
}
export function getCloudConfig():CloudConfig|null { const url=envValue('VITE_SUPABASE_URL').replace(/\/$/,''); const key=envValue('VITE_SUPABASE_PUBLISHABLE_KEY'); return url&&key?{url,key}:null; }
export function cloudConfigured(){return !!getCloudConfig();}
export function loadCloudSession():CloudSession|null { try { const raw=localStorage.getItem(SESSION_KEY); if(!raw)return null; const s=JSON.parse(raw); if(!s||typeof s.accessToken!=='string'||typeof s.refreshToken!=='string'||typeof s.userId!=='string'||typeof s.email!=='string'||!Number.isFinite(s.expiresAt))return null; return s as CloudSession;} catch{return null;} }
function saveCloudSession(session:CloudSession){try{localStorage.setItem(SESSION_KEY,JSON.stringify(session));}catch{} return session;}
export function clearCloudSession(){try{localStorage.removeItem(SESSION_KEY);}catch{}}
function toSession(payload:any):CloudSession { const accessToken=String(payload?.access_token??''); const refreshToken=String(payload?.refresh_token??''); const userId=String(payload?.user?.id??''); const email=String(payload?.user?.email??''); const expiresIn=Number(payload?.expires_in??3600); if(!accessToken||!refreshToken||!userId||!email)throw new Error('Invalid authentication response.'); return {accessToken,refreshToken,userId,email,expiresAt:Date.now()+Math.max(60,expiresIn-30)*1000}; }
async function parseResponse(response:Response):Promise<any>{const text=await response.text();let body:any=null;try{body=text?JSON.parse(text):null;}catch{} if(!response.ok){const message=body?.msg||body?.message||body?.error_description||body?.error||('Request failed ('+response.status+')');throw new Error(String(message));} return body;}
async function authFetch(path:string,init:RequestInit={}):Promise<any>{const config=getCloudConfig();if(!config)throw new Error('Cloud service is not configured.');const headers=new Headers(init.headers);headers.set('apikey',config.key);headers.set('Content-Type','application/json');const response=await fetch(config.url+'/auth/v1/'+path,{...init,headers});return parseResponse(response);}
async function dataFetch(path:string,session:CloudSession,init:RequestInit={}):Promise<any>{const config=getCloudConfig();if(!config)throw new Error('Cloud service is not configured.');const headers=new Headers(init.headers);headers.set('apikey',config.key);headers.set('Authorization','Bearer '+session.accessToken);headers.set('Content-Type','application/json');const response=await fetch(config.url+'/rest/v1/'+path,{...init,headers});return parseResponse(response);}
async function refreshSession(session:CloudSession):Promise<CloudSession>{const payload=await authFetch('token?grant_type=refresh_token',{method:'POST',body:JSON.stringify({refresh_token:session.refreshToken})});return saveCloudSession(toSession(payload));}
export async function ensureCloudSession():Promise<CloudSession|null>{const session=loadCloudSession();if(!session)return null;if(session.expiresAt>Date.now()+60000)return session;try{return await refreshSession(session);}catch{clearCloudSession();return null;}}
export async function signUp(email:string,password:string):Promise<{session:CloudSession|null;confirmationSent:boolean}>{
  const payload=await authFetch('signup',{method:'POST',body:JSON.stringify({email:email.trim().toLowerCase(),password})});
  const session=payload?.access_token ? saveCloudSession(toSession(payload)) : null;
  return {session,confirmationSent:!!payload?.confirmation_sent_at};
}
export async function resendSignupCode(email:string):Promise<void>{await authFetch('resend',{method:'POST',body:JSON.stringify({type:'signup',email:email.trim().toLowerCase()})});}
export async function verifySignupCode(email:string,token:string):Promise<CloudSession|null>{
  const normalized=email.trim().toLowerCase();
  const clean=token.trim();
  const payload=await authFetch('verify',{method:'POST',body:JSON.stringify({type:'email',email:normalized,token:clean})});
  if(payload?.access_token)return saveCloudSession(toSession(payload));
  return null;
}
export async function signInWithPassword(email:string,password:string):Promise<CloudSession>{const payload=await authFetch('token?grant_type=password',{method:'POST',body:JSON.stringify({email:email.trim().toLowerCase(),password})});return saveCloudSession(toSession(payload));}
export async function requestPasswordReset(email:string):Promise<void>{await authFetch('recover',{method:'POST',body:JSON.stringify({email:email.trim().toLowerCase()})});}
export async function signOut():Promise<void>{const session=loadCloudSession();try{if(session)await authFetch('logout',{method:'POST',headers:{Authorization:'Bearer '+session.accessToken}});}finally{clearCloudSession();}}
async function rows(path:string,session:CloudSession):Promise<any[]>{const payload=await dataFetch(path,session,{method:'GET'});return Array.isArray(payload)?payload:[];}
function txToRow(tx:Transaction,userId:string){return {user_id:userId,id:tx.id,type:tx.type,amount:tx.amount,currency:tx.currency,title:tx.title,category:tx.category,date:tx.date,time:tx.time,description:tx.description,created_at_client:tx.createdAt,updated_at_client:tx.updatedAt};}
function rowToTx(r:any):Transaction|null{if(!r||typeof r.id!=='string'||(r.type!=='income'&&r.type!=='expense')||typeof r.amount!=='number'||!Number.isFinite(r.amount))return null;return {id:r.id,type:r.type,amount:r.amount,currency:String(r.currency) as CurrencyCode,title:String(r.title??''),category:String(r.category??''),date:String(r.date??''),time:String(r.time??'00:00'),description:String(r.description??''),createdAt:String(r.created_at_client??''),updatedAt:String(r.updated_at_client??'')};}
function catToRow(c:Category,userId:string){return {user_id:userId,id:c.id,label:c.label,kind:c.kind};}
function rowToCat(r:any):Category|null{if(!r||typeof r.id!=='string'||typeof r.label!=='string')return null;if(r.kind!=='income'&&r.kind!=='expense'&&r.kind!=='both')return null;return {id:r.id,label:r.label,kind:r.kind};}
export async function fetchCloudData(session:CloudSession):Promise<{transactions:Transaction[];categories:Category[]}>{const [txRows,catRows]=await Promise.all([rows('cashio_transactions?select=*&order=date.desc,time.desc',session),rows('cashio_categories?select=*&order=label.asc',session)]);return {transactions:txRows.map(rowToTx).filter(Boolean) as Transaction[],categories:catRows.map(rowToCat).filter(Boolean) as Category[]};}
export async function upsertCloudTransaction(session:CloudSession,tx:Transaction):Promise<void>{await dataFetch('cashio_transactions?on_conflict=user_id,id',session,{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(txToRow(tx,session.userId))});}
export async function deleteCloudTransaction(session:CloudSession,id:string):Promise<void>{await dataFetch('cashio_transactions?id=eq.'+encodeURIComponent(id),session,{method:'DELETE',headers:{Prefer:'return=minimal'}});}
export async function upsertCloudCategory(session:CloudSession,category:Category):Promise<void>{await dataFetch('cashio_categories?on_conflict=user_id,id',session,{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(catToRow(category,session.userId))});}
export async function deleteCloudCategory(session:CloudSession,id:string):Promise<void>{await dataFetch('cashio_categories?id=eq.'+encodeURIComponent(id),session,{method:'DELETE',headers:{Prefer:'return=minimal'}});}
export async function uploadLocalTransactions(session:CloudSession,list:Transaction[]):Promise<void>{if(!list.length)return;await dataFetch('cashio_transactions?on_conflict=user_id,id',session,{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(list.map(x=>txToRow(x,session.userId)))});}
export async function uploadLocalCategories(session:CloudSession,list:Category[]):Promise<void>{const custom=list.filter(c=>!c.system);if(!custom.length)return;await dataFetch('cashio_categories?on_conflict=user_id,id',session,{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(custom.map(x=>catToRow(x,session.userId)))});}
export async function deleteAllCloudData(session:CloudSession):Promise<void>{await Promise.all([dataFetch('cashio_transactions?user_id=eq.'+encodeURIComponent(session.userId),session,{method:'DELETE',headers:{Prefer:'return=minimal'}}),dataFetch('cashio_categories?user_id=eq.'+encodeURIComponent(session.userId),session,{method:'DELETE',headers:{Prefer:'return=minimal'}})]);}
