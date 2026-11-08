import { useState } from 'react';

type Candidate = { value: string; page: number | null; line: number | null; source_text: string; engine?: string; grounded?: boolean; scope?: 'primary' | 'historical' | 'component' | 'unclear'; confidence?: number; pass?: number; evidence_match?: 'exact' | 'format' | null; repair?: { from: string; to: string; kinds: string[] } | null };
const scopeNotes = { historical: 'আগের রেকর্ডের তথ্য; বর্তমান মান হিসেবে নেওয়া হয়নি', component: 'অংশের পরিমাণ; মোট জমি হিসেবে নেওয়া হয়নি', unclear: 'বর্তমান নথির সঙ্গে সম্পর্ক স্পষ্ট নয়; গ্রহণ করা হয়নি' };
const reliability = (score: number) => score >= 0.8 ? 'উচ্চ নির্ভরযোগ্যতা (স্বয়ংক্রিয়)' : score >= 0.6 ? 'মাঝারি নির্ভরযোগ্যতা — যাচাই করুন' : 'কম নির্ভরযোগ্যতা — যাচাই করুন';
const reliabilityColor = (score: number) => score >= 0.8 ? '#1f6b45' : score >= 0.6 ? '#8a5a00' : '#9b2c2c';
export type Extraction = { version: string; source: string; fields: Record<string, { value: string; status: string; candidates: Candidate[]; confidence?: number | null; agreement?: 'confirmed' | 'partial' | 'single'; passes?: number }> };
const labels: Record<string, string> = { mouza: 'মৌজা', jl_number: 'জে.এল. নম্বর', plot_number: 'দাগ নম্বর', khatian_number: 'খতিয়ান নম্বর', deed_number: 'দলিল নম্বর', mutation_number: 'নামজারি নম্বর', owner_name: 'মালিকের নাম', seller_name: 'বিক্রেতার নাম', buyer_name: 'ক্রেতার নাম', area: 'জমির পরিমাণ ও একক', survey_type: 'জরিপের ধরন' };

export function FieldReview({ extraction, values, savedAt, documentId, busy, onSave }: { extraction: Extraction; values?: Record<string, string>; savedAt: string | null; documentId: string; busy: boolean; onSave: (values: Record<string, string>) => void }) {
  const [confirmed, setConfirmed] = useState(false);
  return <details style={{ margin: '24px 0', padding: 18, border: '1px solid #ccd8d0', borderRadius: 12 }}>
    <summary style={{ fontWeight: 700 }}>উৎস দেখুন বা ভুল তথ্য সংশোধন করুন</summary>
    <p>উৎস: {extraction.source === 'reviewed_text' ? 'আপনার সংরক্ষিত সংশোধিত লেখা' : 'OCR লেখা'}। প্রস্তাবিত মান মূল নথির সঙ্গে মিলিয়ে নিন। অনুপস্থিত বা প্রযোজ্য নয় এমন ঘর খালি রাখুন।</p>
    <p>নির্ভরযোগ্যতা স্বয়ংক্রিয় পাঠের ভিত্তিতে হিসাব করা; এটি মাপা নির্ভুলতার শতাংশ নয়।</p>
    <form onSubmit={event => { event.preventDefault(); if (confirmed) onSave(Object.fromEntries(new FormData(event.currentTarget)) as Record<string, string>); }}>
      <fieldset disabled={busy} style={{ border: 0, padding: 0 }}>
        {Object.entries(extraction.fields).map(([key, field]) => <div key={key} style={{ margin: '16px 0' }}>
          <label htmlFor={`${documentId}-${key}`}>{labels[key] ?? key} · {field.status === 'conflict' ? 'একাধিক ভিন্ন মান — যাচাই প্রয়োজন' : field.status === 'uncertain' ? 'নির্ভরযোগ্যভাবে পড়া যায়নি' : field.status === 'missing' ? 'পাওয়া যায়নি' : 'প্রস্তাবিত'}
            {typeof field.confidence === 'number' && <span style={{ marginLeft: 8, fontSize: 13, fontWeight: 600, color: reliabilityColor(field.confidence) }}>{reliability(field.confidence)}</span>}
            {field.agreement === 'partial' && <span style={{ marginLeft: 8, fontSize: 13 }}>· স্বাধীন পাঠগুলোর মধ্যে সর্বসম্মত নয়</span>}
          </label>
          <input id={`${documentId}-${key}`} name={key} maxLength={500} defaultValue={values?.[key] ?? field.value} style={{ width: '100%' }} />
          {field.candidates.length > 0 && <details><summary>উৎসের লেখা দেখুন ({field.candidates.length})</summary>{field.candidates.map((c, i) => <p key={i}>{c.page === null ? 'সংশোধিত লেখা' : `পৃষ্ঠা ${c.page}`}{c.line !== null ? ` · লাইন ${c.line}` : ''}{c.engine ? ` · ${c.engine}` : ''}: <q>{c.source_text}</q>{c.scope && c.scope !== 'primary' ? ` — ${scopeNotes[c.scope]}` : c.grounded === false ? ' — পাঠ অনিশ্চিত বা উদ্ধৃত লেখায় মানটি মেলেনি; গ্রহণ করা হয়নি' : ''}{c.repair ? ` — «${c.repair.from}» থেকে লেবেল বা যতিচিহ্ন সরানো হয়েছে; মূল পাঠ দেখে যাচাই করুন` : c.evidence_match === 'format' ? ' — কেবল সংখ্যা বা এককের বিন্যাস মিলেছে' : ''}</p>)}</details>}
        </div>)}
        <label><input type="checkbox" required checked={confirmed} onChange={e => setConfirmed(e.target.checked)} /> আমি মূল নথির সঙ্গে মিলিয়ে এই তথ্য যাচাই করেছি।</label>
        <button className="primary" disabled={busy || !confirmed}>যাচাই করা তথ্য সংরক্ষণ</button>
      </fieldset>
      {savedAt && <p>এই নথির তথ্য আগে সংরক্ষিত হয়েছে। নতুন পরিবর্তন করলে আবার সংরক্ষণ করুন।</p>}
      <p>এটি ব্যবহারকারীর যাচাই; নথির সত্যতা বা ঝুঁকির সিদ্ধান্ত নয়। লেখা সংশোধন বা ফাইল প্রতিস্থাপন করলে এই যাচাই আবার করতে হবে।</p>
    </form>
  </details>;
}
