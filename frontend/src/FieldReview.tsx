import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  Info,
  ShieldCheck,
  Check,
  ChevronDown,
  ChevronUp,
  FileSearch,
} from 'lucide-react';
import { i18n, formatDigit } from './i18n';

type Candidate = {
  value: string;
  page: number | null;
  line: number | null;
  source_text: string;
  engine?: string;
  grounded?: boolean;
  scope?: 'primary' | 'historical' | 'component' | 'unclear';
  confidence?: number;
  pass?: number;
  evidence_match?: 'exact' | 'format' | null;
  repair?: { from: string; to: string; kinds: string[] } | null;
};

const scopeNotes: Record<string, { bn: string; en: string }> = {
  historical: {
    bn: 'পূর্ববর্তী রেকর্ডের তথ্য; বর্তমান সক্রিয় মান হিসেবে গণ্য নয়',
    en: 'Historical chain record; not active title tenure',
  },
  component: {
    bn: 'অংশবিশেষ বা হিস্যার পরিমাণ; মোট জমি হিসেবে পরিগণিত নয়',
    en: 'Component share; does not represent total parcel area',
  },
  unclear: {
    bn: 'বর্তমান নথির সাথে সম্পর্ক অস্পষ্ট; স্বয়ংক্রিয়ভাবে বাদ রাখা হয়েছে',
    en: 'Ambiguous tenure relation; excluded from primary match',
  },
};

export type Extraction = {
  version: string;
  source: string;
  fields: Record<
    string,
    {
      value: string;
      status: string;
      candidates: Candidate[];
      confidence?: number | null;
      agreement?: 'confirmed' | 'partial' | 'single';
      passes?: number;
    }
  >;
};

export function FieldReview({
  extraction,
  values,
  savedAt,
  documentId,
  busy,
  onSave,
  lang = 'bn',
}: {
  extraction: Extraction;
  values?: Record<string, string>;
  savedAt: string | null;
  documentId: string;
  busy: boolean;
  onSave: (values: Record<string, string>) => void;
  lang?: 'bn' | 'en';
}) {
  const [confirmed, setConfirmed] = useState(false);
  const [expandedSources, setExpandedSources] = useState<Record<string, boolean>>({});

  const t = (bn: string, en: string) => (lang === 'bn' ? bn : en);

  const toggleSource = (fieldKey: string) => {
    setExpandedSources((prev) => ({ ...prev, [fieldKey]: !prev[fieldKey] }));
  };

  const fieldKeys = Object.keys(extraction.fields);

  return (
    <div
      className="animate-fade-in"
      style={{
        background: 'var(--white)',
        border: '1px solid var(--neutral-200)',
        borderRadius: 'var(--radius-xl)',
        padding: 28,
        boxShadow: 'var(--shadow-sm)',
        marginTop: 20,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
        <div>
          <div className="page-eyebrow" style={{ color: 'var(--primary-700)' }}>
            <FileSearch size={14} />
            {t('আহরিত তথ্যের আইনি অডিট ও যাচাই', 'EXTRACTED FIELD AUDIT & LEGAL GROUNDING')}
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--neutral-950)' }}>
            {t('নথি থেকে পাওয়া তথ্যের সঠিকতা নিশ্চিত করুন', 'Verify Extracted Title Attributes')}
          </h3>
          <p style={{ fontSize: 12, color: 'var(--neutral-600)', marginTop: 4 }}>
            {t(
              'উৎস:',
              'Source:'
            )}{' '}
            <strong>
              {extraction.source === 'reviewed_text'
                ? t('সংশোধিত মানবীয় পাঠ্য', 'User Verified Transcript')
                : t('মাল্টিমোডাল OCR ভিশন', 'Multimodal OCR Vision')}
            </strong>
            {' · '}
            {t(
              'মূল নথির সাথে দাগ, খতিয়ান, মৌজা ও মালিকানার তথ্য মিলিয়ে প্রয়োজনে নিচের ঘরে সরাসরি সংশোধন করুন।',
              'Compare proposed values against original document and update any discrepancies below.'
            )}
          </p>
        </div>

        {savedAt && (
          <span className="status-pill success" style={{ padding: '6px 12px' }}>
            <Check size={14} />
            {t('পূর্বে সংরক্ষিত ও যাচাইকৃত', 'Previously Verified')}
          </span>
        )}
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (confirmed) {
            onSave(Object.fromEntries(new FormData(event.currentTarget)) as Record<string, string>);
          }
        }}
      >
        <fieldset disabled={busy} style={{ border: 0, padding: 0 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 18 }}>
            {fieldKeys.map((key) => {
              const field = extraction.fields[key];
              const fieldMeta = (i18n.fields as Record<string, { bn: string; en: string }>)[key];
              const fieldLabel = fieldMeta ? (lang === 'bn' ? fieldMeta.bn : fieldMeta.en) : key;
              const hasCandidates = field.candidates && field.candidates.length > 0;
              const isSourceExpanded = !!expandedSources[key];

              const confidence = field.confidence ?? null;
              const confPercent = confidence !== null ? Math.round(confidence * 100) : null;

              return (
                <div
                  key={key}
                  style={{
                    background: 'var(--neutral-50)',
                    border: '1px solid var(--neutral-200)',
                    borderRadius: 'var(--radius-lg)',
                    padding: 16,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <label htmlFor={`${documentId}-${key}`} style={{ fontSize: 13, fontWeight: 700, color: 'var(--neutral-900)' }}>
                      {fieldLabel}
                    </label>

                    {confidence !== null && (
                      <span
                        className={`status-pill ${
                          confidence >= 0.8 ? 'success' : confidence >= 0.6 ? 'warning' : 'danger'
                        }`}
                        style={{ fontSize: 10, padding: '2px 8px' }}
                      >
                        {confidence >= 0.8
                          ? t('উচ্চ নির্ভুলতা', 'High Confidence')
                          : confidence >= 0.6
                          ? t('মাঝারি — যাচাই আবশ্যক', 'Moderate — Review')
                          : t('কম নির্ভুলতা', 'Low Confidence')}
                        {' ('}
                        {formatDigit(confPercent!, lang)}%{')'}
                      </span>
                    )}
                  </div>

                  <input
                    id={`${documentId}-${key}`}
                    name={key}
                    maxLength={500}
                    defaultValue={values?.[key] ?? field.value}
                    className="form-input"
                    style={{ background: 'var(--white)', fontWeight: 600 }}
                    placeholder={t('কোনো তথ্য পাওয়া যায়নি (খালি রাখুন)', 'No record located (leave blank)')}
                  />

                  {field.status === 'conflict' && (
                    <div style={{ fontSize: 11, color: 'var(--semantic-danger)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <AlertTriangle size={13} />
                      {t('একাধিক পরস্পরবিরোধী মান পাওয়া গেছে — মূল নথির সাথে মিলিয়ে নিন।', 'Multiple conflicting values detected in document.')}
                    </div>
                  )}

                  {field.agreement === 'partial' && (
                    <div style={{ fontSize: 11, color: 'var(--gold-700)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Info size={13} />
                      {t('স্বাধীন একাধিক পাঠের মধ্যে সম্পূর্ণ ঐকমত্য নেই।', 'Partial consensus between independent passes.')}
                    </div>
                  )}

                  {/* Grounded Source Citation Drawer */}
                  {hasCandidates && (
                    <div style={{ borderTop: '1px solid var(--neutral-200)', paddingTop: 8, marginTop: 4 }}>
                      <button
                        type="button"
                        onClick={() => toggleSource(key)}
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: 'var(--primary-700)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: 0,
                        }}
                      >
                        {isSourceExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                        {t('উৎসের উদ্ধৃতি ও পৃষ্ঠা প্রমাণ', 'Grounding Evidence')} ({formatDigit(field.candidates.length, lang)})
                      </button>

                      {isSourceExpanded && (
                        <div style={{ marginTop: 8, display: 'grid', gap: 6 }}>
                          {field.candidates.map((c, i) => (
                            <div
                              key={i}
                              style={{
                                background: 'var(--white)',
                                border: '1px solid var(--neutral-200)',
                                borderRadius: 'var(--radius-sm)',
                                padding: '8px 10px',
                                fontSize: 11,
                                color: 'var(--neutral-700)',
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--neutral-500)', marginBottom: 2 }}>
                                <span>
                                  {c.page === null ? t('সংশোধিত পাঠ্য', 'Verified Text') : `${t('পৃষ্ঠা', 'Page')} ${formatDigit(c.page, lang)}`}
                                  {c.line !== null ? ` · ${t('লাইন', 'Line')} ${formatDigit(c.line, lang)}` : ''}
                                </span>
                                {c.engine && <span style={{ fontWeight: 600 }}>{c.engine}</span>}
                              </div>
                              <blockquote
                                style={{
                                  fontStyle: 'italic',
                                  color: 'var(--neutral-900)',
                                  background: 'var(--neutral-50)',
                                  padding: '4px 8px',
                                  borderRadius: 4,
                                  margin: '4px 0',
                                }}
                              >
                                &ldquo;{c.source_text}&rdquo;
                              </blockquote>
                              {c.scope && c.scope !== 'primary' && (
                                <div style={{ color: 'var(--gold-700)', fontSize: 10 }}>
                                  {lang === 'bn' ? scopeNotes[c.scope]?.bn : scopeNotes[c.scope]?.en}
                                </div>
                              )}
                              {c.repair && (
                                <div style={{ color: 'var(--neutral-500)', fontSize: 10 }}>
                                  {t(`«${c.repair.from}» থেকে ফরম্যাট সমন্বয় করা হয়েছে`, `Normalized from «${c.repair.from}»`)}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Statutory Verification Declaration & Confirmation Action */}
          <div
            style={{
              background: 'var(--primary-50)',
              border: '1px solid var(--primary-200)',
              borderRadius: 'var(--radius-lg)',
              padding: '18px 24px',
              marginTop: 24,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 20,
              flexWrap: 'wrap',
            }}
          >
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--primary-900)',
                flex: 1,
                minWidth: 280,
              }}
            >
              <input
                type="checkbox"
                required
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                style={{ width: 18, height: 18, accentColor: 'var(--primary-700)', cursor: 'pointer' }}
              />
              <span>
                {t(
                  'আমি মূল দলিলের পাতা ও বালাম বহির তথ্যের সাথে মিলিয়ে উপরোক্ত তথ্যসমূহ যাচাই ও নির্ভুল ঘোষণা করছি।',
                  'I have verified these extracted values against the original statutory records.'
                )}
              </span>
            </label>

            <button type="submit" className="btn btn-primary btn-lg" disabled={busy || !confirmed}>
              <CheckCircle2 size={18} />
              {t('যাচাইকৃত তথ্য চূড়ান্ত সংরক্ষণ করুন', 'Confirm & Save Verified Fields')}
            </button>
          </div>
        </fieldset>
      </form>
    </div>
  );
}
