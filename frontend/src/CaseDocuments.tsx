import { useEffect, useState } from 'react';
import { OcrReview } from './OcrReview';

type Document = { id: string; document_type: string; content_type: string; page_count: number; warnings: string[] };
type Readiness = { documents: Document[]; ready: boolean; status: string };
const kinds = [['deed', 'দলিল'], ['mutation', 'নামজারি'], ['khatian', 'খতিয়ান']] as const;

export function CaseDocuments({ caseId, token, onExpired }: { caseId: string; token: string; onExpired: () => void }) {
  const [state, setState] = useState<Readiness | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/v1/cases/${caseId}/readiness`, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal })
      .then(async response => {
        if (response.status === 401) { onExpired(); return; }
        if (!response.ok) throw new Error('নথির তালিকা আনা যায়নি। কেসটি আবার খুলুন।');
        setState(await response.json());
      }).catch(e => { if (!controller.signal.aborted) setError(e.message); });
    return () => controller.abort();
  }, [caseId, token, onExpired]);

  async function perform(path: string, method: string, file?: File) {
    setBusy(true); setError('');
    try {
      if (file && (file.size === 0 || file.size > 10 * 1024 * 1024)) throw new Error('খালি ফাইল নয়; সর্বোচ্চ ১০ MB ফাইল দিন।');
      const response = await fetch(`/api/v1/cases/${caseId}${path}`, {
        method, headers: { Authorization: `Bearer ${token}`, ...(file ? { 'Content-Type': 'application/octet-stream' } : {}) }, body: file,
      });
      if (response.status === 401) { onExpired(); return; }
      if (!response.ok) throw new Error(response.status === 413 ? 'ফাইলটি ১০ MB-এর বেশি।' : response.status === 422 ? 'সঠিক PDF, JPG বা PNG দিন। PDF সর্বোচ্চ ১০ পৃষ্ঠা; পাসওয়ার্ড বা সক্রিয় উপাদান থাকা চলবে না।' : 'অনুরোধ সম্পন্ন হয়নি। আবার চেষ্টা করুন।');
      if (method === 'GET') {
        const url = URL.createObjectURL(await response.blob());
        const anchor = document.createElement('a'); anchor.href = url;
        anchor.download = response.headers.get('Content-Disposition')?.match(/filename="([^"]+)"/)?.[1] || 'document';
        anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      } else {
        const updated = await response.json();
        setState(updated);
        if (path === '/confirm-documents') {
          const started = await fetch(`/api/v1/cases/${caseId}/ocr`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
          if (started.status === 401) { onExpired(); return; }
          if (!started.ok) throw new Error('নথি সংরক্ষিত হয়েছে, কিন্তু প্রক্রিয়া শুরু হয়নি। নিচে আবার চেষ্টা করুন।');
          setState({ ...updated, status: (await started.json()).status });
        }
      }
    } catch (e) { setError(e instanceof Error ? e.message : 'সংযোগ ব্যর্থ হয়েছে।'); }
    finally { setBusy(false); }
  }

  return <section aria-label="কেসের নথি" aria-busy={busy} style={{ padding: '16px 0' }}>
    <h3>তিনটি প্রয়োজনীয় নথি · {state?.documents.length ?? 0}/৩</h3>
    <p>প্রতিটি ঘরে একটি PDF, JPG বা PNG দিন। সর্বোচ্চ ১০ MB; PDF সর্বোচ্চ ১০ পৃষ্ঠা।</p>
    <p>ফাইলের ধরন যাচাই করা হবে। নথির সত্যতা বা জমির ঝুঁকি এখনো বিশ্লেষণ করা হচ্ছে না।</p>
    {error && <p role="alert">{error}</p>}
    {kinds.map(([kind, label]) => {
      const stored = state?.documents.find(d => d.document_type === kind);
      return <form key={kind} style={{ borderTop: '1px solid #ddd', padding: '16px 0' }} onSubmit={e => {
        e.preventDefault(); const form = e.currentTarget; const file = new FormData(form).get('file');
        if (file instanceof File) void perform(`/documents/${kind}`, 'POST', file).then(() => form.reset());
      }}>
        <label htmlFor={`${caseId}-${kind}`}><strong>{label}</strong> — {stored ? `সংরক্ষিত (${stored.page_count} পৃষ্ঠা)` : 'বাকি আছে'}</label>
        <input id={`${caseId}-${kind}`} name="file" type="file" accept=".pdf,.jpg,.jpeg,.png" required disabled={busy || !state} />
        <button className="primary" disabled={busy || !state}>{stored ? 'নতুন ফাইল দিয়ে প্রতিস্থাপন' : 'আপলোড করুন'}</button>
        {stored && <button type="button" className="language" disabled={busy} onClick={() => void perform(`/documents/${stored.id}/download`, 'GET')}>ডাউনলোড</button>}
        {stored?.warnings.includes('low_resolution') && <p>ছবির রেজোলিউশন কম। পরিষ্কার ও বড় ছবি দিন।</p>}
      </form>;
    })}
    <button className="primary" disabled={busy || !state?.ready || state.status !== 'draft'} onClick={() => void perform('/confirm-documents', 'POST')}>
      {state && state.status !== 'draft' ? 'তিনটি নথি জমা সম্পন্ন' : 'নথি জমা দিয়ে প্রক্রিয়া শুরু করুন'}
    </button>
    <p role="status">{busy ? 'অনুগ্রহ করে অপেক্ষা করুন…' : state?.status === 'documents_ready' ? 'নথি সংরক্ষিত। নিচে OCR শুরু করুন।' : 'তিনটি নথি আপলোড করার পর নিশ্চিত করুন।'}</p>
    {state?.ready && <OcrReview key={JSON.stringify(state)} caseId={caseId} token={token} onExpired={onExpired} />}
  </section>;
}
