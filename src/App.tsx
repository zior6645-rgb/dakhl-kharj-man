import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import type { AppSettings, Category, CurrencyCode, FontScale, HomeCardId, LanguageCode, ThemeMode, Transaction, TxType } from './types';
import { DEFAULT_CATS, normalizeCategoryId } from './categories';
import { CURRENCIES, CURRENCY_MAP, DEFAULT_CURRENCY } from './currencies';
import { LANGUAGE_NAMES, RTL_LANGUAGES, categoryLabel, localeForLanguage, t } from './i18n';
import { calcTotals, currenciesIn, filterByDateRange, groupByCategory, groupByDay, groupByMonth, lastNDays, lastNMonths, topCategory, validateBackup, validateTx } from './finance';
import { dbBulkPut, dbClear, dbDel, dbGetAll, dbPut } from './db';
import { displayDate, fmtMoney, fmtNum, isValidDateString, nowISO, parseAmount, timeStr, todayStr, toCSV, uid } from './utils';

const LS_SETTINGS = 'dk-settings-v2';
const LS_CATS = 'dk-cats';
const LS_FALLBACK = 'dk-txs-fallback';
const LS_WIPED = 'dk-txs-wiped';
const DEFAULT_HOME_CARDS: HomeCardId[] = ['balance','monthIncome','monthExpense','monthBalance','topCategory','transactionCount','latestTransaction','currencySummary'];
const ALL_HOME_CARDS: HomeCardId[] = ['balance','monthIncome','monthExpense','monthBalance','topCategory','transactionCount','latestTransaction','currencySummary'];

function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(LS_SETTINGS);
    if (raw) {
      const s = JSON.parse(raw);
      if (s && ['fa','en','ru','ar','tr'].includes(s.language) && CURRENCY_MAP[s.currency as CurrencyCode] && ['light','dark','system'].includes(s.theme)) return { ...s, fontScale: ['small','default','large','xlarge','xxlarge'].includes(s.fontScale) ? s.fontScale : 'default', homeCards: Array.isArray(s.homeCards) ? s.homeCards.filter((x: any) => ALL_HOME_CARDS.includes(x)).filter((x: any, i: number, arr: any[]) => arr.indexOf(x) === i) : DEFAULT_HOME_CARDS };
    }
  } catch {}
  return { language:'fa', currency:DEFAULT_CURRENCY, theme:'system', fontScale:'default', homeCards:[...DEFAULT_HOME_CARDS] };
}

function loadCategories(): Category[] {
  try {
    const raw = localStorage.getItem(LS_CATS);
    if (raw) {
      const list = JSON.parse(raw);
      if (Array.isArray(list)) {
        const custom = list.filter((c: any) => c && typeof c.id === 'string' && !DEFAULT_CATS.some(d => d.id === c.id) &&
          typeof c.label === 'string' && c.label.trim() && (c.kind === 'income' || c.kind === 'expense' || c.kind === 'both'))
          .map((c: any) => ({ id:c.id, label:c.label.trim(), kind:c.kind }));
        return [...DEFAULT_CATS, ...custom];
      }
    }
  } catch {}
  return DEFAULT_CATS;
}

function normalizeTransaction(raw: any, customCategories: Category[], defaultCurrency: CurrencyCode): Transaction | null {
  if (!raw || typeof raw !== 'object') return null;
  const type = raw.type === 'income' || raw.type === 'expense' ? raw.type : null;
  const currency = CURRENCY_MAP[raw.currency as CurrencyCode] ? raw.currency as CurrencyCode : defaultCurrency;
  if (!type || typeof raw.id !== 'string' || !raw.id || typeof raw.amount !== 'number' || !Number.isFinite(raw.amount) || raw.amount <= 0) return null;
  const categoryRaw = typeof raw.category === 'string' ? raw.category : '';
  const normalizedCategory = normalizeCategoryId(categoryRaw);
  const custom = customCategories.find(c => c.id === categoryRaw || c.label === categoryRaw);
  const category = normalizedCategory !== categoryRaw ? normalizedCategory : (custom?.id ?? categoryRaw);
  if (!category) return null;
  if (typeof raw.title !== 'string' || !raw.title.trim() || raw.title.length > 120) return null;
  if (typeof raw.date !== 'string' || !isValidDateString(raw.date) || typeof raw.time !== 'string' || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(raw.time) || typeof raw.description !== 'string' || raw.description.length > 500) return null;
  return {
    id: raw.id,
    type,
    amount: raw.amount,
    currency,
    title: raw.title.trim(),
    category,
    date: raw.date,
    time: raw.time,
    description: raw.description,
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : nowISO(),
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : nowISO()
  };
}

function applyFontScale(scale: FontScale) {
  document.documentElement.setAttribute('data-font-scale', scale);
}

function applyTheme(mode: ThemeMode) {
  const dark = mode === 'dark' || (mode === 'system' && (window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false));
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
}

function periodRange(period: Period, from: string, to: string) {
  const tday = todayStr();
  const local = (days: number) => {
    const d = new Date();
    d.setHours(12,0,0,0);
    d.setDate(d.getDate() + days);
    return todayStr(d);
  };
  if (period === 'today') return { from:tday, to:tday, labelKey:'today' as const };
  if (period === 'week') return { from:local(-6), to:tday, labelKey:'thisWeek' as const };
  if (period === 'month') return { from:tday.slice(0,7) + '-01', to:tday, labelKey:'thisMonth' as const };
  if (period === '3m') return { from:local(-89), to:tday, labelKey:'last3Months' as const };
  if (period === 'year') return { from:tday.slice(0,4) + '-01-01', to:tday, labelKey:'thisYear' as const };
  return { from, to, labelKey:'customRange' as const };
}

type Tab = 'home'|'txs'|'reports'|'settings';
type Period = 'today'|'week'|'month'|'3m'|'year'|'custom';

export default function App() {
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [cats, setCats] = useState<Category[]>(() => loadCategories());
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('home');
  const [toast, setToast] = useState('');
  const [modal, setModal] = useState<{open:boolean;preset:TxType;edit?:Transaction}>({open:false,preset:'expense'});
  const [confirmId, setConfirmId] = useState<string|null>(null);
  const [detailId, setDetailId] = useState<string|null>(null);
  const [q, setQ] = useState('');
  const [fType, setFType] = useState<'all'|TxType>('all');
  const [fCat, setFCat] = useState('all');
  const [fCurrency, setFCurrency] = useState<'all'|CurrencyCode>('all');
  const [fFrom, setFFrom] = useState('');
  const [fTo, setFTo] = useState('');
  const [sort, setSort] = useState<'new'|'old'|'max'|'min'>('new');
  const [period, setPeriod] = useState<Period>('month');
  const [cFrom, setCFrom] = useState(todayStr().slice(0,7) + '-01');
  const [cTo, setCTo] = useState(todayStr());
  const [reportCurrency, setReportCurrency] = useState<CurrencyCode>(() => loadSettings().currency);
  const [wipeStep, setWipeStep] = useState(0);
  const [newCat, setNewCat] = useState('');
  const [newCatKind, setNewCatKind] = useState<'income'|'expense'|'both'>('expense');
  const [showHomeCardManager, setShowHomeCardManager] = useState(false);
  const [draggingHomeCard, setDraggingHomeCard] = useState<HomeCardId|null>(null);
  const homeTrackRef = useRef<HTMLDivElement>(null);
  const homeCardRefs = useRef<Partial<Record<HomeCardId, HTMLElement>>>({});
  const homeDragRef = useRef<{id:HomeCardId;pointerId:number;startX:number;active:boolean;lastOrder:string}>({id:'balance',pointerId:-1,startX:0,active:false,lastOrder:''});
  const fileRef = useRef<HTMLInputElement>(null);

  const lang = settings.language;
  const locale = localeForLanguage(lang);
  const fontScale: FontScale = settings.fontScale ?? 'default';

  const say = (m:string) => { setToast(m); window.setTimeout(() => setToast(''), 2800); };

  useEffect(() => {
    applyTheme(settings.theme);
    applyFontScale(settings.fontScale ?? 'default');
    try { localStorage.setItem(LS_SETTINGS, JSON.stringify(settings)); } catch {}
  }, [settings]);

  useEffect(() => {
    const root = document.documentElement;
    root.dir = RTL_LANGUAGES.has(lang) ? 'rtl' : 'ltr';
    root.lang = lang;
    document.title = t(lang,'appName');
  }, [lang]);

  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    const fn = () => { if (settings.theme === 'system') applyTheme('system'); };
    mq?.addEventListener?.('change', fn);
    return () => mq?.removeEventListener?.('change', fn);
  }, [settings.theme]);

  useEffect(() => {
    if (settings.currency) setReportCurrency(settings.currency);
  }, [settings.currency]);

  useEffect(() => {
    try { localStorage.setItem(LS_CATS, JSON.stringify(cats)); } catch {}
  }, [cats]);

  useEffect(() => {
    const onKey = (e:KeyboardEvent) => {
      if (e.key === 'Escape') {
        setModal({open:false,preset:'expense'});
        setConfirmId(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    (async () => {
      let loaded: Transaction[] = [];
      try {
        const wiped = localStorage.getItem(LS_WIPED) === '1';
        if (!wiped) {
          const fb = localStorage.getItem(LS_FALLBACK);
          if (fb) {
            const raw = JSON.parse(fb);
            if (Array.isArray(raw)) loaded = raw.map(x => normalizeTransaction(x,cats,settings.currency)).filter(Boolean) as Transaction[];
          } else {
            const all = await dbGetAll();
            loaded = all.map(x => normalizeTransaction(x,cats,settings.currency)).filter(Boolean) as Transaction[];
          }
        }
      } catch {
        try {
          const all = await dbGetAll();
          loaded = all.map(x => normalizeTransaction(x,cats,settings.currency)).filter(Boolean) as Transaction[];
        } catch {}
      }
      loaded.sort((a,b) => (b.date+b.time).localeCompare(a.date+a.time));
      setTxs(loaded);
      try {
        if (loaded.length || localStorage.getItem(LS_WIPED) !== '1') localStorage.setItem(LS_FALLBACK,JSON.stringify(loaded));
      } catch {}
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    let r = txs.filter(t =>
      (fType === 'all' || t.type === fType) &&
      (fCat === 'all' || t.category === fCat) &&
      (fCurrency === 'all' || t.currency === fCurrency) &&
      (!fFrom || t.date >= fFrom) &&
      (!fTo || t.date <= fTo)
    );
    const needle = q.trim().toLocaleLowerCase(locale);
    if (needle) {
      r = r.filter(t => [t.title,t.description,categoryLabel(t.category,'',lang),t.currency].some(v => v.toLocaleLowerCase(locale).includes(needle)));
    }
    r.sort((a,b) => {
      if (sort === 'new') return (b.date+b.time).localeCompare(a.date+a.time);
      if (sort === 'old') return (a.date+a.time).localeCompare(b.date+b.time);
      if (sort === 'max') return b.amount-a.amount;
      return a.amount-b.amount;
    });
    return r;
  }, [txs,fType,fCat,fCurrency,fFrom,fTo,q,sort,lang,locale]);

  const currentTotals = useMemo(() => calcTotals(txs,settings.currency), [txs,settings.currency]);
  const monthKey = todayStr().slice(0,7);
  const monthTotals = useMemo(() => calcTotals(txs.filter(x => x.date.slice(0,7) === monthKey),settings.currency), [txs,settings.currency,monthKey]);
  const days7 = useMemo(() => lastNDays(7), []);
  const trend7 = useMemo(() => groupByDay(txs,days7,settings.currency), [txs,days7,settings.currency]);
  const max7 = Math.max(1,...trend7.flatMap(x => [x.income,x.expense]));
  const balances = useMemo(() => currenciesIn(txs).map(c => ({code:c, ...calcTotals(txs,c)})), [txs]);
  const latest = txs[0];
  const topExpenseLabel = topCategory(txs,settings.currency);

  const pr = periodRange(period,cFrom,cTo);
  const reportTxs = useMemo(() => filterByDateRange(txs,pr.from,pr.to,reportCurrency), [txs,pr.from,pr.to,reportCurrency]);
  const reportTotals = useMemo(() => calcTotals(reportTxs,reportCurrency), [reportTxs,reportCurrency]);
  const dist = useMemo(() => groupByCategory(reportTxs,'expense',reportCurrency), [reportTxs,reportCurrency]);
  const maxDist = Math.max(1,...dist.map(x => x.total));
  const repTrend = useMemo(() => {
    if (period === '3m') return groupByMonth(reportTxs,lastNMonths(3),reportCurrency);
    if (period === 'year') return groupByMonth(reportTxs,lastNMonths(12),reportCurrency);
    if (period === 'custom') {
      if (cFrom > cTo) return [];
      const start = new Date(cFrom + 'T12:00:00');
      const end = new Date(cTo + 'T12:00:00');
      const days = Math.round((end.getTime()-start.getTime())/86400000)+1;
      if (days > 62) {
        const months:string[]=[];
        const cursor=new Date(start);
        cursor.setDate(1);
        while (cursor <= end) {
          months.push(cursor.getFullYear() + '-' + String(cursor.getMonth()+1).padStart(2,'0'));
          cursor.setMonth(cursor.getMonth()+1);
        }
        return groupByMonth(reportTxs,months,reportCurrency);
      }
      return groupByDay(reportTxs,lastNDays(days,end),reportCurrency);
    }
    if (period === 'today') return groupByDay(reportTxs,[todayStr()],reportCurrency);
    if (period === 'week') return groupByDay(reportTxs,lastNDays(7),reportCurrency);
    const monthStart = new Date(pr.from + 'T12:00:00');
    const monthEnd = new Date(pr.to + 'T12:00:00');
    const monthDays = Math.max(1,Math.round((monthEnd.getTime()-monthStart.getTime())/86400000)+1);
    return groupByDay(reportTxs,lastNDays(monthDays,monthEnd),reportCurrency);
  }, [reportTxs,period,cFrom,cTo,reportCurrency]);
  const maxRep = Math.max(1,...repTrend.flatMap(x => [x.income,x.expense]));
  const customRangeError = period === 'custom' && cFrom > cTo;

  function persistLocal(next:Transaction[]) {
    try {
      localStorage.removeItem(LS_WIPED);
      localStorage.setItem(LS_FALLBACK,JSON.stringify(next));
    } catch {}
    setTxs(next);
  }

  async function persistTransaction(tx:Transaction,isEdit:boolean) {
    const rest=isEdit ? txs.filter(x => x.id !== tx.id) : txs;
    const next=[tx,...rest].sort((a,b)=>(b.date+b.time).localeCompare(a.date+a.time));
    persistLocal(next);
    try { await dbPut(tx); } catch { say(t(lang,'localFallback')); }
  }

  async function removeTx(id:string) {
    const next=txs.filter(x => x.id !== id);
    persistLocal(next);
    try { await dbDel(id); } catch {}
    setConfirmId(null);
    say(t(lang,'deleted'));
  }

  function exportJSON() {
    const payload={version:2,exportedAt:nowISO(),settings,categories:cats,transactions:txs};
    const a=document.createElement('a');
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
    a.href=URL.createObjectURL(blob); a.download='dakhl-kharj-backup-v2.json'; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href),2000);
    say(t(lang,'backupDownloaded'));
  }

  function exportCSVFile() {
    const rows=txs.map(x => ({...x, category:categoryLabel(x.category,x.category,lang), currency:x.currency}));
    const blob=new Blob(['\ufeff'+toCSV(rows)],{type:'text/csv;charset=utf-8'});
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob); a.download='dakhl-kharj.csv'; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href),2000);
    say(t(lang,'csvDownloaded'));
  }

  async function importFile(file:File) {
    try {
      const obj=JSON.parse(await file.text());
      const err=validateBackup(obj);
      if (err) { say(t(lang,'invalidFileKeepData')); return; }
      const rawCats=Array.isArray(obj.categories) ? obj.categories : [];
      const custom=rawCats.filter((c:any) => c && typeof c.id==='string' && !DEFAULT_CATS.some(d => d.id===c.id) && typeof c.label==='string' && c.label.trim());
      const nextCats=[...DEFAULT_CATS,...custom] as Category[];
      const list=(obj.transactions as any[]).map(x => normalizeTransaction(x,nextCats,settings.currency)).filter(Boolean) as Transaction[];
      const sorted=list.sort((a,b)=>(b.date+b.time).localeCompare(a.date+a.time));
      localStorage.removeItem(LS_WIPED);
      localStorage.setItem(LS_FALLBACK,JSON.stringify(sorted));
      setCats(nextCats);
      setTxs(sorted);
      try { await dbBulkPut(sorted); } catch { say(t(lang,'localFallback')); return; }
      say(t(lang,'restored'));
    } catch { say(t(lang,'invalidFileKeepData')); }
  }

  function addCategory() {
    const label=newCat.trim();
    if (!label) { say(t(lang,'categoryNameRequired')); return; }
    if (label.length>80) return;
    if (cats.some(c => c.label.toLocaleLowerCase(locale) === label.toLocaleLowerCase(locale))) { say(t(lang,'categoryExists')); return; }
    setCats(prev => [...prev,{id:'cat-'+uid(),label,kind:newCatKind}]);
    setNewCat('');
    say(t(lang,'categoryAdded'));
  }

  function delCategory(id:string) {
    const c=cats.find(x => x.id===id);
    if (!c) return;
    if (c.system) { say(t(lang,'defaultCategoryCannotDelete')); return; }
    if (txs.some(x => x.category===id)) { say(t(lang,'categoryHasTransactions')); return; }
    setCats(prev => prev.filter(x => x.id!==id));
    say(t(lang,'categoryDeleted'));
  }

  async function wipeAll() {
    try {
      localStorage.setItem(LS_WIPED,'1');
      localStorage.removeItem(LS_FALLBACK);
      localStorage.removeItem(LS_CATS);
    } catch {}
    setTxs([]);
    setCats(DEFAULT_CATS);
    setWipeStep(0);
    try { await dbClear(); } catch {}
    say(t(lang,'allDataDeleted'));
  }

  const stopHomeCardDrag = (e?: PointerEvent<HTMLButtonElement>) => {
    const state = homeDragRef.current;
    if (e && state.pointerId !== e.pointerId) return;
    if (e) {
      try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
    }
    homeDragRef.current = { id:'balance', pointerId:-1, startX:0, active:false, lastOrder:'' };
    setDraggingHomeCard(null);
  };

  const reorderHomeCard = (id:HomeCardId, targetId:HomeCardId) => {
    setSettings(prev => {
      if (id === targetId) return prev;
      const current = prev.homeCards;
      if (!current.includes(id) || !current.includes(targetId)) return prev;
      const next = current.filter(x => x !== id);
      const targetIndex = next.indexOf(targetId);
      next.splice(targetIndex < 0 ? next.length : targetIndex, 0, id);
      return {...prev, homeCards:next};
    });
  };

  const moveHomeCardFromPointer = (e: PointerEvent<HTMLButtonElement>) => {
    const state = homeDragRef.current;
    if (state.pointerId !== e.pointerId) return;
    if (!state.active) {
      if (Math.abs(e.clientX - state.startX) < 8) return;
      state.active = true;
      setDraggingHomeCard(state.id);
    }

    const track = homeTrackRef.current;
    if (track) {
      const r = track.getBoundingClientRect();
      if (e.clientX < r.left + 42) track.scrollBy({left:-12,behavior:'auto'});
      else if (e.clientX > r.right - 42) track.scrollBy({left:12,behavior:'auto'});
    }

    setSettings(prev => {
      const remaining = prev.homeCards.filter(x => x !== state.id);
      let insertIndex = remaining.length;
      for (let i=0;i<remaining.length;i++) {
        const rect = homeCardRefs.current[remaining[i]]?.getBoundingClientRect();
        if (rect && e.clientX < rect.left + rect.width / 2) {
          insertIndex = i;
          break;
        }
      }
      const next = [...remaining];
      next.splice(insertIndex,0,state.id);
      const nextOrder = next.join('|');
      if (nextOrder === prev.homeCards.join('|')) return prev;
      state.lastOrder = nextOrder;
      return {...prev,homeCards:next};
    });
  };

  const startHomeCardDrag = (id:HomeCardId, e:PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
    homeDragRef.current = {id,pointerId:e.pointerId,startX:e.clientX,active:false,lastOrder:''};
  };

  const systemCats=cats.filter(c => c.system);
  const customCats=cats.filter(c => !c.system);

  if (loading) return <div className="wrap"><div className="empty">{t(lang,'noneYet')}</div></div>;

  return <>
    <header className="top">
      <div className="brand">
        <img className="brand-mark-img" src="./icon.svg" alt="" />
        <div><h1>{t(lang,'appName')}</h1><p>{t(lang,'tagline')}</p></div>
      </div>
      <div className="row">
        <button className="btn ghost" onClick={() => setSettings(s => ({...s,theme:s.theme==='dark'?'light':s.theme==='light'?'system':'dark'}))}>
          {settings.theme==='dark'?t(lang,'dark'):settings.theme==='light'?t(lang,'light'):t(lang,'system')}
        </button>
      </div>
    </header>

    {toast && <div className="toast"><div>{toast}</div></div>}

    <main className="wrap">
      {tab==='home' && <>
        <section className="hero-card">
          <div className="hero-orb hero-orb-one" aria-hidden="true" />
          <div className="hero-orb hero-orb-two" aria-hidden="true" />
          <div className="hero-content">
            <div>
              <div className="hero-label">{t(lang,'currentBalance')} · {CURRENCIES.find(x => x.code===settings.currency)?.names[lang]}</div>
              <div className="hero-balance">{fmtMoney(currentTotals.balance,settings.currency,locale)}</div>
              <div className="hero-note">{t(lang,'recordedOnDevice')}</div>
            </div>
            <img className="hero-chip-img" src="./icon.svg" alt="" />
          </div>
          <div className="hero-stats">
            <div><span>{t(lang,'totalIncome')}</span><b>{fmtMoney(currentTotals.income,settings.currency,locale)}</b></div>
            <div><span>{t(lang,'totalExpense')}</span><b>{fmtMoney(currentTotals.expense,settings.currency,locale)}</b></div>
            <div><span>{t(lang,'transactions')}</span><b>{fmtNum(currentTotals.count,locale)}</b></div>
          </div>
        </section>

        <div className="quick-actions">
          <button className="action-card income-action" onClick={() => setModal({open:true,preset:'income'})}><span className="action-icon">＋</span><span><b>{t(lang,'registerIncome')}</b><small>{t(lang,'newInput')}</small></span></button>
          <button className="action-card expense-action" onClick={() => setModal({open:true,preset:'expense'})}><span className="action-icon">−</span><span><b>{t(lang,'registerExpense')}</b><small>{t(lang,'newOutput')}</small></span></button>
        </div>

        <section className="home-carousel-section">
          <div className="section-head">
            <div>
              <h2>{t(lang,'homeCards')}</h2>
              <div className="muted">{t(lang,'cardHint')}</div>
            </div>
            <button className="btn ghost compact-btn" onClick={() => setShowHomeCardManager(true)}>＋ {t(lang,'addHomeCard')}</button>
          </div>
          <div ref={homeTrackRef} className="home-card-track" aria-label={t(lang,'homeCards')}>
            {settings.homeCards.map((id, index) => {
              const moveCard = (dir: -1 | 1) => {
                setSettings(s => {
                  const next=[...s.homeCards];
                  const target=index+dir;
                  if(target<0 || target>=next.length) return s;
                  [next[index],next[target]]=[next[target],next[index]];
                  return {...s,homeCards:next};
                });
              };
              const removeCard = () => setSettings(s => ({...s,homeCards:s.homeCards.filter(x => x!==id)}));
              const nav = <>
                <button
                  type="button"
                  className="home-card-drag-handle"
                  aria-label={t(lang,'cardHint')}
                  title={t(lang,'cardHint')}
                  onPointerDown={(e) => startHomeCardDrag(id,e)}
                  onPointerMove={moveHomeCardFromPointer}
                  onPointerUp={stopHomeCardDrag}
                  onPointerCancel={stopHomeCardDrag}
                >⋮⋮</button>
                <div className="home-card-controls">
                  <button className="icon-btn" aria-label={t(lang,'moveLeft')} onClick={() => moveCard(-1)}>‹</button>
                  <button className="icon-btn" aria-label={t(lang,'moveRight')} onClick={() => moveCard(1)}>›</button>
                </div>
              </>;
              const cardStyle = {opacity: draggingHomeCard===id ? 0.68 : 1, transform: draggingHomeCard===id ? 'scale(.98)' : undefined};
              const cardRef = (el: HTMLElement|null) => { if (el) homeCardRefs.current[id]=el; else delete homeCardRefs.current[id]; };
              if (id==='balance') return <article ref={cardRef} style={cardStyle} className={'home-insight-card'+(draggingHomeCard===id?' is-dragging':'')} key={id}>{nav}<span className="card-k">{t(lang,'balanceCard')}</span><strong className="card-amount">{fmtMoney(currentTotals.balance,settings.currency,locale)}</strong><span className="card-sub">{CURRENCY_MAP[settings.currency].names[lang]}</span></article>;
              if (id==='monthIncome') return <article className="home-insight-card" key={id}>{nav}<span className="card-k">{t(lang,'monthIncomeCard')}</span><strong className="card-amount positive">{fmtMoney(monthTotals.income,settings.currency,locale)}</strong><span className="card-sub">{CURRENCY_MAP[settings.currency].names[lang]}</span></article>;
              if (id==='monthExpense') return <article className="home-insight-card" key={id}>{nav}<span className="card-k">{t(lang,'monthExpenseCard')}</span><strong className="card-amount negative">{fmtMoney(monthTotals.expense,settings.currency,locale)}</strong><span className="card-sub">{CURRENCY_MAP[settings.currency].names[lang]}</span></article>;
              if (id==='monthBalance') return <article className="home-insight-card" key={id}>{nav}<span className="card-k">{t(lang,'monthBalanceCard')}</span><strong className="card-amount">{fmtMoney(monthTotals.balance,settings.currency,locale)}</strong><span className="card-sub">{CURRENCY_MAP[settings.currency].names[lang]}</span></article>;
              if (id==='topCategory') return <article className="home-insight-card" key={id}>{nav}<span className="card-k">{t(lang,'topCategoryCard')}</span><strong className="card-text">{topExpenseLabel==='—'?'—':categoryLabel(topExpenseLabel,'',lang)}</strong><span className="card-sub">{topExpenseLabel==='—'?t(lang,'noTransactions'):fmtMoney((groupByCategory(txs.filter(x=>x.currency===settings.currency),'expense',settings.currency)[0]?.total ?? 0),settings.currency,locale)}</span></article>;
              if (id==='transactionCount') return <article className="home-insight-card" key={id}>{nav}<span className="card-k">{t(lang,'transactionCountCard')}</span><strong className="card-amount">{fmtNum(currentTotals.count,locale)}</strong><span className="card-sub">{t(lang,'transactions')}</span></article>;
              if (id==='latestTransaction') return <article className="home-insight-card" key={id}>{nav}<span className="card-k">{t(lang,'latestTransactionCard')}</span><strong className="card-text">{latest ? latest.title : '—'}</strong><span className="card-sub">{latest ? fmtMoney(latest.amount,latest.currency,locale) : t(lang,'noTransactions')}</span></article>;
              return <article className="home-insight-card" key={id}>{nav}<span className="card-k">{t(lang,'currencySummaryCard')}</span><strong className="card-amount">{fmtNum(balances.length,locale)}</strong><span className="card-sub">{t(lang,'otherCurrencies')}</span></article>;
            })}
            <button className="home-add-card" onClick={() => setShowHomeCardManager(true)}><span>＋</span><b>{t(lang,'addHomeCard')}</b></button>
          </div>
        </section>

        <h2>{t(lang,'last7Days')}</h2>
        <div className="card">
          <div className="bars">
            {trend7.map(d => <div className="bar" key={d.date}>
              <div className="col income-bar" style={{height:Math.max(3,(d.income/max7)*52)}} title={t(lang,'income')+' '+fmtMoney(d.income,settings.currency,locale)} />
              <div className="col expense-bar" style={{height:Math.max(3,(d.expense/max7)*52)}} title={t(lang,'expense')+' '+fmtMoney(d.expense,settings.currency,locale)} />
              <span className="muted" style={{fontSize:10}}>{d.date.slice(5)}</span>
            </div>)}
          </div>
          <div className="muted">{t(lang,'greenIncomeRedExpense')}</div>
        </div>

        <h2>{t(lang,'financialSummary')}</h2>
        <div className="card">
          <div>{t(lang,'totalTransactions')}: <b>{fmtNum(currentTotals.count,locale)}</b></div>
          <div className="muted">{t(lang,'topExpenseCategory')}: {topCategory(txs,settings.currency)==='—'?'—':categoryLabel(topCategory(txs,settings.currency),'',lang)}</div>
          <div className="currency-note">{t(lang,'currencyNote')}</div>
        </div>

        {balances.length>0 && <><h2>{t(lang,'currencySummary')}</h2><div className="grid currency-grid">
          {balances.map(b => <div className="card" key={b.code}>
            <div className="row space"><b>{CURRENCY_MAP[b.code].names[lang]}</b><span className="muted">{b.code}</span></div>
            <div className="v bal">{fmtMoney(b.balance,b.code,locale)}</div>
            <div className="muted">{t(lang,'totalIncome')}: {fmtMoney(b.income,b.code,locale)} · {t(lang,'totalExpense')}: {fmtMoney(b.expense,b.code,locale)}</div>
          </div>)}
        </div></>}

        <h2>{t(lang,'latestTransactions')}</h2>
        {txs.length===0 ? <div className="empty">{t(lang,'noneYet')} {t(lang,'registerFirst')}</div> :
          <div className="list">{txs.slice(0,5).map(x => <div className="item" key={x.id}>
            <div><b>{x.title}</b> <span className={'badge '+(x.type==='income'?'in':'out')}>{x.type==='income'?t(lang,'income'):t(lang,'expense')}</span>
              <div className="muted">{categoryLabel(x.category,x.category,lang)} · {displayDate(x.date,locale)} {x.time} · {CURRENCY_MAP[x.currency].names[lang]}</div>
            </div>
            <b className={x.type==='income'?'money-in':'money-out'}>{fmtMoney(x.amount,x.currency,locale)}</b>
          </div>)}</div>}
      </>}

      {tab==='txs' && <>
        <h2>{t(lang,'transactionsTitle')}</h2>
        <div className="toolbar">
          <input aria-label={t(lang,'search')} placeholder={t(lang,'search')} value={q} onChange={e => setQ(e.target.value)} />
          <select value={fType} onChange={e => setFType(e.target.value as 'all'|TxType)}><option value="all">{t(lang,'allTypes')}</option><option value="income">{t(lang,'income')}</option><option value="expense">{t(lang,'expense')}</option></select>
          <select value={fCat} onChange={e => setFCat(e.target.value)}><option value="all">{t(lang,'allCategories')}</option>{cats.map(c => <option value={c.id} key={c.id}>{categoryLabel(c.id,c.label,lang)}</option>)}</select>
          <select value={fCurrency} onChange={e => { const next=e.target.value as 'all'|CurrencyCode; setFCurrency(next); if(next==='all' && (sort==='max'||sort==='min')) setSort('new'); }}><option value="all">{t(lang,'allCurrencies')}</option>{CURRENCIES.map(c => <option value={c.code} key={c.code}>{c.names[lang]} ({c.code})</option>)}</select>
          <select value={sort} onChange={e => setSort(e.target.value as any)}><option value="new">{t(lang,'newest')}</option><option value="old">{t(lang,'oldest')}</option><option value="max" disabled={fCurrency==='all'}>{t(lang,'highestAmount')}</option><option value="min" disabled={fCurrency==='all'}>{t(lang,'lowestAmount')}</option></select>
        </div>
        <div className="toolbar date-tools">
          <div><label>{t(lang,'fromDate')}</label><input type="date" value={fFrom} onChange={e => setFFrom(e.target.value)} /></div>
          <div><label>{t(lang,'toDate')}</label><input type="date" value={fTo} onChange={e => setFTo(e.target.value)} /></div>
          <div className="align-end"><button className="btn ghost" onClick={() => {setQ('');setFType('all');setFCat('all');setFCurrency('all');setFFrom('');setFTo('');setSort('new')}}>{t(lang,'clearFilters')}</button></div>
        </div>
        {filtered.length===0 ? <div className="empty">{t(lang,'noMatch')} {t(lang,'changeFilters')}</div> :
          <div className="list">{filtered.map(x => <div className="item" key={x.id}>
            <div style={{flex:1}}><b>{x.title}</b> <span className={'badge '+(x.type==='income'?'in':'out')}>{x.type==='income'?t(lang,'income'):t(lang,'expense')}</span>
              <div className="muted">{categoryLabel(x.category,x.category,lang)} · {displayDate(x.date,locale)} {x.time} · {CURRENCY_MAP[x.currency].names[lang]}</div>
              {detailId===x.id && <div className="detail">{x.description || '—'}</div>}
            </div>
            <div className="row item-actions">
              <b className={x.type==='income'?'money-in':'money-out'}>{fmtMoney(x.amount,x.currency,locale)}</b>
              <button className="btn ghost" onClick={() => setDetailId(detailId===x.id?null:x.id)}>{t(lang,'details')}</button>
              <button className="btn ghost" onClick={() => setModal({open:true,preset:x.type,edit:x})}>{t(lang,'edit')}</button>
              <button className="btn danger" onClick={() => setConfirmId(x.id)}>{t(lang,'delete')}</button>
            </div>
          </div>)}</div>}
      </>}

      {tab==='reports' && <>
        <h2>{t(lang,'reports')} — {t(lang,pr.labelKey)} — {CURRENCY_MAP[reportCurrency].names[lang]}</h2>
        <div className="row">
          {(['today','week','month','3m','year','custom'] as Period[]).map(p => <button key={p} className={period===p?'btn':'btn ghost'} onClick={() => setPeriod(p)}>
            {p==='today'?t(lang,'today'):p==='week'?t(lang,'thisWeek'):p==='month'?t(lang,'thisMonth'):p==='3m'?t(lang,'last3Months'):p==='year'?t(lang,'thisYear'):t(lang,'customRange')}
          </button>)}
        </div>
        <div className="toolbar report-controls">
          <div><label>{t(lang,'currency')}</label><select value={reportCurrency} onChange={e => setReportCurrency(e.target.value as CurrencyCode)}>{CURRENCIES.map(c => <option value={c.code} key={c.code}>{c.names[lang]} ({c.code})</option>)}</select></div>
          {period==='custom' && <><div><label>{t(lang,'fromDate')}</label><input type="date" value={cFrom} onChange={e => setCFrom(e.target.value)} /></div><div><label>{t(lang,'toDate')}</label><input type="date" value={cTo} onChange={e => setCTo(e.target.value)} /></div></>}
        </div>
        <div className="currency-note">{t(lang,'noAutoConversion')}</div>
        {customRangeError ? <div className="err">{t(lang,'rangeStartAfterEnd')}</div> : reportTxs.length===0 ? <div className="empty">{t(lang,'noDataInRange')}</div> :
          <>
            <div className="grid cards">
              <div className="card"><div className="k">{t(lang,'totalIncomeReport')}</div><div className="v in">{fmtMoney(reportTotals.income,reportCurrency,locale)}</div></div>
              <div className="card"><div className="k">{t(lang,'totalExpenseReport')}</div><div className="v out">{fmtMoney(reportTotals.expense,reportCurrency,locale)}</div></div>
              <div className="card"><div className="k">{t(lang,'balance')}</div><div className="v bal">{fmtMoney(reportTotals.balance,reportCurrency,locale)}</div></div>
              <div className="card"><div className="k">{t(lang,'transactionCount')}</div><div className="v">{fmtNum(reportTotals.count,locale)}</div></div>
            </div>
            <h3>{t(lang,'incomeExpenseTrend')}</h3>
            <div className="card"><div className="bars">
              {repTrend.map(d => <div className="bar" key={d.date}>
                <div className="col income-bar" style={{height:Math.max(3,(d.income/maxRep)*48)}} />
                <div className="col expense-bar" style={{height:Math.max(3,(d.expense/maxRep)*48)}} />
                <span className="muted" style={{fontSize:9}}>{d.date.replace('-', '/')}</span>
              </div>)}
            </div></div>
            <h3>{t(lang,'expenseDistribution')}</h3>
            <div className="card grid">{dist.map(x => <div key={x.category}>
              <div className="row space"><span>{categoryLabel(x.category,x.category,lang)}</span><b>{fmtMoney(x.total,reportCurrency,locale)}</b></div>
              <div className="hbar"><i style={{width:Math.round((x.total/maxDist)*100)+'%'}} /></div>
            </div>)}</div>
          </>}
      </>}

      {tab==='settings' && <>
        <h2>{t(lang,'settings')}</h2>
        <div className="card">
          <h3>{t(lang,'fontSize')}</h3>
          <div className="row font-size-options">
            {(['small','default','large','xlarge','xxlarge'] as FontScale[]).map(s => <button key={s} className={fontScale===s?'btn':'btn ghost'} onClick={() => setSettings(v => ({...v,fontScale:s}))}>{t(lang, s==='small'?'fontSmall':s==='default'?'fontDefault':s==='large'?'fontLarge':s==='xlarge'?'fontXlarge':'fontXxlarge')}</button>)}
          </div>
          <div className="muted font-preview">{t(lang,'dataIntegrityNote')}</div>
        </div>

        <div className="card" style={{marginTop:10}}>
          <div className="section-head">
            <div><h3>{t(lang,'homeCards')}</h3><div className="muted">{t(lang,'cardHint')}</div></div>
            <button className="btn ghost compact-btn" onClick={() => setShowHomeCardManager(true)}>＋ {t(lang,'addHomeCard')}</button>
          </div>
          <div className="home-card-manager">
            {settings.homeCards.map((id,index) => <div className="manager-row" key={id}>
              <b>{t(lang, id==='balance'?'balanceCard':id==='monthIncome'?'monthIncomeCard':id==='monthExpense'?'monthExpenseCard':id==='monthBalance'?'monthBalanceCard':id==='topCategory'?'topCategoryCard':id==='transactionCount'?'transactionCountCard':id==='latestTransaction'?'latestTransactionCard':'currencySummaryCard')}</b>
              <div className="row">
                <button className="icon-btn" aria-label={t(lang,'moveLeft')} disabled={index===0} onClick={() => setSettings(s => { const n=[...s.homeCards]; [n[index-1],n[index]]=[n[index],n[index-1]]; return {...s,homeCards:n}; })}>‹</button>
                <button className="icon-btn" aria-label={t(lang,'moveRight')} disabled={index===settings.homeCards.length-1} onClick={() => setSettings(s => { const n=[...s.homeCards]; [n[index],n[index+1]]=[n[index+1],n[index]]; return {...s,homeCards:n}; })}>›</button>
                <button className="btn ghost compact-btn" onClick={() => setSettings(s => ({...s,homeCards:s.homeCards.filter(x => x!==id)}))}>{t(lang,'removeHomeCard')}</button>
              </div>
            </div>)}
            <button className="btn ghost" onClick={() => setSettings(s => ({...s,homeCards:[...DEFAULT_HOME_CARDS]}))}>{t(lang,'restoreHomeCards')}</button>
          </div>
        </div>

        <div className="card" style={{marginTop:10}}>
          <h3>{t(lang,'language')}</h3>
          <select value={lang} onChange={e => { const next=e.target.value as LanguageCode; setSettings(s=>({...s,language:next})); say(t(next,'languageReload')); }}>
            {(Object.keys(LANGUAGE_NAMES) as LanguageCode[]).map(x => <option value={x} key={x}>{LANGUAGE_NAMES[x]}</option>)}
          </select>
          <h3>{t(lang,'defaultCurrency')}</h3>
          <select value={settings.currency} onChange={e => setSettings(s=>({...s,currency:e.target.value as CurrencyCode}))}>
            {CURRENCIES.map(c => <option value={c.code} key={c.code}>{c.names[lang]} ({c.code})</option>)}
          </select>
          <div className="currency-note">{t(lang,'selectedCurrency')}: {CURRENCY_MAP[settings.currency].names[lang]} ({settings.currency})</div>
        </div>

        <div className="card" style={{marginTop:10}}>
          <h3>{t(lang,'appearance')}</h3>
          <div className="row">{(['light','dark','system'] as ThemeMode[]).map(m => <button key={m} className={settings.theme===m?'btn':'btn ghost'} onClick={() => {setSettings(s=>({...s,theme:m}));say(t(lang,'themeChanged'))}}>{t(lang,m)}</button>)}</div>
        </div>

        <div className="card" style={{marginTop:10}}>
          <h3>{t(lang,'manageCategories')}</h3>
          <div className="list">{systemCats.map(c => <div className="item" key={c.id}><span>{categoryLabel(c.id,c.label,lang)} <span className="muted">({c.kind==='income'?t(lang,'income'):c.kind==='expense'?t(lang,'expense'):t(lang,'both')})</span></span><span className="muted">✓</span></div>)}</div>
          {customCats.length>0 && <><h3>{t(lang,'customCategory')}</h3><div className="list">{customCats.map(c => <div className="item" key={c.id}><span>{c.label}</span><button className="btn ghost" onClick={() => delCategory(c.id)}>{t(lang,'delete')}</button></div>)}</div></>}
          <div className="row" style={{marginTop:8}}><input maxLength={80} placeholder={t(lang,'addCategoryName')} value={newCat} onChange={e => setNewCat(e.target.value)} style={{flex:1,minWidth:140}}/><select value={newCatKind} onChange={e => setNewCatKind(e.target.value as any)} style={{maxWidth:160}}><option value="expense">{t(lang,'expense')}</option><option value="income">{t(lang,'income')}</option><option value="both">{t(lang,'both')}</option></select><button className="btn" onClick={addCategory}>{t(lang,'add')}</button></div>
        </div>

        <div className="card" style={{marginTop:10}}>
          <h3>{t(lang,'backupRestore')}</h3>
          <div className="row"><button className="btn" onClick={exportJSON}>{t(lang,'downloadBackup')}</button><button className="btn ghost" onClick={exportCSVFile}>{t(lang,'exportCsv')}</button><button className="btn ghost" onClick={() => fileRef.current?.click()}>{t(lang,'importFile')}</button></div>
          <input ref={fileRef} type="file" accept="application/json,.json" style={{display:'none'}} onChange={e => { const f=e.target.files?.[0]; if(f) void importFile(f); e.target.value=''; }} />
          <div className="currency-note">{t(lang,'privacyLocalOnly')} {t(lang,'dataIntegrityNote')}</div>
        </div>

        <div className="card" style={{marginTop:10}}>
          <h3>{t(lang,'deleteAllData')}</h3>
          {wipeStep===0 ? <button className="btn danger" onClick={() => setWipeStep(1)}>{t(lang,'deleteAllData')}</button> :
            wipeStep===1 ? <><div className="err">{t(lang,'deleteAllWarning')}</div><div className="row"><button className="btn danger" onClick={() => setWipeStep(2)}>{t(lang,'confirmSure')}</button><button className="btn ghost" onClick={() => setWipeStep(0)}>{t(lang,'cancel')}</button></div></> :
            <><div className="err">{t(lang,'finalDeleteWarning')}</div><div className="row"><button className="btn danger" onClick={() => void wipeAll()}>{t(lang,'finalDelete')}</button><button className="btn ghost" onClick={() => setWipeStep(0)}>{t(lang,'cancel')}</button></div></>}
        </div>

        <div className="card" style={{marginTop:10}}>
          <h3>{t(lang,'about')}</h3>
          <div className="muted">{t(lang,'versionOffline')}</div>
          <div className="muted" style={{marginTop:6}}>{t(lang,'openSource')}</div>
        </div>
      </>}
    </main>

    <nav className="nav" aria-label={t(lang,'mainNavigation')}>
      <button className={tab==='home'?'on':''} onClick={() => setTab('home')}><span>⌂</span><small>{t(lang,'home')}</small></button>
      <button className={tab==='txs'?'on':''} onClick={() => setTab('txs')}><span>▤</span><small>{t(lang,'transactionsTab')}</small></button>
      <button className={tab==='reports'?'on':''} onClick={() => setTab('reports')}><span>◔</span><small>{t(lang,'reportsTab')}</small></button>
      <button className={tab==='settings'?'on':''} onClick={() => setTab('settings')}><span>⚙</span><small>{t(lang,'settingsTab')}</small></button>
    </nav>

    {showHomeCardManager && <div className="modal" onClick={() => setShowHomeCardManager(false)}><div className="sheet" onClick={e => e.stopPropagation()}><div className="sheet-head"><h3>{t(lang,'addHomeCard')}</h3><button className="btn ghost" onClick={() => setShowHomeCardManager(false)}>×</button></div><div className="list home-card-options">
      {ALL_HOME_CARDS.filter(id => !settings.homeCards.includes(id)).map(id => <button className="option-row" key={id} onClick={() => { setSettings(s => ({...s,homeCards:[...s.homeCards,id]})); setShowHomeCardManager(false); }}>
        <span>{t(lang, id==='balance'?'balanceCard':id==='monthIncome'?'monthIncomeCard':id==='monthExpense'?'monthExpenseCard':id==='monthBalance'?'monthBalanceCard':id==='topCategory'?'topCategoryCard':id==='transactionCount'?'transactionCountCard':id==='latestTransaction'?'latestTransactionCard':'currencySummaryCard')}</span><b>＋</b>
      </button>)}
      <button className="btn ghost" onClick={() => setShowHomeCardManager(false)}>{t(lang,'cancel')}</button>
    </div></div></div>}
    {modal.open && <TxModal lang={lang} preset={modal.preset} edit={modal.edit} cats={cats} defaultCurrency={settings.currency} onClose={() => setModal({open:false,preset:'expense'})} onSave={async (tx,isEdit) => { await persistTransaction(tx,isEdit); setModal({open:false,preset:'expense'}); say(t(lang,isEdit?'updated':'saved')); }} />}
    {confirmId && <div className="modal" onClick={() => setConfirmId(null)}><div className="sheet" onClick={e => e.stopPropagation()}><h3>{t(lang,'delete')}</h3><p>{t(lang,'confirmDeleteTransaction')}</p><div className="row"><button className="btn danger" onClick={() => void removeTx(confirmId)}>{t(lang,'delete')}</button><button className="btn ghost" onClick={() => setConfirmId(null)}>{t(lang,'cancel')}</button></div></div></div>}
  </>;
}

function TxModal({lang,preset,edit,cats,defaultCurrency,onClose,onSave}:{lang:LanguageCode;preset:TxType;edit?:Transaction;cats:Category[];defaultCurrency:CurrencyCode;onClose:()=>void;onSave:(t:Transaction,isEdit:boolean)=>Promise<void>}) {
  const [type,setType]=useState<TxType>(edit?.type ?? preset);
  const [currency,setCurrency]=useState<CurrencyCode>(edit?.currency ?? defaultCurrency);
  const [amount,setAmount]=useState(edit ? String(edit.amount) : '');
  const [title,setTitle]=useState(edit?.title ?? '');
  const [category,setCategory]=useState(edit?.category ?? '');
  const [date,setDate]=useState(edit?.date ?? todayStr());
  const [time,setTime]=useState(edit?.time ?? timeStr());
  const [desc,setDesc]=useState(edit?.description ?? '');
  const [errs,setErrs]=useState<string[]>([]);
  const avail=cats.filter(c => c.kind==='both' || c.kind===type);

  const fieldMessage=(key:string) => key==='amount'?t(lang,'invalidAmount'):key==='title'?t(lang,title.trim()? 'titleTooLong':'titleRequired'):key==='category'?t(lang,'categoryRequired'):key==='date'?t(lang,'dateInvalid'):key==='time'?t(lang,'invalidTime'):key;

  function submit() {
    const raw=validateTx({type,amount,title,category,date,time,currency});
    const errors=raw.map(fieldMessage);
    if (!errs.length && !avail.some(c => c.id===category)) {
      errors.push(t(lang,'invalidCategory'));
    }
    if (desc.trim().length>500) errors.push(t(lang,'descTooLong'));
    if (errors.length) { setErrs(errors); return; }
    const num=parseAmount(amount,currency);
    if (num===null) { setErrs([t(lang,'invalidAmount')]); return; }
    const now=nowISO();
    const tx:Transaction={
      id:edit?.id ?? uid(),type,amount:num,currency,title:title.trim(),category,date,time,description:desc.trim(),
      createdAt:edit?.createdAt ?? now,updatedAt:now
    };
    void onSave(tx,!!edit);
  }

  return <div className="modal" role="dialog" aria-modal="true" onClick={onClose}>
    <div className="sheet" onClick={e => e.stopPropagation()}>
      <div className="sheet-head"><h3>{edit?t(lang,'edit'):type==='income'?t(lang,'registerIncome'):t(lang,'registerExpense')}</h3><button className="btn ghost" onClick={onClose}>×</button></div>
      {errs.length>0 && <div className="err">{errs.map((x,i)=><div key={i}>• {x}</div>)}</div>}
      <div className="row"><button className={type==='income'?'btn ok':'btn ghost'} onClick={() => {setType('income');setCategory(cats.some(c => c.id===category && (c.kind==='income'||c.kind==='both'))?category:'')}}>{t(lang,'income')}</button><button className={type==='expense'?'btn danger':'btn ghost'} onClick={() => {setType('expense');setCategory(cats.some(c => c.id===category && (c.kind==='expense'||c.kind==='both'))?category:'')}}>{t(lang,'expense')}</button></div>
      <label>{t(lang,'currency')}</label>
      <select value={currency} onChange={e => setCurrency(e.target.value as CurrencyCode)}>{CURRENCIES.map(c => <option value={c.code} key={c.code}>{c.names[lang]} ({c.code})</option>)}</select>
      <label>{t(lang,'amount')} — {CURRENCY_MAP[currency].names[lang]}</label>
      <input inputMode={CURRENCY_MAP[currency].digits===0?'numeric':'decimal'} autoFocus={!edit} placeholder={t(lang,'amountExample')} value={amount} onChange={e => setAmount(e.target.value)} />
      <label>{t(lang,'title')}</label>
      <input maxLength={120} placeholder={t(lang,'titleExample')} value={title} onChange={e => setTitle(e.target.value)} />
      <label>{t(lang,'category')}</label>
      <select value={category} onChange={e => setCategory(e.target.value)}><option value="">{t(lang,'select')}</option>{avail.map(c=><option key={c.id} value={c.id}>{categoryLabel(c.id,c.label,lang)}</option>)}</select>
      <div className="toolbar" style={{gridTemplateColumns:'1fr 1fr'}}><div><label>{t(lang,'date')}</label><input type="date" value={date} onChange={e=>setDate(e.target.value)} /></div><div><label>{t(lang,'time')}</label><input type="time" value={time} onChange={e=>setTime(e.target.value)} /></div></div>
      <label>{t(lang,'descriptionOptional')}</label>
      <textarea rows={3} maxLength={500} value={desc} onChange={e=>setDesc(e.target.value)} />
      <div className="row" style={{marginTop:12}}><button className="btn" onClick={submit}>{edit?t(lang,'saveChanges'):t(lang,'save')}</button><button className="btn ghost" onClick={onClose}>{t(lang,'cancel')}</button></div>
    </div>
  </div>;
}
