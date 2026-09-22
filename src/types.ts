export type TxType = 'income' | 'expense';

export type LanguageCode = 'fa' | 'en' | 'ru' | 'ar' | 'tr';

export type CurrencyCode =
  | 'IRT' | 'IRR' | 'USD' | 'EUR' | 'GBP' | 'RUB' | 'TRY' | 'AED' | 'SAR'
  | 'CNY' | 'JPY' | 'CAD' | 'AUD' | 'CHF';

export interface Transaction {
  id: string;
  type: TxType;
  amount: number;
  currency: CurrencyCode;
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
  system?: boolean;
}

export type ThemeMode = 'light' | 'dark' | 'system';
export type FontScale = 'small' | 'default' | 'large' | 'xlarge' | 'xxlarge';
export type HomeCardId = 'balance' | 'monthIncome' | 'monthExpense' | 'monthBalance' | 'topCategory' | 'transactionCount' | 'latestTransaction' | 'currencySummary';

export interface AppSettings {
  language: LanguageCode;
  currency: CurrencyCode;
  theme: ThemeMode;
}
