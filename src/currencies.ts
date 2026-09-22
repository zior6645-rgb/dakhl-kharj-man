import type { CurrencyCode, LanguageCode } from './types';

export interface CurrencyInfo {
  code: CurrencyCode;
  isoCode: string;
  digits: 0 | 2;
  names: Record<LanguageCode, string>;
  symbol: string;
}

export const CURRENCIES: CurrencyInfo[] = [
  { code: 'IRT', isoCode: 'IRR', digits: 0, symbol: 'تومان', names: { fa:'تومان', en:'Toman', ru:'Туман', ar:'تومان', tr:'Toman' } },
  { code: 'IRR', isoCode: 'IRR', digits: 0, symbol: 'ریال', names: { fa:'ریال ایران', en:'Iranian Rial', ru:'Иранский риал', ar:'الريال الإيراني', tr:'İran riyali' } },
  { code: 'USD', isoCode: 'USD', digits: 2, symbol: '$', names: { fa:'دلار آمریکا', en:'US Dollar', ru:'Доллар США', ar:'الدولار الأمريكي', tr:'ABD doları' } },
  { code: 'EUR', isoCode: 'EUR', digits: 2, symbol: '€', names: { fa:'یورو', en:'Euro', ru:'Евро', ar:'اليورو', tr:'Euro' } },
  { code: 'GBP', isoCode: 'GBP', digits: 2, symbol: '£', names: { fa:'پوند بریتانیا', en:'British Pound', ru:'Фунт стерлингов', ar:'الجنيه الإسترليني', tr:'İngiliz sterlini' } },
  { code: 'RUB', isoCode: 'RUB', digits: 2, symbol: '₽', names: { fa:'روبل روسیه', en:'Russian Ruble', ru:'Российский рубль', ar:'الروبل الروسي', tr:'Rus rublesi' } },
  { code: 'TRY', isoCode: 'TRY', digits: 2, symbol: '₺', names: { fa:'لیر ترکیه', en:'Turkish Lira', ru:'Турецкая лира', ar:'الليرة التركية', tr:'Türk lirası' } },
  { code: 'AED', isoCode: 'AED', digits: 2, symbol: 'د.إ', names: { fa:'درهم امارات', en:'UAE Dirham', ru:'Дирхам ОАЭ', ar:'درهم إماراتي', tr:'BAE dirhemi' } },
  { code: 'SAR', isoCode: 'SAR', digits: 2, symbol: 'ر.س', names: { fa:'ریال عربستان', en:'Saudi Riyal', ru:'Саудовский риял', ar:'الريال السعودي', tr:'Suudi Arabistan riyali' } },
  { code: 'CNY', isoCode: 'CNY', digits: 2, symbol: '¥', names: { fa:'یوان چین', en:'Chinese Yuan', ru:'Китайский юань', ar:'اليوان الصيني', tr:'Çin yuanı' } },
  { code: 'JPY', isoCode: 'JPY', digits: 0, symbol: '¥', names: { fa:'ین ژاپن', en:'Japanese Yen', ru:'Японская иена', ar:'الين الياباني', tr:'Japon yeni' } },
  { code: 'CAD', isoCode: 'CAD', digits: 2, symbol: 'C$', names: { fa:'دلار کانادا', en:'Canadian Dollar', ru:'Канадский доллар', ar:'الدولار الكندي', tr:'Kanada doları' } },
  { code: 'AUD', isoCode: 'AUD', digits: 2, symbol: 'A$', names: { fa:'دلار استرالیا', en:'Australian Dollar', ru:'Австралийский доллар', ar:'الدولار الأسترالي', tr:'Avustralya doları' } },
  { code: 'CHF', isoCode: 'CHF', digits: 2, symbol: 'CHF', names: { fa:'فرانک سوئیس', en:'Swiss Franc', ru:'Швейцарский франк', ar:'الفرنك السويسري', tr:'İsviçre frangı' } },
];

export const CURRENCY_MAP = Object.fromEntries(CURRENCIES.map(c => [c.code, c])) as Record<CurrencyCode, CurrencyInfo>;
export const DEFAULT_CURRENCY: CurrencyCode = 'IRT';

export function currencyName(code: CurrencyCode, lang: LanguageCode): string {
  return CURRENCY_MAP[code].names[lang];
}
