import { useEffect, useState } from 'react';
import { FieldReview, type Extraction } from './FieldReview';
import { CaseComparison, type Comparison } from './CaseComparison';

type Page = { page: number; text: string; confidence: number | null; warning: string | null; warnings?: string[]; text_kind?: string; readings?: {engine: string; text: string}[] };
type OcrDocument = { id: string; document_type: string; pages: Page[]; reviewed_text: string | null; reviewed_at: string | null; extraction: Extraction; field_review: { values: Record<string,string> } | null; field_reviewed_at: string | null };
type Result = { status: string; documents: OcrDocument[]; comparison: Comparison; reader?: {engine: string; configured: boolean}; progress?: { error?: string; completed_pages?: number; total_pages?: number; document_type?: string; page?: number; engine: string } | null };
const names: Record<string, string> = { deed: 'দলিল', mutation: 'নামজারি', khatian: 'খতিয়ান' };
const stages: Record<string, string> = { tesseract: 'ছাপা লেখা পড়া হচ্ছে', gemini: 'Gemini নথি থেকে তথ্য শনাক্ত করছে', complete: 'সম্পন্ন' };

const readerErrors: Record<string,string> = { gemini_not_configured: 'Gemini API key যোগ করা হয়নি।', gemini_key_rejected: 'Gemini API key গ্রহণ করা হয়নি। key ও API অনুমতি যাচাই করুন।', gemini_rate_limited: 'Gemini ব্যবহারের সীমা পৌঁছেছে। quota বা billing যাচাই করে পরে চেষ্টা করুন।', gemini_model_unavailable: 'নির্বাচিত Gemini মডেল পাওয়া যায়নি।', gemini_timeout: 'Gemini নির্ধারিত সময়ে উত্তর দেয়নি। আবার চেষ্টা করুন।', gemini_invalid_output: 'Gemini-এর ফল সম্পূর্ণভাবে পড়া যায়নি। আবার চেষ্টা করুন।', gemini_incomplete_output: 'Gemini অসম্পূর্ণ ফল দিয়েছে। আবার চেষ্টা করুন।' };

export function OcrReview({ caseId, token, onExpired }: { caseId: string; token: string; onExpired: () => void }) {
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [version, setVersion] = useState(0);
  const [comparisonStale, setComparisonStale] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    async function load() {
      try {
        const response = await fetch(`/api/v1/cases/${caseId}/ocr`, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal });
        if (response.status === 401) { onExpired(); return; }
        if (!response.ok) throw new Error('OCR-এর অবস্থা আনা যায়নি। আবার চেষ্টা করুন।');
        const data: Result = await response.json();
        if (controller.signal.aborted) return;
        setResult(data);
        setComparisonStale(false);
        if (['queued', 'processing'].includes(data.status)) timer = setTimeout(() => void load(), 3000);
      } catch (e) { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : 'সংযোগ ব্যর্থ'); }
    }
    void load();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [caseId, token, onExpired, version]);

  async function submit(path: string, body?: unknown) {
    setBusy(true); setError(''); setComparisonStale(true);
    try {
      const response = await fetch(`/api/v1/cases/${caseId}/ocr${path}`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
      if (response.status === 401) { onExpired(); return; }
      if (response.status === 503) { const detail = await response.json(); throw new Error(readerErrors[detail.detail] ?? 'পাঠ সেবা এখন পাওয়া যাচ্ছে না। আবার চেষ্টা করুন।'); }
      if (!response.ok) throw new Error(response.status === 409 ? 'উৎস বা সংরক্ষিত তথ্য বদলেছে। অবস্থা দেখুন চাপুন, তারপর তথ্য মিলিয়ে আবার সংরক্ষণ করুন।' : 'অনুরোধ সম্পন্ন হয়নি। নথির অবস্থা যাচাই করে আবার চেষ্টা করুন।');
      setVersion(v => v + 1);
    } catch (e) { setError(e instanceof Error ? e.message : 'সংযোগ ব্যর্থ'); }
    finally { setBusy(false); }
  }
  return <section className="ocr-review" aria-busy={busy}>
    <h3>নথি থেকে পাওয়া তথ্য</h3>
    <p>নথি পড়ার জন্য Google Gemini API-তে পাঠানো হবে। পাওয়া তথ্য ভুল হতে পারে। মূল নথির সঙ্গে মিলিয়ে দেখুন। এটি নথির সত্যতা বা আইনি ঝুঁকির মূল্যায়ন নয়।</p>
    {result?.reader?.configured === false && <p role="alert">Gemini API key এখনো যোগ করা হয়নি। সার্ভারের key ফাইলে key যোগ করে আবার চেষ্টা করুন।</p>}
    {result?.progress?.error && <p role="alert">{readerErrors[result.progress.error] ?? 'নথি পড়া সম্পন্ন হয়নি। আবার চেষ্টা করুন।'}</p>}
    {error && <p role="alert">{error}</p>}
    <button className="language" disabled={busy} onClick={() => { setError(''); setVersion(v => v + 1); }}>অবস্থা দেখুন</button>
    {result && ['documents_ready', 'failed', 'needs_verification'].includes(result.status) && <button className="primary" disabled={busy || result.reader?.configured === false} onClick={() => { if (result.status !== 'needs_verification' || window.confirm('আবার প্রক্রিয়া করলে আগের লেখা ও তথ্যের সংশোধন মুছে যাবে। চালিয়ে যাবেন?')) void submit(''); }}>
      {result.status === 'documents_ready' ? 'প্রক্রিয়া শুরু করুন' : result.status === 'needs_verification' ? 'নতুন করে নথি পড়ুন' : result.status === 'failed' ? 'আবার চেষ্টা করুন' : 'প্রক্রিয়ার অবস্থা দেখুন'}
    </button>}
    <p role="status">{result?.status === 'queued' ? 'প্রক্রিয়ার জন্য অপেক্ষা করছে…' : result?.status === 'processing' ? 'Gemini দিয়ে নথি পড়া হচ্ছে। নথির আকার ও সংযোগ অনুযায়ী সময় লাগবে।' : result?.status === 'failed' ? 'প্রক্রিয়া সম্পন্ন হয়নি। আবার চেষ্টা করুন।' : result?.status === 'needs_verification' ? 'নথি পড়া সম্পন্ন। পাওয়া তথ্য নিচে দেখানো হয়েছে; সংশোধন প্রয়োজন হলে উৎস খুলুন।' : 'তিনটি নথি জমা দেওয়ার পর প্রক্রিয়া শুরু হবে।'}</p>
    {result?.progress?.total_pages && <div aria-live="polite"><progress aria-label="নথি পড়ার অগ্রগতি" value={result.progress.completed_pages} max={result.progress.total_pages} /><p>{result.progress.completed_pages}/{result.progress.total_pages} পৃষ্ঠা সম্পন্ন · {result.progress.document_type ? `${names[result.progress.document_type]} · পৃষ্ঠা ${result.progress.page} · ` : ''}{stages[result.progress.engine] ?? result.progress.engine}</p></div>}
    {comparisonStale ? <p role="status">তুলনার তথ্য হালনাগাদ প্রয়োজন। সংরক্ষণ শেষে স্বয়ংক্রিয়ভাবে আসবে; না এলে অবস্থা দেখুন চাপুন।</p> : result && <CaseComparison data={result.comparison} />}
    {result?.documents.map(doc => <article key={doc.id}>
      <h4>{names[doc.document_type]}</h4>
      {doc.pages.some(page => page.warnings?.includes('tesseract_fallback')) && <p role="alert">Gemini দিয়ে পড়া যায়নি; বিকল্প Tesseract দিয়ে ছাপা লেখা পড়া হয়েছে। হাতের লেখার ফল অসম্পূর্ণ হতে পারে।</p>}{doc.pages.some(page => page.warnings?.includes('independent_pass_failed')) && <p role="status">একটি স্বাধীন পাঠ সম্পন্ন হয়নি; ফলাফল এক পাঠের ভিত্তিতে তৈরি, তাই নির্ভরযোগ্যতা কম দেখানো হয়েছে। মূল নথির সঙ্গে মিলিয়ে দেখুন।</p>}
      {doc.pages.map(page => <details key={page.page}><summary>পৃষ্ঠা {page.page} · {page.text_kind === 'field_excerpts' ? 'তথ্যের উৎস অংশ (পূর্ণ প্রতিলিপি নয়)' : 'উৎসের লেখা'}</summary><pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{page.text || 'পাঠযোগ্য লেখা পাওয়া যায়নি।'}</pre>{page.readings?.map(reading => <details key={reading.engine}><summary>{reading.engine}</summary><pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{reading.text || 'লেখা পাওয়া যায়নি'}</pre></details>)}</details>)}
      <details><summary>প্রয়োজনে OCR-এর লেখা সংশোধন করুন</summary><form key={doc.reviewed_at ?? 'unreviewed'} onSubmit={e => { e.preventDefault(); const text = String(new FormData(e.currentTarget).get('text')); void submit(`/${doc.id}/review`, { text }); }}>
        <label htmlFor={`review-${doc.id}`}>মূল নথির সঙ্গে মিলিয়ে সংশোধিত লেখা</label>
        <textarea id={`review-${doc.id}`} name="text" rows={10} required maxLength={100000} defaultValue={doc.reviewed_text ?? doc.pages.map(p => p.text).join('\n\n')} style={{ width: '100%', padding: 12, font: 'inherit' }} />
        <button className="primary" disabled={busy}>যাচাই করা লেখা সংরক্ষণ</button>
        {doc.reviewed_at && <p role="status">আপনার সংশোধন সংরক্ষিত হয়েছে।</p>}
      </form></details>
      <FieldReview key={`${doc.extraction.version}-${doc.field_reviewed_at}`} extraction={doc.extraction} values={doc.field_review?.values} savedAt={doc.field_reviewed_at} documentId={doc.id} busy={busy || result.status !== 'needs_verification'} onSave={values => void submit(`/${doc.id}/fields`, { source_version: doc.extraction.version, previous_reviewed_at: doc.field_reviewed_at, values })} />
    </article>)}
  </section>;
}
