import React, { useEffect, useState } from 'react';
import {
  Sparkles,
  RefreshCw,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Layers,
  Edit3,
  Eye,
  Check,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { FieldReview, type Extraction } from './FieldReview';
import { CaseComparison, type Comparison } from './CaseComparison';
import { formatDigit } from './i18n';

type Page = {
  page: number;
  text: string;
  confidence: number | null;
  warning: string | null;
  warnings?: string[];
  text_kind?: string;
  readings?: { engine: string; text: string }[];
};

type OcrDocument = {
  id: string;
  document_type: string;
  pages: Page[];
  reviewed_text: string | null;
  reviewed_at: string | null;
  extraction: Extraction;
  field_review: { values: Record<string, string> } | null;
  field_reviewed_at: string | null;
};

type Result = {
  status: string;
  documents: OcrDocument[];
  comparison: Comparison;
  reader?: { engine: string; configured: boolean };
  progress?: {
    error?: string;
    completed_pages?: number;
    total_pages?: number;
    document_type?: string;
    page?: number;
    engine: string;
  } | null;
};

const docNames: Record<string, { bn: string; en: string }> = {
  deed: { bn: 'সাব-রেজিস্ট্রি বিক্রয় দলিল', en: 'Sale Deed' },
  mutation: { bn: 'নামজারি ও ডিসিআর', en: 'Mutation' },
  khatian: { bn: 'রেকর্ড অব রাইটস (খতিয়ান)', en: 'RoR Khatian' },
};

const engineLabels: Record<string, { bn: string; en: string }> = {
  gemini: { bn: 'Google Gemini মাল্টিমোডাল ভিশন', en: 'Google Gemini Multimodal Vision' },
  tesseract: { bn: 'Tesseract OCR বেসলাইন ইঞ্জিন', en: 'Tesseract OCR Baseline' },
  complete: { bn: 'সম্পন্ন', en: 'Complete' },
};

const readerErrors: Record<string, { bn: string; en: string }> = {
  gemini_not_configured: {
    bn: 'Gemini API কী কনফিগার করা হয়নি। সার্ভারে API Key যোগ করে পুনরায় চেষ্টা করুন।',
    en: 'Gemini API key is not configured on the server.',
  },
  gemini_key_rejected: {
    bn: 'Gemini API কী সার্ভার দ্বারা প্রত্যাখ্যাত হয়েছে। API অনুমতি ও কোটা যাচাই করুন।',
    en: 'Gemini API key was rejected. Verify API credentials & quota.',
  },
  gemini_rate_limited: {
    bn: 'Gemini ব্যবহারের সর্বোচ্চ সীমা অতিক্রান্ত হয়েছে। কিছুক্ষণ পর পুনরায় চেষ্টা করুন।',
    en: 'Gemini rate limit exceeded. Please try again in a few moments.',
  },
  gemini_model_unavailable: {
    bn: 'নির্বাচিত Gemini মডেলটি সাময়িকভাবে অনুপলব্ধ।',
    en: 'The requested Gemini model is currently unavailable.',
  },
  gemini_timeout: {
    bn: 'নির্ধারিত সময়ে Gemini সেবা সাড়া দেয়নি। পুনরায় চেষ্টা করুন।',
    en: 'Gemini request timed out. Please try again.',
  },
  gemini_invalid_output: {
    bn: 'Gemini-এর ফলাফল পার্স করা যায়নি। পুনরায় চেষ্টা করুন।',
    en: 'Gemini returned unparseable output. Please retry.',
  },
  gemini_incomplete_output: {
    bn: 'Gemini অসম্পূর্ণ ফলাফল প্রদান করেছে। পুনরায় চেষ্টা করুন।',
    en: 'Gemini returned incomplete output. Please retry.',
  },
};

export function OcrReview({
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
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [version, setVersion] = useState(0);
  const [comparisonStale, setComparisonStale] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('deed');

  const t = (bn: string, en: string) => (lang === 'bn' ? bn : en);

  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;

    async function load() {
      try {
        const response = await fetch(`/api/v1/cases/${caseId}/ocr`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        if (response.status === 401) {
          onExpired();
          return;
        }
        if (!response.ok)
          throw new Error(
            t('OCR-এর সর্বশেষ অবস্থা সার্ভার থেকে আনা যায়নি।', 'Failed to retrieve OCR status from server.')
          );
        const data: Result = await response.json();
        if (controller.signal.aborted) return;
        setResult(data);
        setComparisonStale(false);
        if (['queued', 'processing'].includes(data.status)) {
          timer = setTimeout(() => void load(), 3000);
        }
      } catch (e) {
        if (!controller.signal.aborted) setError(e instanceof Error ? e.message : 'Connection failed');
      }
    }

    void load();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [caseId, token, onExpired, version, lang]);

  async function submit(path: string, body?: unknown) {
    setBusy(true);
    setError('');
    setComparisonStale(true);
    try {
      const response = await fetch(`/api/v1/cases/${caseId}/ocr${path}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (response.status === 401) {
        onExpired();
        return;
      }

      if (response.status === 503) {
        const detail = await response.json();
        const errObj = readerErrors[detail.detail];
        throw new Error(
          errObj
            ? lang === 'bn'
              ? errObj.bn
              : errObj.en
            : t('নথি পাঠ সেবা সাময়িকভাবে পাওয়া যাচ্ছে না।', 'Extraction service temporarily unavailable.')
        );
      }

      if (!response.ok) {
        throw new Error(
          response.status === 409
            ? t(
                'উৎস বা সংরক্ষিত তথ্যের সংস্করণ বদলেছে। "অবস্থা হালনাগাদ" করুন এবং পুনরায় সংরক্ষণ করুন।',
                'Version conflict detected. Refresh and re-save corrections.'
              )
            : t('অনুরোধ সম্পন্ন করা যায়নি।', 'Operation could not be completed.')
        );
      }

      setVersion((v) => v + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Operation failed');
    } finally {
      setBusy(false);
    }
  }

  const isProcessing = result?.status === 'processing' || result?.status === 'queued';
  const progressPercent =
    result?.progress?.total_pages && result.progress.completed_pages
      ? Math.round((result.progress.completed_pages / result.progress.total_pages) * 100)
      : isProcessing
      ? 45
      : 0;

  const currentDoc = result?.documents.find((d) => d.document_type === activeTab);

  return (
    <div className="panel-card animate-fade-in" style={{ padding: 32 }}>
      {/* Studio Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, marginBottom: 24, flexWrap: 'wrap' }}>
        <div>
          <div className="page-eyebrow">
            <Sparkles size={14} />
            {t('AI ভিশন ও OCR বিশ্লেষণ স্টুডিও', 'AI VISION & OCR DUE DILIGENCE STUDIO')}
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--neutral-950)' }}>
            {t('নথি থেকে স্বয়ংক্রিয় তথ্য আহরণ ও সমতা পরীক্ষা', 'Automated Extraction & Tri-Document Due Diligence')}
          </h2>
          <p style={{ fontSize: 13, color: 'var(--neutral-600)', marginTop: 4, maxWidth: 680 }}>
            {t(
              'বাংলাদেশের সাব-রেজিস্ট্রি দলিল, নামজারি এবং রেকর্ড অব রাইটস (খতিয়ান) থেকে দাগ, মৌজা, খতিয়ান ও মালিকানার তথ্য স্বয়ংক্রিয়ভাবে আলাদা করে বিশ্লেষণ করা হয়েছে।',
              'Fields are extracted across deeds, mutations, and Khatians using multi-pass multimodal AI vision.'
            )}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={busy || isProcessing}
            onClick={() => {
              setError('');
              setVersion((v) => v + 1);
            }}
          >
            <RefreshCw size={14} className={busy ? 'animate-spin' : ''} />
            {t('অবস্থা হালনাগাদ', 'Refresh Status')}
          </button>

          {result && ['documents_ready', 'failed', 'needs_verification'].includes(result.status) && (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={busy || isProcessing || result.reader?.configured === false}
              onClick={() => {
                if (
                  result.status !== 'needs_verification' ||
                  window.confirm(
                    t(
                      'পুনরায় OCR প্রক্রিয়া করলে পূর্বে সংরক্ষিত সংশোধন প্রতিস্থাপিত হতে পারে। আপনি কি নিশ্চিত?',
                      'Re-running extraction will reset unsaved field edits. Continue?'
                    )
                  )
                ) {
                  void submit('');
                }
              }}
            >
              <Sparkles size={14} />
              {result.status === 'documents_ready'
                ? t('OCR প্রক্রিয়া শুরু করুন', 'Start Extraction Pipeline')
                : result.status === 'needs_verification'
                ? t('নতুন করে নথি পড়ুন', 'Re-Run AI Extraction')
                : t('পুনরায় চেষ্টা করুন', 'Retry Extraction')}
            </button>
          )}
        </div>
      </div>

      {/* API Configuration & Error Alerts */}
      {result?.reader?.configured === false && (
        <div className="banner-notice warning" role="alert">
          <AlertTriangle size={18} />
          <div>
            <strong>{t('Gemini API কী কনফিগার করা হয়নি:', 'Gemini API Key Required:')}</strong>{' '}
            {t(
              'উচ্চমাত্রার হাতের লেখা ও বাংলা পাঠের জন্য সার্ভারের কী ফাইলে Gemini API কী যোগ করুন।',
              'For deep handwritten Bengali recognition, provide a GEMINI_API_KEY in the server configuration.'
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="banner-notice danger" role="alert">
          <AlertCircle size={18} />
          <div>
            <strong>{t('নোটিশ:', 'Notice:')}</strong> {error}
          </div>
        </div>
      )}

      {/* Progress Bar & Status Pill */}
      {isProcessing && (
        <div
          style={{
            background: 'var(--neutral-100)',
            border: '1px solid var(--neutral-200)',
            borderRadius: 'var(--radius-lg)',
            padding: 20,
            marginBottom: 28,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary-800)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <div className="pilot-pulse" />
              {result?.status === 'queued'
                ? t('সার্ভার সারিতে অপেক্ষমাণ…', 'Queued in processing pipeline…')
                : t('Gemini AI ও ভিশন ইঞ্জিন দিয়ে নথি পাঠ ও তথ্য শনাক্তকরণ চলছে…', 'Extracting fields with multimodal AI vision…')}
            </span>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--neutral-700)' }}>
              {formatDigit(progressPercent, lang)}%
            </span>
          </div>

          <div style={{ height: 8, background: 'var(--neutral-200)', borderRadius: 4, overflow: 'hidden' }}>
            <div
              style={{
                width: `${progressPercent}%`,
                height: '100%',
                background: 'linear-gradient(90deg, var(--primary-600), var(--primary-400))',
                transition: 'width 0.4s ease',
              }}
            />
          </div>

          {result?.progress?.total_pages && (
            <p style={{ fontSize: 12, color: 'var(--neutral-600)', marginTop: 8 }}>
              {formatDigit(result.progress.completed_pages ?? 0, lang)}/
              {formatDigit(result.progress.total_pages, lang)} {t('পৃষ্ঠা সম্পন্ন', 'pages completed')}
              {result.progress.document_type && (
                <> · {lang === 'bn' ? docNames[result.progress.document_type]?.bn : docNames[result.progress.document_type]?.en}</>
              )}
            </p>
          )}
        </div>
      )}

      {/* Title Due Diligence Matrix (Comparison Table) */}
      {comparisonStale ? (
        <div className="banner-notice warning">
          <RefreshCw size={16} className="animate-spin" />
          {t(
            'তুলনার ফলাফল হালনাগাদ করা প্রয়োজন। স্বয়ংক্রিয়ভাবে রিফ্রেশ না হলে "অবস্থা হালনাগাদ" বোতামে চাপুন।',
            'Cross-comparison state is updating. Click Refresh Status if delayed.'
          )}
        </div>
      ) : (
        result?.comparison && (
          <div style={{ marginBottom: 32 }}>
            <CaseComparison data={result.comparison} lang={lang} />
          </div>
        )
      )}

      {/* Document Inspector & Field Verification Section */}
      {result && result.documents.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--neutral-950)' }}>
              {t('নথিভিত্তিক বিস্তারিত পাঠ ও তথ্য সংশোধন', 'Individual Document Extraction & Field Audit')}
            </h3>
            <span style={{ fontSize: 12, color: 'var(--neutral-500)' }}>
              {t('যে-কোনো নথির ট্যাবে ক্লিক করে তথ্য দেখুন ও প্রয়োজনে সম্পাদনা করুন', 'Select a tab to inspect & correct fields')}
            </span>
          </div>

          {/* Document Tabs */}
          <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid var(--neutral-200)', paddingBottom: 8, marginBottom: 20 }}>
            {['deed', 'mutation', 'khatian'].map((kind) => {
              const doc = result.documents.find((d) => d.document_type === kind);
              const isActive = activeTab === kind;
              const hasCorrection = !!doc?.reviewed_at || !!doc?.field_reviewed_at;
              return (
                <button
                  key={kind}
                  type="button"
                  onClick={() => setActiveTab(kind)}
                  className={`btn ${isActive ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                  style={{ borderRadius: 'var(--radius-full)', padding: '8px 18px' }}
                >
                  <FileText size={14} />
                  {lang === 'bn' ? docNames[kind]?.bn : docNames[kind]?.en}
                  {hasCorrection && (
                    <span
                      style={{
                        background: 'var(--gold-400)',
                        color: 'var(--primary-950)',
                        fontSize: 10,
                        padding: '1px 6px',
                        borderRadius: 10,
                        fontWeight: 800,
                      }}
                    >
                      {t('সংশোধিত', 'Edited')}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Active Document Details */}
          {currentDoc && (
            <div className="animate-fade-in">
              {/* Warnings for Active Doc */}
              {currentDoc.pages.some((page) => page.warnings?.includes('tesseract_fallback')) && (
                <div className="banner-notice warning">
                  <AlertTriangle size={16} />
                  {t(
                    'Gemini উপলব্ধ না থাকায় বিকল্প Tesseract ইঞ্জিন দিয়ে ছাপা লেখা পড়া হয়েছে। হস্তলিখিত তথ্যের ক্ষেত্রে মূল নথির সাথে মিলিয়ে নিন।',
                    'Fell back to Tesseract OCR engine for printed text. Please verify handwritten sections against original.'
                  )}
                </div>
              )}

              {/* Text Inspector (Extracted Text from Pages) */}
              <div className="ocr-inspector-card">
                <div className="ocr-inspector-header">
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--neutral-900)' }}>
                    {t('নথি থেকে পঠিত মূল পাঠ্য (Raw Extracted Text)', 'Extracted OCR Transcript')}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--neutral-500)' }}>
                    {formatDigit(currentDoc.pages.length, lang)} {t('পৃষ্ঠা', 'pages')}
                  </span>
                </div>

                <div className="ocr-raw-text">
                  {currentDoc.pages.map((p) => (
                    <div key={p.page} style={{ marginBottom: 14 }}>
                      <div style={{ color: 'var(--primary-700)', fontWeight: 700, marginBottom: 4 }}>
                        --- {t('পৃষ্ঠা', 'Page')} {formatDigit(p.page, lang)} ---
                      </div>
                      {p.text || t('(কোনো পাঠযোগ্য লেখা পাওয়া যায়নি)', '(No readable text extracted)')}
                    </div>
                  ))}
                </div>
              </div>

              {/* Human OCR Text Correction Drawer */}
              <details
                style={{
                  background: 'var(--white)',
                  border: '1px solid var(--neutral-200)',
                  borderRadius: 'var(--radius-lg)',
                  padding: 16,
                  marginBottom: 20,
                }}
              >
                <summary style={{ cursor: 'pointer', fontWeight: 700, fontSize: 13, color: 'var(--neutral-800)' }}>
                  <Edit3 size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 8 }} />
                  {t('প্রয়োজনে পূর্ণ পাঠ্য ম্যানুয়ালি সংশোধন করুন', 'Manual Full-Text Correction (Optional)')}
                </summary>
                <form
                  key={currentDoc.reviewed_at ?? 'unreviewed'}
                  onSubmit={(e) => {
                    e.preventDefault();
                    const text = String(new FormData(e.currentTarget).get('text'));
                    void submit(`/${currentDoc.id}/review`, { text });
                  }}
                  style={{ marginTop: 14 }}
                >
                  <label htmlFor={`review-${currentDoc.id}`} className="form-label">
                    {t('মূল নথির সাথে মিলিয়ে সংশোধিত পূর্ণ পাঠ্য:', 'Corrected Text Transcript:')}
                  </label>
                  <textarea
                    id={`review-${currentDoc.id}`}
                    name="text"
                    rows={8}
                    required
                    maxLength={100000}
                    defaultValue={currentDoc.reviewed_text ?? currentDoc.pages.map((p) => p.text).join('\n\n')}
                    className="form-input"
                    style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
                    <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>
                      <Check size={14} />
                      {t('সংশোধিত পাঠ্য সংরক্ষণ করুন', 'Save Text Correction')}
                    </button>
                    {currentDoc.reviewed_at && (
                      <span style={{ fontSize: 12, color: 'var(--semantic-success)', fontWeight: 600 }}>
                        ✓ {t('আপনার পাঠ্য সংশোধন সংরক্ষিত রয়েছে।', 'Transcript correction saved.')}
                      </span>
                    )}
                  </div>
                </form>
              </details>

              {/* Field Review & Verification Component */}
              <FieldReview
                key={`${currentDoc.extraction.version}-${currentDoc.field_reviewed_at}`}
                extraction={currentDoc.extraction}
                values={currentDoc.field_review?.values}
                savedAt={currentDoc.field_reviewed_at}
                documentId={currentDoc.id}
                busy={busy || result.status !== 'needs_verification'}
                lang={lang}
                onSave={(values) =>
                  void submit(`/${currentDoc.id}/fields`, {
                    source_version: currentDoc.extraction.version,
                    previous_reviewed_at: currentDoc.field_reviewed_at,
                    values,
                  })
                }
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
