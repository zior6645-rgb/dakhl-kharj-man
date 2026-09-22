import type { Category } from './types';

export const DEFAULT_CATS: Category[] = [
  { id:'c1', label:'حقوق', kind:'income', system:true },
  { id:'c2', label:'درآمد جانبی', kind:'income', system:true },
  { id:'c3', label:'خوراک', kind:'expense', system:true },
  { id:'c4', label:'حمل‌ونقل', kind:'expense', system:true },
  { id:'c5', label:'خرید', kind:'expense', system:true },
  { id:'c6', label:'قبض', kind:'expense', system:true },
  { id:'c7', label:'مسکن', kind:'expense', system:true },
  { id:'c8', label:'درمان', kind:'expense', system:true },
  { id:'c9', label:'آموزش', kind:'expense', system:true },
  { id:'c10', label:'تفریح', kind:'expense', system:true },
  { id:'c11', label:'سفر', kind:'expense', system:true },
  { id:'c12', label:'اقساط', kind:'expense', system:true },
  { id:'c13', label:'سرمایه‌گذاری', kind:'expense', system:true },
  { id:'c14', label:'سایر', kind:'both', system:true },
];

const OLD_DEFAULT_LABEL_TO_ID: Record<string,string> = {
  'حقوق':'c1','درآمد جانبی':'c2','خوراک':'c3','حمل‌ونقل':'c4','خرید':'c5','قبض':'c6','مسکن':'c7',
  'درمان':'c8','آموزش':'c9','تفریح':'c10','سفر':'c11','اقساط':'c12','سرمایه‌گذاری':'c13','سایر':'c14'
};

export function normalizeCategoryId(value: string): string {
  return /^c\d+$/.test(value) ? value : (OLD_DEFAULT_LABEL_TO_ID[value] ?? value);
}
