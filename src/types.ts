export type TxType = 'income' | 'expense';
export interface Transaction {
  id: string;
  type: TxType;
  amount: number;
  title: string;
  category: string;
  date: string;
  time: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}
export interface Category {
  id: string;
  label: string;
  kind: 'income' | 'expense' | 'both';
}
export type ThemeMode = 'light' | 'dark' | 'system';
