import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ShieldCheck,
  LayoutDashboard,
  FolderOpen,
  BookOpen,
  Cpu,
  Languages,
  Menu,
  ChevronRight,
  Plus,
  Search,
  FileText,
  Landmark,
  Map,
  ArrowUpRight,
  ArrowLeft,
  ArrowRight,
  Upload,
  Check,
  AlertTriangle,
  CircleHelp,
  X,
  FileCheck,
  CheckCircle2,
  Lock,
  Layers,
  Sparkles,
} from 'lucide-react';
import './styles.css';
import { Account } from './Account';
import { BuildHandoff } from './BuildHandoff';
import { i18n, formatDigit, formatDate, type Language } from './i18n';

type DemoCase = {
  id: string;
  name: string;
  mouza: string;
  survey: string;
  status: 'review' | 'ready' | 'draft';
  date: string;
};

const initialDemoCases: DemoCase[] = [
  {
    id: 'DEMO-001',
    name: 'সাভার মৌজা প্লট — ০১ (দাগ অমিল কেস)',
    mouza: 'সাভার (ঢাকা)',
    survey: 'RS',
    status: 'review',
    date: '2026-11-06',
  },
  {
    id: 'DEMO-002',
    name: 'মিরপুর হাউজিং প্লট — ০২ (সমন্বিত কেস)',
    mouza: 'মিরপুর (ঢাকা)',
    survey: 'BS',
    status: 'ready',
    date: '2026-11-05',
  },
  {
    id: 'DEMO-003',
    name: 'কেরানীগঞ্জ আবাসিক — ০৩ (খসড়া কেস)',
    mouza: 'জিনজিরা (ঢাকা)',
    survey: 'SA',
    status: 'draft',
    date: '2026-11-04',
  },
];

function App() {
  const [lang, setLang] = useState<Language>('bn');
  const t = (bn: string, en: string) => (lang === 'bn' ? bn : en);

  // Determine initial view based on URL pathname/hash
  const initialNav =
    window.location.pathname === '/demo' || window.location.hash === '#demo'
      ? 'demo'
      : window.location.hash === '#guide'
      ? 'guide'
      : window.location.hash === '#status'
      ? 'status'
      : 'workspace';

  const [activeTab, setActiveTab] = useState<'workspace' | 'demo' | 'guide' | 'status'>(initialNav);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Demo Studio State
  const [demoSubPage, setDemoSubPage] = useState<'dashboard' | 'cases' | 'upload' | 'report' | 'selection-complete'>('dashboard');
  const [demoCases, setDemoCases] = useState<DemoCase[]>(initialDemoCases);
  const [selectedCase, setSelectedCase] = useState<DemoCase>(initialDemoCases[0]);
  const [demoSearch, setDemoSearch] = useState('');
  const [demoFilter, setDemoFilter] = useState('all');
  const [demoModalOpen, setDemoModalOpen] = useState(false);
  const [demoFiles, setDemoFiles] = useState<Record<string, File>>({});
  const [demoError, setDemoError] = useState('');

  const toggleLanguage = () => {
    const nextLang: Language = lang === 'bn' ? 'en' : 'bn';
    setLang(nextLang);
    document.documentElement.lang = nextLang;
  };

  const navigateTab = (tab: 'workspace' | 'demo' | 'guide' | 'status') => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
    if (tab === 'demo') {
      window.history.replaceState(null, '', '#demo');
    } else if (tab === 'guide') {
      window.history.replaceState(null, '', '#guide');
    } else if (tab === 'status') {
      window.history.replaceState(null, '', '#status');
    } else {
      window.history.replaceState(null, '', '#workspace');
    }
  };

  const openDemoCase = (c: DemoCase) => {
    setSelectedCase(c);
    setDemoFiles({});
    setDemoError('');
    setDemoSubPage(c.status === 'draft' ? 'upload' : 'report');
  };

  const selectDemoFile = (kind: string, file?: File) => {
    if (!file) return;
    if (!['application/pdf', 'image/png', 'image/jpeg'].includes(file.type) || file.size > 10 * 1024 * 1024) {
      setDemoError(t('PDF, JPG বা PNG ফরম্যাটের সর্বোচ্চ ১০ MB ফাইল নির্বাচন করুন।', 'Please choose a PDF, JPG, or PNG up to 10 MB.'));
      return;
    }
    setDemoError('');
    setDemoFiles((prev) => ({ ...prev, [kind]: file }));
  };

  return (
    <div className="app-container">
      {/* Accessible Skip Link */}
      <a
        href="#main-content"
        style={{
          position: 'fixed',
          left: 20,
          top: -100,
          background: 'var(--primary-800)',
          color: '#fff',
          padding: '10px 16px',
          zIndex: 9999,
          borderRadius: 'var(--radius-md)',
          fontWeight: 700,
        }}
        onFocus={(e) => (e.currentTarget.style.top = '16px')}
        onBlur={(e) => (e.currentTarget.style.top = '-100px')}
      >
        {t('মূল অংশে যান', 'Skip to content')}
      </a>

      {/* Responsive Navigation Sidebar */}
      <aside className={`app-sidebar ${mobileMenuOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="brand-crest" onClick={() => navigateTab('workspace')}>
            <div className="brand-icon-box">
              <ShieldCheck size={28} />
            </div>
            <div className="brand-titles">
              <h1>নিরীক্ষা</h1>
              <span className="brand-sub">NEERIKKHA</span>
            </div>
          </div>
        </div>

        <div className="sidebar-section-title">
          {t('প্ল্যাটফর্ম মডিউল', 'PLATFORM MODULES')}
        </div>

        <nav className="sidebar-nav">
          <button
            type="button"
            className={`nav-item ${activeTab === 'workspace' ? 'active' : ''}`}
            onClick={() => navigateTab('workspace')}
          >
            <FolderOpen size={18} />
            <span>{t('লাইভ কর্মক্ষেত্র', 'Live Workspace')}</span>
            <span className="nav-count">{t('সক্রিয়', 'Live')}</span>
          </button>

          <button
            type="button"
            className={`nav-item ${activeTab === 'demo' ? 'active' : ''}`}
            onClick={() => navigateTab('demo')}
          >
            <LayoutDashboard size={18} />
            <span>{t('ইন্টারেক্টিভ ডেমো', 'Interactive Studio')}</span>
            <span className="nav-count">{formatDigit(demoCases.length, lang)}</span>
          </button>

          <button
            type="button"
            className={`nav-item ${activeTab === 'guide' ? 'active' : ''}`}
            onClick={() => navigateTab('guide')}
          >
            <BookOpen size={18} />
            <span>{t('আইনি নির্দেশিকা', 'Due Diligence Guide')}</span>
          </button>

          <button
            type="button"
            className={`nav-item ${activeTab === 'status' ? 'active' : ''}`}
            onClick={() => navigateTab('status')}
          >
            <Cpu size={18} />
            <span>{t('সিস্টেম স্থিতি', 'Pipeline Status')}</span>
          </button>
        </nav>

        {/* Institutional Trust Box */}
        <div className="sidebar-trust-box">
          <div className="trust-badge">
            <ShieldCheck size={14} />
            <span>{t('স্বত্ব ও আইনি সুরক্ষা', 'TITLE DUE DILIGENCE')}</span>
          </div>
          <h4>{t('সিদ্ধান্তের পূর্বে নির্ভুল স্পষ্টতা', 'Clarity Before Commitment')}</h4>
          <p>
            {t(
              'দলিল, খতিয়ান ও নামজারি — তিন দপ্তরের নথির সমন্বিত আইনি ও প্রাতিষ্ঠানিক বিশ্লেষণ।',
              'Three statutory records reconciled in one unified due diligence workspace.'
            )}
          </p>
          <button
            type="button"
            className="trust-btn"
            onClick={() => navigateTab('guide')}
          >
            {t('পদ্ধতি জানুন', 'Read Guide')}
            <ArrowUpRight size={13} />
          </button>
        </div>

        {/* User Session Profile in Sidebar */}
        <div className="sidebar-user">
          <div className="user-avatar">ন</div>
          <div className="user-meta">
            <div className="user-name">
              {activeTab === 'workspace' ? t('লাইভ ব্যবহারকারী সেশন', 'Live Session User') : t('ডেমো পরিবেশ', 'Demo Explorer')}
            </div>
            <div className="user-role">
              <span className="online-dot" />
              <span>{t('নিরাপদ সংযোগ', 'TLS Encrypted')}</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Shell */}
      <div className="app-content">
        {/* Sticky Glassmorphic Header */}
        <header className="app-topbar">
          <div className="topbar-left">
            <button
              type="button"
              className="mobile-menu-trigger"
              aria-label="Toggle Navigation"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <Menu size={20} />
            </button>

            <div className="breadcrumbs">
              <span>{t('নিরীক্ষা প্ল্যাটফর্ম', 'Neerikkha Platform')}</span>
              <span className="crumb-separator">/</span>
              <span className="crumb-current">
                {activeTab === 'workspace'
                  ? t('লাইভ কর্মক্ষেত্র', 'Live Workspace')
                  : activeTab === 'demo'
                  ? t('ইন্টারেক্টিভ ডেমো', 'Interactive Studio')
                  : activeTab === 'guide'
                  ? t('আইনি নির্দেশিকা', 'Due Diligence Guide')
                  : t('সিস্টেম স্থিতি', 'Pipeline Status')}
              </span>
            </div>
          </div>

          <div className="topbar-actions">
            {/* Quick Mode Switcher in Header */}
            <div className="mode-toggle-group">
              <button
                type="button"
                className={`mode-btn ${activeTab === 'workspace' ? 'active' : ''}`}
                onClick={() => navigateTab('workspace')}
              >
                <FolderOpen size={14} />
                {t('লাইভ কর্মক্ষেত্র', 'Live Workspace')}
              </button>
              <button
                type="button"
                className={`mode-btn ${activeTab === 'demo' ? 'active' : ''}`}
                onClick={() => navigateTab('demo')}
              >
                <Sparkles size={14} />
                {t('ইন্টারেক্টিভ ডেমো', 'Interactive Demo')}
              </button>
            </div>

            <span className="badge-pilot">
              <span className="pilot-pulse" />
              {t('পাইলট সংস্করণ', 'PILOT EDITION')}
            </span>

            <button
              type="button"
              className="lang-switch-btn"
              onClick={toggleLanguage}
              aria-label="Toggle Language"
            >
              <Languages size={15} />
              <span>{lang === 'bn' ? 'English' : 'বাংলা'}</span>
            </button>
          </div>
        </header>

        {/* Dynamic Main Body Content */}
        <main id="main-content" className="main-view-container">
          {/* TAB 1: LIVE AUTHENTICATED WORKSPACE */}
          {activeTab === 'workspace' && <Account lang={lang} />}

          {/* TAB 2: INTERACTIVE DEMO STUDIO */}
          {activeTab === 'demo' && (
            <div className="animate-fade-in">
              <div className="banner-notice warning">
                <Sparkles size={16} />
                <div>
                  <strong>{t('ইন্টারেক্টিভ ডেমো মোড:', 'Interactive Studio Preview:')}</strong>{' '}
                  {t(
                    'এটি একটি হ্যান্ডস-অন ডেমো পরিবেশ। এতে সিন্থেটিক তথ্য দিয়ে বাস্তব জমি যাচাইয়ের অমিল (দাগ ১২০ বনাম ১২৮) প্রদর্শন করা হয়েছে। প্রকৃত জমি যাচাই করতে "লাইভ কর্মক্ষেত্র" ব্যবহার করুন।',
                    'Synthetic demonstration mode showcasing real-world discrepancy resolution. Use "Live Workspace" to connect your server documents.'
                  )}
                </div>
              </div>

              {/* Sub-Views within Demo */}
              {(demoSubPage === 'dashboard' || demoSubPage === 'cases') && (
                <>
                  <div className="page-header-row">
                    <div>
                      <div className="page-eyebrow">
                        <FolderOpen size={14} />
                        {t('সিন্থেটিক কেস পোর্টফোলিও', 'SYNTHETIC CASE DEMO')}
                      </div>
                      <h1 className="page-title">
                        {t('নমুনা জমির নথি ও স্বত্ব যাচাই চিত্র', 'Demonstration Due Diligence Portfolio')}
                      </h1>
                      <p className="page-subtitle">
                        {t(
                          'সাব-রেজিস্ট্রি বিক্রয় দলিল, ভূমি রেকর্ড অফিস ও নামজারির তথ্যের সমন্বিত রূপ স্বচক্ষে দেখুন।',
                          'Explore simulated cross-examination of Deed, Khatian, and Mutation records.'
                        )}
                      </p>
                    </div>

                    <button
                      type="button"
                      className="btn btn-primary btn-lg"
                      onClick={() => setDemoModalOpen(true)}
                    >
                      <Plus size={18} />
                      {t('নমুনা কেস তৈরি করুন', 'Create Demo Case')}
                    </button>
                  </div>

                  {/* Hero Showcase Card */}
                  <div className="hero-card">
                    <div>
                      <div className="hero-kicker">
                        {t('স্বত্ব যাচাইয়ের আধুনিক ভিত্তি', 'THE PINNACLE OF LAND DUE DILIGENCE')}
                      </div>
                      <h2>
                        {t('তিন অফিসের নথি।', 'Three Independent Offices.')}
                        <br />
                        {t('সিদ্ধান্তের পূর্বে এক অভিন্ন চিত্র।', 'One Unified View Before Financial Commitment.')}
                      </h2>
                      <p>
                        {t(
                          'বাংলাদেশে জমি ক্রয়ের ক্ষেত্রে দলিল, খতিয়ান ও নামজারির তথ্যে সামান্যতম দাগ বা জরিপের গরমিল অপূরণীয় আর্থিক ক্ষতির কারণ হতে পারে। নিরীক্ষা প্রতিটি প্যারামিটার স্বয়ংক্রিয়ভাবে মিলিয়ে দেখে।',
                          'Cross-reconcile ownership continuity, plot boundary shifts, and survey classifications across Sub-Registry, DLRS, and AC Land.'
                        )}
                      </p>
                      <div className="hero-actions">
                        <button
                          type="button"
                          className="btn btn-gold btn-lg"
                          onClick={() => setDemoModalOpen(true)}
                        >
                          <Plus size={18} />
                          {t('নতুন কেস তৈরি করে পরীক্ষা করুন', 'Create Demonstration Case')}
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary btn-lg"
                          style={{ background: 'rgba(255,255,255,0.12)', color: '#fff', borderColor: 'rgba(255,255,255,0.2)' }}
                          onClick={() => navigateTab('guide')}
                        >
                          <BookOpen size={16} />
                          {t('ভূমি নির্দেশিকা দেখুন', 'Explore Legal Guide')}
                        </button>
                      </div>
                    </div>

                    {/* 3D Document Illustration Deck */}
                    <div className="hero-visual-stage" aria-hidden="true">
                      <div className="doc-deck">
                        <div className="doc-sheet back">
                          <div className="sheet-header">
                            <Map size={18} />
                            <span>খতিয়ান / DLRS</span>
                          </div>
                          <div className="sheet-lines">
                            <div className="sheet-line" style={{ width: '85%' }} />
                            <div className="sheet-line" style={{ width: '60%' }} />
                            <div className="sheet-line" style={{ width: '75%' }} />
                          </div>
                          <span className="sheet-badge">ROR</span>
                        </div>

                        <div className="doc-sheet mid">
                          <div className="sheet-header">
                            <Landmark size={18} />
                            <span>নামজারি / AC Land</span>
                          </div>
                          <div className="sheet-lines">
                            <div className="sheet-line" style={{ width: '90%' }} />
                            <div className="sheet-line" style={{ width: '70%' }} />
                            <div className="sheet-line" style={{ width: '80%' }} />
                          </div>
                          <span className="sheet-badge" style={{ background: 'var(--gold-100)', color: 'var(--gold-900)' }}>
                            DCR
                          </span>
                        </div>

                        <div className="doc-sheet front">
                          <div className="sheet-header">
                            <ShieldCheck size={18} color="var(--primary-700)" />
                            <span style={{ fontWeight: 800 }}>নিরীক্ষা সনদ</span>
                          </div>
                          <div style={{ fontSize: 13, fontWeight: 800, margin: '8px 0 6px', color: 'var(--primary-950)' }}>
                            সমন্বিত স্বত্ব চিত্র
                          </div>
                          <div className="sheet-lines">
                            <div className="sheet-line" style={{ width: '100%' }} />
                            <div className="sheet-line" style={{ width: '80%' }} />
                            <div className="sheet-line" style={{ width: '65%' }} />
                          </div>
                          <div
                            style={{
                              position: 'absolute',
                              bottom: 12,
                              right: 12,
                              width: 32,
                              height: 32,
                              borderRadius: 'var(--radius-full)',
                              border: '1px solid var(--primary-600)',
                              display: 'grid',
                              placeItems: 'center',
                              color: 'var(--primary-700)',
                            }}
                          >
                            <Check size={18} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Interactive Stats Grid */}
                  <div className="stats-grid">
                    <div className="stat-card">
                      <div className="stat-content">
                        <div className="stat-label">{t('মোট ডেমো কেস', 'Total Cases')}</div>
                        <div className="stat-number">{formatDigit(demoCases.length, lang)}</div>
                      </div>
                      <div className="stat-icon-wrapper neutral">
                        <FolderOpen size={24} />
                      </div>
                    </div>

                    <div className="stat-card">
                      <div className="stat-content">
                        <div className="stat-label">{t('অমিল শনাক্ত (Review)', 'Needs Review')}</div>
                        <div className="stat-number">
                          {formatDigit(demoCases.filter((c) => c.status === 'review').length, lang)}
                        </div>
                      </div>
                      <div className="stat-icon-wrapper amber">
                        <AlertTriangle size={24} />
                      </div>
                    </div>

                    <div className="stat-card">
                      <div className="stat-content">
                        <div className="stat-label">{t('সমন্বিত প্রতিবেদন', 'Sample Reports')}</div>
                        <div className="stat-number">
                          {formatDigit(demoCases.filter((c) => c.status === 'ready').length, lang)}
                        </div>
                      </div>
                      <div className="stat-icon-wrapper green">
                        <CheckCircle2 size={24} />
                      </div>
                    </div>

                    <div className="stat-card">
                      <div className="stat-content">
                        <div className="stat-label">{t('খসড়া প্রিভিউ', 'Draft Sessions')}</div>
                        <div className="stat-number">
                          {formatDigit(demoCases.filter((c) => c.status === 'draft').length, lang)}
                        </div>
                      </div>
                      <div className="stat-icon-wrapper neutral">
                        <FileText size={24} />
                      </div>
                    </div>
                  </div>

                  {/* Case Search & Table Panel */}
                  <div className="panel-card">
                    <div className="panel-header">
                      <div>
                        <h3>{t('সাম্প্রতিক কেস তালিকা', 'Recent Demo Case Records')}</h3>
                        <p>{t('যাচাইয়ের অগ্রগতি ও তথ্য পর্যালোচনা', 'Real-time reconciliation status and review actions')}</p>
                      </div>
                      <span className="badge-pilot">{t('নমুনা তথ্য সেট', 'SYNTHETIC FIXTURE')}</span>
                    </div>

                    <div className="filter-row">
                      <div className="search-input-box">
                        <Search size={18} />
                        <input
                          aria-label={t('কেস খুঁজুন', 'Search cases')}
                          placeholder={t(
                            'কেসের নাম, আইডি বা মৌজা দিয়ে অনুসন্ধান করুন…',
                            'Search by case title, ID, or mouza…'
                          )}
                          value={demoSearch}
                          onChange={(e) => setDemoSearch(e.target.value)}
                        />
                      </div>

                      <select
                        aria-label="Filter status"
                        value={demoFilter}
                        onChange={(e) => setDemoFilter(e.target.value)}
                        className="select-box"
                      >
                        <option value="all">{t('সব অবস্থা (All Statuses)', 'All Statuses')}</option>
                        <option value="review">{t('যাচাই প্রয়োজন (Needs Review)', 'Needs Review')}</option>
                        <option value="ready">{t('প্রতিবেদন প্রস্তুত (Ready)', 'Sample Report')}</option>
                        <option value="draft">{t('খসড়া (Draft)', 'Draft Session')}</option>
                      </select>
                    </div>

                    <div className="table-responsive">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>{t('কেস পরিচিতি ও রেফারেন্স', 'CASE REFERENCE & ID')}</th>
                            <th>{t('মৌজা ও জরিপ শ্রেণি', 'MOUZA & SURVEY')}</th>
                            <th>{t('নিবন্ধন তারিখ', 'DATE CREATED')}</th>
                            <th>{t('যাচাই অবস্থা', 'DUE DILIGENCE STATUS')}</th>
                            <th>{t('অ্যাকশন', 'ACTION')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {demoCases
                            .filter(
                              (c) =>
                                (demoFilter === 'all' || c.status === demoFilter) &&
                                `${c.id} ${c.name} ${c.mouza}`.toLowerCase().includes(demoSearch.toLowerCase())
                            )
                            .map((c) => (
                              <tr key={c.id}>
                                <td>
                                  <div className="case-identity-cell">
                                    <div className="case-icon-cell">
                                      <FileText size={18} />
                                    </div>
                                    <div>
                                      <div className="case-ref-title">{c.name}</div>
                                      <span className="case-id-badge">{c.id}</span>
                                    </div>
                                  </div>
                                </td>
                                <td>
                                  <div style={{ fontWeight: 600, color: 'var(--neutral-900)' }}>{c.mouza}</div>
                                  <div style={{ fontSize: 11, color: 'var(--neutral-500)' }}>
                                    {c.survey} {t('জরিপ', 'Survey')}
                                  </div>
                                </td>
                                <td>{formatDate(c.date, lang)}</td>
                                <td>
                                  <span
                                    className={`status-pill ${
                                      c.status === 'review' ? 'review' : c.status === 'ready' ? 'ready' : 'draft'
                                    }`}
                                  >
                                    <span className="status-dot" />
                                    {c.status === 'review'
                                      ? t('অমিল — যাচাই আবশ্যক', 'Needs Review')
                                      : c.status === 'ready'
                                      ? t('নমুনা প্রতিবেদন প্রস্তুত', 'Report Ready')
                                      : t('খসড়া আপলোড', 'Draft Session')}
                                  </span>
                                </td>
                                <td>
                                  <button
                                    type="button"
                                    className="btn btn-secondary btn-sm"
                                    onClick={() => openDemoCase(c)}
                                  >
                                    {c.status === 'draft' ? t('নথি যোগ করুন', 'Add Files') : t('প্রতিবেদন খুলুন', 'Open Report')}
                                    <ArrowUpRight size={14} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}

              {/* DEMO SUB-PAGE: UPLOAD PREVIEW */}
              {demoSubPage === 'upload' && (
                <div className="animate-fade-in">
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    style={{ marginBottom: 16 }}
                    onClick={() => setDemoSubPage('cases')}
                  >
                    <ArrowLeft size={16} />
                    {t('কেস তালিকায় ফিরে যান', 'Back to Cases')}
                  </button>

                  <div className="page-header-row">
                    <div>
                      <div className="page-eyebrow">
                        {selectedCase.id} · {t('নথি নির্বাচন প্রিভিউ', 'DOCUMENT SELECTION PREVIEW')}
                      </div>
                      <h1 className="page-title">{selectedCase.name}</h1>
                      <p className="page-subtitle">
                        {t(
                          'একই জমির জন্য তিনটি মূল নথি নির্বাচন করুন। এই প্রিভিউতে ফাইল কেবল আপনার ব্রাউজার সেশনে থাকে।',
                          'Select the three statutory records. Files remain isolated in your browser preview.'
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="tri-card-grid">
                    {[
                      {
                        key: 'deed',
                        title: t('সাব-রেজিস্ট্রি বিক্রয় দলিল', 'Registered Sale Deed'),
                        office: t('সাব-রেজিস্ট্রি অফিস (রেজিস্ট্রেশন অধিদপ্তর)', 'Sub-Registry Office'),
                        icon: FileText,
                      },
                      {
                        key: 'khatian',
                        title: t('রেকর্ড অব রাইটস (খতিয়ান / পরচা)', 'RoR Khatian Record'),
                        office: t('ভূমি রেকর্ড ও জরিপ অধিদপ্তর (DLRS)', 'Land Records Office (DLRS)'),
                        icon: Map,
                      },
                      {
                        key: 'mutation',
                        title: t('নামজারি ও ডিসিআর খতিয়ান', 'Mutation & DCR Record'),
                        office: t('সহকারী কমিশনার (ভূমি) কার্যালয়', 'AC Land Office'),
                        icon: Landmark,
                      },
                    ].map(({ key, title, office, icon: Icon }) => {
                      const file = demoFiles[key];
                      return (
                        <div key={key} className={`tri-card ${file ? 'completed' : ''}`}>
                          <div className="tri-card-header">
                            <div className="tri-card-icon">
                              <Icon size={22} />
                            </div>
                            {file ? (
                              <span className="status-pill success">
                                <Check size={12} />
                                {t('নির্বাচিত', 'Selected')}
                              </span>
                            ) : (
                              <span className="status-pill neutral">{t('অপেক্ষমাণ', 'Pending')}</span>
                            )}
                          </div>

                          <h3>{title}</h3>
                          <div className="tri-card-office">{office}</div>

                          <label
                            className="dropzone-box"
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => {
                              e.preventDefault();
                              selectDemoFile(key, e.dataTransfer.files[0]);
                            }}
                          >
                            <div className="dropzone-icon">
                              <Upload size={20} />
                            </div>
                            <div className="dropzone-title">
                              {file ? file.name : t('ফাইল ব্রাউজ বা ড্রপ করুন', 'Select document file')}
                            </div>
                            <div className="dropzone-subtitle">PDF, JPG, PNG (Max 10 MB)</div>
                            <input
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png"
                              onChange={(e) => selectDemoFile(key, e.target.files?.[0])}
                            />
                          </label>

                          {file && (
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              style={{ color: 'var(--semantic-danger)', marginTop: 12 }}
                              onClick={() =>
                                setDemoFiles((prev) => {
                                  const next = { ...prev };
                                  delete next[key];
                                  return next;
                                })
                              }
                            >
                              <X size={14} />
                              {t('ফাইলটি সরিয়ে দিন', 'Remove File')}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {demoError && (
                    <div className="banner-notice danger" role="alert">
                      <AlertTriangle size={18} />
                      <div>{demoError}</div>
                    </div>
                  )}

                  <div className="readiness-summary-card">
                    <div>
                      <h3 style={{ fontSize: 16, fontWeight: 800 }}>
                        {formatDigit(Object.keys(demoFiles).length, lang)}/৩ {t('নথি নির্বাচন করা হয়েছে', 'Documents Selected')}
                      </h3>
                      <p style={{ fontSize: 12, color: 'var(--neutral-500)', marginTop: 2 }}>
                        {t(
                          'বিশ্লেষণ পরবর্তী ধাপে যুক্ত হবে। এটি ব্রাউজার সেশনে নথি নির্বাচনের প্রিভিউ।',
                          'This interactive preview simulates client-side document readiness validation.'
                        )}
                      </p>
                    </div>

                    <button
                      type="button"
                      className="btn btn-primary btn-lg"
                      disabled={Object.keys(demoFiles).length !== 3}
                      onClick={() => setDemoSubPage('selection-complete')}
                    >
                      <CheckCircle2 size={18} />
                      {t('নথি নির্বাচন নিশ্চিত করুন', 'Confirm Document Selection')}
                    </button>
                  </div>
                </div>
              )}

              {/* DEMO SUB-PAGE: SELECTION COMPLETE */}
              {demoSubPage === 'selection-complete' && (
                <div className="panel-card animate-fade-in" style={{ padding: '64px 32px', textAlign: 'center' }}>
                  <div
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: 'var(--radius-full)',
                      background: 'var(--semantic-success-bg)',
                      color: 'var(--semantic-success)',
                      display: 'grid',
                      placeItems: 'center',
                      margin: '0 auto 20px',
                    }}
                  >
                    <CheckCircle2 size={36} />
                  </div>
                  <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--neutral-950)' }}>
                    {t('৩টি প্রয়োজনীয় নথি সফলভাবে নির্বাচন করা হয়েছে', 'Three Required Records Successfully Selected')}
                  </h2>
                  <p style={{ fontSize: 14, color: 'var(--neutral-600)', maxWidth: 540, margin: '10px auto 24px' }}>
                    {t(
                      'এটি সিন্থেটিক ইন্টারফেস প্রিভিউ। লাইভ ব্যাকএন্ডে এনক্রিপ্টেড সংরক্ষণ ও কৃত্রিম বুদ্ধিমত্তা চালিত OCR বিশ্লেষণ পরীক্ষা করতে "লাইভ কর্মক্ষেত্র" ব্যবহার করুন।',
                      'This completes the client readiness preview. Switch to "Live Workspace" to trigger real server-side encryption & AI vision extraction.'
                    )}
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 14 }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setDemoSubPage('upload')}
                    >
                      {t('নথিতে ফিরে যান', 'Review Selected Files')}
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => navigateTab('workspace')}
                    >
                      {t('লাইভ কর্মক্ষেত্রে যান', 'Open Live Workspace')}
                      <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
              )}

              {/* DEMO SUB-PAGE: SYNTHETIC REPORT PREVIEW */}
              {demoSubPage === 'report' && (
                <div className="animate-fade-in">
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    style={{ marginBottom: 16 }}
                    onClick={() => setDemoSubPage('cases')}
                  >
                    <ArrowLeft size={16} />
                    {t('কেস তালিকায় ফিরে যান', 'Back to Cases')}
                  </button>

                  <div className="page-header-row">
                    <div>
                      <div className="page-eyebrow">
                        {selectedCase.id} · {t('সমন্বিত স্বত্ব প্রতিবেদন প্রিভিউ', 'DUE DILIGENCE REPORT PREVIEW')}
                      </div>
                      <h1 className="page-title">{t('তিন দপ্তরের তথ্যের সমন্বিত নিরীক্ষা চিত্র', 'Tri-Office Reconciliation Report')}</h1>
                      <p className="page-subtitle">
                        {t(
                          'এই প্রতিবেদনে সাব-রেজিস্ট্রি দলিল, নামজারি এবং জরিপ খতিয়ানের তথ্যে বাস্তব অমিল (দাগ ১২০ বনাম ১২৮) প্রদর্শন করা হয়েছে।',
                          'Synthetic fixture highlighting parcel subdivision discrepancy (Plot 120 in Deed/Mutation vs Plot 128 in Khatian).'
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Discrepancy Alert Banner */}
                  <div className={`banner-notice ${selectedCase.status === 'review' ? 'danger' : 'success'}`}>
                    {selectedCase.status === 'review' ? <AlertTriangle size={20} /> : <CheckCircle2 size={20} />}
                    <div>
                      <h4 style={{ fontSize: 14, fontWeight: 800, margin: 0 }}>
                        {selectedCase.status === 'review'
                          ? t('সতর্কতা: দাগ নম্বরে গরমিল শনাক্ত হয়েছে (Discrepancy)', 'Warning: Substantive Plot Number Discrepancy Detected')
                          : t('সবকটি নথির তথ্যে নির্ভুল সামঞ্জস্য রয়েছে', 'Full Concordance Across Records')}
                      </h4>
                      <p style={{ fontSize: 12, marginTop: 4, margin: 0 }}>
                        {selectedCase.status === 'review'
                          ? t(
                              'বিক্রয় দলিল ও নামজারিতে দাগ নম্বর ১২০ উল্লেখ থাকলেও খতিয়ানে দাগ নম্বর ১২৮ লিপিবদ্ধ। জমি ক্রয়ের পূর্বে মূল বালাম বহি পরীক্ষা আবশ্যক।',
                              'The deed and mutation cite Plot 120, while the DLRS Khatian records Plot 128. Physical volume audit is mandatory.'
                            )
                          : t('নথিপত্র অনুযায়ী স্বত্বে কোনো অসঙ্গতি ধরা পড়েনি।', 'No statutory discrepancies detected in this sample.')}
                      </p>
                    </div>
                  </div>

                  {/* 3-Office Comparison Grid */}
                  <div className="tri-card-grid" style={{ marginTop: 24 }}>
                    {[
                      {
                        title: t('সাব-রেজিস্ট্রি দলিল', 'Sale Deed'),
                        office: t('সাব-রেজিস্ট্রি অফিস', 'Sub-Registry'),
                        icon: FileText,
                        plot: '120',
                        isMismatch: false,
                      },
                      {
                        title: t('রেকর্ড অব রাইটস (খতিয়ান)', 'RoR Khatian'),
                        office: t('ভূমি রেকর্ড ও জরিপ অধিদপ্তর', 'DLRS Office'),
                        icon: Map,
                        plot: selectedCase.status === 'review' ? '128' : '120',
                        isMismatch: selectedCase.status === 'review',
                      },
                      {
                        title: t('নামজারি ও ডিসিআর', 'Mutation'),
                        office: t('সহকারী কমিশনার (ভূমি) অফিস', 'AC Land Office'),
                        icon: Landmark,
                        plot: '120',
                        isMismatch: false,
                      },
                    ].map(({ title, office, icon: Icon, plot, isMismatch }, i) => (
                      <div key={i} className={`tri-card ${isMismatch ? 'danger' : ''}`} style={{ borderColor: isMismatch ? 'var(--semantic-danger-border)' : undefined }}>
                        <div className="tri-card-header">
                          <div className="tri-card-icon" style={{ background: isMismatch ? 'var(--semantic-danger-bg)' : undefined, color: isMismatch ? 'var(--semantic-danger)' : undefined }}>
                            <Icon size={22} />
                          </div>
                          {isMismatch ? (
                            <span className="status-pill danger">
                              <AlertTriangle size={12} />
                              {t('অমিল', 'Mismatch')}
                            </span>
                          ) : (
                            <span className="status-pill success">
                              <Check size={12} />
                              {t('মিলেছে', 'Agreed')}
                            </span>
                          )}
                        </div>

                        <h3>{title}</h3>
                        <div className="tri-card-office">{office}</div>

                        <div style={{ display: 'grid', gap: 10, borderTop: '1px solid var(--neutral-200)', paddingTop: 14 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                            <span style={{ color: 'var(--neutral-500)' }}>{t('জরিপ শ্রেণি:', 'Survey Type:')}</span>
                            <strong style={{ color: 'var(--neutral-900)' }}>{selectedCase.survey}</strong>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, alignItems: 'center' }}>
                            <span style={{ color: 'var(--neutral-500)' }}>{t('দাগ নম্বর:', 'Plot Number:')}</span>
                            <span className={isMismatch ? 'cell-mismatch' : 'cell-match'}>
                              {isMismatch && <AlertTriangle size={12} style={{ display: 'inline', marginRight: 4 }} />}
                              {plot}
                            </span>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                            <span style={{ color: 'var(--neutral-500)' }}>{t('তথ্যের উৎস:', 'Source:')}</span>
                            <span style={{ color: 'var(--neutral-600)' }}>{t('সিন্থেটিক নমুনা', 'Synthetic Fixture')}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Specific Actionable Recommendation Panel */}
                  {selectedCase.status === 'review' && (
                    <div className="panel-card" style={{ padding: 28, marginTop: 24, border: '1px solid var(--gold-200)' }}>
                      <span className="status-pill review" style={{ marginBottom: 12 }}>
                        <AlertTriangle size={13} />
                        {t('শনাক্তকৃত গরমিলের আইনি পর্যালোচনা', 'DISCREPANCY LEGAL AUDIT')}
                      </span>
                      <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--neutral-950)', marginTop: 8 }}>
                        {t('খতিয়ান এবং দলিলের দাগ নম্বরে সুস্পষ্ট অমিল রয়েছে', 'Substantive Conflict in Plot Number Specification')}
                      </h3>
                      <p style={{ fontSize: 13, color: 'var(--neutral-700)', marginTop: 6, lineHeight: 1.7 }}>
                        {t(
                          'একই জরিপের আওতায় বিক্রয় দলিল এবং ইউনিয়ন ভূমি অফিসের নামজারি নথিতে ১২০ দাগ উল্লেখ হলেও মূল জরিপ খতিয়ানে ১২৮ দাগ দেখানো হয়েছে। এটি সাধারণত জমি বিভাজনের সময় ভুল দাগ অন্তর্ভুক্তি অথবা পূর্ববর্তী জরিপের সাবেক দাগের বিভ্রান্তির কারণে ঘটে থাকে।',
                          'Deed & Mutation specify Plot 120, but the official DLRS Khatian records Plot 128. This divergence typically stems from unrecorded parcel subdivision or confusion between Sabek (former) and Hal (current) plot references.'
                        )}
                      </p>

                      <div style={{ background: 'var(--neutral-50)', padding: 18, borderRadius: 'var(--radius-md)', marginTop: 16 }}>
                        <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary-900)', marginBottom: 6 }}>
                          {t('প্রস্তাবিত পরবর্তী পদক্ষেপ (Recommended Next Steps):', 'Recommended Action Protocol:')}
                        </h4>
                        <ol style={{ paddingLeft: 20, fontSize: 12, color: 'var(--neutral-700)', lineHeight: 1.8 }}>
                          <li>{t('মূল দলিলের বালাম বহি এবং সূচি-১ (Index-I) সাব-রেজিস্ট্রি অফিসে যাচাই করুন।', 'Verify Sub-Registry Volume Register (Balam Bahi) & Index-I.')}</li>
                          <li>{t('সহকারী কমিশনার (ভূমি) কার্যালয়ে মিসকেস বা সংশোধনী রেকর্ড রয়েছে কিনা নিশ্চিত হন।', 'Examine AC Land case files for any pending amendment petitions.')}</li>
                          <li>{t('সংশ্লিষ্ট আমিন বা সার্ভেয়ার দ্বারা মৌজা নকশায় (Map) সরেজমিন দাগ সীমানা মেপে নিন।', 'Conduct physical cadastral boundary demarcation with a licensed surveyor.')}</li>
                        </ol>
                      </div>
                    </div>
                  )}

                  {/* Statutory Legal Notice */}
                  <div
                    style={{
                      background: 'var(--neutral-100)',
                      border: '1px solid var(--neutral-200)',
                      borderRadius: 'var(--radius-lg)',
                      padding: '18px 24px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14,
                      fontSize: 12,
                      color: 'var(--neutral-600)',
                      marginTop: 24,
                    }}
                  >
                    <ShieldCheck size={24} color="var(--primary-700)" style={{ flexShrink: 0 }} />
                    <p style={{ margin: 0 }}>{i18n.disclaimer[lang]}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: DUE DILIGENCE FIELD GUIDE */}
          {activeTab === 'guide' && (
            <div className="animate-fade-in">
              <div className="page-header-row">
                <div>
                  <div className="page-eyebrow">
                    <BookOpen size={14} />
                    {t('আইনি সহায়িকা ও নির্দেশিকা', 'STATUTORY DUE DILIGENCE HANDBOOK')}
                  </div>
                  <h1 className="page-title">{t('বাংলাদেশের ভূমি রেকর্ড ও স্বত্ব যাচাই নির্দেশিকা', 'Guide to Bangladesh Land Records & Title Audit')}</h1>
                  <p className="page-subtitle">
                    {t(
                      'কেন দলিল, খতিয়ান ও নামজারি—তিনটি নথিই সমান গুরুত্বপূর্ণ এবং কীভাবে ত্রুটি শনাক্ত করতে হয়।',
                      'Understanding why Deed, RoR Khatian, and Mutation must concord before purchasing land in Bangladesh.'
                    )}
                  </p>
                </div>
              </div>

              {/* 4 Step Workflow */}
              <div style={{ display: 'grid', gap: 16, marginBottom: 32 }}>
                {[
                  {
                    step: '০১',
                    title: t('কেস নিবন্ধন ও জরিপ নির্বাচন', 'Register Case & Identify Survey Standards'),
                    desc: t(
                      'একটি নির্দিষ্ট জমির জন্য কেস খুলুন এবং মৌজা ও জরিপ শ্রেণি (CS, SA, RS, বা BS) নির্ধারণ করুন। জরিপ ভেদে দাগ ও খতিয়ানের ধারাবাহিকতা ভিন্ন হয়।',
                      'Determine the operational survey era (CS, SA, RS, BS) for the mouza. Plot numbers diverge across historical survey regimes.'
                    ),
                  },
                  {
                    step: '০২',
                    title: t('তিন দপ্তরের মূল ৩টি নথি সংগ্রহ ও আপলোড', 'Procure the Three Statutory Records'),
                    desc: t(
                      '১) সাব-রেজিস্ট্রি অফিসের রেজিস্ট্রিকৃত বিক্রয় দলিল, ২) সহকারী কমিশনার ভূমি অফিসের নামজারি ও ডিসিআর, এবং ৩) ভূমি রেকর্ড অধিদপ্তরের জরিপ খতিয়ান (পরচা)।',
                      'Acquire the certified Deed from Sub-Registry, Mutation/DCR from AC Land, and RoR Khatian from DLRS.'
                    ),
                  },
                  {
                    step: '০৩',
                    title: t('মাল্টিমোডাল ভিশন দিয়ে তথ্য আহরণ ও মানবীয় যাচাই', 'Multimodal Extraction & Grounding Audit'),
                    desc: t(
                      'কৃত্রিম বুদ্ধিমত্তা ও বাংলা ওসিআর দিয়ে দাগ নম্বর, খতিয়ান, মৌজা, পরিমাণ ও ক্রেতা-বিক্রেতার নাম আলাদা করা হয়। প্রতিটি লাইনের প্রমাণ দেখে প্রয়োজনে সংশোধন করুন।',
                      'Extract attributes with AI vision. Cross-check candidate lines with original documents and confirm verified values.'
                    ),
                  },
                  {
                    step: '০৪',
                    title: t('সমতা ম্যাট্রিক্স ও ঝুঁকি বিশ্লেষণ', 'Title Due Diligence & Discrepancy Matrix'),
                    desc: t(
                      'তিন নথির দাগ, খতিয়ান ও পরিমাণের সামঞ্জস্য পরীক্ষা করে সিস্টেম স্বয়ংক্রিয়ভাবে অমিল ও ঝুঁকি নির্দেশ করে। এর ফলে আইনি বিরোধ বা প্রতারণার ঝুঁকি এড়ানো সম্ভব।',
                      'The system flags plot shifts, unmutated ownership gaps, and area discrepancies to avert future civil litigation.'
                    ),
                  },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="panel-card"
                    style={{
                      padding: '24px 28px',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 24,
                      marginBottom: 0,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 28,
                        fontWeight: 900,
                        color: 'var(--primary-600)',
                        fontFamily: 'var(--font-mono)',
                        lineHeight: 1,
                      }}
                    >
                      {item.step}
                    </div>
                    <div>
                      <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--neutral-950)' }}>{item.title}</h3>
                      <p style={{ fontSize: 13, color: 'var(--neutral-600)', marginTop: 6, lineHeight: 1.7 }}>
                        {item.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Historical Survey Breakdown Cards */}
              <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--neutral-950)', marginBottom: 16 }}>
                {t('বাংলাদেশের চারটি ঐতিহাসিক জরিপের পরিচয়', 'Historical Survey Classifications')}
              </h2>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18, marginBottom: 32 }}>
                {Object.entries(i18n.surveys).map(([key, meta]) => (
                  <div
                    key={key}
                    className="panel-card"
                    style={{ padding: 22, display: 'flex', flexDirection: 'column', marginBottom: 0 }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <span className="status-pill neutral" style={{ fontSize: 12, fontWeight: 800 }}>
                        {key} {t('জরিপ', 'Survey')}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--neutral-500)', fontFamily: 'var(--font-mono)' }}>
                        {meta.period}
                      </span>
                    </div>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--neutral-950)', marginBottom: 6 }}>
                      {lang === 'bn' ? meta.label : meta.enLabel}
                    </h3>
                    <p style={{ fontSize: 12, color: 'var(--neutral-600)', lineHeight: 1.6, flex: 1 }}>
                      {lang === 'bn' ? meta.desc.bn : meta.desc.en}
                    </p>
                  </div>
                ))}
              </div>

              {/* Statutory Legal Disclaimer */}
              <div
                style={{
                  background: 'var(--neutral-100)',
                  border: '1px solid var(--neutral-200)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '20px 24px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  fontSize: 12,
                  color: 'var(--neutral-600)',
                }}
              >
                <CircleHelp size={24} color="var(--primary-700)" style={{ flexShrink: 0 }} />
                <p style={{ margin: 0 }}>{i18n.disclaimer[lang]}</p>
              </div>
            </div>
          )}

          {/* TAB 4: SYSTEM STATUS & PIPELINE ROADMAP */}
          {activeTab === 'status' && <BuildHandoff lang={lang} />}
        </main>

        {/* Global Footer */}
        <footer className="app-footer">
          <div className="footer-copy">
            <strong>© 2026 {t('নিরীক্ষা', 'Neerikkha')}</strong>
            <span>·</span>
            <span>{t('ভূমি স্বত্ব ও দলিল সমন্বিত যাচাই প্ল্যাটফর্ম', 'Land Title Due Diligence Platform')}</span>
          </div>
          <div>
            <span>{t('ক্যাপস্টোন গবেষণা সংস্করণ · OddBenchers', 'Capstone Engineering Edition · OddBenchers')}</span>
          </div>
        </footer>
      </div>

      {/* Demo Case Creation Modal */}
      {demoModalOpen && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setDemoModalOpen(false);
          }}
        >
          <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="demo-modal-title">
            <div className="modal-header">
              <button
                type="button"
                className="modal-close-btn"
                aria-label={t('বন্ধ করুন', 'Close')}
                onClick={() => setDemoModalOpen(false)}
              >
                <X size={20} />
              </button>
              <div className="page-eyebrow" style={{ color: 'var(--primary-700)' }}>
                {t('নমুনা কেস তৈরি', 'DEMO SIMULATION')}
              </div>
              <h2 id="demo-modal-title" style={{ fontSize: 20, fontWeight: 800, color: 'var(--neutral-950)' }}>
                {t('একটি ডেমো কেস তৈরি করুন', 'Create a Demonstration Case')}
              </h2>
              <p style={{ fontSize: 13, color: 'var(--neutral-600)', marginTop: 4 }}>
                {t(
                  'কাল্পনিক প্লট ও মৌজা দিয়ে তাৎক্ষণিক প্রিভিউ দেখুন। ব্রাউজার রিফ্রেশ করলে এই নমুনা রিসেট হবে।',
                  'Simulate due diligence with custom test fixtures. Resets on full page reload.'
                )}
              </p>
            </div>

            <div className="modal-body">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const data = new FormData(e.currentTarget);
                  const newC: DemoCase = {
                    id: `LOCAL-${String(demoCases.length + 1).padStart(3, '0')}`,
                    name: String(data.get('name')).trim(),
                    mouza: String(data.get('mouza')).trim(),
                    survey: String(data.get('survey')),
                    status: 'draft',
                    date: new Date().toLocaleDateString('en-CA'),
                  };
                  if (!newC.name || !newC.mouza) return;
                  setDemoCases([newC, ...demoCases]);
                  setDemoModalOpen(false);
                  openDemoCase(newC);
                }}
              >
                <div className="form-group">
                  <label className="form-label" htmlFor="demo-case-name">
                    {t('কেসের রেফারেন্স নাম', 'Case Reference Name')}
                  </label>
                  <input
                    id="demo-case-name"
                    name="name"
                    required
                    maxLength={80}
                    className="form-input"
                    autoFocus
                    placeholder={t('যেমন: সাভার আবাসিক প্লট — ০৪', 'e.g. Savar Plot 04')}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="demo-case-mouza">
                    {t('মৌজার নাম', 'Mouza Name')}
                  </label>
                  <input
                    id="demo-case-mouza"
                    name="mouza"
                    required
                    maxLength={80}
                    className="form-input"
                    placeholder={t('যেমন: ভাটারা, সাভার, বাড্ডা', 'e.g. Vatara, Savar')}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="demo-case-survey">
                    {t('জরিপের শ্রেণি', 'Survey Standard')}
                  </label>
                  <select id="demo-case-survey" name="survey" className="form-input">
                    <option value="RS">RS (রিভিশনাল সার্ভে ১৯৬২–১৯৯০)</option>
                    <option value="BS">BS / সিটি সার্ভে (১৯৯৮–বর্তমান)</option>
                    <option value="SA">SA (স্টেট অ্যাকুইজিশন ১৯৫৬–১৯৬৩)</option>
                    <option value="CS">CS (ক্যাডাস্ট্রাল সার্ভে ১৮৮৮–১৯৪০)</option>
                  </select>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setDemoModalOpen(false)}
                  >
                    {t('বাতিল', 'Cancel')}
                  </button>
                  <button type="submit" className="btn btn-primary">
                    <Plus size={16} />
                    {t('তৈরি করে নথি নির্বাচন করুন', 'Create & Add Records')}
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

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
