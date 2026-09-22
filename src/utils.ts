export const uid = () => (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') ? crypto.randomUUID() : Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
export const nowISO = () => new Date().toISOString();

export function todayStr(d = new Date()): string {
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
}

export const timeStr = (d = new Date()) =>
  String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');

const nf = new Intl.NumberFormat('fa-IR');
export const fmt = (n: number) => nf.format(Math.round(n)) + ' تومان';
export const fmtNum = (n: number) => nf.format(Math.round(n));

export function normalizeDigits(value: string): string {
  const fa = '۰۱۲۳۴۵۶۷۸۹';
  const ar = '٠١٢٣٤٥٦٧٨٩';
  return String(value)
    .replace(/[۰-۹]/g, ch => String(fa.indexOf(ch)))
    .replace(/[٠-٩]/g, ch => String(ar.indexOf(ch)))
    .replace(/[٬,\s]/g, '');
}

export function parseAmount(value: string): number | null {
  const normalized = normalizeDigits(value);
  if (!normalized || !/^\d+$/.test(normalized)) return null;
  const n = Number(normalized);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

export function isValidDateString(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const x = new Date(y, m - 1, d);
  return x.getFullYear() === y && x.getMonth() === m - 1 && x.getDate() === d;
}

export function toCSV(rows: { id: string; type: string; amount: number; title: string; category: string; date: string; time: string; description: string }[]): string {
  const esc = (s: string | number) => '"' + String(s).replace(/"/g, '""') + '"';
  const head = 'id,type,amount,title,category,date,time,description';
  return head + '\n' + rows.map(r => [esc(r.id), esc(r.type), r.amount, esc(r.title), esc(r.category), esc(r.date), esc(r.time), esc(r.description)].join(',')).join('\n');
}
