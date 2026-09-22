import { useEffect, useMemo, useRef, useState } from 'react';
import type { Category, ThemeMode, Transaction, TxType } from './types';
import { calcTotals, filterByDateRange, groupByCategory, groupByDay, groupByMonth, lastNDays, lastNMonths, topCategory, validateBackup, validateTx } from './finance';
import { dbBulkPut, dbClear, dbDel, dbGetAll, dbPut } from './db';
import { fmt, parseAmount, timeStr, todayStr, toCSV, uid } from './utils';

const DEFAULT_CATS: Category[] = [
  { id: 'c1', label: 'حقوق', kind: 'income' },
  { id: 'c2', label: 'درآمد جانبی', kind: 'income' },
  { id: 'c3', label: 'خوراک', kind: 'expense' },
  { id: 'c4', label: 'حمل‌ونقل', kind: 'expense' },
  { id: 'c5', label: 'خرید', kind: 'expense' },
  { id: 'c6', label: 'قبض', kind: 'expense' },
  { id: 'c7', label: 'مسکن', kind: 'expense' },
  { id: 'c8', label: 'درمان', kind: 'expense' },
  { id: 'c9', label: 'آموزش', kind: 'expense' },
  { id: 'c10', label: 'تفریح', kind: 'expense' },
  { id: 'c11', label: 'سفر', kind: 'expense' },
  { id: 'c12', label: 'اقساط', kind: 'expense' },
  { id: 'c13', label: 'سرمایه‌گذاری', kind: 'expense' },
  { id: 'c14', label: 'سایر', kind: 'both' },
];
const LS_CATS = 'dk-cats';
const LS_THEME = 'dk-theme';
const LS_FALLBACK = 'dk-txs-fallback';

function loadCats(): Category[] {
  try {
    const s = localStorage.getItem(LS_CATS);
    if (s) {
      const a = JSON.parse(s);
      if (Array.isArray(a) && a.length && a.every(c =>
        c && typeof c.id === 'string' && typeof c.label === 'string' &&
        (c.kind === 'income' || c.kind === 'expense' || c.kind === 'both')
      )) return a as Category[];
    }
  } catch { /* fall back to defaults */ }
  return DEFAULT_CATS;
}
function loadTheme(): ThemeMode {
  try {
    const s = localStorage.getItem(LS_THEME);
    return s === 'light' || s === 'dark' || s === 'system' ? s : 'system';
  } catch {
    return 'system';
  }
}
function applyTheme(m: ThemeMode) {
  const root = document.documentElement;
  if (m === 'system') {
    const dark = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
    root.setAttribute('data-theme', dark ? 'dark' : 'light');
  } else {
    root.setAttribute('data-theme', m);
  }
}

type Tab = 'home' | 'txs' | 'reports' | 'settings';
type Period = 'today' | 'week' | 'month' | '3m' | 'year' | 'custom';

function periodRange(p: Period, customFrom: string, customTo: string): { from: string; to: string; label: string } {
  const t = todayStr();
  const local = (days: number) => {
    const x = new Date();
    x.setHours(12, 0, 0, 0);
    x.setDate(x.getDate() + days);
    return todayStr(x);
  };
  if (p === 'today') return { from: t, to: t, label: 'امروز' };
  if (p === 'week') return { from: local(-6), to: t, label: 'هفت روز اخیر' };
  if (p === 'month') return { from: t.slice(0, 7) + '-01', to: t, label: 'ماه جاری' };
  if (p === '3m') return { from: local(-89), to: t, label: 'سه ماه اخیر' };
  if (p === 'year') return { from: t.slice(0, 4) + '-01-01', to: t, label: 'امسال' };
  return { from: customFrom, to: customTo, label: 'بازه دلخواه' };
}

export default function App() {
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('home');
  const [theme, setTheme] = useState<ThemeMode>(() => loadTheme());
  const [cats, setCats] = useState<Category[]>(() => loadCats());
  const [toast, setToast] = useState('');
  const [modal, setModal] = useState<{ open: boolean; preset: TxType; edit?: Transaction }>({ open: false, preset: 'expense' });
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [fType, setFType] = useState<'all' | TxType>('all');
  const [fCat, setFCat] = useState('all');
  const [fFrom, setFFrom] = useState('');
  const [fTo, setFTo] = useState('');
  const [sort, setSort] = useState<'new' | 'old' | 'max' | 'min'>('new');
  const [period, setPeriod] = useState<Period>('month');
  const [cFrom, setCFrom] = useState(todayStr().slice(0, 7) + '-01');
  const [cTo, setCTo] = useState(todayStr());
  const [wipeStep, setWipeStep] = useState(0);
  const [newCat, setNewCat] = useState('');
  const [newCatKind, setNewCatKind] = useState<'income' | 'expense' | 'both'>('expense');
  const fileRef = useRef<HTMLInputElement>(null);

  const say = (m: string) => { setToast(m); setTimeout(() => setToast(''), 2600); };

  useEffect(() => {
    applyTheme(theme);
    try { localStorage.setItem(LS_THEME, theme); } catch { /* storage may be unavailable */ }
  }, [theme]);
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    const fn = () => { 
      try {
        const s = localStorage.getItem(LS_THEME) as ThemeMode;
        if (!s || s === 'system') applyTheme('system');
      } catch { applyTheme('system'); }
    };
    mq?.addEventListener?.('change', fn);
    return () => mq?.removeEventListener?.('change', fn);
  }, []);
  useEffect(() => {
    try { localStorage.setItem(LS_CATS, JSON.stringify(cats)); } catch { /* storage may be unavailable */ }
  }, [cats]);

  useEffect(() => {
    (async () => {
      try {
        const all = await dbGetAll();
        if (all.length) { setTxs(all.sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time))); }
        else {
          const fb = localStorage.getItem(LS_FALLBACK);
          if (fb) { const arr = JSON.parse(fb); if (Array.isArray(arr)) setTxs(arr); }
        }
      } catch {
        try { const fb = localStorage.getItem(LS_FALLBACK); if (fb) setTxs(JSON.parse(fb)); } catch { /* */ }
      } finally { setLoading(false); }
    })();
  }, []);
  useEffect(() => { try { localStorage.setItem(LS_FALLBACK, JSON.stringify(txs)); } catch { /* */ } }, [txs]);

  const totals = useMemo(() => calcTotals(txs), [txs]);
  const mk = todayStr().slice(0, 7);
  const monthTxs = useMemo(() => txs.filter(t => t.date.slice(0, 7) === mk), [txs, mk]);
  const monthTotals = useMemo(() => calcTotals(monthTxs), [monthTxs]);
  const last5 = useMemo(() => txs.slice(0, 5), [txs]);
  const days7 = useMemo(() => lastNDays(7), []);
  const trend7 = useMemo(() => groupByDay(txs, days7), [txs, days7]);
  const max7 = Math.max(1, ...trend7.flatMap(x => [x.income, x.expense]));

  const filtered = useMemo(() => {
    let r = [...txs];
    if (fType !== 'all') r = r.filter(t => t.type === fType);
    if (fCat !== 'all') r = r.filter(t => t.category === fCat);
    if (fFrom) r = r.filter(t => t.date >= fFrom);
    if (fTo) r = r.filter(t => t.date <= fTo);
    if (q.trim()) { const s = q.trim(); r = r.filter(t => t.title.includes(s) || t.description.includes(s) || t.category.includes(s)); }
    r.sort((a, b) => {
      if (sort === 'new') return (b.date + b.time).localeCompare(a.date + a.time);
      if (sort === 'old') return (a.date + a.time).localeCompare(b.date + b.time);
      if (sort === 'max') return b.amount - a.amount;
      return a.amount - b.amount;
    });
    return r;
  }, [txs, q, fType, fCat, fFrom, fTo, sort]);

  const pr = periodRange(period, cFrom, cTo);
  const reportTxs = useMemo(() => filterByDateRange(txs, pr.from, pr.to), [txs, pr.from, pr.to]);
  const reportTotals = useMemo(() => calcTotals(reportTxs), [reportTxs]);
  const dist = useMemo(() => groupByCategory(reportTxs, 'expense'), [reportTxs]);
  const maxDist = Math.max(1, ...dist.map(x => x.total));
  const repTrend = useMemo(() => {
    if (period === '3m') return groupByMonth(reportTxs, lastNMonths(3));
    if (period === 'year') return groupByMonth(reportTxs, lastNMonths(12));
    if (period === 'custom') {
      if (cFrom > cTo) return [];
      const start = new Date(cFrom + 'T12:00:00');
      const end = new Date(cTo + 'T12:00:00');
      const days = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
      if (days > 62) {
        const months: string[] = [];
        const cursor = new Date(start);
        cursor.setDate(1);
        while (cursor <= end) {
          months.push(todayStr(cursor).slice(0, 7));
          cursor.setMonth(cursor.getMonth() + 1);
        }
        return groupByMonth(reportTxs, months);
      }
      return groupByDay(reportTxs, lastNDays(Math.min(days, 14), end));
    }
    if (period === 'today') return groupByDay(reportTxs, [todayStr()]);
    if (period === 'week') return groupByDay(reportTxs, lastNDays(7));
    return groupByDay(reportTxs, lastNDays(30));
  }, [reportTxs, period, cFrom, cTo]);
  const maxRep = Math.max(1, ...repTrend.flatMap(x => [x.income, x.expense]));
  const customRangeError = period === 'custom' && cFrom > cTo ? 'تاریخ شروع نباید بعد از تاریخ پایان باشد.' : '';

  async function persistAdd(t: Transaction, isEdit: boolean) {
    let dbSaved = true;
    try { await dbPut(t); } catch { dbSaved = false; }
    setTxs(prev => {
      const rest = isEdit ? prev.filter(x => x.id !== t.id) : prev;
      return [t, ...rest].sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
    });
    if (!dbSaved) say('تراکنش در پشتیبان محلی ذخیره شد؛ پایگاه داده دستگاه در دسترس نبود.');
  }
  async function removeTx(id: string) {
    try { await dbDel(id); } catch { /* */ }
    setTxs(prev => prev.filter(x => x.id !== id));
    setConfirmId(null);
    say('تراکنش حذف شد.');
  }

  function exportJSON() {
    const data = JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), transactions: txs, categories: cats }, null, 2);
    const b = new Blob([data], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(b); a.download = 'dakhl-kharj-backup.json'; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    say('فایل پشتیبان دانلود شد.');
  }
  function exportCSV() {
    const csv = toCSV(txs.map(t => ({ ...t })));
    const b = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(b); a.download = 'dakhl-kharj.csv'; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    say('فایل اکسل (CSV) دانلود شد.');
  }
  async function importFile(f: File) {
    try {
      const txt = await f.text();
      const obj = JSON.parse(txt);
      const err = validateBackup(obj);
      if (err) { say('فایل خراب است: ' + err); return; }
      const rawList = (obj as { transactions: Transaction[] }).transactions;
      const incomingCats = (obj as { categories?: Category[] }).categories;
      const now = new Date().toISOString();
      const list = rawList.map(t => ({
        ...t,
        createdAt: t.createdAt || now,
        updatedAt: t.updatedAt || now,
        description: t.description || '',
      }));
      await dbBulkPut(list);
      setTxs([...list].sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time)));
      if (incomingCats && Array.isArray(incomingCats) && incomingCats.length) setCats(incomingCats);
      say('بازیابی با موفقیت انجام شد.');
    } catch { say('فایل خراب است و اطلاعات فعلی حفظ شد.'); }
  }

  function addCategory() {
    const v = newCat.trim();
    if (!v) { say('نام دسته را وارد کنید.'); return; }
    if (cats.some(c => c.label === v)) { say('این دسته از قبل وجود دارد.'); return; }
    setCats(p => [...p, { id: uid(), label: v, kind: newCatKind }]);
    setNewCat('');
    say('دسته اضافه شد.');
  }
  function delCategory(id: string) {
    const c = cats.find(x => x.id === id);
    if (!c) return;
    if (DEFAULT_CATS.some(x => x.id === c.id)) { say('دسته‌های پیش‌فرض قابل حذف نیستند.'); return; }
    if (txs.some(t => t.category === c.label)) { say('این دسته تراکنش دارد و حذف آن مجاز نیست.'); return; }
    setCats(p => p.filter(x => x.id !== id));
    say('دسته حذف شد.');
  }

  async function wipeAll() {
    try {
      await dbClear();
      localStorage.removeItem(LS_FALLBACK);
      localStorage.removeItem(LS_CATS);
      setTxs([]);
      setCats(DEFAULT_CATS);
      setWipeStep(0);
      say('همه تراکنش‌ها و دسته‌های سفارشی حذف شد.');
    } catch {
      say('حذف اطلاعات انجام نشد؛ اطلاعات فعلی حفظ شد.');
    }
  }

  if (loading) return <div className="wrap"><div className="empty">در حال بارگذاری…</div></div>;

  return (
    <>
      <header className="top">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true"><span>ت</span></div>
          <div>
            <h1>دخل‌وخرج من</h1>
            <p>مدیریت ساده و آفلاین</p>
          </div>
        </div>
        <button className="btn ghost theme-button" aria-label="تغییر حالت نمایش" onClick={() => setTheme(theme === 'dark' ? 'light' : theme === 'light' ? 'system' : 'dark')}>
          <span aria-hidden="true">◐</span>
          {theme === 'dark' ? 'تاریک' : theme === 'light' ? 'روشن' : 'سیستم'}
        </button>
      </header>
      {toast ? <div className="toast"><div>{toast}</div></div> : null}
      <div className="wrap">
        {tab === 'home' && (
          <>
            <section className="hero-card">
              <div className="hero-orb hero-orb-one" aria-hidden="true" />
              <div className="hero-orb hero-orb-two" aria-hidden="true" />
              <div className="hero-content">
                <div>
                  <div className="hero-label">موجودی فعلی</div>
                  <div className="hero-balance">{fmt(totals.balance)}</div>
                  <div className="hero-note">درآمد و هزینه‌های ثبت‌شده روی همین دستگاه</div>
                </div>
                <div className="hero-chip" aria-hidden="true">ت</div>
              </div>
              <div className="hero-stats">
                <div><span>درآمد کل</span><b>{fmt(totals.income)}</b></div>
                <div><span>هزینه کل</span><b>{fmt(totals.expense)}</b></div>
                <div><span>تراکنش</span><b>{totals.count.toLocaleString('fa-IR')}</b></div>
              </div>
            </section>
            <div className="quick-actions">
              <button className="action-card income-action" onClick={() => setModal({ open: true, preset: 'income' })}>
                <span className="action-icon" aria-hidden="true">＋</span>
                <span><b>ثبت درآمد</b><small>ورودی جدید</small></span>
              </button>
              <button className="action-card expense-action" onClick={() => setModal({ open: true, preset: 'expense' })}>
                <span className="action-icon" aria-hidden="true">−</span>
                <span><b>ثبت هزینه</b><small>خروجی جدید</small></span>
              </button>
            </div>
            <div className="grid cards">
              <div className="card stat-card"><div className="k">درآمد ماه جاری</div><div className="v in">{fmt(monthTotals.income)}</div></div>
              <div className="card stat-card"><div className="k">هزینه ماه جاری</div><div className="v out">{fmt(monthTotals.expense)}</div></div>
              <div className="card stat-card"><div className="k">مانده ماه جاری</div><div className="v bal">{fmt(monthTotals.balance)}</div></div>
            </div>
            <h2>نمودار هفت روز اخیر</h2>
            {txs.length === 0 ? <div className="empty">هنوز تراکنشی ثبت نشده است. از دکمه‌های بالا اولین تراکنش را ثبت کنید.</div> : (
              <div className="card">
                <div className="bars">
                  {trend7.map(d => (
                    <div className="bar" key={d.date}>
                      <div className="col" title={'درآمد ' + d.income} style={{ height: Math.max(3, (d.income / max7) * 52), background: '#16a34a' }} />
                      <div className="col" title={'هزینه ' + d.expense} style={{ height: Math.max(3, (d.expense / max7) * 52), background: '#dc2626' }} />
                      <span className="muted" style={{ fontSize: 10 }}>{d.date.slice(5)}</span>
                    </div>
                  ))}
                </div>
                <div className="muted">سبز: درآمد — قرمز: هزینه</div>
              </div>
            )}
            <h2>خلاصه مالی</h2>
            <div className="card">
              <div>تعداد کل تراکنش‌ها: <b>{totals.count.toLocaleString('fa-IR')}</b></div>
              <div className="muted">بیشترین دسته هزینه: {topCategory(txs)}</div>
            </div>
            <h2>آخرین تراکنش‌ها</h2>
            {last5.length === 0 ? <div className="empty">تراکنشی وجود ندارد.</div> : (
              <div className="list">
                {last5.map(t => (
                  <div className="item" key={t.id}>
                    <div><b>{t.title}</b> <span className={`badge ${t.type === 'income' ? 'in' : 'out'}`}>{t.type === 'income' ? 'درآمد' : 'هزینه'}</span><div className="muted">{t.category} — {t.date} {t.time}</div></div>
                    <div style={{ textAlign: 'left' }}><b style={{ color: t.type === 'income' ? 'var(--ok)' : 'var(--bad)' }}>{fmt(t.amount)}</b></div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {tab === 'txs' && (
          <>
            <h2>تراکنش‌ها</h2>
            <div className="toolbar">
              <input placeholder="جستجو…" value={q} onChange={e => setQ(e.target.value)} />
              <select value={fType} onChange={e => setFType(e.target.value as 'all' | TxType)}>
                <option value="all">همه انواع</option><option value="income">درآمد</option><option value="expense">هزینه</option>
              </select>
              <select value={fCat} onChange={e => setFCat(e.target.value)}>
                <option value="all">همه دسته‌ها</option>{cats.map(c => <option key={c.id} value={c.label}>{c.label}</option>)}
              </select>
              <select value={sort} onChange={e => setSort(e.target.value as 'new' | 'old' | 'max' | 'min')}>
                <option value="new">جدیدترین</option><option value="old">قدیمی‌ترین</option><option value="max">بیشترین مبلغ</option><option value="min">کمترین مبلغ</option>
              </select>
            </div>
            <div className="toolbar">
              <div><label>از تاریخ</label><input type="date" value={fFrom} onChange={e => setFFrom(e.target.value)} /></div>
              <div><label>تا تاریخ</label><input type="date" value={fTo} onChange={e => setFTo(e.target.value)} /></div>
              <div style={{ display: 'flex', alignItems: 'flex-end' }}><button className="btn ghost" onClick={() => { setQ(''); setFType('all'); setFCat('all'); setFFrom(''); setFTo(''); }}>پاک کردن فیلتر</button></div>
            </div>
            {filtered.length === 0 ? <div className="empty">موردی یافت نشد. فیلترها را تغییر دهید یا تراکنش جدید ثبت کنید.</div> : (
              <div className="list">
                {filtered.map(t => (
                  <div className="item" key={t.id}>
                    <div style={{ flex: 1 }}>
                      <b>{t.title}</b> <span className={`badge ${t.type === 'income' ? 'in' : 'out'}`}>{t.type === 'income' ? 'درآمد' : 'هزینه'}</span>
                      <div className="muted">{t.category} — {t.date} {t.time} — {fmt(t.amount)}</div>
                      {detailId === t.id && <div style={{ marginTop: 6, fontSize: 13 }}>{t.description ? t.description : 'بدون توضیح'}</div>}
                    </div>
                    <div className="row">
                      <button className="btn ghost" onClick={() => setDetailId(detailId === t.id ? null : t.id)}>جزئیات</button>
                      <button className="btn ghost" onClick={() => setModal({ open: true, preset: t.type, edit: t })}>ویرایش</button>
                      <button className="btn danger" onClick={() => setConfirmId(t.id)}>حذف</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {tab === 'reports' && (
          <>
            <h2>گزارش‌ها — {pr.label}</h2>
            <div className="row">
              {(['today', 'week', 'month', '3m', 'year', 'custom'] as Period[]).map(p => (
                <button key={p} className={period === p ? 'btn' : 'btn ghost'} onClick={() => setPeriod(p)}>
                  {p === 'today' ? 'امروز' : p === 'week' ? 'این هفته' : p === 'month' ? 'این ماه' : p === '3m' ? 'سه ماه اخیر' : p === 'year' ? 'امسال' : 'بازه دلخواه'}
                </button>
              ))}
            </div>
            {period === 'custom' && (
              <div className="toolbar">
                <div><label>از تاریخ</label><input type="date" value={cFrom} onChange={e => setCFrom(e.target.value)} /></div>
                <div><label>تا تاریخ</label><input type="date" value={cTo} onChange={e => setCTo(e.target.value)} /></div>
              </div>
            )}
            {customRangeError ? <div className="err">{customRangeError}</div> : reportTxs.length === 0 ? <div className="empty">در این بازه داده‌ای وجود ندارد.</div> : (
              <>
                <div className="grid cards" style={{ marginTop: 10 }}>
                  <div className="card"><div className="k">مجموع درآمد</div><div className="v in">{fmt(reportTotals.income)}</div></div>
                  <div className="card"><div className="k">مجموع هزینه</div><div className="v out">{fmt(reportTotals.expense)}</div></div>
                  <div className="card"><div className="k">مانده</div><div className="v bal">{fmt(reportTotals.balance)}</div></div>
                  <div className="card"><div className="k">تعداد تراکنش</div><div className="v">{reportTotals.count.toLocaleString('fa-IR')}</div></div>
                  <div className="card"><div className="k">بیشترین دسته هزینه</div><div className="v">{topCategory(reportTxs)}</div></div>
                </div>
                <h3>روند درآمد و هزینه</h3>
                <div className="card">
                  <div className="bars">
                    {repTrend.map(d => (
                      <div className="bar" key={d.date}>
                        <div className="col" style={{ height: Math.max(3, (d.income / maxRep) * 48), background: '#16a34a' }} />
                        <div className="col" style={{ height: Math.max(3, (d.expense / maxRep) * 48), background: '#dc2626' }} />
                        <span className="muted" style={{ fontSize: 9 }}>{d.date.replace('-', '/')}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <h3>توزیع هزینه بر اساس دسته</h3>
                <div className="card grid">
                  {dist.map(x => (
                    <div key={x.category}>
                      <div className="row" style={{ justifyContent: 'space-between' }}><span>{x.category}</span><b>{fmt(x.total)}</b></div>
                      <div className="hbar"><i style={{ width: Math.round((x.total / maxDist) * 100) + '%' }} /></div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {tab === 'settings' && (
          <>
            <h2>تنظیمات</h2>
            <div className="card">
              <h3>حالت نمایش</h3>
              <div className="row">
                {(['light', 'dark', 'system'] as ThemeMode[]).map(m => (
                  <button key={m} className={theme === m ? 'btn' : 'btn ghost'} onClick={() => { setTheme(m); say('تم تغییر کرد.'); }}>
                    {m === 'light' ? 'روشن' : m === 'dark' ? 'تاریک' : 'سیستم'}
                  </button>
                ))}
              </div>
              <div className="muted" style={{ marginTop: 6 }}>واحد پول: تومان</div>
            </div>
            <div className="card" style={{ marginTop: 10 }}>
              <h3>مدیریت دسته‌بندی‌ها</h3>
              <div className="list">
                {cats.map(c => (
                  <div className="item" key={c.id}><span>{c.label} <span className="muted">({c.kind === 'income' ? 'درآمد' : c.kind === 'expense' ? 'هزینه' : 'هر دو'})</span></span><button className="btn ghost" onClick={() => delCategory(c.id)}>حذف</button></div>
                ))}
              </div>
              <div className="row" style={{ marginTop: 8 }}>
                <input placeholder="نام دسته جدید" value={newCat} onChange={e => setNewCat(e.target.value)} style={{ flex: 1, minWidth: 140 }} />
                <select value={newCatKind} onChange={e => setNewCatKind(e.target.value as 'income' | 'expense' | 'both')} style={{ maxWidth: 140 }}>
                  <option value="expense">هزینه</option><option value="income">درآمد</option><option value="both">هر دو</option>
                </select>
                <button className="btn" onClick={addCategory}>افزودن</button>
              </div>
            </div>
            <div className="card" style={{ marginTop: 10 }}>
              <h3>پشتیبان‌گیری و بازیابی</h3>
              <div className="row">
                <button className="btn" onClick={exportJSON}>دانلود پشتیبان (JSON)</button>
                <button className="btn ghost" onClick={exportCSV}>خروجی اکسل (CSV)</button>
                <button className="btn ghost" onClick={() => fileRef.current?.click()}>وارد کردن فایل</button>
                <input ref={fileRef} type="file" accept="application/json,.json" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) importFile(f); e.target.value = ''; }} />
              </div>
            </div>
            <div className="card" style={{ marginTop: 10 }}>
              <h3>حذف تمام اطلاعات</h3>
              {wipeStep === 0 ? <button className="btn danger" onClick={() => setWipeStep(1)}>حذف همه اطلاعات</button> : wipeStep === 1 ? (
                <><div className="err">این کار همه تراکنش‌ها و دسته‌های سفارشی را حذف می‌کند و قابل بازگشت نیست.</div><div className="row"><button className="btn danger" onClick={() => setWipeStep(2)}>بله، مطمئنم</button><button className="btn ghost" onClick={() => setWipeStep(0)}>انصراف</button></div></>
              ) : (
                <><div className="err">تأیید نهایی: همه تراکنش‌ها و دسته‌های سفارشی حذف می‌شوند.</div><div className="row"><button className="btn danger" onClick={wipeAll}>تأیید نهایی حذف</button><button className="btn ghost" onClick={() => setWipeStep(0)}>انصراف</button></div></>
              )}
            </div>
            <div className="card" style={{ marginTop: 10 }}>
              <h3>درباره</h3>
              <div className="muted">دخل‌وخرج من — نسخه ۱٫۰٫۰ — مدیریت ساده درآمد و هزینه، آفلاین و بدون نیاز به اینترنت.</div>
            </div>
          </>
        )}
      </div>

      <nav className="nav" aria-label="ناوبری اصلی">
        <button className={tab === 'home' ? 'on' : ''} onClick={() => setTab('home')}><span aria-hidden="true">⌂</span><small>خانه</small></button>
        <button className={tab === 'txs' ? 'on' : ''} onClick={() => setTab('txs')}><span aria-hidden="true">▤</span><small>تراکنش‌ها</small></button>
        <button className={tab === 'reports' ? 'on' : ''} onClick={() => setTab('reports')}><span aria-hidden="true">◔</span><small>گزارش‌ها</small></button>
        <button className={tab === 'settings' ? 'on' : ''} onClick={() => setTab('settings')}><span aria-hidden="true">⚙</span><small>تنظیمات</small></button>
      </nav>

      {modal.open && <TxModal preset={modal.preset} edit={modal.edit} cats={cats} onClose={() => setModal({ open: false, preset: 'expense' })} onSave={async (t, isEdit) => { await persistAdd(t, isEdit); setModal({ open: false, preset: 'expense' }); say(isEdit ? 'تراکنش ویرایش شد.' : 'تراکنش ثبت شد.'); }} />}

      {confirmId && (
        <div className="modal" onClick={() => setConfirmId(null)}>
          <div className="sheet" onClick={e => e.stopPropagation()}>
            <h3>حذف تراکنش</h3>
            <p>آیا از حذف این تراکنش مطمئن هستید؟</p>
            <div className="row"><button className="btn danger" onClick={() => removeTx(confirmId)}>بله، حذف شود</button><button className="btn ghost" onClick={() => setConfirmId(null)}>انصراف</button></div>
          </div>
        </div>
      )}
    </>
  );
}

function TxModal({ preset, edit, cats, onClose, onSave }: { preset: TxType; edit?: Transaction; cats: Category[]; onClose: () => void; onSave: (t: Transaction, isEdit: boolean) => void }) {
  const [type, setType] = useState<TxType>(edit?.type ?? preset);
  const [amount, setAmount] = useState(edit ? String(edit.amount) : '');
  const [title, setTitle] = useState(edit?.title ?? '');
  const [category, setCategory] = useState(edit?.category ?? '');
  const [date, setDate] = useState(edit?.date ?? todayStr());
  const [time, setTime] = useState(edit?.time ?? timeStr());
  const [desc, setDesc] = useState(edit?.description ?? '');
  const [errs, setErrs] = useState<string[]>([]);
  const avail = cats.filter(c => c.kind === 'both' || c.kind === type);

  function submit() {
    const e = validateTx({ type, amount, title, category, date });
    if (!e.length && !avail.some(c => c.label === category)) e.push('دسته‌بندی معتبر نیست.');
    if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)) e.push('ساعت نامعتبر است.');
    if (desc.trim().length > 500) e.push('توضیح بیش از حد طولانی است.');
    const num = parseAmount(amount);
    if (!e.length && num === null) e.push('مبلغ نامعتبر است.');
    if (e.length) { setErrs(e); return; }

    const now = new Date().toISOString();
    const t: Transaction = {
      id: edit?.id ?? uid(),
      type,
      amount: num as number,
      title: title.trim(),
      category,
      date,
      time,
      description: desc.trim(),
      createdAt: edit?.createdAt ?? now,
      updatedAt: now,
    };
    onSave(t, !!edit);
  }
  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label={edit ? 'ویرایش تراکنش' : 'ثبت تراکنش'} onClick={onClose}>
      <div className="sheet" onClick={e => e.stopPropagation()}>
        <h3>{edit ? 'ویرایش تراکنش' : type === 'income' ? 'ثبت درآمد' : 'ثبت هزینه'}</h3>
        {errs.length > 0 && <div className="err">{errs.map((x, i) => <div key={i}>• {x}</div>)}</div>}
        <div className="row">
          <button className={type === 'income' ? 'btn ok' : 'btn ghost'} onClick={() => { setType('income'); if (!cats.some(c => (c.kind === 'both' || c.kind === 'income') && c.label === category)) setCategory(''); }}>درآمد</button>
          <button className={type === 'expense' ? 'btn danger' : 'btn ghost'} onClick={() => { setType('expense'); if (!cats.some(c => (c.kind === 'both' || c.kind === 'expense') && c.label === category)) setCategory(''); }}>هزینه</button>
        </div>
        <label>مبلغ (تومان)</label>
        <input inputMode="numeric" autoFocus={!edit} placeholder="مثلاً 2500000" value={amount} onChange={e => setAmount(e.target.value)} aria-label="مبلغ به تومان" />
        <label>عنوان</label>
        <input placeholder="مثلاً حقوق مرداد" value={title} onChange={e => setTitle(e.target.value)} />
        <label>دسته‌بندی</label>
        <select value={category} onChange={e => setCategory(e.target.value)}>
          <option value="">انتخاب کنید…</option>{avail.map(c => <option key={c.id} value={c.label}>{c.label}</option>)}
        </select>
        <div className="toolbar" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <div><label>تاریخ</label><input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
          <div><label>ساعت</label><input type="time" value={time} onChange={e => setTime(e.target.value)} /></div>
        </div>
        <label>توضیح (اختیاری)</label>
        <textarea rows={2} value={desc} onChange={e => setDesc(e.target.value)} />
        <div className="row" style={{ marginTop: 12 }}>
          <button className="btn" onClick={submit}>{edit ? 'ذخیره تغییرات' : 'ثبت'}</button>
          <button className="btn ghost" onClick={onClose}>انصراف</button>
        </div>
      </div>
    </div>
  );
}
