import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  Mail,
  User,
  Eye,
  EyeOff,
  CheckCircle2,
  ArrowRight,
  Check,
  AlertCircle,
  LogIn,
  UserPlus,
} from 'lucide-react';

const punctuation = /[!"#$%&'()*+,\-./:;<=>?@[\]\\^_`{|}~]/;

export function AuthForm({
  busy,
  onSubmit,
  lang = 'bn',
}: {
  busy: boolean;
  onSubmit: (register: boolean, values: Record<string, string>) => Promise<void>;
  lang?: 'bn' | 'en';
}) {
  const [register, setRegister] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const t = (bn: string, en: string) => (lang === 'bn' ? bn : en);

  const checks = [
    {
      label: t('অন্তত ৮টি অক্ষর (সর্বোচ্চ ১২৮)', 'At least 8 characters (max 128)'),
      valid: Array.from(password).length >= 8 && Array.from(password).length <= 128,
    },
    {
      label: t('একটি বড় হাতের ইংরেজি অক্ষর (A–Z)', 'One uppercase letter (A–Z)'),
      valid: /[A-Z]/.test(password),
    },
    {
      label: t('একটি ছোট হাতের ইংরেজি অক্ষর (a–z)', 'One lowercase letter (a–z)'),
      valid: /[a-z]/.test(password),
    },
    {
      label: t('একটি সংখ্যা (0–9)', 'One numerical digit (0–9)'),
      valid: /[0-9]/.test(password),
    },
    {
      label: t('একটি বিশেষ চিহ্ন (যেমন ! @ # $)', 'One special character (! @ # $)'),
      valid: punctuation.test(password),
    },
  ];

  const allChecksPassed = checks.every((c) => c.valid);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    if (register && !allChecksPassed) {
      setError(t('পাসওয়ার্ডের সবকটি শর্ত পূরণ করা আবশ্যক।', 'Please meet all password security requirements.'));
      return;
    }

    if (register && password !== confirmation) {
      setError(t('পাসওয়ার্ড এবং নিশ্চিতকরণ পাসওয়ার্ড মেলেনি।', 'Password and confirmation do not match.'));
      return;
    }

    const values = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    values.email = values.email.trim();
    delete values.confirmation;
    void onSubmit(register, values);
  };

  return (
    <div className="auth-wrapper animate-slide-up">
      {/* Institutional Assurance Hero Panel */}
      <div className="auth-sidebar-hero">
        <div>
          <div className="brand-crest" style={{ marginBottom: 36 }}>
            <div className="brand-icon-box">
              <ShieldCheck size={26} />
            </div>
            <div className="brand-titles">
              <h1 style={{ color: '#fff' }}>নিরীক্ষা</h1>
              <span className="brand-sub" style={{ color: 'var(--gold-400)' }}>
                NEERIKKHA
              </span>
            </div>
          </div>

          <div className="hero-kicker" style={{ color: 'var(--gold-400)' }}>
            {t('নিরাপদ ভূমি যাচাই প্ল্যাটফর্ম', 'SECURE LAND DUE DILIGENCE')}
          </div>

          <h2 style={{ fontSize: 24, fontWeight: 800, lineHeight: 1.4, marginBottom: 16 }}>
            {t(
              'বাংলাদেশের জমি নথির সমন্বিত আইনি ও তথ্যগত যাচাই।',
              'Deterministic due diligence for Bangladesh land records.'
            )}
          </h2>

          <p style={{ fontSize: 13, color: 'var(--neutral-300)', lineHeight: 1.7, marginBottom: 24 }}>
            {t(
              'সাব-রেজিস্ট্রি দলিলের স্বত্ব, সহকারী কমিশনার (ভূমি) অফিসের নামজারি এবং জরিপ খতিয়ানের তথ্য মিলিয়ে দেখুন এক নিরাপদ ডিজিটাল কর্মক্ষেত্রে।',
              'Reconcile deed conveyance, mutation records, and RoR Khatians across Bangladesh statutory authorities.'
            )}
          </p>

          <div style={{ display: 'grid', gap: 14 }}>
            {[
              {
                title: t('২৫৬-বিট এনক্রিপশন', '256-bit Document Encryption'),
                desc: t('আপনার আপলোডকৃত ফাইলসমূহ সুরক্ষিত ও সংবেদনশীল রাখা হয়।', 'Uploaded title documents are strictly isolated & encrypted.'),
              },
              {
                title: t('আইনি ম্যানুয়াল মানদণ্ড', 'Statutory Concordance'),
                desc: t('রাষ্ট্রীয় ভূমি ব্যবস্থাপনা ও রেজিস্ট্রেশন আইনের নিয়মে পরীক্ষা।', 'Checks mapped to Registration Act 1908 & SAT Act 1950.'),
              },
              {
                title: t('সেশন নির্ভর গোপনীয়তা', 'Zero Permanent Exposure'),
                desc: t('প্রয়োজন ব্যতীত কোনো অননুমোদিত তৃতীয় পক্ষের প্রবেশাধিকার নেই।', 'Ephemeral sessions with strict credential expiration.'),
              },
            ].map((feature, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div
                  style={{
                    background: 'rgba(201, 152, 36, 0.15)',
                    color: 'var(--gold-400)',
                    padding: 6,
                    borderRadius: 8,
                    marginTop: 2,
                  }}
                >
                  <Check size={14} />
                </div>
                <div>
                  <h4 style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{feature.title}</h4>
                  <p style={{ fontSize: 11, color: 'var(--neutral-400)', margin: 0 }}>{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ fontSize: 11, color: 'var(--neutral-400)', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 16, marginTop: 24 }}>
          {t('ক্যাপস্টোন গবেষণা ও উন্নয়ন সংস্করণ · অডবেঞ্চার্স', 'Capstone R&D Edition · OddBenchers')}
        </div>
      </div>

      {/* Interactive Form Panel */}
      <div className="auth-form-container">
        {/* Segmented Sign In / Register Tab Switcher */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            background: 'var(--neutral-100)',
            border: '1px solid var(--neutral-200)',
            borderRadius: 'var(--radius-lg)',
            padding: 4,
            marginBottom: 24,
            gap: 4,
          }}
        >
          <button
            type="button"
            className={`btn btn-sm ${!register ? 'btn-primary' : 'btn-ghost'}`}
            style={{ borderRadius: 'var(--radius-md)', padding: '10px 14px', fontSize: 13, fontWeight: 700 }}
            onClick={() => {
              setRegister(false);
              setError('');
            }}
          >
            <LogIn size={15} />
            {t('লগইন করুন', 'Sign In')}
          </button>

          <button
            type="button"
            className={`btn btn-sm ${register ? 'btn-primary' : 'btn-ghost'}`}
            style={{ borderRadius: 'var(--radius-md)', padding: '10px 14px', fontSize: 13, fontWeight: 700 }}
            onClick={() => {
              setRegister(true);
              setError('');
            }}
          >
            <UserPlus size={15} />
            {t('নতুন অ্যাকাউন্ট', 'Create Account')}
          </button>
        </div>

        <h2>{register ? t('নতুন অ্যাকাউন্ট নিবন্ধন করুন', 'Create Your Account') : t('কর্মক্ষেত্রে প্রবেশ করুন', 'Welcome Back')}</h2>
        <p className="subtitle">
          {register
            ? t('আপনার নিরাপদ কর্মক্ষেত্র তৈরি করুন এবং তিন নথির যাচাই শুরু করুন।', 'Create a credentialed workspace to verify land titles.')
            : t('জমির সংরক্ষিত কেস ও নথি দেখতে ইমেইল ও পাসওয়ার্ড দিয়ে লগইন করুন।', 'Enter your credentials to access your document cases.')}
        </p>

        {error && (
          <div className="banner-notice danger" role="alert">
            <AlertCircle size={18} />
            <div>
              <strong>{t('ত্রুটি:', 'Notice:')}</strong> {error}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <fieldset disabled={busy} style={{ border: 0, padding: 0, margin: 0 }}>
            {register && (
              <div className="form-group">
                <label className="form-label" htmlFor="display_name">
                  {t('আপনার পূর্ণ নাম', 'Full Name')}
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="display_name"
                    name="display_name"
                    className="form-input"
                    required
                    maxLength={100}
                    autoComplete="name"
                    placeholder={t('উদা: মাহমুদুল হাসান', 'e.g. Mahbubul Alam')}
                    style={{ paddingLeft: 38 }}
                  />
                  <User size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--neutral-400)' }} />
                </div>
              </div>
            )}

            <div className="form-group">
              <label className="form-label" htmlFor="email">
                {t('অফিসিয়াল বা ব্যক্তিগত ইমেইল', 'Email Address')}
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="email"
                  type="email"
                  name="email"
                  className="form-input"
                  required
                  maxLength={254}
                  autoComplete="username"
                  placeholder="name@example.com"
                  style={{ paddingLeft: 38 }}
                />
                <Mail size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--neutral-400)' }} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="password">
                {t('গোপন পাসওয়ার্ড', 'Password')}
              </label>
              <div className="password-input-wrapper">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  className="form-input"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={register ? 'new-password' : 'current-password'}
                  placeholder="••••••••••••"
                  style={{ paddingLeft: 38, paddingRight: 40 }}
                />
                <Lock size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--neutral-400)' }} />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {register && (
                <ul className="password-criteria-list" id="password-rules">
                  {checks.map((check, idx) => (
                    <li key={idx} className={`criterion-item ${check.valid ? 'valid' : 'invalid'}`}>
                      <span className="criterion-icon">{check.valid ? <Check size={11} /> : '○'}</span>
                      {check.label}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {register && (
              <div className="form-group">
                <label className="form-label" htmlFor="confirmation">
                  {t('পাসওয়ার্ড নিশ্চিত করুন', 'Confirm Password')}
                </label>
                <div className="password-input-wrapper">
                  <input
                    id="confirmation"
                    type={showPassword ? 'text' : 'password'}
                    name="confirmation"
                    className="form-input"
                    required
                    value={confirmation}
                    onChange={(e) => setConfirmation(e.target.value)}
                    autoComplete="new-password"
                    placeholder="••••••••••••"
                    style={{ paddingLeft: 38 }}
                  />
                  <Lock size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--neutral-400)' }} />
                </div>
                {confirmation && password !== confirmation && (
                  <p style={{ fontSize: 11, color: 'var(--semantic-danger)', marginTop: 6 }}>
                    {t('দুটি পাসওয়ার্ড এখনও মেলেনি।', 'Passwords do not match yet.')}
                  </p>
                )}
              </div>
            )}

            <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: 8 }} disabled={busy}>
              {busy ? (
                <>
                  <div className="pilot-pulse" style={{ background: '#fff' }} />
                  {t('অনুগ্রহ করে অপেক্ষা করুন…', 'Authenticating…')}
                </>
              ) : register ? (
                <>
                  {t('অ্যাকাউন্ট তৈরি ও স্বয়ংক্রিয় লগইন', 'Create Account & Continue')}
                  <ArrowRight size={17} />
                </>
              ) : (
                <>
                  {t('কর্মক্ষেত্রে লগইন করুন', 'Sign In to Workspace')}
                  <ArrowRight size={17} />
                </>
              )}
            </button>
          </fieldset>
        </form>

        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            disabled={busy}
            onClick={() => {
              setRegister(!register);
              setPassword('');
              setConfirmation('');
              setError('');
            }}
          >
            {register ? t('আগে থেকেই অ্যাকাউন্ট আছে? লগইন করুন', 'Already have an account? Sign in') : t('নতুন ব্যবহারকারী? অ্যাকাউন্ট নিবন্ধন করুন', "Don't have an account? Register")}
          </button>
        </div>
      </div>
    </div>
  );
}
