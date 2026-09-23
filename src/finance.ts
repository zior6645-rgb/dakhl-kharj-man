import type { Category, Transaction, CurrencyCode } from './types';
import { CURRENCY_MAP } from './currencies';
import { isValidDateString, parseAmount } from './utils';

export function calcTotals(list: Transaction[], currency?: CurrencyCode) {
  let income = 0, expense = 0;
  const scoped = currency ? list.filter(t => t.currency === currency) : list;
  for (const t of scoped) {
    if (t.type === 'income') income += t.amount;
    else expense += t.amount;
  }
  return { income, expense, balance: income - expense, count: scoped.length };
}

export function currenciesIn(list: Transaction[]): CurrencyCode[] {
  return [...new Set(list.map(t => t.currency))];
}

export function monthKey(d: string) { return d.slice(0, 7); }

export function filterByDateRange(list: Transaction[], from: string, to: string, currency?: CurrencyCode) {
  return list.filter(t => (!from || t.date >= from) && (!to || t.date <= to) && (!currency || t.currency === currency));
}

export function groupByDay(list: Transaction[], days: string[], currency?: CurrencyCode) {
  const map = new Map<string,{income:number;expense:number}>();
  for (const d of days) map.set(d,{income:0,expense:0});
  for (const t of list) {
    if (currency && t.currency !== currency) continue;
    const e = map.get(t.date);
    if (!e) continue;
    if (t.type === 'income') e.income += t.amount; else e.expense += t.amount;
  }
  return days.map(d => ({ date:d, ...(map.get(d) as {income:number;expense:number}) }));
}

export function groupByMonth(list: Transaction[], months: string[], currency?: CurrencyCode) {
  const map = new Map<string,{income:number;expense:number}>();
  for (const m of months) map.set(m,{income:0,expense:0});
  for (const t of list) {
    if (currency && t.currency !== currency) continue;
    const e = map.get(monthKey(t.date));
    if (!e) continue;
    if (t.type === 'income') e.income += t.amount; else e.expense += t.amount;
  }
  return months.map(m => ({ date:m, ...(map.get(m) as {income:number;expense:number}) }));
}

export function groupByCategory(list: Transaction[], type:'income'|'expense', currency?:CurrencyCode) {
  const m = new Map<string,number>();
  for (const t of list) if (t.type === type && (!currency || t.currency === currency)) m.set(t.category,(m.get(t.category) ?? 0)+t.amount);
  return [...m.entries()].map(([category,total]) => ({category,total})).sort((a,b)=>b.total-a.total);
}

export function topCategory(list: Transaction[], currency?: CurrencyCode): string {
  const g = groupByCategory(list,'expense',currency);
  return g.length ? g[0].category : '—';
}

export function validateTx(input:{type:string;amount:string;title:string;category:string;date:string;time:string;currency:CurrencyCode}) {
  const errs:string[]=[];
  const amt=parseAmount(input.amount,input.currency);
  if (!input.amount.trim() || amt===null) errs.push('amount');
  if (!input.title.trim()) errs.push('title');
  else if (input.title.trim().length>120) errs.push('title');
  if (input.type!=='income' && input.type!=='expense') errs.push('type');
  if (!input.category.trim()) errs.push('category');
  if (!input.date || !isValidDateString(input.date)) errs.push('date');
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(input.time)) errs.push('time');
  return errs;
}

function validTime(v:unknown):boolean { return typeof v==='string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(v); }
function validCurrency(v:unknown):v is CurrencyCode { return typeof v==='string' && Object.prototype.hasOwnProperty.call(CURRENCY_MAP,v); }

function validCategoryList(v:unknown): v is Category[] {
  if (!Array.isArray(v)) return false;
  const ids=new Set<string>();
  const labels=new Set<string>();
  for (const item of v) {
    const c=item as Record<string,unknown>;
    if (!c || typeof c.id!=='string' || !c.id || ids.has(c.id)) return false;
    if (typeof c.label!=='string' || !c.label.trim() || c.label.length>80 || labels.has(c.label)) return false;
    if (c.kind!=='income' && c.kind!=='expense' && c.kind!=='both') return false;
    ids.add(c.id); labels.add(c.label);
  }
  return true;
}

export function validateBackup(obj:unknown):string|null {
  if (!obj || typeof obj!=='object') return 'structure';
  const o=obj as Record<string,unknown>;
  const version=o.version ?? 1;
  if (version!==1 && version!==2) return 'version';
  if (!Array.isArray(o.transactions)) return 'transactions';
  if (o.categories!==undefined && !validCategoryList(o.categories)) return 'categories';
  const ids=new Set<string>();
  for (const item of o.transactions as unknown[]) {
    const r=item as Record<string,unknown>;
    if (!r || typeof r.id!=='string' || !r.id || ids.has(r.id)) return 'id';
    if (r.type!=='income' && r.type!=='expense') return 'type';
    if (typeof r.amount!=='number' || !Number.isFinite(r.amount) || !Number.isSafeInteger(Math.round(r.amount*100)) || r.amount<=0) return 'amount';
    if (typeof r.title!=='string' || !r.title.trim() || r.title.length>120) return 'title';
    if (typeof r.category!=='string' || !r.category.trim() || r.category.length>80) return 'category';
    if (typeof r.date!=='string' || !isValidDateString(r.date)) return 'date';
    if (!validTime(r.time)) return 'time';
    if (typeof r.description!=='string' || r.description.length>500) return 'description';
    if (version>=2 && !validCurrency(r.currency)) return 'currency';
    if (r.createdAt!==undefined && typeof r.createdAt!=='string') return 'createdAt';
    if (r.updatedAt!==undefined && typeof r.updatedAt!=='string') return 'updatedAt';
    ids.add(r.id);
  }
  return null;
}

export function lastNDays(n:number, base=new Date()):string[] {
  const out:string[]=[];
  for (let i=n-1;i>=0;i--) {
    const d=new Date(base);
    d.setHours(12,0,0,0);
    d.setDate(d.getDate()-i);
    out.push([d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-'));
  }
  return out;
}

export function lastNMonths(n:number, base=new Date()):string[] {
  const out:string[]=[];
  for (let i=n-1;i>=0;i--) {
    const d=new Date(base);
    d.setHours(12,0,0,0);
    d.setDate(1);
    d.setMonth(d.getMonth()-i);
    out.push(d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0'));
  }
  return out;
}


export type CashCandle = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
};

export function buildCashCandles(list: Transaction[], days: string[], currency?: CurrencyCode): CashCandle[] {
  const filtered = list
    .filter(t => (!currency || t.currency === currency) && days.includes(t.date))
    .sort((a,b) => (a.date+a.time).localeCompare(b.date+b.time));
  const byDay = new Map<string, Transaction[]>();
  for (const day of days) byDay.set(day, []);
  for (const tx of filtered) byDay.get(tx.date)?.push(tx);

  let balance = 0;
  const out: CashCandle[] = [];
  for (const day of days) {
    const open = balance;
    let high = balance;
    let low = balance;
    for (const tx of byDay.get(day) ?? []) {
      balance += tx.type === 'income' ? tx.amount : -tx.amount;
      high = Math.max(high, balance);
      low = Math.min(low, balance);
    }
    out.push({date:day, open, high, low, close:balance});
  }
  return out;
}

export function movingAverage(values: number[], window = 7): number[] {
  if (!values.length) return [];
  const size = Math.max(1, Math.min(window, values.length));
  const out: number[] = [];
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= size) sum -= values[i-size];
    out.push(sum / Math.min(i + 1, size));
  }
  return out;
}

export function standardDeviation(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((s,x)=>s+x,0) / values.length;
  const variance = values.reduce((s,x)=>s + (x-mean)*(x-mean),0) / values.length;
  return Math.sqrt(Math.max(0,variance));
}
