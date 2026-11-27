import React from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  FileText,
  Landmark,
  Map,
  ArrowRight,
  Info,
  Layers,
  Scale,
} from 'lucide-react';
import { i18n, formatDigit } from './i18n';

export type Comparison = {
  reviewed_count: number;
  preliminary?: boolean;
  rows: {
    field: string;
    values: Record<string, string | null>;
    status: string;
    note?: string;
    missing_in?: string[];
    compared?: string[];
  }[];
  summary?: {
    sentence?: string;
    total?: number;
    match?: number;
    different?: number;
    partial_match?: number;
    cannot_compare?: number;
  };
};

export function CaseComparison({
  data,
  lang = 'bn',
}: {
  data: Comparison;
  lang?: 'bn' | 'en';
}) {
  const t = (bn: string, en: string) => (lang === 'bn' ? bn : en);

  const total = data.summary?.total ?? data.rows.length;
  const matchCount = data.summary?.match ?? data.rows.filter((r) => r.status === 'match').length;
  const diffCount = data.summary?.different ?? data.rows.filter((r) => r.status === 'different').length;
  const partialCount =
    data.summary?.partial_match ??
    data.rows.filter((r) => ['partial_match', 'format_differs'].includes(r.status)).length;

  const hasMismatch = diffCount > 0;

  return (
    <div
      className="panel-card animate-slide-up"
      style={{
        border: hasMismatch ? '1px solid var(--semantic-danger-border)' : '1px solid var(--neutral-200)',
      }}
    >
      {/* Executive Due Diligence Summary Header */}
      <div
        style={{
          padding: '24px 28px',
          background: hasMismatch
            ? 'linear-gradient(180deg, #fffbfb 0%, #ffffff 100%)'
            : 'linear-gradient(180deg, #f7fbf8 0%, #ffffff 100%)',
          borderBottom: '1px solid var(--neutral-200)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
          <div>
            <div
              className="page-eyebrow"
              style={{ color: hasMismatch ? 'var(--semantic-danger)' : 'var(--primary-700)' }}
            >
              <Scale size={14} />
              {data.preliminary
                ? t('প্রাথমিক তুলনামূলক ম্যাট্রিক্স (AI প্রিভিউ)', 'PRELIMINARY TITLE CONCORDANCE MATRIX')
                : t('যাচাইকৃত স্বত্ব সমতা ম্যাট্রিক্স (VERIFIED)', 'VERIFIED TITLE DUE DILIGENCE MATRIX')}
            </div>

            <h3 style={{ fontSize: 22, fontWeight: 800, color: 'var(--neutral-950)' }}>
              {t('তিন দপ্তরের তথ্যের পারস্পরিক সামঞ্জস্য ও সমতা বিশ্লেষণ', 'Tri-Office Reconciliation & Title Concordance')}
            </h3>

            <p style={{ fontSize: 13, color: 'var(--neutral-600)', marginTop: 4, maxWidth: 720 }}>
              {data.preliminary
                ? t(
                    'সাব-রেজিস্ট্রি দলিল, ভূমি অফিসের নামজারি এবং জরিপ খতিয়ানের তথ্যে কোনো গরমিল আছে কিনা তা নিচে দেখানো হয়েছে।',
                    'Comparing deed conveyance, revenue mutation, and survey RoR Khatian to highlight discrepancies.'
                  )
                : t(
                    'আপনার সংরক্ষিত সংশোধনের ভিত্তিতে প্রস্তুতকৃত চূড়ান্ত সমতা ম্যাট্রিক্স।',
                    'Concordance calculated from your verified and reviewed ground-truth values.'
                  )}
            </p>
          </div>

          {/* Quick Stats Pill Shelf */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: 'var(--semantic-success-bg)',
                border: '1px solid var(--semantic-success-border)',
                color: 'var(--semantic-success)',
                padding: '6px 12px',
                borderRadius: 'var(--radius-full)',
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              <CheckCircle2 size={14} />
              <span>
                {formatDigit(matchCount, lang)} {t('মান নিখুঁত মিলেছে', 'Exact Matches')}
              </span>
            </div>

            {hasMismatch && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  background: 'var(--semantic-danger-bg)',
                  border: '1px solid var(--semantic-danger-border)',
                  color: 'var(--semantic-danger)',
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                <AlertTriangle size={14} />
                <span>
                  {formatDigit(diffCount, lang)} {t('অমিল শনাক্ত', 'Discrepancies Detected')}
                </span>
              </div>
            )}

            {partialCount > 0 && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  background: 'var(--gold-100)',
                  border: '1px solid var(--gold-200)',
                  color: 'var(--gold-900)',
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                <Info size={14} />
                <span>
                  {formatDigit(partialCount, lang)} {t('আংশিক / বিন্যাস ভিন্ন', 'Partial Matches')}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Narrative Sentence Alert */}
        {data.summary?.sentence && (
          <div
            className={`banner-notice ${hasMismatch ? 'danger' : 'success'}`}
            style={{ marginTop: 18, marginBottom: 0 }}
          >
            {hasMismatch ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
            <div style={{ fontSize: 13, fontWeight: 600 }}>{data.summary.sentence}</div>
          </div>
        )}
      </div>

      {/* Comparison Table */}
      <div className="table-responsive">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ minWidth: 160 }}>{t('যাচাইকৃত বৈশিষ্ট্য (Field)', 'ATTRIBUTE')}</th>
              <th style={{ minWidth: 180 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <FileText size={14} />
                  <span>{t('বিক্রয় দলিল (Deed)', 'SALE DEED')}</span>
                </div>
              </th>
              <th style={{ minWidth: 180 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Landmark size={14} />
                  <span>{t('নামজারি ও ডিসিআর', 'MUTATION / DCR')}</span>
                </div>
              </th>
              <th style={{ minWidth: 180 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Map size={14} />
                  <span>{t('রেকর্ড অব রাইটস (খতিয়ান)', 'ROR KHATIAN')}</span>
                </div>
              </th>
              <th style={{ minWidth: 200 }}>{t('আইনি সমন্বয় ও অবস্থা', 'RECONCILIATION STATUS')}</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row) => {
              const fieldMeta = (i18n.fields as Record<string, { bn: string; en: string }>)[row.field];
              const fieldName = fieldMeta ? (lang === 'bn' ? fieldMeta.bn : fieldMeta.en) : row.field;
              const statusMeta = (i18n.statuses as Record<string, { label: { bn: string; en: string }; variant: string; desc: { bn: string; en: string } }>)[row.status];

              const isDiff = row.status === 'different';
              const isMatch = row.status === 'match';

              return (
                <tr
                  key={row.field}
                  style={{
                    background: isDiff ? 'rgba(185, 28, 28, 0.02)' : undefined,
                  }}
                >
                  {/* Field Label */}
                  <td>
                    <strong style={{ color: 'var(--neutral-950)', fontSize: 13 }}>{fieldName}</strong>
                  </td>

                  {/* Deed Value */}
                  <td>
                    {row.values.deed === null ? (
                      <span style={{ color: 'var(--neutral-400)' }}>—</span>
                    ) : (
                      <span className={isDiff ? 'cell-mismatch' : isMatch ? 'cell-match' : ''}>
                        {row.values.deed || t('নিশ্চিত পাঠ পাওয়া যায়নি', 'Unspecified')}
                      </span>
                    )}
                  </td>

                  {/* Mutation Value */}
                  <td>
                    {row.values.mutation === null ? (
                      <span style={{ color: 'var(--neutral-400)' }}>—</span>
                    ) : (
                      <span className={isDiff ? 'cell-mismatch' : isMatch ? 'cell-match' : ''}>
                        {row.values.mutation || t('নিশ্চিত পাঠ পাওয়া যায়নি', 'Unspecified')}
                      </span>
                    )}
                  </td>

                  {/* Khatian Value */}
                  <td>
                    {row.values.khatian === null ? (
                      <span style={{ color: 'var(--neutral-400)' }}>—</span>
                    ) : (
                      <span className={isDiff ? 'cell-mismatch' : isMatch ? 'cell-match' : ''}>
                        {row.values.khatian || t('নিশ্চিত পাঠ পাওয়া যায়নি', 'Unspecified')}
                      </span>
                    )}
                  </td>

                  {/* Status & Legal Note */}
                  <td>
                    <span
                      className={`status-pill ${
                        statusMeta?.variant ?? (isDiff ? 'danger' : isMatch ? 'success' : 'neutral')
                      }`}
                    >
                      <span className="status-dot" />
                      {statusMeta
                        ? lang === 'bn'
                          ? statusMeta.label.bn
                          : statusMeta.label.en
                        : row.status}
                    </span>

                    {row.note && (
                      <div
                        style={{
                          fontSize: 11,
                          color: isDiff ? 'var(--semantic-danger)' : 'var(--neutral-600)',
                          marginTop: 6,
                          lineHeight: 1.5,
                        }}
                      >
                        {row.note}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Explanatory Legal Footnote */}
      <div
        style={{
          padding: '16px 28px',
          background: 'var(--neutral-50)',
          borderTop: '1px solid var(--neutral-200)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: 12,
          color: 'var(--neutral-500)',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ShieldCheck size={16} color="var(--primary-700)" />
          <span>
            {t(
              'বাংলা ও ইংরেজি সংখ্যা, দাগ বিভাজন ও শূন্যের অবস্থান মিলিয়ে সমতা নির্ণয় করা হয়েছে।',
              'Numeric normalization & parcel subdivision rules applied per Bangladesh Land Management standards.'
            )}
          </span>
        </div>

        <span>
          {t('সাব-রেজিস্ট্রি · সেটেলমেন্ট · ইউনিয়ন ভূমি', 'Sub-Registry · DLRS · AC Land')}
        </span>
      </div>
    </div>
  );
}
