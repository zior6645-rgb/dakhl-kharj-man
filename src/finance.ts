import type { Category, Transaction } from './types';
import { isValidDateString, parseAmount, todayStr } from './utils';

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
    if (e) {
      if (t.type === 'income') e.income += t.amount;
      else e.expense += t.amount;
    }
  }
  return days.map(d => ({ date: d, ...(map.get(d) as { income: number; expense: number }) }));
}

export function groupByMonth(list: Transaction[], months: string[]) {
  const map = new Map<string, { income: number; expense: number }>();
  for (const m of months) map.set(m, { income: 0, expense: 0 });
  for (const t of list) {
    const key = monthKey(t.date);
    const e = map.get(key);
    if (e) {
      if (t.type === 'income') e.income += t.amount;
      else e.expense += t.amount;
    }
  }
  return months.map(month => ({ date: month, ...(map.get(month) as { income: number; expense: number }) }));
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
  const amt = parseAmount(input.amount);
  if (!input.amount || String(input.amount).trim() === '') errs.push('مبلغ را وارد کنید.');
  else if (amt === null) errs.push('مبلغ نامعتبر است؛ فقط عدد صحیح بزرگ‌تر از صفر وارد کنید.');
  if (!input.title || input.title.trim() === '') errs.push('عنوان را وارد کنید.');
  else if (input.title.trim().length > 120) errs.push('عنوان بیش از حد طولانی است.');
  if (input.type !== 'income' && input.type !== 'expense') errs.push('نوع تراکنش معتبر نیست.');
  if (!input.category || input.category.trim() === '') errs.push('دسته‌بندی را انتخاب کنید.');
  if (!input.date || !isValidDateString(input.date)) errs.push('تاریخ نامعتبر است.');
  return errs;
}

function validTime(value: unknown): boolean {
  return typeof value === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function validCategoryList(value: unknown): value is Category[] {
  if (!Array.isArray(value)) return false;
  const ids = new Set<string>();
  const labels = new Set<string>();
  for (const item of value) {
    const c = item as Record<string, unknown>;
    if (!c || typeof c.id !== 'string' || !c.id || ids.has(c.id)) return false;
    if (typeof c.label !== 'string' || !c.label.trim() || c.label.length > 80 || labels.has(c.label)) return false;
    if (c.kind !== 'income' && c.kind !== 'expense' && c.kind !== 'both') return false;
    ids.add(c.id);
    labels.add(c.label);
  }
  return true;
}

export function validateBackup(obj: unknown): string | null {
  if (!obj || typeof obj !== 'object') return 'ساختار فایل معتبر نیست.';
  const o = obj as Record<string, unknown>;
  if (o.version !== undefined && o.version !== 1) return 'نسخه فایل پشتیبان پشتیبانی نمی‌شود.';
  if (!Array.isArray(o.transactions)) return 'فایل پشتیبان تراکنش‌ها را ندارد.';
  if (o.categories !== undefined && !validCategoryList(o.categories)) return 'دسته‌بندی‌های فایل پشتیبان معتبر نیستند.';

  const ids = new Set<string>();
  for (const item of o.transactions as unknown[]) {
    const r = item as Record<string, unknown>;
    if (!r || typeof r.id !== 'string' || !r.id || ids.has(r.id)) return 'یک تراکنش در فایل خراب است (شناسه).';
    if (r.type !== 'income' && r.type !== 'expense') return 'یک تراکنش در فایل خراب است (نوع).';
    if (typeof r.amount !== 'number' || !Number.isSafeInteger(r.amount) || r.amount <= 0) return 'یک تراکنش در فایل خراب است (مبلغ).';
    if (typeof r.title !== 'string' || !r.title.trim() || r.title.length > 120) return 'یک تراکنش در فایل خراب است (عنوان).';
    if (typeof r.category !== 'string' || !r.category.trim() || r.category.length > 80) return 'یک تراکنش در فایل خراب است (دسته‌بندی).';
    if (typeof r.date !== 'string' || !isValidDateString(r.date)) return 'یک تراکنش در فایل خراب است (تاریخ).';
    if (!validTime(r.time)) return 'یک تراکنش در فایل خراب است (ساعت).';
    if (typeof r.description !== 'string' || r.description.length > 500) return 'یک تراکنش در فایل خراب است (توضیح).';
    if (r.createdAt !== undefined && typeof r.createdAt !== 'string') return 'یک تراکنش در فایل خراب است (زمان ایجاد).';
    if (r.updatedAt !== undefined && typeof r.updatedAt !== 'string') return 'یک تراکنش در فایل خراب است (زمان ویرایش).';
    ids.add(r.id);
  }
  return null;
}

export function lastNDays(n: number, base = new Date()): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(base);
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() - i);
    out.push(todayStr(d));
  }
  return out;
}

export function lastNMonths(n: number, base = new Date()): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(base);
    d.setHours(12, 0, 0, 0);
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    out.push(todayStr(d).slice(0, 7));
  }
  return out;
}
