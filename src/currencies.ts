import type { CurrencyCode, LanguageCode } from './types';

export interface CurrencyInfo {
  code: CurrencyCode;
  isoCode: string;
  digits: 0 | 2;
  names: Record<LanguageCode, string>;
  symbol: string;
}

export const CURRENCIES: CurrencyInfo[] = [
  { code: 'IRT', isoCode: 'IRR', digits: 0, symbol: 'تومان', names: { fa:'تومان', en:'Toman', ru:'Туман', ar:'تومان', tr:'Toman', de:'Toman', fr:'Toman', es:'Toman' } },
  { code: 'IRR', isoCode: 'IRR', digits: 0, symbol: 'ریال', names: { fa:'ریال ایران', en:'Iranian rial', ru:'Иранский риал', ar:'الريال الإيراني', tr:'İran riyali', de:'Iranischer Rial', fr:'Rial iranien', es:'Rial iraní' } },
  { code: 'USD', isoCode: 'USD', digits: 2, symbol: '$', names: { fa:'دلار آمریکا', en:'US Dollar', ru:'Доллар США', ar:'الدولار الأمريكي', tr:'ABD doları', de:'US-Dollar', fr:'Dollar américain', es:'Dólar estadounidense' } },
  { code: 'EUR', isoCode: 'EUR', digits: 2, symbol: '€', names: { fa:'یورو', en:'Euro', ru:'Евро', ar:'اليورو', tr:'Euro', de:'Euro', fr:'Euro', es:'Euro' } },
  { code: 'GBP', isoCode: 'GBP', digits: 2, symbol: '£', names: { fa:'پوند بریتانیا', en:'British Pound', ru:'Фунт стерлингов', ar:'الجنيه الإسترليني', tr:'İngiliz sterlini', de:'Britisches Pfund', fr:'Livre sterling', es:'Libra esterlina' } },
  { code: 'RUB', isoCode: 'RUB', digits: 2, symbol: '₽', names: { fa:'روبل روسیه', en:'Russian Ruble', ru:'Российский рубль', ar:'الروبل الروسي', tr:'Rus rublesi', de:'Russischer Rubel', fr:'Rouble russe', es:'Rublo ruso' } },
  { code: 'TRY', isoCode: 'TRY', digits: 2, symbol: '₺', names: { fa:'لیر ترکیه', en:'Turkish Lira', ru:'Турецкая лира', ar:'الليرة التركية', tr:'Türk lirası', de:'Türkische Lira', fr:'Livre turque', es:'Lira turca' } },
  { code: 'AED', isoCode: 'AED', digits: 2, symbol: 'د.إ', names: { fa:'درهم امارات', en:'UAE Dirham', ru:'Дирхам ОАЭ', ar:'درهم إماراتي', tr:'BAE dirhemi', de:'VAE-Dirham', fr:'Dirham des Émirats arabes unis', es:'Dírham de los EAU' } },
  { code: 'SAR', isoCode: 'SAR', digits: 2, symbol: 'ر.س', names: { fa:'ریال عربستان', en:'Saudi Riyal', ru:'Саудовский риял', ar:'الريال السعودي', tr:'Suudi Arabistan riyali', de:'Saudi-Riyal', fr:'Riyal saoudien', es:'Riyal saudí' } },
  { code: 'CNY', isoCode: 'CNY', digits: 2, symbol: '¥', names: { fa:'یوان چین', en:'Chinese Yuan', ru:'Китайский юань', ar:'اليوان الصيني', tr:'Çin yuanı', de:'Chinesischer Yuan', fr:'Yuan chinois', es:'Yuan chino' } },
  { code: 'JPY', isoCode: 'JPY', digits: 0, symbol: '¥', names: { fa:'ین ژاپن', en:'Japanese Yen', ru:'Японская иена', ar:'الين الياباني', tr:'Japon yeni', de:'Japanischer Yen', fr:'Yen japonais', es:'Yen japonés' } },
  { code: 'CAD', isoCode: 'CAD', digits: 2, symbol: 'C$', names: { fa:'دلار کانادا', en:'Canadian Dollar', ru:'Канадский доллар', ar:'الدولار الكندي', tr:'Kanada doları', de:'Kanadischer Dollar', fr:'Dollar canadien', es:'Dólar canadiense' } },
  { code: 'AUD', isoCode: 'AUD', digits: 2, symbol: 'A$', names: { fa:'دلار استرالیا', en:'Australian Dollar', ru:'Австралийский доллар', ar:'الدоллар الأسترالي', tr:'Avustralya doları', de:'Australischer Dollar', fr:'Dollar australien', es:'Dólar australiano' } },
  { code: 'CHF', isoCode: 'CHF', digits: 2, symbol: 'CHF', names: { fa:'فرانک سوئیس', en:'Swiss Franc', ru:'Швейцарский франк', ar:'الفرنك السويسري', tr:'İsviçre frangı', de:'Schweizer Franken', fr:'Franc suisse', es:'Franco suizo' } },
];

export const CURRENCY_MAP = Object.fromEntries(CURRENCIES.map(c => [c.code, c])) as Record<CurrencyCode, CurrencyInfo>;

export function currencyName(code: CurrencyCode, lang: LanguageCode): string {
  return CURRENCY_MAP[code].names[lang];
}

export function currencyDigits(code: CurrencyCode): 0 | 2 {
  return CURRENCY_MAP[code].digits;
}

export const DEFAULT_CURRENCY: CurrencyCode = 'IRT';
