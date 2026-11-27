import React from 'react';
import {
  CheckCircle2,
  Clock,
  ShieldCheck,
  Cpu,
  Lock,
  FileCheck,
  Check,
  Sparkles,
  Layers,
  ArrowUpRight,
} from 'lucide-react';

export function BuildHandoff({ lang = 'bn' }: { lang?: 'bn' | 'en' }) {
  const t = (bn: string, en: string) => (lang === 'bn' ? bn : en);

  const milestones = [
    {
      title: t('নিরাপদ সেশন ও অ্যাকাউন্টিং', 'Secure Session & Identity Assurance'),
      desc: t('পাসওয়ার্ড জটিলতা পরীক্ষা, সেশন রিফ্রেশ ও রিনিউ টোকেন ব্যবস্থাপনা।', 'Strict password complexity, JWT rotation, and ephemeral credential isolation.'),
      status: 'completed',
    },
    {
      title: t('এনক্রিপ্টেড ত্রি-নথি ভল্ট', 'Tri-Document Encrypted Vault'),
      desc: t('দলিল, নামজারি ও খতিয়ান আপলোড, পৃষ্ঠা সংখ্যা ও রেজোলিউশন যাচাই।', 'Encrypted storage for Deed, Mutation, and RoR Khatian with resolution validation.'),
      status: 'completed',
    },
    {
      title: t('মাল্টিমোডাল ভিশন ও OCR পাইপলাইন', 'Multimodal Vision & OCR Pipeline'),
      desc: t('Google Gemini ভিশন ও Tesseract হাইব্রিড বাংলা পাঠ ইঞ্জিন।', 'Multi-pass extraction leveraging Google Gemini multimodal AI with Tesseract fallback.'),
      status: 'completed',
    },
    {
      title: t('উৎস-ভিত্তিক তথ্য শনাক্তকরণ ও সংশোধন', 'Grounded Field Extraction & Audit'),
      desc: t('দাগ, খতিয়ান, মৌজা শনাক্তকরণ, লাইনের উদ্ধৃতি এবং ব্যবহারকারীর সম্পাদনা।', 'Deterministic attribute extraction with grounded page/line citations & human review.'),
      status: 'completed',
    },
    {
      title: t('তিন দপ্তরের তথ্যের তুলনামূলক ম্যাট্রিক্স', 'Tri-Office Reconciliation Matrix'),
      desc: t('বাংলা/ইংরেজি সংখ্যা রূপান্তর, দাগ অমিল শনাক্তকরণ ও জরিপভেদ পরীক্ষা।', 'Cross-comparison matrix identifying plot mismatches, context diffs, and unit ambiguities.'),
      status: 'completed',
    },
    {
      title: t('আইনি ধারা ও সংবিধিবদ্ধ ব্যাখ্যা সংযুক্তি', 'Statutory Provisions & Judicial Citation'),
      desc: t('রেজিস্ট্রেশন আইন ও ভূমি ব্যবস্থাপনাবিধির সরাসরি রেফারেন্স সংযোগ।', 'Contextual mapping to Registration Act 1908 and State Acquisition & Tenancy Act 1950.'),
      status: 'in-progress',
    },
    {
      title: t('ডকুমেন্ট ওয়াটারমার্কযুক্ত অডিট সার্টিফিকেট', 'Audited Title Clearance Certificate'),
      desc: t('চূড়ান্ত পর্যালোচনার পর প্রিন্ট ও শেয়ারযোগ্য প্রাতিষ্ঠানিক প্রতিবেদন।', 'Downloadable, cryptographically signed title due diligence summary PDF.'),
      status: 'planned',
    },
  ];

  return (
    <div className="panel-card animate-fade-in" style={{ padding: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div className="page-eyebrow">
            <Cpu size={14} />
            {t('প্রকৌশল হস্তান্তর ও প্ল্যাটফর্ম অগ্রগতি', 'ENGINEERING HANDOFF & PIPELINE ROADMAP')}
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--neutral-950)' }}>
            {t('নিরীক্ষা প্ল্যাটফর্মের সক্ষমতা ও স্থাপত্য স্থিতি', 'System Architecture & Milestone Verification')}
          </h2>
          <p style={{ fontSize: 13, color: 'var(--neutral-600)', marginTop: 4 }}>
            {t(
              'ব্যাকএন্ডের ৪৩টি অটোমেটেড টেস্ট, এনক্রিপশন লেয়ার ও হাইব্রিড ওসিআর পাইপলাইন সফলভাবে উত্তীর্ণ হয়েছে।',
              '43 backend automated tests passing. End-to-end multi-pass vision pipeline verified.'
            )}
          </p>
        </div>

        <span className="status-pill success" style={{ padding: '8px 16px', fontSize: 13 }}>
          <CheckCircle2 size={16} />
          {t('কোর ইঞ্জিন প্রস্তুত', 'Core Engine Verified')}
        </span>
      </div>

      <div style={{ display: 'grid', gap: 14 }}>
        {milestones.map((m, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 20px',
              borderRadius: 'var(--radius-lg)',
              background: m.status === 'completed' ? 'var(--neutral-50)' : 'var(--white)',
              border: '1px solid var(--neutral-200)',
              gap: 16,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 'var(--radius-full)',
                  display: 'grid',
                  placeItems: 'center',
                  background:
                    m.status === 'completed'
                      ? 'var(--semantic-success-bg)'
                      : m.status === 'in-progress'
                      ? 'var(--gold-100)'
                      : 'var(--neutral-200)',
                  color:
                    m.status === 'completed'
                      ? 'var(--semantic-success)'
                      : m.status === 'in-progress'
                      ? 'var(--gold-700)'
                      : 'var(--neutral-500)',
                }}
              >
                {m.status === 'completed' ? <Check size={16} /> : <Clock size={16} />}
              </div>
              <div>
                <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--neutral-950)' }}>{m.title}</h4>
                <p style={{ fontSize: 12, color: 'var(--neutral-500)', margin: 0 }}>{m.desc}</p>
              </div>
            </div>

            <span
              className={`status-pill ${
                m.status === 'completed' ? 'success' : m.status === 'in-progress' ? 'warning' : 'neutral'
              }`}
            >
              {m.status === 'completed'
                ? t('সম্পন্ন', 'Completed')
                : m.status === 'in-progress'
                ? t('চলমান', 'In Progress')
                : t('পরবর্তী ধাপ', 'Planned')}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
