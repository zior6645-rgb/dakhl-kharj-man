import { useEffect, useMemo, useRef, useState } from 'react';
import { Capacitor, registerPlugin } from '@capacitor/core';

type PdfTransaction = {
  date:string;
  time:string;
  type:string;
  title:string;
  category:string;
  amount:string;
  description:string;
  dateLabel?:string;
  timeLabel?:string;
  typeLabel?:string;
  categoryLabel?:string;
  descriptionLabel?:string;
};

type PdfReport = {
  title:string;
  subtitle:string;
  exportedAt:string;
  summaryTitle:string;
  emptyText:string;
  dateLabel:string;
  timeLabel:string;
  typeLabel:string;
  categoryLabel:string;
  descriptionLabel:string;
  indicatorsTitle:string;
  chartsTitle:string;
  indicators:Array<{label:string;value:string}>;
  summaries:Array<{
    currency:string;
    currencyLabel:string;
    income:string;
    expense:string;
    balance:string;
    incomeLabel:string;
    expenseLabel:string;
    balanceLabel:string;
  }>;
  categoryDistribution:Array<{label:string;value:number;percent:number}>;
  trend:Array<{date:string;income:number;expense:number;balance:number}>;
  transactions:PdfTransaction[];
};

type NativeImportResult = {
  pending?: boolean;
  filename?: string;
  mimeType?: string;
  data?: string;
  error?: string;
};

type FileSaverPlugin = {
  saveFile(options: { filename:string; mimeType:string; data:string }): Promise<{ uri:string; saved:boolean }>;
  savePdf(options: { filename:string; report:PdfReport }): Promise<{ uri:string; saved:boolean }>;
  pickFile(options?: { mimeType?:string }): Promise<NativeImportResult>;
  getPendingFile(): Promise<NativeImportResult>;
  addListener(eventName:'fileOpen', listener:(result:NativeImportResult)=>void): Promise<{remove:()=>Promise<void>}>;
};

const FileSaver = registerPlugin<FileSaverPlugin>('FileSaver');
import type { AppSettings, Category, CurrencyCode, FontScale, LanguageCode, StorageMode, ThemeMode, Transaction, TxType } from './types';
import { DEFAULT_CATS, normalizeCategoryId } from './categories';
import { CURRENCIES, CURRENCY_MAP, DEFAULT_CURRENCY } from './currencies';
import { LANGUAGE_NAMES, RTL_LANGUAGES, categoryLabel, localeForLanguage, t } from './i18n';
import { calcTotals, filterByDateRange, groupByCategory, groupByDay, groupByMonth, lastNDays, lastNMonths, validateBackup, validateTx } from './finance';
import { dbBulkPut, dbClear, dbDel, dbGetAll, dbPut } from './db';
import { displayDate, fmtMoney, fmtNum, isValidDateString, nowISO, parseAmount, parseCSV, timeStr, todayStr, toCSV, uid } from './utils';
import { cloudConfigured, ensureCloudSession, fetchCloudData, loadCloudSession, requestPasswordReset, resendSignupCode, signInWithPassword, signOut, signUp, upsertCloudCategory, upsertCloudTransaction, deleteCloudCategory, deleteCloudTransaction, deleteAllCloudData, uploadLocalCategories, uploadLocalTransactions, verifySignupCode, type CloudSession } from './cloud';

const LS_SETTINGS = 'dk-settings-v2';
const LS_CATS = 'dk-cats';
const LS_FALLBACK = 'dk-txs-fallback';
const LS_CLOUD_FALLBACK = 'dk-cloud-txs-cache';
const LS_CLOUD_CATS = 'dk-cloud-cats-cache';
const LS_WIPED = 'dk-txs-wiped';
function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(LS_SETTINGS);
    if (raw) {
      const value = JSON.parse(raw);
      if (value && ['fa','en','ru','ar','tr'].includes(value.language) && CURRENCY_MAP[value.currency as CurrencyCode] && ['light','dark','system'].includes(value.theme)) {
        return {
          language: value.language,
          currency: value.currency,
          theme: value.theme,
          storageMode: value.storageMode === 'cloud' && cloudConfigured() ? 'cloud' : 'offline',
          fontScale: ['small','default','large','xlarge','xxlarge'].includes(value.fontScale) ? value.fontScale : 'default'
        };
      }
    }
  } catch {}
  return { language:'fa', currency:DEFAULT_CURRENCY, theme:'system', storageMode:'offline', fontScale:'default' };
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
  const [cloudSession, setCloudSession] = useState<CloudSession|null>(() => loadCloudSession());
  const [cloudAuthOpen, setCloudAuthOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const lang = settings.language;
  const locale = localeForLanguage(lang);
  const fontScale: FontScale = settings.fontScale ?? 'default';
  const categoryName = (id: string) => categoryLabel(id, cats.find(c => c.id === id)?.label ?? id, lang);

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
    try {
      localStorage.setItem(settings.storageMode==='cloud' ? LS_CLOUD_CATS : LS_CATS, JSON.stringify(cats));
    } catch {}
  }, [cats,settings.storageMode]);

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

  async function loadOfflineData() {
    let loaded: Transaction[] = [];
    const localCats=loadCategories();
    setCats(localCats);
    try {
      const wiped = localStorage.getItem(LS_WIPED) === '1';
      if (!wiped) {
        const fb = localStorage.getItem(LS_FALLBACK);
        if (fb) {
          const raw = JSON.parse(fb);
          if (Array.isArray(raw)) loaded = raw.map(x => normalizeTransaction(x,localCats,settings.currency)).filter(Boolean) as Transaction[];
        } else {
          const all = await dbGetAll();
          loaded = all.map(x => normalizeTransaction(x,localCats,settings.currency)).filter(Boolean) as Transaction[];
        }
      }
    } catch {
      try {
        const all = await dbGetAll();
        loaded = all.map(x => normalizeTransaction(x,localCats,settings.currency)).filter(Boolean) as Transaction[];
      } catch {}
    }
    loaded.sort((a,b) => (b.date+b.time).localeCompare(a.date+a.time));
    setTxs(loaded);
    setLoading(false);
  }

  useEffect(() => { if (settings.storageMode==='offline') void loadOfflineData(); }, [settings.storageMode]);

  useEffect(() => {
    if (settings.storageMode !== 'cloud') return;
    let active = true;
    (async () => {
      const session = await ensureCloudSession();
      if (!active) return;
      setCloudSession(session);
      if (!session) {
        setCloudAuthOpen(true);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const data = await fetchCloudData(session);
        if (!active) return;
        const mergedCats = [...DEFAULT_CATS, ...data.categories.filter(c => !DEFAULT_CATS.some(d => d.id === c.id))];
        const cloudTxs = data.transactions.map(x => normalizeTransaction(x,mergedCats,settings.currency)).filter(Boolean) as Transaction[];
        cloudTxs.sort((a,b) => (b.date+b.time).localeCompare(a.date+a.time));
        setCats(mergedCats);
        setTxs(cloudTxs);
        try {
          localStorage.setItem(LS_CLOUD_FALLBACK,JSON.stringify(cloudTxs));
          localStorage.setItem(LS_CLOUD_CATS,JSON.stringify(mergedCats));
        } catch {}
      } catch (err) {
        say(err instanceof Error ? err.message : t(lang,'cloudSyncFailed'));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [settings.storageMode, cloudSession?.accessToken]);

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
      r = r.filter(t => [t.title,t.description,categoryName(t.category),t.currency].some(v => v.toLocaleLowerCase(locale).includes(needle)));
    }
    r.sort((a,b) => {
      if (sort === 'new') return (b.date+b.time).localeCompare(a.date+a.time);
      if (sort === 'old') return (a.date+a.time).localeCompare(b.date+b.time);
      if (sort === 'max') return b.amount-a.amount;
      return a.amount-b.amount;
    });
    return r;
  }, [txs,cats,fType,fCat,fCurrency,fFrom,fTo,q,sort,lang,locale]);

  const currentTotals = useMemo(() => calcTotals(txs,settings.currency), [txs,settings.currency]);
  const days7 = useMemo(() => lastNDays(7), []);
  const trend7 = useMemo(() => groupByDay(txs,days7,settings.currency), [txs,days7,settings.currency]);
  const max7 = Math.max(1,...trend7.flatMap(x => [x.income,x.expense]));
  const latest = txs[0];

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
  const reportExpenseDist = useMemo(() => [...dist].sort((a,b) => b.total-a.total), [dist]);
  const expenseTransactions = useMemo(() => reportTxs.filter(x => x.type==='expense'), [reportTxs]);
  const incomeTransactions = useMemo(() => reportTxs.filter(x => x.type==='income'), [reportTxs]);
  const savingsRate = reportTotals.income > 0 ? (reportTotals.balance / reportTotals.income) * 100 : null;
  const expenseRatio = reportTotals.income > 0 ? (reportTotals.expense / reportTotals.income) * 100 : null;
  const averageIncome = incomeTransactions.length ? reportTotals.income / incomeTransactions.length : 0;
  const averageExpense = expenseTransactions.length ? reportTotals.expense / expenseTransactions.length : 0;
  const averageTransaction = reportTotals.count ? (reportTotals.income + reportTotals.expense) / reportTotals.count : 0;
  const largestExpenseTx = expenseTransactions.reduce<Transaction | null>((max,x) => !max || x.amount > max.amount ? x : max, null);
  const reportStart = new Date(pr.from + 'T12:00:00');
  const reportEnd = new Date(pr.to + 'T12:00:00');
  const reportCalendarDays = Math.max(1, Math.round((reportEnd.getTime()-reportStart.getTime())/86400000)+1);
  const averageDailyExpense = reportTotals.expense / reportCalendarDays;
  const balanceSeries = useMemo(() => {
    let balance=0;
    return [...reportTxs]
      .sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time))
      .reduce<Array<{date:string;income:number;expense:number;balance:number}>>((acc,x) => {
        const last=acc[acc.length-1];
        const income=x.type==='income' ? x.amount : 0;
        const expense=x.type==='expense' ? x.amount : 0;
        balance += income-expense;
        if(last && last.date===x.date) {
          last.income += income;
          last.expense += expense;
          last.balance = balance;
        } else {
          acc.push({date:x.date,income,expense,balance});
        }
        return acc;
      },[]);
  }, [reportTxs]);

  const lineWidth=680;
  const lineHeight=240;
  const linePadX=40;
  const linePadY=24;
  const lineMax=Math.max(1,...repTrend.flatMap(x => [x.income,x.expense]));
  const makeLinePoints=(data:Array<{income:number;expense:number}>,key:'income'|'expense') => data.map((d,i) => {
    const x=data.length<=1 ? lineWidth/2 : linePadX + (i/(data.length-1))*(lineWidth-linePadX*2);
    const y=lineHeight-linePadY-(d[key]/lineMax)*(lineHeight-linePadY*2);
    return x.toFixed(1)+','+y.toFixed(1);
  }).join(' ');
  const incomeLinePoints=makeLinePoints(repTrend,'income');
  const expenseLinePoints=makeLinePoints(repTrend,'expense');
  const balanceMax=Math.max(1,...balanceSeries.map(x=>Math.abs(x.balance)));
  const balanceLinePoints=balanceSeries.map((d,i) => {
    const x=balanceSeries.length<=1 ? lineWidth/2 : linePadX + (i/(balanceSeries.length-1))*(lineWidth-linePadX*2);
    const y=lineHeight/2 - (d.balance/balanceMax)*(lineHeight/2-linePadY);
    return x.toFixed(1)+','+y.toFixed(1);
  }).join(' ');
  const categoryStops=(() => {
    if(!reportExpenseDist.length) return 'transparent';
    let cursor=0;
    const colors=['#2f7d6a','#5a9f8b','#7eb7a7','#a5cfc2','#d0e5de','#e6f0ed'];
    return reportExpenseDist.map((x,i) => {
      const start=cursor;
      cursor += x.total/Math.max(1,reportTotals.expense)*100;
      return colors[i%colors.length]+' '+start.toFixed(2)+'% '+cursor.toFixed(2)+'%';
    }).join(',');
  })();

  const customRangeError = period === 'custom' && cFrom > cTo;

  function persistLocal(next:Transaction[]) {
    try {
      localStorage.removeItem(LS_WIPED);
      localStorage.setItem(settings.storageMode==='cloud' ? LS_CLOUD_FALLBACK : LS_FALLBACK,JSON.stringify(next));
    } catch {}
    setTxs(next);
  }

  async function persistTransaction(tx:Transaction,isEdit:boolean):Promise<boolean> {
    const rest=isEdit ? txs.filter(x => x.id !== tx.id) : txs;
    const next=[tx,...rest].sort((a,b)=>(b.date+b.time).localeCompare(a.date+a.time));

    if (settings.storageMode === 'cloud' && cloudSession) {
      try {
        await upsertCloudTransaction(cloudSession,tx);
      } catch {
        say(t(lang,'cloudSyncFailed'));
        return false;
      }
      persistLocal(next);
      return true;
    }

    persistLocal(next);
    try { await dbPut(tx); } catch { say(t(lang,'localFallback')); }
    return true;
  }

  async function removeTx(id:string) {
    if (settings.storageMode === 'cloud' && cloudSession) {
      try { await deleteCloudTransaction(cloudSession,id); }
      catch { say(t(lang,'cloudSyncFailed')); return; }
    } else {
      try { await dbDel(id); } catch {}
    }
    persistLocal(txs.filter(x => x.id !== id));
    setConfirmId(null);
    say(t(lang,'deleted'));
  }

  async function chooseStorageMode(mode:StorageMode) {
    if (mode === 'offline') {
      setSettings(s => ({...s,storageMode:'offline'}));
      setCloudAuthOpen(false);
      return;
    }
    if (!cloudConfigured()) {
      say(t(lang,'cloudNotConfigured'));
      setCloudAuthOpen(true);
      return;
    }
    const session = await ensureCloudSession();
    if (!session) {
      setCloudAuthOpen(true);
      return;
    }
    try {
      await fetchCloudData(session);
    } catch (e) {
      say(e instanceof Error ? e.message : t(lang,'cloudSyncFailed'));
      return;
    }
    setCloudSession(session);
    setSettings(s => ({...s,storageMode:'cloud'}));
  }

  async function uploadLocalToCloud() {
    if (!cloudSession) { setCloudAuthOpen(true); return; }
    try {
      const localRaw=localStorage.getItem(LS_FALLBACK);
      const localList=localRaw ? JSON.parse(localRaw) : await dbGetAll();
      const localCats=loadCategories();
      const normalized=Array.isArray(localList)
        ? localList.map(x=>normalizeTransaction(x,localCats,settings.currency)).filter(Boolean) as Transaction[]
        : [];
      await uploadLocalTransactions(cloudSession,normalized);
      await uploadLocalCategories(cloudSession,localCats);
      say(t(lang,'cloudImportedLocal'));
      const data=await fetchCloudData(cloudSession);
      const mergedCats=[...DEFAULT_CATS,...data.categories.filter(c=>!DEFAULT_CATS.some(d=>d.id===c.id))];
      setCats(mergedCats);
      const next=data.transactions.sort((a,b)=>(b.date+b.time).localeCompare(a.date+a.time));
      setTxs(next);
      try { localStorage.setItem(LS_CLOUD_FALLBACK,JSON.stringify(next)); localStorage.setItem(LS_CLOUD_CATS,JSON.stringify(mergedCats)); } catch {}
    } catch (e) {
      say(e instanceof Error ? e.message : t(lang,'cloudSyncFailed'));
    }
  }

  async function cloudLogout() {
    await signOut();
    setCloudSession(null);
    setSettings(s => ({...s,storageMode:'offline'}));
    say(t(lang,'cloudSignedOut'));
  }

  function utf8ToBase64(value:string) {
    const bytes = new TextEncoder().encode(value);
    let binary = '';
    const chunk = 0x8000;
    for (let i=0; i<bytes.length; i += chunk) {
      binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + chunk, bytes.length)));
    }
    return btoa(binary);
  }

  async function deliverFile(filename:string, content:string, mime:string, successKey:'backupReady'|'csvReady') {
    if (Capacitor.getPlatform() === 'android') {
      try {
        const result = await FileSaver.saveFile({
          filename,
          mimeType:mime,
          data:utf8ToBase64(content)
        });
        if (!result?.saved) throw new Error('Android did not confirm that the file was saved.');
        say(t(lang,successKey));
      } catch {
        say(t(lang,'fileExportFailed'));
      }
      return;
    }

    try {
      const blob=new Blob([content],{type:mime});
      const url=URL.createObjectURL(blob);
      const a=document.createElement('a');
      a.href=url;
      a.download=filename;
      a.style.display='none';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url),1000);
      say(t(lang,successKey));
    } catch {
      say(t(lang,'fileExportFailed'));
    }
  }

  async function exportPdf() {
    if (txs.length === 0) {
      say(t(lang,'pdfNoTransactions'));
      return;
    }

    const currencies=[...new Set(txs.map(x => x.currency))];
    const summaries=currencies.map(currency => {
      const totals=calcTotals(txs,currency);
      return {
        currency,
        currencyLabel:CURRENCY_MAP[currency].names[lang] + ' (' + currency + ')',
        income:fmtMoney(totals.income,currency,locale),
        expense:fmtMoney(totals.expense,currency,locale),
        balance:fmtMoney(totals.balance,currency,locale),
        incomeLabel:t(lang,'income'),
        expenseLabel:t(lang,'expense'),
        balanceLabel:t(lang,'currentBalance')
      };
    });

    const report:PdfReport={
      title:t(lang,'pdfReportTitle'),
      subtitle:fmtNum(txs.length,locale) + ' ' + t(lang,'transactions'),
      exportedAt:new Date().toLocaleString(locale),
      summaryTitle:t(lang,'pdfSummary'),
      emptyText:t(lang,'noTransactions'),
      dateLabel:t(lang,'pdfDate'),
      timeLabel:t(lang,'pdfTime'),
      typeLabel:t(lang,'pdfType'),
      categoryLabel:t(lang,'pdfCategory'),
      descriptionLabel:t(lang,'pdfDescription'),
      indicatorsTitle:t(lang,'financialIndicators'),
      chartsTitle:t(lang,'reportCharts'),
      indicators:[
        {label:t(lang,'savingsRate'),value:savingsRate === null ? '—' : fmtNum(savingsRate,locale,1) + '%'},
        {label:t(lang,'expenseRatio'),value:expenseRatio === null ? '—' : fmtNum(expenseRatio,locale,1) + '%'},
        {label:t(lang,'averageIncome'),value:fmtMoney(averageIncome,reportCurrency,locale)},
        {label:t(lang,'averageExpense'),value:fmtMoney(averageExpense,reportCurrency,locale)},
        {label:t(lang,'largestExpense'),value:largestExpenseTx ? fmtMoney(largestExpenseTx.amount,largestExpenseTx.currency,locale) : '—'},
        {label:t(lang,'averageTransaction'),value:fmtMoney(averageTransaction,reportCurrency,locale)},
        {label:t(lang,'averageDailyExpense'),value:fmtMoney(averageDailyExpense,reportCurrency,locale)},
      ],
      summaries,
      categoryDistribution:reportExpenseDist.map(x => ({
        label:categoryName(x.category),
        value:x.total,
        percent:reportTotals.expense ? (x.total/reportTotals.expense)*100 : 0
      })),
      trend:balanceSeries.map(x => ({date:x.date,income:x.income,expense:x.expense,balance:x.balance})),
      transactions:[...txs]
        .sort((a,b)=>(b.date+b.time).localeCompare(a.date+a.time))
        .map(x => ({
          date:displayDate(x.date,locale),
          time:x.time,
          type:x.type==='income' ? t(lang,'income') : t(lang,'expense'),
          title:x.title,
          category:categoryName(x.category),
          amount:(x.type==='income' ? '+ ' : '- ') + fmtMoney(x.amount,x.currency,locale),
          description:x.description || '',
          dateLabel:t(lang,'pdfDate'),
          timeLabel:t(lang,'pdfTime'),
          typeLabel:t(lang,'pdfType'),
          categoryLabel:t(lang,'pdfCategory'),
          descriptionLabel:t(lang,'pdfDescription')
        }))
    };

    try {
      if (Capacitor.getPlatform() === 'android') {
        await FileSaver.savePdf({
          filename:'cashio-financial-report.pdf',
          report
        });
        say(t(lang,'pdfReady'));
        return;
      }

      const oldTitle=document.title;
      document.title=report.title;
      window.print();
      window.setTimeout(() => { document.title=oldTitle; },1000);
      say(t(lang,'pdfPrintHint'));
    } catch {
      say(t(lang,'pdfExportFailed'));
    }
  }

  async function exportJSON() {
    const payload={version:2,exportedAt:nowISO(),settings,categories:cats,transactions:txs};
    await deliverFile('dakhl-kharj-backup-v2.json',JSON.stringify(payload,null,2),'application/json','backupReady');
  }

  async function exportCSVFile() {
    const rows=txs.map(x => ({...x, categoryId:x.category, category:categoryName(x.category), currency:x.currency}));
    await deliverFile('dakhl-kharj.csv','\ufeff'+toCSV(rows),'text/csv;charset=utf-8','csvReady');
  }

  function resolveCsvCategoryId(rawId:string, rawLabel:string, existing:Category[], type:TxType): string {
    const id = rawId.trim();
    const label = rawLabel.trim();
    if (id && existing.some(c => c.id === id)) return id;

    const byLabel = existing.find(c =>
      c.label.trim().toLocaleLowerCase(locale) === label.toLocaleLowerCase(locale) ||
      categoryLabel(c.id,c.label,lang).trim().toLocaleLowerCase(locale) === label.toLocaleLowerCase(locale)
    );
    if (byLabel) return byLabel.id;

    for (const language of ['fa','en','ru','ar','tr'] as LanguageCode[]) {
      const match = existing.find(c => categoryLabel(c.id,c.label,language).trim().toLocaleLowerCase() === label.toLocaleLowerCase());
      if (match) return match.id;
    }

    return id || 'cat-'+uid();
  }

  async function importFile(file:File) {
    try {
      const name=file.name.toLocaleLowerCase();
      const text=await file.text();

      if (name.endsWith('.csv') || file.type.toLocaleLowerCase().includes('csv')) {
        const rows=parseCSV(text);
        if (rows.length < 2) { say(t(lang,'invalidFileKeepData')); return; }

        const normalizeHeader=(value:string) => value.trim().toLocaleLowerCase().replace(/[\s_\-\u200c\u200d]+/g,'');
        const headers=rows[0].map(normalizeHeader);
        const index=(...names:string[]) => names.map(n => headers.indexOf(n)).find(i => i >= 0) ?? -1;
        const iId=index('id','شناسه');
        const iType=index('type','نوع','نوعتراکنش');
        const iAmount=index('amount','مبلغ');
        const iCurrency=index('currency','ارز','واحدپول');
        const iTitle=index('title','عنوان');
        const iCategoryId=index('categoryid','شناسهدسته');
        const iCategory=index('category','دسته','دسته بندی','دسته‌بندی');
        const iDate=index('date','تاریخ');
        const iTime=index('time','ساعت');
        const iDescription=index('description','توضیحات','توضیح');
        const iCreated=index('createdat','تاریخایجاد');
        const iUpdated=index('updatedat','تاریخبروزرسانی');

        if ([iType,iAmount,iTitle,iCategory,iDate,iTime].some(i => i < 0)) {
          say(t(lang,'invalidFileKeepData'));
          return;
        }

        const rawRecords=rows.slice(1).map(cols => ({
          id: iId >= 0 ? cols[iId]?.trim() : '',
          type: (cols[iType] ?? '').trim().toLocaleLowerCase(),
          amount: cols[iAmount] ?? '',
          currency: iCurrency >= 0 ? (cols[iCurrency] ?? '').trim().toUpperCase() : '',
          title: cols[iTitle] ?? '',
          categoryId: iCategoryId >= 0 ? (cols[iCategoryId] ?? '') : '',
          category: cols[iCategory] ?? '',
          date: (cols[iDate] ?? '').trim(),
          time: (cols[iTime] ?? '').trim(),
          description: iDescription >= 0 ? (cols[iDescription] ?? '') : '',
          createdAt: iCreated >= 0 ? (cols[iCreated] ?? '') : '',
          updatedAt: iUpdated >= 0 ? (cols[iUpdated] ?? '') : ''
        }));

        if (rawRecords.some(r => !r.title.trim() || !r.category.trim())) {
          say(t(lang,'invalidFileKeepData'));
          return;
        }

        const categorySpecs=new Map<string,{id:string;label:string;types:Set<TxType>}>();
        const existingCats=loadCategories();
        for (const row of rawRecords) {
          const type:TxType | null = row.type === 'income' || row.type === 'expense'
            ? row.type
            : (row.type === 'درآمد' || row.type === 'دخل' ? 'income' : row.type === 'هزینه' || row.type === 'مصروف' ? 'expense' : null);
          if (!type) { say(t(lang,'invalidFileKeepData')); return; }
          const id=resolveCsvCategoryId(row.categoryId,row.category,existingCats,type);
          if (!existingCats.some(c => c.id === id)) {
            const spec=categorySpecs.get(id) ?? {id,label:row.category.trim(),types:new Set<TxType>()};
            spec.types.add(type);
            if (!spec.label) spec.label=row.category.trim();
            categorySpecs.set(id,spec);
          }
        }

        const csvCustom:Category[]=[];
        for (const spec of categorySpecs.values()) {
          if (!DEFAULT_CATS.some(c => c.id === spec.id)) {
            csvCustom.push({
              id:spec.id,
              label:spec.label,
              kind:spec.types.size > 1 ? 'both' : (spec.types.has('income') ? 'income' : 'expense')
            });
          }
        }
        const nextCats=[...DEFAULT_CATS,...existingCats.filter(c => !c.system && !DEFAULT_CATS.some(d => d.id===c.id)),...csvCustom.filter(c => !existingCats.some(e => e.id===c.id))] as Category[];

        const ids=new Set<string>();
        const normalized=rawRecords.map((row,n) => {
          const type:TxType | null = row.type === 'income' || row.type === 'expense'
            ? row.type
            : (row.type === 'درآمد' || row.type === 'دخل' ? 'income' : row.type === 'هزینه' || row.type === 'مصروف' ? 'expense' : null);
          if (!type) return null;
          const currency = row.currency && CURRENCY_MAP[row.currency as CurrencyCode] ? row.currency as CurrencyCode : settings.currency;
          const amount=parseAmount(row.amount,currency);
          const id=row.id || 'csv-'+uid();
          if (!amount || !row.title.trim() || !row.category.trim() || !isValidDateString(row.date) || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(row.time) || ids.has(id)) return null;
          ids.add(id);
          const categoryId=resolveCsvCategoryId(row.categoryId,row.category,nextCats,type);
          const tx=normalizeTransaction({
            id,
            type,
            amount,
            currency,
            title:row.title,
            category:categoryId,
            date:row.date,
            time:row.time,
            description:row.description,
            createdAt:row.createdAt || nowISO(),
            updatedAt:row.updatedAt || nowISO()
          },nextCats,settings.currency);
          return tx;
        });

        if (normalized.some(x => !x) || !normalized.length) {
          say(t(lang,'invalidFileKeepData'));
          return;
        }

        const sorted=normalized.filter(Boolean) as Transaction[];
        sorted.sort((a,b)=>(b.date+b.time).localeCompare(a.date+a.time));
        if (settings.storageMode==='cloud' && cloudSession) {
          try {
            await uploadLocalCategories(cloudSession,nextCats);
            await uploadLocalTransactions(cloudSession,sorted);
            const current=await fetchCloudData(cloudSession);
            const keepTx=new Set(sorted.map(x=>x.id));
            const keepCats=new Set(nextCats.filter(c=>!c.system).map(c=>c.id));
            await Promise.all(current.transactions.filter(x=>!keepTx.has(x.id)).map(x=>deleteCloudTransaction(cloudSession,x.id)));
            await Promise.all(current.categories.filter(x=>!keepCats.has(x.id)).map(x=>deleteCloudCategory(cloudSession,x.id)));
            setCats(nextCats);
            setTxs(sorted);
            say(t(lang,'restored'));
            return;
          } catch {
            say(t(lang,'cloudSyncFailed'));
            return;
          }
        }

        localStorage.removeItem(LS_WIPED);
        localStorage.setItem(LS_FALLBACK,JSON.stringify(sorted));
        setCats(nextCats);
        setTxs(sorted);
        try { await dbBulkPut(sorted); } catch { say(t(lang,'localFallback')); return; }
        say(t(lang,'restored'));
        return;
      }

      const obj=JSON.parse(text);
      const err=validateBackup(obj);
      if (err) { say(t(lang,'invalidFileKeepData')); return; }

      const rawCats=Array.isArray(obj.categories) ? obj.categories : [];
      const custom=rawCats.filter((c:any) =>
        c && typeof c.id==='string' &&
        !DEFAULT_CATS.some(d => d.id===c.id) &&
        typeof c.label==='string' &&
        c.label.trim()
      );
      const nextCats=[...DEFAULT_CATS,...custom] as Category[];
      const sorted=(obj.transactions as any[])
        .map(x => normalizeTransaction(x,nextCats,settings.currency))
        .filter(Boolean) as Transaction[];
      sorted.sort((a,b)=>(b.date+b.time).localeCompare(a.date+a.time));

      if (settings.storageMode==='cloud' && cloudSession) {
        try {
          await uploadLocalCategories(cloudSession,nextCats);
          await uploadLocalTransactions(cloudSession,sorted);

          const current=await fetchCloudData(cloudSession);
          const keepTx=new Set(sorted.map(x=>x.id));
          const keepCats=new Set(nextCats.filter(c=>!c.system).map(c=>c.id));
          await Promise.all(current.transactions.filter(x=>!keepTx.has(x.id)).map(x=>deleteCloudTransaction(cloudSession,x.id)));
          await Promise.all(current.categories.filter(x=>!keepCats.has(x.id)).map(x=>deleteCloudCategory(cloudSession,x.id)));

          const data=await fetchCloudData(cloudSession);
          const mergedCats=[...DEFAULT_CATS,...data.categories.filter(c => !DEFAULT_CATS.some(d => d.id===c.id))];
          const cloudTxs=data.transactions
            .map(x => normalizeTransaction(x,mergedCats,settings.currency))
            .filter(Boolean) as Transaction[];
          cloudTxs.sort((a,b)=>(b.date+b.time).localeCompare(a.date+a.time));
          setCats(mergedCats);
          setTxs(cloudTxs);
          localStorage.setItem(LS_CLOUD_FALLBACK,JSON.stringify(cloudTxs));
          localStorage.setItem(LS_CLOUD_CATS,JSON.stringify(mergedCats));
          say(t(lang,'restored'));
          return;
        } catch {
          say(t(lang,'cloudSyncFailed'));
          return;
        }
      }

      localStorage.removeItem(LS_WIPED);
      localStorage.setItem(LS_FALLBACK,JSON.stringify(sorted));
      setCats(nextCats);
      setTxs(sorted);
      try { await dbBulkPut(sorted); } catch { say(t(lang,'localFallback')); return; }
      say(t(lang,'restored'));
    } catch {
      say(t(lang,'invalidFileKeepData'));
    }
  }

  function base64ToFile(data:string, filename:string, mimeType:string) {
    const binary=atob(data);
    const bytes=new Uint8Array(binary.length);
    for(let i=0;i<binary.length;i++) bytes[i]=binary.charCodeAt(i);
    return new File([bytes],filename,{type:mimeType});
  }

  async function importNativeResult(result:NativeImportResult) {
    if (result?.error) {
      say(result.error);
      return false;
    }
    if(!result?.data || !result.filename) {
      say(t(lang,'invalidFileKeepData'));
      return false;
    }
    const lower=result.filename.toLocaleLowerCase();
    const nativeMime=(result.mimeType || '').toLocaleLowerCase();
    let looksCsv=lower.endsWith('.csv') || nativeMime.includes('csv');
    let looksJson=lower.endsWith('.json') || nativeMime.includes('json');
    if (!looksCsv && !looksJson && (nativeMime.includes('text/plain') || nativeMime.includes('octet-stream'))) {
      try {
        const binary=atob(result.data);
        const preview=decodeURIComponent(Array.from(binary.slice(0,1200),ch=>'%' + ch.charCodeAt(0).toString(16).padStart(2,'0')).join(''));
        const trimmed=preview.replace(/^\uFEFF/,'').trimStart();
        looksJson=trimmed.startsWith('{') || trimmed.startsWith('[');
        looksCsv=!looksJson && /^(?:id|type|amount|title|category|تاریخ|مبلغ|نوع)/i.test(trimmed.split(/\r?\n/,1)[0] || '');
      } catch {}
    }
    if (!looksCsv && !looksJson) {
      say(t(lang,'invalidFileKeepData'));
      return false;
    }
    const mime=looksCsv ? 'text/csv' : 'application/json';
    await importFile(base64ToFile(result.data,result.filename,mime));
    return true;
  }

  async function handleImportClick() {
    if (Capacitor.getPlatform() === 'android') {
      try {
        const result=await FileSaver.pickFile({mimeType:'*/*'});
        await importNativeResult(result);
      } catch (e) {
        const message=e instanceof Error ? e.message : String(e);
        if (message && !/canceled/i.test(message)) say(message);
      }
      return;
    }
    fileRef.current?.click();
  }

  useEffect(() => {
    if (Capacitor.getPlatform() !== 'android') return;
    let active=true;
    let handle:{remove:()=>Promise<void>}|null=null;
    void FileSaver.addListener('fileOpen', async result => {
      if (!active) return;
      await importNativeResult(result);
    }).then(v => { handle=v; });
    void FileSaver.getPendingFile()
      .then(async result => {
        if (!active || !result?.pending) return;
        await importNativeResult(result);
      })
      .catch(() => {});
    return () => {
      active=false;
      void handle?.remove();
    };
  }, []);

  async function addCategory() {
    const label=newCat.trim();
    if (!label) { say(t(lang,'categoryNameRequired')); return; }
    if (label.length>80) return;
    if (cats.some(c => c.label.toLocaleLowerCase(locale) === label.toLocaleLowerCase(locale))) { say(t(lang,'categoryExists')); return; }

    const created={id:'cat-'+uid(),label,kind:newCatKind};
    if (settings.storageMode==='cloud' && cloudSession) {
      try { await upsertCloudCategory(cloudSession,created); }
      catch { say(t(lang,'cloudSyncFailed')); return; }
    }
    setCats(prev => [...prev,created]);
    setNewCat('');
    say(t(lang,'categoryAdded'));
  }

  async function delCategory(id:string) {
    const c=cats.find(x => x.id===id);
    if (!c) return;
    if (c.system) { say(t(lang,'defaultCategoryCannotDelete')); return; }
    if (txs.some(x => x.category===id)) { say(t(lang,'categoryHasTransactions')); return; }
    if (settings.storageMode==='cloud' && cloudSession) {
      try { await deleteCloudCategory(cloudSession,id); }
      catch { say(t(lang,'cloudSyncFailed')); return; }
    }
    setCats(prev => prev.filter(x => x.id!==id));
    say(t(lang,'categoryDeleted'));
  }

  async function wipeAll() {
    if (settings.storageMode==='cloud' && cloudSession) {
      try { await deleteAllCloudData(cloudSession); }
      catch { say(t(lang,'cloudSyncFailed')); return; }
    }
    try {
      localStorage.setItem(LS_WIPED,'1');
      localStorage.removeItem(LS_FALLBACK);
      localStorage.removeItem(LS_CLOUD_FALLBACK);
      localStorage.removeItem(LS_CATS);
      localStorage.removeItem(LS_CLOUD_CATS);
    } catch {}
    setTxs([]);
    setCats(DEFAULT_CATS);
    setWipeStep(0);
    try { await dbClear(); } catch {}
    say(t(lang,'allDataDeleted'));
  }

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
        <h2>{t(lang,'last7Days')}</h2>
        <div className="card"><div className="bars">
          {trend7.map(d => <div className="bar" key={d.date}>
            <div className="col income-bar" style={{height:Math.max(3,(d.income/max7)*52)}} title={t(lang,'income')+' '+fmtMoney(d.income,settings.currency,locale)} />
            <div className="col expense-bar" style={{height:Math.max(3,(d.expense/max7)*52)}} title={t(lang,'expense')+' '+fmtMoney(d.expense,settings.currency,locale)} />
            <span className="muted" style={{fontSize:10}}>{d.date.slice(5)}</span>
          </div>)}
        </div><div className="muted">{t(lang,'greenIncomeRedExpense')}</div></div>
        <h2>{t(lang,'latestTransactions')}</h2>
        {txs.length===0 ? <div className="empty">{t(lang,'noneYet')} {t(lang,'registerFirst')}</div> :
          <div className="list">{txs.slice(0,5).map(x => <div className="item" key={x.id}>
            <div><b>{x.title}</b> <span className={'badge '+(x.type==='income'?'in':'out')}>{x.type==='income'?t(lang,'income'):t(lang,'expense')}</span>
              <div className="muted">{categoryName(x.category)} · {displayDate(x.date,locale)} {x.time} · {CURRENCY_MAP[x.currency].names[lang]}</div>
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
              <div className="muted">{categoryName(x.category)} · {displayDate(x.date,locale)} {x.time} · {CURRENCY_MAP[x.currency].names[lang]}</div>
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
        <section className="report-page" aria-label={t(lang,'reports')}>
        <h2>{t(lang,'reports')} — {t(lang,pr.labelKey)} — {CURRENCY_MAP[reportCurrency].names[lang]}</h2>
        <div className="report-periods">
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
            <div className="report-kpi-grid">
              <div className="card"><div className="k">{t(lang,'totalIncomeReport')}</div><div className="v in">{fmtMoney(reportTotals.income,reportCurrency,locale)}</div></div>
              <div className="card"><div className="k">{t(lang,'totalExpenseReport')}</div><div className="v out">{fmtMoney(reportTotals.expense,reportCurrency,locale)}</div></div>
              <div className="card"><div className="k">{t(lang,'balance')}</div><div className="v bal">{fmtMoney(reportTotals.balance,reportCurrency,locale)}</div></div>
              <div className="card"><div className="k">{t(lang,'transactionCount')}</div><div className="v">{fmtNum(reportTotals.count,locale)}</div></div>
            </div>

            <h3>{t(lang,'financialIndicators')}</h3>
            <div className="report-kpi-grid">
              <div className="card"><div className="k">{t(lang,'savingsRate')}</div><div className="v">{savingsRate===null ? '—' : fmtNum(savingsRate,locale,1)+'%'}</div></div>
              <div className="card"><div className="k">{t(lang,'expenseRatio')}</div><div className="v">{expenseRatio===null ? '—' : fmtNum(expenseRatio,locale,1)+'%'}</div></div>
              <div className="card"><div className="k">{t(lang,'averageIncome')}</div><div className="v in">{fmtMoney(averageIncome,reportCurrency,locale)}</div></div>
              <div className="card"><div className="k">{t(lang,'averageExpense')}</div><div className="v out">{fmtMoney(averageExpense,reportCurrency,locale)}</div></div>
              <div className="card"><div className="k">{t(lang,'largestExpense')}</div><div className="v out">{largestExpenseTx ? fmtMoney(largestExpenseTx.amount,largestExpenseTx.currency,locale) : '—'}</div></div>
              <div className="card"><div className="k">{t(lang,'averageTransaction')}</div><div className="v">{fmtMoney(averageTransaction,reportCurrency,locale)}</div></div>
              <div className="card"><div className="k">{t(lang,'averageDailyExpense')}</div><div className="v out">{fmtMoney(averageDailyExpense,reportCurrency,locale)}</div></div>

            </div>

            <h3>{t(lang,'reportCharts')}</h3>
            <div className="report-chart-grid">
              <div className="card report-chart-card report-chart-wide">
                <h3>{t(lang,'incomeExpenseLine')}</h3>
                <svg className="report-chart-svg" viewBox="0 0 680 240" role="img" aria-label={t(lang,'incomeExpenseLine')} style={{width:'100%',height:'auto',overflow:'visible'}}>
                  <line x1="40" y1="216" x2="640" y2="216" stroke="currentColor" opacity=".18" />
                  <polyline points={incomeLinePoints} fill="none" stroke="#2f7d6a" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                  <polyline points={expenseLinePoints} fill="none" stroke="#b85b5b" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                  {repTrend.length>0 && <><circle cx={incomeLinePoints.split(' ').slice(-1)[0]?.split(',')[0] || 0} cy={incomeLinePoints.split(' ').slice(-1)[0]?.split(',')[1] || 0} r="5" fill="#2f7d6a" /><circle cx={expenseLinePoints.split(' ').slice(-1)[0]?.split(',')[0] || 0} cy={expenseLinePoints.split(' ').slice(-1)[0]?.split(',')[1] || 0} r="5" fill="#b85b5b" /></>}
                </svg>
                <div className="row space"><span className="muted">{t(lang,'income')}</span><span className="muted">{t(lang,'expense')}</span></div>
              </div>

              <div className="card report-chart-card">
                <h3>{t(lang,'balanceTrend')}</h3>
                <svg className="report-chart-svg" viewBox="0 0 680 240" role="img" aria-label={t(lang,'balanceTrend')} style={{width:'100%',height:'auto'}}>
                  <line x1="40" y1="120" x2="640" y2="120" stroke="currentColor" opacity=".18" />
                  <polyline points={balanceLinePoints} fill="none" stroke="#586fae" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <div className="muted">{t(lang,'monthlyComparison')}</div>
              </div>

              <div className="card report-chart-card">
                <h3>{t(lang,'categoryChart')}</h3>
                <div className="report-donut-row">
                  <div className="report-donut" aria-label={t(lang,'categoryChart')} style={{borderRadius:'50%',background:'conic-gradient('+categoryStops+')',position:'relative'}}>
                    <div style={{position:'absolute',inset:'23%',borderRadius:'50%',background:'var(--card,#fff)'}} />
                  </div>
                  <div style={{flex:1,minWidth:180}}>{reportExpenseDist.slice(0,8).map((x,i)=><div className="row space" key={x.category} style={{marginBottom:6}}>
                    <span><i style={{display:'inline-block',width:10,height:10,borderRadius:3,marginLeft:6,background:['#2f7d6a','#5a9f8b','#7eb7a7','#a5cfc2','#d0e5de','#e6f0ed'][i%6]}} />{categoryName(x.category)}</span>
                    <b>{fmtNum(x.total/reportTotals.expense*100,locale,1)}%</b>
                  </div>)}</div>
                </div>
              </div>

              <div className="card report-chart-card">
                <h3>{t(lang,'incomeExpenseTrend')}</h3>
                <div className="bars">
                  {repTrend.map(d => <div className="bar" key={d.date}>
                    <div className="col income-bar" style={{height:Math.max(3,(d.income/maxRep)*58)}} />
                    <div className="col expense-bar" style={{height:Math.max(3,(d.expense/maxRep)*58)}} />
                    <span className="muted" style={{fontSize:9}}>{d.date.replace('-', '/')}</span>
                  </div>)}
                </div>
              </div>
            </div>

            <h3>{t(lang,'expenseDistribution')}</h3>
            <div className="card grid">{reportExpenseDist.map(x => <div key={x.category}>
              <div className="row space"><span>{categoryName(x.category)}</span><b>{fmtMoney(x.total,reportCurrency,locale)}</b></div>
              <div className="hbar"><i style={{width:Math.round((x.total/maxDist)*100)+'%'}} /></div>
            </div>)}</div>
          </>}
        </section>
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
          <h3>{t(lang,'storageMode')}</h3>
          <div className="row">
            <button className={settings.storageMode==='offline'?'btn':'btn ghost'} onClick={() => void chooseStorageMode('offline')}>{t(lang,'offlineMode')}</button>
            <button className={settings.storageMode==='cloud'?'btn':'btn ghost'} onClick={() => void chooseStorageMode('cloud')}>{t(lang,'cloudMode')}</button>
          </div>
          {settings.storageMode==='cloud' && cloudSession ? <>
            <div className="cloud-account">
              <b>{t(lang,'cloudAccount')}</b>
              <span>{cloudSession.email}</span>
            </div>
            <div className="row" style={{marginTop:8}}>
              <button className="btn ghost" onClick={() => void uploadLocalToCloud()}>{t(lang,'cloudTransferLocal')}</button>
              <button className="btn ghost" onClick={() => void cloudLogout()}>{t(lang,'cloudLogout')}</button>
            </div>
          </> : settings.storageMode==='cloud' ? <div className="currency-note">{t(lang,'cloudModeRequiresAccount')}</div> : null}
          {!cloudConfigured() && <>
            <div className="err">{t(lang,'cloudConfigureHint')}</div>
            <div className="currency-note">{t(lang,'cloudAuthSetupHint')}</div>
          </>}
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
          <div className="row"><button className="btn" onClick={exportJSON}>{t(lang,'downloadBackup')}</button><button className="btn ghost" onClick={exportCSVFile}>{t(lang,'exportCsv')}</button><button className="btn ghost" onClick={exportPdf}>{t(lang,'exportPdf')}</button><button className="btn ghost" onClick={() => void handleImportClick()}>{t(lang,'importFile')}</button></div>
          <input ref={fileRef} type="file" accept="application/json,.json,text/csv,.csv" style={{display:'none'}} onChange={e => { const f=e.target.files?.[0]; if(f) void importFile(f); e.target.value=''; }} />
          <div className="currency-note">{settings.storageMode==='cloud' ? t(lang,'cloudDataNote') : t(lang,'privacyLocalOnly')} {t(lang,'dataIntegrityNote')}</div>
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

    {cloudAuthOpen && <CloudAuthModal lang={lang} onClose={() => setCloudAuthOpen(false)} onAuthenticated={(session) => { setCloudSession(session); setCloudAuthOpen(false); setSettings(s => ({...s,storageMode:'cloud'})); }} />}
    {modal.open && <TxModal lang={lang} preset={modal.preset} edit={modal.edit} cats={cats} defaultCurrency={settings.currency} onClose={() => setModal({open:false,preset:'expense'})} onSave={async (tx,isEdit) => { const ok=await persistTransaction(tx,isEdit); if(ok){ setModal({open:false,preset:'expense'}); say(t(lang,isEdit?'updated':'saved')); } }} />}
    {confirmId && <div className="modal" onClick={() => setConfirmId(null)}><div className="sheet" onClick={e => e.stopPropagation()}><h3>{t(lang,'delete')}</h3><p>{t(lang,'confirmDeleteTransaction')}</p><div className="row"><button className="btn danger" onClick={() => void removeTx(confirmId)}>{t(lang,'delete')}</button><button className="btn ghost" onClick={() => setConfirmId(null)}>{t(lang,'cancel')}</button></div></div></div>}
  </>;
}

function CloudAuthModal({lang,onClose,onAuthenticated}:{lang:LanguageCode;onClose:()=>void;onAuthenticated:(session:CloudSession)=>void}) {
  const [mode,setMode]=useState<'login'|'signup'>('login');
  const [step,setStep]=useState<'form'|'verify'>('form');
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [confirmPassword,setConfirmPassword]=useState('');
  const [otp,setOtp]=useState('');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [info,setInfo]=useState('');

  async function submit() {
    setError('');
    setInfo('');
    const normalized=email.trim().toLowerCase();
    if (!normalized || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) { setError(t(lang,'invalidEmail')); return; }
    if (password.length<8) { setError(t(lang,'passwordTooShort')); return; }
    if (mode==='signup' && password!==confirmPassword) { setError(t(lang,'passwordsMismatch')); return; }
    if (!cloudConfigured()) { setError(t(lang,'cloudNotConfigured')); return; }
    setBusy(true);
    try {
      if (mode==='signup') {
        const result=await signUp(normalized,password);
        if (result.session) {
          onAuthenticated(result.session);
        } else {
          setStep('verify');
          setInfo(t(lang,'cloudOtpSent'));
        }
      } else {
        const session=await signInWithPassword(normalized,password);
        onAuthenticated(session);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    setError('');
    setInfo('');
    if (!/^\d{6}$/.test(otp.trim())) { setError(t(lang,'otpInvalid')); return; }
    setBusy(true);
    try {
      const session=await verifySignupCode(email,otp);
      if (session) onAuthenticated(session);
      else {
        const signed=await signInWithPassword(email,password);
        onAuthenticated(signed);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    setError('');
    setInfo('');
    try { await resendSignupCode(email); setInfo(t(lang,'cloudOtpSent')); } catch(e) { setError(e instanceof Error ? e.message : String(e)); }
  }

  async function resetPassword() {
    setError('');
    setInfo('');
    const normalized=email.trim().toLowerCase();
    if (!normalized) { setError(t(lang,'invalidEmail')); return; }
    try { await requestPasswordReset(normalized); setInfo(t(lang,'cloudPasswordResetSent')); } catch(e) { setError(e instanceof Error ? e.message : String(e)); }
  }

  return <div className="modal" role="dialog" aria-modal="true" onClick={onClose}>
    <div className="sheet cloud-auth-sheet" onClick={e => e.stopPropagation()}>
      <div className="sheet-head"><h3>{mode==='signup'?t(lang,'cloudSignUp'):t(lang,'cloudSignIn')}</h3><button className="btn ghost" onClick={onClose}>×</button></div>
      {!cloudConfigured() ? <div className="err">{t(lang,'cloudConfigureHint')}</div> : step==='verify' ? <>
        <p className="muted">{t(lang,'cloudEmailCodeHint')} <b>{email}</b></p>
        {info && <div className="okmsg">{info}</div>}
        {error && <div className="err">{error}</div>}
        <label>{t(lang,'cloudOtp')}</label>
        <input inputMode="numeric" autoFocus maxLength={6} value={otp} onChange={e=>setOtp(e.target.value.replace(/\D/g,''))} placeholder="123456" />
        <div className="row" style={{marginTop:10}}><button className="btn" disabled={busy} onClick={() => void verify()}>{t(lang,'cloudVerify')}</button><button className="btn ghost" disabled={busy} onClick={() => void resend()}>{t(lang,'cloudResendCode')}</button></div>
      </> : <>
        {info && <div className="okmsg">{info}</div>}
        {error && <div className="err">{error}</div>}
        <label>{t(lang,'cloudEmail')}</label>
        <input type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} />
        <label>{t(lang,'cloudPassword')}</label>
        <input type="password" autoComplete={mode==='signup'?'new-password':'current-password'} value={password} onChange={e=>setPassword(e.target.value)} />
        {mode==='signup' && <><label>{t(lang,'cloudConfirmPassword')}</label><input type="password" autoComplete="new-password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} /></>}
        <div className="row" style={{marginTop:12}}><button className="btn" disabled={busy} onClick={() => void submit()}>{mode==='signup'?t(lang,'cloudSignUp'):t(lang,'cloudSignIn')}</button>{mode==='login' && <button className="btn ghost" disabled={busy} onClick={() => void resetPassword()}>{t(lang,'cloudForgotPassword')}</button>}</div>
        <button className="btn ghost cloud-switch" disabled={busy} onClick={() => {setMode(mode==='login'?'signup':'login');setError('');setInfo('');}}>{mode==='login'?t(lang,'cloudCreateAccount'):t(lang,'cloudExistingAccount')}</button>
      </>}
    </div>
  </div>;
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
