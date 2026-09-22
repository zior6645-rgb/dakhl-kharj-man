export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
export const nowISO = () => new Date().toISOString();
export const todayStr = () => { const d = new Date(); return d.toISOString().slice(0, 10); };
export const timeStr = () => { const d = new Date(); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
const nf = new Intl.NumberFormat('fa-IR');
export const fmt = (n: number) => nf.format(Math.round(n)) + ' تومان';
export const fmtNum = (n: number) => nf.format(Math.round(n));
export function toCSV(rows: { id: string; type: string; amount: number; title: string; category: string; date: string; time: string; description: string }[]): string {
  const esc = (s: string | number) => '"' + String(s).replace(/"/g, '""') + '"';
  const head = 'id,type,amount,title,category,date,time,description';
  return head + '\n' + rows.map(r => [esc(r.id), esc(r.type), r.amount, esc(r.title), esc(r.category), esc(r.date), esc(r.time), esc(r.description)].join(','));
}
