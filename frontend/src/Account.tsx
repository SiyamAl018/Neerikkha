import React, { useCallback, useState, useEffect } from 'react';
import {
  FolderOpen,
  Plus,
  Search,
  Filter,
  RefreshCw,
  LogOut,
  ShieldCheck,
  FileText,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  MapPin,
  Compass,
  CheckCircle2,
  X,
  Layers,
  Sparkles,
} from 'lucide-react';
import { CaseDocuments } from './CaseDocuments';
import { AuthForm } from './AuthForm';
import { i18n, formatDigit, type Language } from './i18n';
import './workspace.css';

type Case = {
  id: string;
  reference: string;
  mouza: string;
  survey_type: string;
  status: string;
};

export function Account({
  lang = 'bn',
  onSignOut,
  onTokenChange,
}: {
  lang?: Language;
  onSignOut?: () => void;
  onTokenChange?: (token: string) => void;
}) {
  const [selected, setSelected] = useState('');
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [cases, setCases] = useState<Case[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [surveyFilter, setSurveyFilter] = useState('all');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const t = (bn: string, en: string) => (lang === 'bn' ? bn : en);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const expire = useCallback(() => {
    setToken('');
    setCases([]);
    setSelected('');
    if (onTokenChange) onTokenChange('');
    if (onSignOut) onSignOut();
  }, [onSignOut, onTokenChange]);

  const api = async (path: string, method = 'GET', body?: unknown, auth = token) => {
    let response: Response;
    try {
      response = await fetch('/api/v1' + path, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(auth ? { Authorization: 'Bearer ' + auth } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch {
      throw new Error(
        t('সার্ভারের সাথে সংযোগ স্থাপন করা যায়নি। সার্ভার চলছে কিনা নিশ্চিত করুন।', 'Failed to connect to the backend API server. Please check your network.')
      );
    }

    if (response.status === 401 && auth) {
      expire();
      throw new Error(t('আপনার সেশনের মেয়াদ শেষ হয়েছে। পুনরায় লগইন করুন।', 'Session expired. Please log in again.'));
    }

    if (!response.ok) {
      let serverDetail = '';
      try {
        const errorData = await response.json();
        if (typeof errorData.detail === 'string') {
          serverDetail = errorData.detail;
        } else if (Array.isArray(errorData.detail)) {
          serverDetail = errorData.detail.map((d: { msg?: string }) => d.msg || '').filter(Boolean).join(', ');
        }

        if (Array.isArray(errorData.fields)) {
          if (errorData.fields.includes('email')) {
            throw new Error(
              t('সঠিক ইমেইল ঠিকানা প্রদান করুন (যেমন name@example.com)।', 'Please provide a valid email address (e.g. name@example.com).')
            );
          }
          if (errorData.fields.includes('password')) {
            throw new Error(
              t(
                'পাসওয়ার্ডে ৮–১২৮ অক্ষর, বড় ও ছোট হাতের ইংরেজি অক্ষর, সংখ্যা এবং বিশেষ চিহ্ন (! @ # $ ইত্যাদি) আবশ্যক।',
                'Password must be 8–128 chars with uppercase, lowercase, digit, and special punctuation.'
              )
            );
          }
          if (errorData.fields.includes('display_name')) {
            throw new Error(t('অনুগ্রহ করে আপনার পূর্ণ নাম লিখুন।', 'Please enter your full name.'));
          }
        }
      } catch (parseErr) {
        if (parseErr instanceof Error && parseErr.message) throw parseErr;
      }

      if (response.status === 409) {
        throw new Error(
          t(
            'এই ইমেইল ঠিকানা দিয়ে ইতোমধ্যে একটি অ্যাকাউন্ট নিবন্ধিত রয়েছে। অনুগ্রহ করে লগইন ট্যাবে যান অথবা অন্য ইমেইল ব্যবহার করুন।',
            'An account with this email address already exists. Please switch to the Sign In tab or use a different email.'
          )
        );
      }

      if (response.status === 401) {
        throw new Error(
          t(
            'ইমেইল বা পাসওয়ার্ড সঠিক নয়। অনুগ্রহ করে তথ্য মিলিয়ে পুনরায় চেষ্টা করুন। নতুন ব্যবহারকারী হলে "নতুন অ্যাকাউন্ট" ট্যাবে নিবন্ধন করুন।',
            'Invalid email or password. Please verify your credentials or register a new account.'
          )
        );
      }

      if (response.status === 429) {
        throw new Error(
          t(
            'নিরাপত্তার স্বার্থে অতিরিক্ত প্রচেষ্টার কারণে সাময়িক বিরতি দেওয়া হয়েছে। অনুগ্রহ করে ১ মিনিট পর আবার চেষ্টা করুন।',
            'Rate limit exceeded for security. Please wait 1 minute before retrying.'
          )
        );
      }

      if (response.status === 422) {
        throw new Error(
          t('প্রদত্ত তথ্যের ফরম্যাট সঠিক নয়। ইমেইল ও পাসওয়ার্ডের শর্তাবলী পূরণ করুন।', 'Invalid input format. Please meet all email and password criteria.')
        );
      }

      if (serverDetail) {
        throw new Error(serverDetail);
      }

      throw new Error(
        t('অনুরোধ সম্পন্ন করা যায়নি। পুনরায় চেষ্টা করুন।', 'Request could not be completed. Please try again.')
      );
    }

    return response.status === 204 ? null : response.json();
  };

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError('');
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('সংযোগ ব্যর্থ হয়েছে।', 'Connection failed.'));
    } finally {
      setBusy(false);
    }
  };

  const filteredCases = cases.filter((c) => {
    const matchesSurvey = surveyFilter === 'all' || c.survey_type === surveyFilter;
    const q = searchQuery.toLowerCase();
    const matchesQuery =
      c.reference.toLowerCase().includes(q) ||
      c.mouza.toLowerCase().includes(q) ||
      c.id.toLowerCase().includes(q);
    return matchesSurvey && matchesQuery;
  });

  return (
    <div className={`workspace ${token ? 'workspace-signed-in' : 'workspace-auth'}`}>
      {/* Toast Alert Notification */}
      {toastMessage && (
        <div className="toast-shelf">
          <div className="toast-item success">
            <CheckCircle2 size={18} color="var(--semantic-success)" />
            <span style={{ fontSize: 13, fontWeight: 600 }}>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Top Identity & Session Management Bar */}
      {token && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            background: 'var(--white)',
            border: '1px solid var(--neutral-200)',
            borderRadius: 'var(--radius-xl)',
            padding: '16px 24px',
            marginBottom: 28,
            boxShadow: 'var(--shadow-sm)',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div className="stat-icon-wrapper green" style={{ width: 40, height: 40 }}>
              <ShieldCheck size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="user-name" style={{ fontSize: 14 }}>
                  {t('প্রমাণিত কর্মক্ষেত্র সেশন', 'Authenticated Workspace')}
                </span>
                <span className="status-pill success" style={{ fontSize: 10, padding: '2px 8px' }}>
                  <span className="status-dot" />
                  {t('সক্রিয়', 'Active')}
                </span>
              </div>
              <p style={{ fontSize: 11, color: 'var(--neutral-500)', margin: 0 }}>
                {t('সেশন ৩০ মিনিটের জন্য সক্রিয় থাকে। এনক্রিপ্টেড সংযোগ।', 'Active 30-minute encrypted session.')}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  const result = await api('/auth/renew', 'POST');
                  setToken(result.access_token);
                  if (onTokenChange) onTokenChange(result.access_token);
                  showToast(t('সেশন সফলভাবে নবায়ন করা হয়েছে।', 'Session successfully extended.'));
                })
              }
            >
              <RefreshCw size={14} className={busy ? 'animate-spin' : ''} />
              {t('সেশন নবায়ন', 'Extend Session')}
            </button>

            <button
              type="button"
              className="btn btn-ghost btn-sm"
              style={{ color: 'var(--semantic-danger)' }}
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  await api('/auth/logout', 'POST');
                  expire();
                  showToast(t('সফলভাবে লগআউট করা হয়েছে।', 'Logged out successfully.'));
                })
              }
            >
              <LogOut size={14} />
              {t('লগআউট', 'Sign Out')}
            </button>
          </div>
        </div>
      )}

      {/* Global Error Banner */}
      {error && (
        <div className="banner-notice danger" role="alert">
          <AlertTriangle size={18} />
          <div>
            <strong>{t('বিজ্ঞপ্তি:', 'Notice:')}</strong> {error}
          </div>
        </div>
      )}

      {/* If Not Signed In -> Show Dual-Column Auth Form */}
      {!token ? (
        <AuthForm
          busy={busy}
          lang={lang}
          onSubmit={(register, values) =>
            run(async () => {
              const email = values.email.trim().toLowerCase();
              const password = values.password;
              if (register) {
                await api('/auth/register', 'POST', {
                  display_name: (values.display_name || '').trim(),
                  email,
                  password,
                });
              }
              const result = await api('/auth/login', 'POST', {
                email,
                password,
              });
              setToken(result.access_token);
              if (onTokenChange) onTokenChange(result.access_token);
              const list = await api('/cases', 'GET', undefined, result.access_token);
              setCases(list || []);
              showToast(
                register
                  ? t('অ্যাকাউন্ট সফলভাবে তৈরি ও লগইন হয়েছে!', 'Account successfully created and signed in!')
                  : t('কর্মক্ষেত্রে সফলভাবে প্রবেশ করেছেন!', 'Welcome back to your workspace!')
              );
            })
          }
        />
      ) : (
        <>
          {/* Page Heading & Action */}
          <div className="page-header-row">
            <div>
              <div className="page-eyebrow">
                <FolderOpen size={14} />
                {t('কেস পোর্টফোলিও ও যাচাই কর্মক্ষেত্র', 'CASE PORTFOLIO & AUDIT HUB')}
              </div>
              <h1 className="page-title">{t('আপনার জমির নথি ও যাচাইকৃত কেসসমূহ', 'Your Verified Land Title Cases')}</h1>
              <p className="page-subtitle">
                {t(
                  'একটি কেস নির্বাচন করে বিক্রয় দলিল, নামজারি ও খতিয়ান আপলোড করুন অথবা পূর্বে সংরক্ষিত ফলাফল পরীক্ষা করুন।',
                  'Select a plot case to inspect tri-document reconciliation or register a new property due diligence case.'
                )}
              </p>
            </div>

            <button
              type="button"
              className="btn btn-primary btn-lg"
              onClick={() => setCreateModalOpen(true)}
            >
              <Plus size={18} />
              {t('নতুন কেস নিবন্ধন করুন', 'New Land Case')}
            </button>
          </div>

          {/* Quick Metrics Bar */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-content">
                <div className="stat-label">{t('মোট কেস সংখ্যা', 'Total Cases')}</div>
                <div className="stat-number">{formatDigit(cases.length, lang)}</div>
              </div>
              <div className="stat-icon-wrapper neutral">
                <FolderOpen size={24} />
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-content">
                <div className="stat-label">{t('সক্রিয় পর্যালোচনা', 'In Review')}</div>
                <div className="stat-number">
                  {formatDigit(cases.filter((c) => c.status !== 'ready').length, lang)}
                </div>
              </div>
              <div className="stat-icon-wrapper amber">
                <AlertTriangle size={24} />
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-content">
                <div className="stat-label">{t('সম্পূর্ণ প্রস্তুত কেস', 'Completed Reports')}</div>
                <div className="stat-number">
                  {formatDigit(cases.filter((c) => c.status === 'ready').length, lang)}
                </div>
              </div>
              <div className="stat-icon-wrapper green">
                <CheckCircle2 size={24} />
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-content">
                <div className="stat-label">{t('সংরক্ষিত নথি সেট', 'Document Trios')}</div>
                <div className="stat-number">
                  {formatDigit(cases.length * 3, lang)}
                </div>
              </div>
              <div className="stat-icon-wrapper neutral">
                <FileText size={24} />
              </div>
            </div>
          </div>

          {/* Case Filtering & Search Bar */}
          <div className="panel-card">
            <div className="filter-row">
              <div className="search-input-box">
                <Search size={18} />
                <input
                  aria-label={t('কেস অনুসন্ধান করুন', 'Search cases')}
                  placeholder={t(
                    'কেসের নাম, আইডি বা মৌজা দিয়ে খুঁজুন…',
                    'Search by case reference, ID, or mouza…'
                  )}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <select
                  aria-label="Filter by Survey"
                  value={surveyFilter}
                  onChange={(e) => setSurveyFilter(e.target.value)}
                  className="select-box"
                >
                  <option value="all">{t('সকল জরিপ ধরন (All Surveys)', 'All Survey Standards')}</option>
                  <option value="CS">CS (ক্যাডাস্ট্রাল সার্ভে ১৮৮৮-১৯৪০)</option>
                  <option value="SA">SA (স্টেট অ্যাকুইজিশন ১৯৫৬-১৯৬৩)</option>
                  <option value="RS">RS (রিভিশনাল সার্ভে ১৯৬২-১৯৯০)</option>
                  <option value="BS">BS / সিটি সার্ভে (১৯৯৮-বর্তমান)</option>
                </select>
              </div>
            </div>

            {/* Case List / Accordion */}
            <div style={{ padding: '8px 28px 24px' }}>
              {filteredCases.length === 0 ? (
                <div className="workspace-empty">
                  <div className="stat-icon-wrapper neutral" style={{ margin: '0 auto 16px' }}>
                    <FolderOpen size={28} />
                  </div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--neutral-900)' }}>
                    {cases.length === 0
                      ? t('এখনও কোনো কেস নিবন্ধন করা হয়নি।', 'No property cases registered yet.')
                      : t('অনুসন্ধানের সাথে মেলে এমন কোনো কেস পাওয়া যায়নি।', 'No cases match your search query.')}
                  </h3>
                  <p style={{ fontSize: 13, color: 'var(--neutral-500)', marginTop: 4, marginBottom: 16 }}>
                    {cases.length === 0
                      ? t(
                          'জমির দলিল, নামজারি ও খতিয়ান যাচাই শুরু করতে উপরের বোতাম থেকে নতুন কেস তৈরি করুন।',
                          'Register a new case above to start uploading and reconciling deed, mutation, and khatian.'
                        )
                      : t('অন্য কোনো নাম বা জরিপ ধরন দিয়ে পুনরায় অনুসন্ধান করুন।', 'Try searching with a different keyword or filter.')}
                  </p>
                  {cases.length === 0 && (
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => setCreateModalOpen(true)}
                    >
                      <Plus size={16} />
                      {t('প্রথম কেস তৈরি করুন', 'Create First Case')}
                    </button>
                  )}
                </div>
              ) : (
                filteredCases.map((c) => {
                  const isOpen = selected === c.id;
                  const surveyMeta = (i18n.surveys as Record<string, { label: string; period: string }>)[c.survey_type];

                  return (
                    <div key={c.id} className="workspace-case">
                      <div className="workspace-case-heading">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                          <div
                            className="case-icon-cell"
                            style={{
                              background: isOpen ? 'var(--primary-100)' : 'var(--neutral-100)',
                              color: isOpen ? 'var(--primary-800)' : 'var(--neutral-700)',
                            }}
                          >
                            <FileText size={20} />
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <h3 style={{ fontSize: 16, fontWeight: 800 }}>{c.reference}</h3>
                              <span className="status-pill neutral" style={{ fontSize: 11 }}>
                                {c.survey_type} {t('জরিপ', 'Survey')}
                              </span>
                            </div>
                            <p style={{ fontSize: 12, color: 'var(--neutral-500)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <MapPin size={12} />
                                {t('মৌজা:', 'Mouza:')} {c.mouza}
                              </span>
                              <span>·</span>
                              <span style={{ fontFamily: 'var(--font-mono)' }}>ID: {c.id}</span>
                              {surveyMeta && <span>· ({surveyMeta.period})</span>}
                            </p>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <button
                            type="button"
                            className={`btn ${isOpen ? 'btn-secondary' : 'btn-primary'} btn-sm`}
                            disabled={busy}
                            onClick={() => setSelected(isOpen ? '' : c.id)}
                          >
                            {isOpen ? (
                              <>
                                <ChevronUp size={16} />
                                {t('নথি বন্ধ করুন', 'Collapse Case')}
                              </>
                            ) : (
                              <>
                                <FolderOpen size={16} />
                                {t('নথি ও বিশ্লেষণ খুলুন', 'Inspect Documents')}
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Expanded Document Vault & Extraction Review */}
                      {isOpen && (
                        <div
                          style={{
                            marginTop: 20,
                            paddingTop: 20,
                            borderTop: '1px dashed var(--neutral-300)',
                          }}
                        >
                          <CaseDocuments
                            key={c.id + token}
                            caseId={c.id}
                            token={token}
                            onExpired={expire}
                            lang={lang}
                          />
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}

      {/* Case Creation Modal */}
      {createModalOpen && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setCreateModalOpen(false);
          }}
        >
          <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <div className="modal-header">
              <button
                type="button"
                className="modal-close-btn"
                aria-label={t('বন্ধ করুন', 'Close')}
                onClick={() => setCreateModalOpen(false)}
              >
                <X size={20} />
              </button>
              <div className="page-eyebrow" style={{ color: 'var(--primary-700)' }}>
                {t('নতুন জমি স্বত্ব যাচাই', 'NEW TITLE DUE DILIGENCE')}
              </div>
              <h2 id="modal-title" style={{ fontSize: 20, fontWeight: 800, color: 'var(--neutral-950)' }}>
                {t('একটি জমির জন্য নতুন কেস নিবন্ধন করুন', 'Register a New Land Plot Case')}
              </h2>
              <p style={{ fontSize: 13, color: 'var(--neutral-600)', marginTop: 4 }}>
                {t(
                  'একই দাগ ও মৌজার ৩টি নথির (দলিল, নামজারি ও খতিয়ান) সমন্বিত অডিট করার জন্য তথ্য দিন।',
                  'Enter the plot reference, mouza, and survey standard to begin verification.'
                )}
              </p>
            </div>

            <div className="modal-body">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = e.currentTarget;
                  const values = Object.fromEntries(new FormData(form));
                  void run(async () => {
                    await api('/cases', 'POST', values);
                    const updated = await api('/cases');
                    setCases(updated);
                    setCreateModalOpen(false);
                    showToast(t('নতুন কেস সফলভাবে নিবন্ধিত হয়েছে!', 'New case successfully created!'));
                  });
                }}
              >
                <div className="form-group">
                  <label className="form-label" htmlFor="case-reference">
                    {t('কেসের রেফারেন্স নাম', 'Case Reference Name')}
                  </label>
                  <input
                    id="case-reference"
                    name="reference"
                    required
                    maxLength={100}
                    className="form-input"
                    autoFocus
                    placeholder={t('উদা: সাভার মৌজা প্লট — ১২০', 'e.g. Savar Mouza Plot — 120')}
                  />
                  <small style={{ fontSize: 11, color: 'var(--neutral-500)', marginTop: 4, display: 'block' }}>
                    {t('আপনার সুবিধাজনক যে-কোনো নাম দিন।', 'Use a recognizable identifier for this parcel.')}
                  </small>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="case-mouza">
                    {t('মৌজার নাম', 'Mouza Name')}
                  </label>
                  <input
                    id="case-mouza"
                    name="mouza"
                    required
                    maxLength={100}
                    className="form-input"
                    placeholder={t('উদা: ভাটারা, গুলশান, বাড্ডা', 'e.g. Vatara, Gulshan, Savar')}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="case-survey">
                    {t('জরিপের ধরন (Survey Type)', 'Survey Classification')}
                  </label>
                  <select id="case-survey" name="survey_type" className="form-input">
                    <option value="RS">RS (রিভিশনাল সার্ভে ১৯৬২–১৯৯০) — অধিকাংশ ক্ষেত্রে প্রযোজ্য</option>
                    <option value="BS">BS / সিটি সার্ভে (১৯৯৮–বর্তমান) — আধুনিক সিটি জরিপ</option>
                    <option value="SA">SA (স্টেট অ্যাকুইজিশন ১৯৫৬–১৯৬৩) — জমিদারী অধিগ্রহণ</option>
                    <option value="CS">CS (ক্যাডাস্ট্রাল সার্ভে ১৮৮৮–১৯৪০) — মূল ব্রিটিশ জরিপ</option>
                  </select>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setCreateModalOpen(false)}
                  >
                    {t('বাতিল', 'Cancel')}
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={busy}>
                    {busy ? (
                      <>
                        <RefreshCw size={16} className="animate-spin" />
                        {t('তৈরি হচ্ছে…', 'Registering…')}
                      </>
                    ) : (
                      <>
                        <Plus size={16} />
                        {t('কেস তৈরি ও নথি যোগ করুন', 'Create Case & Add Records')}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
