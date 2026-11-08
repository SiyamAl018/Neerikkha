import { useCallback, useState } from 'react';
import { CaseDocuments } from './CaseDocuments';
import { AuthForm } from './AuthForm';
import './workspace.css';

type Case = {id:string;reference:string;mouza:string;survey_type:string;status:string};
export function Account(){
 const [selected,setSelected]=useState('');
 const [token,setToken]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[cases,setCases]=useState<Case[]>([]);
 const expire=useCallback(()=>{setToken('');setCases([]);setSelected('')},[]);
 const api=async(path:string,method='GET',body?:unknown,auth=token)=>{
  const response=await fetch('/api/v1'+path,{method,headers:{'Content-Type':'application/json',...(auth?{Authorization:'Bearer '+auth}:{})},body:body?JSON.stringify(body):undefined});
  if(response.status===401&&auth){setToken('');setCases([])}
  if(response.status===422){const details=await response.json();throw new Error(details.fields?.includes('email')?'সঠিক ইমেইল ঠিকানা দিন।':details.fields?.includes('password')?'পাসওয়ার্ডে ৮–১২৮ অক্ষর, বড় ও ছোট হাতের ইংরেজি অক্ষর, সংখ্যা এবং বিশেষ চিহ্ন প্রয়োজন।':'দেওয়া তথ্য যাচাই করে আবার চেষ্টা করুন।')}
  if(!response.ok)throw new Error(response.status===429?'অনুগ্রহ করে এক মিনিট পরে চেষ্টা করুন।':response.status===401?'ইমেইল বা পাসওয়ার্ড সঠিক নয়, অথবা সেশন শেষ হয়েছে।':'অনুরোধ সম্পন্ন হয়নি। তথ্য যাচাই করে আবার চেষ্টা করুন।');
  return response.status===204?null:response.json();
 };
 const run=async(action:()=>Promise<void>)=>{setBusy(true);setError('');try{await action()}catch(e){setError(e instanceof Error?e.message:'সংযোগ ব্যর্থ হয়েছে।')}finally{setBusy(false)}};
 return <main className={`workspace ${token?'workspace-signed-in':'workspace-auth'}`}>
 <div className="workspace-topbar"><div className="brand">নিরীক্ষা <small>NEERIKKHA</small></div><span>জমির নথি যাচাই</span></div>
 <section className="workspace-heading"><h1>{token?'আপনার কেস':'নথি যাচাই শুরু করুন'}</h1><p>{token?'কেস খুলে নথি ও যাচাই করা তথ্য দেখুন।':'দলিল, নামজারি ও খতিয়ান একসঙ্গে রাখুন।'}</p></section>
 {error&&<p role="alert" className="error">{error}</p>}
 {!token?<AuthForm busy={busy} onSubmit={(register,values)=>run(async()=>{if(register)await api('/auth/register','POST',values);const result=await api('/auth/login','POST',values);setToken(result.access_token);setCases(await api('/cases','GET',undefined,result.access_token));})}/>:<>
 <div className="workspace-actions"><button className="language" disabled={busy} onClick={()=>void run(async()=>{const result=await api('/auth/renew','POST');setToken(result.access_token)})}>সেশন নবায়ন</button><button className="language" disabled={busy} onClick={()=>void run(async()=>{await api('/auth/logout','POST');expire()})}>লগআউট</button></div>
 <section className="workspace-card"><h2>নতুন কেস</h2><form className="case-create-form" onSubmit={e=>{e.preventDefault();const form=e.currentTarget;const values=Object.fromEntries(new FormData(form));void run(async()=>{await api('/cases','POST',values);setCases(await api('/cases'));form.reset()})}}><label>কেসের নাম<input name="reference" required maxLength={100}/></label><label>মৌজা<input name="mouza" required maxLength={100}/></label><label>জরিপ<select name="survey_type">{['CS','SA','RS','BS'].map(s=><option key={s}>{s}</option>)}</select></label><button className="primary" disabled={busy}>কেস তৈরি করুন</button></form></section>
 <section className="workspace-card"><h2>সংরক্ষিত কেস <span className="workspace-count">{cases.length}</span></h2>{!cases.length?<p className="workspace-empty">এখনো কোনো কেস নেই। উপরের ফর্ম থেকে একটি তৈরি করুন।</p>:cases.map(c=><article key={c.id} className="workspace-case"><div className="workspace-case-heading"><div><h3>{c.reference}</h3><p>{c.mouza} · {c.survey_type}</p></div><button className="language" disabled={busy} onClick={()=>setSelected(selected===c.id?'':c.id)}>{selected===c.id?'বন্ধ করুন':'নথি খুলুন'}</button></div>{selected===c.id&&<CaseDocuments key={c.id+token} caseId={c.id} token={token} onExpired={expire}/>}</article>)}</section></>}
 <p className="workspace-footnote">সেশন ৩০ মিনিটের। পৃষ্ঠা রিফ্রেশ করলে আবার লগইন করুন।</p></main>
}
