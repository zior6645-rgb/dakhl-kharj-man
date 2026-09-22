import type { Transaction } from './types';

export function calcTotals(list: Transaction[]) {
  let income = 0, expense = 0;
  for (const t of list) {
    if (t.type === 'income') income += t.amount;
    else expense += t.amount;
  }
  return { income, expense, balance: income - expense, count: list.length };
}

export function monthKey(d: string) { return d.slice(0, 7); }

export function filterByDateRange(list: Transaction[], from: string, to: string) {
  return list.filter(t => (!from || t.date >= from) && (!to || t.date <= to));
}

export function groupByDay(list: Transaction[], days: string[]) {
  const map = new Map<string, { income: number; expense: number }>();
  for (const d of days) map.set(d, { income: 0, expense: 0 });
  for (const t of list) {
    const e = map.get(t.date);
    if (e) { if (t.type === 'income') e.income += t.amount; else e.expense += t.amount; }
  }
  return days.map(d => ({ date: d, ...(map.get(d) as { income: number; expense: number }) }));
}

export function groupByCategory(list: Transaction[], type: 'income' | 'expense') {
  const m = new Map<string, number>();
  for (const t of list) if (t.type === type) m.set(t.category, (m.get(t.category) ?? 0) + t.amount);
  return [...m.entries()].map(([category, total]) => ({ category, total })).sort((a, b) => b.total - a.total);
}

export function topCategory(list: Transaction[]): string {
  const g = groupByCategory(list, 'expense');
  return g.length ? g[0].category : '—';
}

export function validateTx(input: { type: string; amount: string; title: string; category: string; date: string }): string[] {
  const errs: string[] = [];
  const amt = Number(String(input.amount).replace(/[,٬۰-۹٠-٩\s]/g, (ch) => {
    const fa = '۰۱۲۳۴۵۶۷۸۹'; const ar = '٠١٢٣٤٥٦٧٨٩';
    if (fa.includes(ch)) return String(fa.indexOf(ch));
    if (ar.includes(ch)) return String(ar.indexOf(ch));
    return '';
  }));
  if (!input.amount || String(input.amount).trim() === '') errs.push('مبلغ را وارد کنید.');
  else if (!Number.isFinite(amt) || amt <= 0 || !Number.isInteger(Math.round(amt))) errs.push('مبلغ نامعتبر است؛ عدد صحیح بزرگ‌تر از صفر وارد کنید.');
  if (!input.title || input.title.trim() === '') errs.push('عنوان را وارد کنید.');
  if (input.type !== 'income' && input.type !== 'expense') errs.push('نوع تراکنش معتبر نیست.');
  if (!input.category || input.category.trim() === '') errs.push('دسته‌بندی را انتخاب کنید.');
  if (!input.date || !/^\d{4}-\d{2}-\d{2}$/.test(input.date) || isNaN(new Date(input.date).getTime())) errs.push('تاریخ نامعتبر است.');
  return errs;
}

export function validateBackup(obj: unknown): string | null {
  if (!obj || typeof obj !== 'object') return 'ساختار فایل معتبر نیست.';
  const o = obj as Record<string, unknown>;
  if (!Array.isArray(o.transactions)) return 'فایل پشتیبان تراکنش‌ها را ندارد.';
  for (const t of o.transactions as unknown[]) {
    const r = t as Record<string, unknown>;
    if (!r || typeof r.id !== 'string' || (r.type !== 'income' && r.type !== 'expense')) return 'یک تراکنش در فایل خراب است (نوع).';
    if (typeof r.amount !== 'number' || !(r.amount > 0)) return 'یک تراکنش در فایل خراب است (مبلغ).';
    if (typeof r.title !== 'string' || !r.title.trim()) return 'یک تراکنش در فایل خراب است (عنوان).';
    if (typeof r.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(r.date)) return 'یک تراکنش در فایل خراب است (تاریخ).';
  }
  return null;
}

export function lastNDays(n: number, base = new Date()): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(base); d.setDate(d.getDate() - i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}
