import { useState } from 'react';

const punctuation = /[!"#$%&'()*+,\-./:;<=>?@[\]\\^_`{|}~]/;

export function AuthForm({ busy, onSubmit }: { busy: boolean; onSubmit: (register: boolean, values: Record<string, string>) => Promise<void> }) {
  const [register, setRegister] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const checks = [
    { label: 'অন্তত ৮টি অক্ষর (সর্বোচ্চ ১২৮)', valid: Array.from(password).length >= 8 && Array.from(password).length <= 128 },
    { label: 'একটি বড় হাতের ইংরেজি অক্ষর (A–Z)', valid: /[A-Z]/.test(password) },
    { label: 'একটি ছোট হাতের ইংরেজি অক্ষর (a–z)', valid: /[a-z]/.test(password) },
    { label: 'একটি সংখ্যা (0–9)', valid: /[0-9]/.test(password) },
    { label: 'একটি বিশেষ চিহ্ন (যেমন ! @ # $)', valid: punctuation.test(password) },
  ];
  return <section className="workspace-card auth-card">
    <h2>{register ? 'অ্যাকাউন্ট তৈরি করুন' : 'লগইন করুন'}</h2>
    {error && <p role="alert">{error}</p>}
    <form onSubmit={e => {
      e.preventDefault(); setError('');
      if (register && !checks.every(c => c.valid)) { setError('পাসওয়ার্ডের সব শর্ত পূরণ করুন।'); return; }
      if (register && password !== confirmation) { setError('দুটি পাসওয়ার্ড মেলেনি।'); return; }
      const values = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
      values.email = values.email.trim(); delete values.confirmation;
      void onSubmit(register, values);
    }}>
      <fieldset disabled={busy} style={{ border: 0, padding: 0, margin: 0 }}>
        {register && <label>আপনার নাম<input name="display_name" required maxLength={100} autoComplete="name" /></label>}
        <label>ইমেইল<input type="email" name="email" required maxLength={254} autoComplete="username" placeholder="name@example.com" /></label>
        <label>পাসওয়ার্ড<input type="password" name="password" required value={password} onChange={e => setPassword(e.target.value)} autoComplete={register ? 'new-password' : 'current-password'} aria-describedby={register ? 'password-rules' : undefined} /></label>
        {register && <>
          <ul id="password-rules" className="password-rules">{checks.map(check => <li key={check.label}>{check.valid ? '✓' : '○'} {check.label}</li>)}</ul>
          <label>পাসওয়ার্ড আবার লিখুন<input type="password" name="confirmation" required value={confirmation} onChange={e => setConfirmation(e.target.value)} autoComplete="new-password" aria-invalid={confirmation.length > 0 && password !== confirmation} /></label>
          {confirmation && password !== confirmation && <p>দুটি পাসওয়ার্ড এখনো মেলেনি।</p>}
        </>}
        <button className="primary" disabled={busy}>{busy ? 'অপেক্ষা করুন…' : register ? 'অ্যাকাউন্ট তৈরি ও লগইন' : 'লগইন'}</button>
      </fieldset>
    </form>
    <button className="back" disabled={busy} style={{ marginTop: 20 }} onClick={() => { setRegister(!register); setPassword(''); setConfirmation(''); setError(''); }}>{register ? 'আগেই অ্যাকাউন্ট আছে? লগইন করুন' : 'নতুন ব্যবহারকারী? অ্যাকাউন্ট তৈরি করুন'}</button>
  </section>;
}
