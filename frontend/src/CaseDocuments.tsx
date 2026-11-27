import React, { useEffect, useState } from 'react';
import {
  FileText,
  Upload,
  Download,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Landmark,
  Map,
  ShieldCheck,
  FileCheck,
  ArrowRight,
  Info,
} from 'lucide-react';
import { OcrReview } from './OcrReview';
import { formatDigit } from './i18n';

type Document = {
  id: string;
  document_type: string;
  content_type: string;
  page_count: number;
  warnings: string[];
};

type Readiness = {
  documents: Document[];
  ready: boolean;
  status: string;
};

const docMetadata = [
  {
    kind: 'deed',
    titleBn: 'সাব-রেজিস্ট্রি বিক্রয় দলিল',
    titleEn: 'Registered Sale Deed',
    officeBn: 'সাব-রেজিস্ট্রি অফিস (রেজিস্ট্রেশন অধিদপ্তর)',
    officeEn: 'Sub-Registry Office (Directorate of Registration)',
    icon: FileText,
    roleBn: 'মালিকানা হস্তান্তর ও আর্থিক লেনদেনের মূল আইনি প্রমাণ।',
    roleEn: 'Proof of title conveyance and monetary consideration.',
  },
  {
    kind: 'mutation',
    titleBn: 'নামজারি ও ডিসিআর খতিয়ান',
    titleEn: 'Mutation & DCR Record',
    officeBn: 'সহকারী কমিশনার (ভূমি) ও ইউনিয়ন ভূমি অফিস',
    officeEn: 'Assistant Commissioner (Land) & Union Land Office',
    icon: Landmark,
    roleBn: 'সরকারি রাজস্ব তালিকায় নাম অন্তর্ভুক্তি ও বর্তমান কর প্রদানের সনদ।',
    roleEn: 'Updated revenue ledger entry for land development tax.',
  },
  {
    kind: 'khatian',
    titleBn: 'রেকর্ড অব রাইটস (খতিয়ান / পরচা)',
    titleEn: 'Record of Rights (Khatian / RoR)',
    officeBn: 'ভূমি রেকর্ড ও জরিপ অধিদপ্তর (DLRS)',
    officeEn: 'Directorate of Land Records & Surveys',
    icon: Map,
    roleBn: 'সরকারি জরিপভিত্তিক দখল, শ্রেণি ও প্রজার মূল স্বত্বলিপি।',
    roleEn: 'Statutory survey confirming plot classification and tenancy.',
  },
] as const;

export function CaseDocuments({
  caseId,
  token,
  onExpired,
  lang = 'bn',
}: {
  caseId: string;
  token: string;
  onExpired: () => void;
  lang?: 'bn' | 'en';
}) {
  const [state, setState] = useState<Readiness | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState<string | null>(null);

  const t = (bn: string, en: string) => (lang === 'bn' ? bn : en);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/v1/cases/${caseId}/readiness`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    })
      .then(async (response) => {
        if (response.status === 401) {
          onExpired();
          return;
        }
        if (!response.ok)
          throw new Error(
            t(
              'নথির তালিকা সার্ভার থেকে আনা যায়নি। অনুগ্রহ করে কেসটি পুনরায় খুলুন।',
              'Failed to retrieve document inventory from server.'
            )
          );
        setState(await response.json());
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      });
    return () => controller.abort();
  }, [caseId, token, onExpired, lang]);

  async function perform(path: string, method: string, file?: File) {
    setBusy(true);
    setError('');
    try {
      if (file && (file.size === 0 || file.size > 10 * 1024 * 1024)) {
        throw new Error(
          t(
            'ফাইলের আকার শূন্য অথবা ১০ মেগাবাইটের বেশি হতে পারবে না।',
            'File size must not be empty and must be under 10 MB.'
          )
        );
      }
      const response = await fetch(`/api/v1/cases/${caseId}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          ...(file ? { 'Content-Type': 'application/octet-stream' } : {}),
        },
        body: file,
      });

      if (response.status === 401) {
        onExpired();
        return;
      }

      if (!response.ok) {
        throw new Error(
          response.status === 413
            ? t('ফাইলটি অনুমোদিত ১০ MB আকারের চেয়ে বড়।', 'File exceeds the allowed 10 MB limit.')
            : response.status === 422
            ? t(
                'অনুমোদিত ফরম্যাট: PDF, JPG অথবা PNG। PDF সর্বোচ্চ ১০ পৃষ্ঠা এবং পাসওয়ার্ডমুক্ত হতে হবে।',
                'Accepted formats: PDF, JPG, PNG (Max 10 pages for PDF, password-free).'
              )
            : t('অনুরোধটি সম্পন্ন করা যায়নি। পুনরায় চেষ্টা করুন।', 'Operation failed. Please try again.')
        );
      }

      if (method === 'GET') {
        const url = URL.createObjectURL(await response.blob());
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download =
          response.headers.get('Content-Disposition')?.match(/filename="([^"]+)"/)?.[1] ||
          `document-${caseId}`;
        anchor.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } else {
        const updated = await response.json();
        setState(updated);
        if (path === '/confirm-documents') {
          const started = await fetch(`/api/v1/cases/${caseId}/ocr`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
          });
          if (started.status === 401) {
            onExpired();
            return;
          }
          if (!started.ok)
            throw new Error(
              t(
                'নথি সফলভাবে সংরক্ষিত হয়েছে, তবে OCR বিশ্লেষণ শুরু করা যায়নি। নিচে পুনরায় চেষ্টা করুন।',
                'Documents saved, but OCR engine could not start automatically.'
              )
            );
          setState({ ...updated, status: (await started.json()).status });
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t('সার্ভার সংযোগ ব্যর্থ হয়েছে।', 'Network connection failed.'));
    } finally {
      setBusy(false);
    }
  }

  const uploadedCount = state?.documents.length ?? 0;
  const isReady = state?.ready ?? false;
  const isConfirmed = state && state.status !== 'draft';

  return (
    <div className="animate-fade-in" style={{ padding: '8px 0 32px' }}>
      {/* Visual Stepper / Progress Header */}
      <div className="readiness-summary-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div className="stat-icon-wrapper green">
            <ShieldCheck size={28} />
          </div>
          <div>
            <div className="page-eyebrow" style={{ marginBottom: 4 }}>
              {t('নথি সংরক্ষণাগার ও প্রস্তুতি', 'DOCUMENT VAULT & READINESS')}
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--neutral-950)' }}>
              {t('প্রয়োজনীয় ৩টি নথির মধ্যে', 'Required Documents:')}{' '}
              <span style={{ color: 'var(--primary-700)' }}>
                {formatDigit(uploadedCount, lang)}/৩
              </span>{' '}
              {t('সংরক্ষিত', 'Uploaded')}
            </h3>
            <p style={{ fontSize: 12, color: 'var(--neutral-500)', marginTop: 2 }}>
              {t(
                'জমির পূর্ণ স্বত্ব বিশ্লেষণের জন্য সাব-রেজিস্ট্রি দলিল, নামজারি ও খতিয়ান—তিনটি নথিই আবশ্যক।',
                'Conclusive cross-verification requires all three statutory records.'
              )}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          {isConfirmed ? (
            <span className="status-pill success" style={{ padding: '8px 16px', fontSize: 13 }}>
              <CheckCircle2 size={16} />
              {t('নথি জমাদান সম্পন্ন ও যাচাই সক্রিয়', 'Documents Confirmed & Active')}
            </span>
          ) : (
            <button
              type="button"
              className="btn btn-primary btn-lg"
              disabled={busy || !isReady}
              onClick={() => void perform('/confirm-documents', 'POST')}
            >
              {busy ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  {t('প্রক্রিয়া চলছে…', 'Processing…')}
                </>
              ) : (
                <>
                  {t('নথি নিশ্চিত করুন ও OCR শুরু করুন', 'Confirm Documents & Start OCR')}
                  <ArrowRight size={17} />
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="banner-notice danger" role="alert">
          <AlertTriangle size={18} />
          <div>
            <strong>{t('ত্রুটি:', 'Error:')}</strong> {error}
          </div>
        </div>
      )}

      {/* Tri-Document Upload Grid */}
      <div className="tri-card-grid">
        {docMetadata.map(({ kind, titleBn, titleEn, officeBn, officeEn, icon: Icon, roleBn, roleEn }) => {
          const stored = state?.documents.find((d) => d.document_type === kind);
          const hasLowRes = stored?.warnings?.includes('low_resolution');
          const isDragOver = dragActive === kind;

          return (
            <div key={kind} className={`tri-card ${stored ? 'completed' : ''}`}>
              <div className="tri-card-header">
                <div className="tri-card-icon">
                  <Icon size={22} />
                </div>
                {stored ? (
                  <span className="status-pill success">
                    <CheckCircle2 size={13} />
                    {t('সংরক্ষিত', 'Saved')} ({formatDigit(stored.page_count, lang)} {t('পৃষ্ঠা', 'pages')})
                  </span>
                ) : (
                  <span className="status-pill warning">
                    <AlertTriangle size={13} />
                    {t('অপেক্ষমাণ', 'Pending')}
                  </span>
                )}
              </div>

              <h3>{lang === 'bn' ? titleBn : titleEn}</h3>
              <div className="tri-card-office">{lang === 'bn' ? officeBn : officeEn}</div>
              <div className="tri-card-role">{lang === 'bn' ? roleBn : roleEn}</div>

              {/* Upload Dropzone */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const file = (new FormData(e.currentTarget).get('file') as File) || undefined;
                  if (file instanceof File) {
                    void perform(`/documents/${kind}`, 'POST', file).then(() => e.currentTarget.reset());
                  }
                }}
              >
                <label
                  className={`dropzone-box ${isDragOver ? 'drag-active' : ''}`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragActive(kind);
                  }}
                  onDragLeave={() => setDragActive(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragActive(null);
                    const file = e.dataTransfer.files[0];
                    if (file) void perform(`/documents/${kind}`, 'POST', file);
                  }}
                >
                  <div className="dropzone-icon">
                    <Upload size={20} />
                  </div>
                  <div className="dropzone-title">
                    {stored
                      ? t('নথি প্রতিস্থাপন করতে ফাইল নির্বাচন করুন', 'Replace this document')
                      : t('ফাইল ড্রপ করুন অথবা ব্রাউজ করুন', 'Drop file here or click to browse')}
                  </div>
                  <div className="dropzone-subtitle">PDF, JPG, PNG (Max 10 MB, ≤ 10 pages)</div>
                  <input
                    type="file"
                    name="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    disabled={busy || !state}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void perform(`/documents/${kind}`, 'POST', file);
                    }}
                  />
                </label>
              </form>

              {stored && (
                <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ flex: 1 }}
                    disabled={busy}
                    onClick={() => void perform(`/documents/${stored.id}/download`, 'GET')}
                  >
                    <Download size={14} />
                    {t('ডাউনলোড', 'Download')}
                  </button>
                </div>
              )}

              {hasLowRes && (
                <div
                  className="banner-notice warning"
                  style={{ marginTop: 12, padding: '8px 12px', fontSize: 11 }}
                >
                  <AlertTriangle size={14} />
                  {t(
                    'ছবির রেজোলিউশন কম। OCR পাঠে ভুলের ঝুঁকি কমাতে পরিষ্কার স্ক্যান দিন।',
                    'Low scan resolution detected. High-res scan recommended for OCR.'
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Live OCR & Due Diligence Review Trigger */}
      {state?.ready && (
        <div style={{ marginTop: 32 }}>
          <OcrReview key={JSON.stringify(state)} caseId={caseId} token={token} onExpired={onExpired} lang={lang} />
        </div>
      )}
    </div>
  );
}
