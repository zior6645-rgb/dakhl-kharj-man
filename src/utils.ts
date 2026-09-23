import type { CurrencyCode, Transaction } from './types';
import { CURRENCY_MAP } from './currencies';

export const uid = () =>
  (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

export const nowISO = () => new Date().toISOString();

export function todayStr(d = new Date()): string {
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
}
export const timeStr = (d = new Date()) => String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');

export function normalizeDigits(value: string): string {
  const fa = '۰۱۲۳۴۵۶۷۸۹';
  const ar = '٠١٢٣٤٥٦٧٨٩';
  return String(value)
    .replace(/[۰-۹]/g, ch => String(fa.indexOf(ch)))
    .replace(/[٠-٩]/g, ch => String(ar.indexOf(ch)))
    .replace(/[٬]/g, ',')
    .replace(/[٫]/g, '.')
    .replace(/[،]/g, ',')
    .replace(/\s+/g, '');
}

export function parseAmount(value: string, currency: CurrencyCode = 'IRT'): number | null {
  let s = normalizeDigits(value).trim().replace(/\s+/g, '');
  if (!s) return null;
  const digits = CURRENCY_MAP[currency].digits;
  const comma = s.lastIndexOf(',');
  const dot = s.lastIndexOf('.');
  const hasComma = comma >= 0;
  const hasDot = dot >= 0;

  if (hasComma && hasDot) {
    const decimalSep = comma > dot ? ',' : '.';
    const thousandSep = decimalSep === ',' ? '.' : ',';
    s = s.split(thousandSep).join('');
    const pos = s.lastIndexOf(decimalSep);
    s = s.slice(0,pos) + '.' + s.slice(pos + 1);
  } else if (hasComma) {
    const pos = comma;
    const suffix = s.length - pos - 1;
    if (digits === 2 && suffix >= 1 && suffix <= 2) s = s.slice(0,pos) + '.' + s.slice(pos + 1);
    else s = s.split(',').join('');
  } else if (hasDot) {
    const pos = dot;
    const suffix = s.length - pos - 1;
    if (digits === 2 && suffix >= 1 && suffix <= 2) {
      // Keep a decimal point for normal 2-decimal currencies.
    } else {
      s = s.split('.').join('');
    }
  }

  if (!/^\d+(?:\.\d+)?$/.test(s)) return null;
  const n = Number(s);
  const factor = 10 ** digits;
  const rounded = Math.round(n * factor) / factor;
  if (!Number.isFinite(n) || n <= 0 || !Number.isSafeInteger(Math.round(n * factor))) return null;
  if (Math.abs(rounded - n) > Number.EPSILON * Math.max(1, Math.abs(n))) return null;
  return rounded;
}

export function isValidDateString(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y,m,d] = value.split('-').map(Number);
  const x = new Date(y,m-1,d);
  return x.getFullYear() === y && x.getMonth() === m - 1 && x.getDate() === d;
}

export function fmtMoney(amount: number, currency: CurrencyCode, locale: string): string {
  const info = CURRENCY_MAP[currency];
  if (currency === 'IRT' || currency === 'IRR') {
    return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(Math.round(amount)) + ' ' + info.symbol;
  }
  return new Intl.NumberFormat(locale, {
    style:'currency', currency:info.isoCode, currencyDisplay:'symbol',
    minimumFractionDigits:info.digits, maximumFractionDigits:info.digits
  }).format(amount);
}

export function fmtNum(n: number, locale = 'fa-IR', digits = 0): string {
  return new Intl.NumberFormat(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(n);
}

export function displayDate(value: string, locale: string): string {
  const [y,m,d] = value.split('-').map(Number);
  return new Intl.DateTimeFormat(locale, { year:'numeric', month:'short', day:'numeric' }).format(new Date(y,m-1,d,12));
}

export function toCSV(rows: Array<Transaction & { categoryId?: string }>): string {
  const esc = (s: string | number) => '"' + String(s).replace(/"/g,'""') + '"';
  const head = 'id,type,amount,currency,title,categoryId,category,date,time,description,createdAt,updatedAt';
  return head + '\n' + rows.map(r => [
    esc(r.id), esc(r.type), String(r.amount), esc(r.currency), esc(r.title), esc(r.categoryId ?? r.category), esc(r.category),
    esc(r.date), esc(r.time), esc(r.description), esc(r.createdAt), esc(r.updatedAt)
  ].join(',')).join('\n');
}

export function parseCSV(text: string): string[][] {
  const source = String(text).replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;

  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    if (quoted) {
      if (ch === '"') {
        if (source[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        cell += ch;
      }
      continue;
    }
    if (ch === '"') {
      quoted = true;
    } else if (ch === ',') {
      row.push(cell);
      cell = '';
    } else if (ch === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else if (ch === '\r') {
      if (source[i + 1] === '\n') i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += ch;
    }
  }

  if (quoted) throw new Error('Unclosed CSV quote.');
  if (cell !== '' || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter(r => r.some(v => v.trim() !== ''));
}
