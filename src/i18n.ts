import type { LanguageCode, CurrencyCode } from './types';
import { CURRENCIES, currencyName } from './currencies';

export type TranslationKey =
  | 'appName'|'tagline'|'currentBalance'|'recordedOnDevice'|'totalIncome'|'totalExpense'|'transactions'
  | 'currentMonthIncome'|'currentMonthExpense'|'currentMonthBalance'|'last7Days'|'income'|'expense'
  | 'greenIncomeRedExpense'|'financialSummary'|'totalTransactions'|'topExpenseCategory'|'latestTransactions'
  | 'noneYet'|'registerFirst'|'noTransactions'|'transactionsTitle'|'search'|'allTypes'|'allCategories'
  | 'newest'|'oldest'|'highestAmount'|'lowestAmount'|'fromDate'|'toDate'|'clearFilters'|'details'|'edit'
  | 'delete'|'noMatch'|'changeFilters'|'reports'|'today'|'thisWeek'|'thisMonth'|'last3Months'|'thisYear'
  | 'customRange'|'rangeStartAfterEnd'|'noDataInRange'|'totalIncomeReport'|'totalExpenseReport'|'balance'
  | 'transactionCount'|'expenseDistribution'|'settings'|'appearance'|'light'|'dark'|'system'|'language'
  | 'currency'|'defaultCurrency'|'manageCategories'|'addCategoryName'|'add'|'both'|'backupRestore'
  | 'downloadBackup'|'exportCsv'|'importFile'|'deleteAllData'|'deleteAllWarning'|'confirmSure'
  | 'finalDeleteWarning'|'finalDelete'|'cancel'|'about'|'versionOffline'|'enterTransaction'
  | 'registerIncome'|'registerExpense'|'newInput'|'newOutput'|'amount'|'amountExample'|'title'
  | 'titleExample'|'category'|'select'|'date'|'time'|'descriptionOptional'|'saveChanges'|'save'
  | 'invalidCategory'|'invalidTime'|'descTooLong'|'saved'|'updated'|'deleted'|'backupDownloaded'
  | 'csvDownloaded'|'restored'|'invalidFile'|'invalidFileKeepData'|'localFallback'|'categoryAdded'
  | 'categoryExists'|'categoryDeleted'|'categoryHasTransactions'|'defaultCategoryCannotDelete'
  | 'categoryNameRequired'|'allDataDeleted'|'themeChanged'|'currencySummary'|'otherCurrencies'
  | 'noBalanceForCurrency'|'currencyNote'|'noAutoConversion'|'selectLanguage'|'selectCurrency'
  | 'mainNavigation'|'home'|'transactionsTab'|'reportsTab'|'settingsTab'|'incomeCategory'|'expenseCategory'
  | 'customCategory'|'currencyFilter'|'allCurrencies'|'thisCurrency'|'importVersion'
  | 'privacyLocalOnly'|'dataIntegrityNote'|'openSource';

const D: Record<LanguageCode, Record<TranslationKey,string>> = {
  fa: {
    appName:'دخل‌وخرج من',tagline:'مدیریت ساده و آفلاین',currentBalance:'موجودی فعلی',recordedOnDevice:'اطلاعات روی همین دستگاه ذخیره می‌شود',
    totalIncome:'درآمد کل',totalExpense:'هزینه کل',transactions:'تراکنش',currentMonthIncome:'درآمد ماه جاری',currentMonthExpense:'هزینه ماه جاری',currentMonthBalance:'مانده ماه جاری',
    last7Days:'هفت روز اخیر',income:'درآمد',expense:'هزینه',greenIncomeRedExpense:'سبز: درآمد — قرمز: هزینه',financialSummary:'خلاصه مالی',totalTransactions:'تعداد کل تراکنش‌ها',
    topExpenseCategory:'بیشترین دسته هزینه',latestTransactions:'آخرین تراکنش‌ها',noneYet:'هنوز تراکنشی ثبت نشده است.',registerFirst:'از دکمه‌های بالا اولین تراکنش را ثبت کنید.',
    noTransactions:'تراکنشی وجود ندارد.',transactionsTitle:'تراکنش‌ها',search:'جستجو…',allTypes:'همه انواع',allCategories:'همه دسته‌ها',newest:'جدیدترین',oldest:'قدیمی‌ترین',
    highestAmount:'بیشترین مبلغ',lowestAmount:'کمترین مبلغ',fromDate:'از تاریخ',toDate:'تا تاریخ',clearFilters:'پاک کردن فیلتر',details:'جزئیات',edit:'ویرایش',delete:'حذف',
    noMatch:'موردی یافت نشد.',changeFilters:'فیلترها را تغییر دهید یا تراکنش جدید ثبت کنید.',reports:'گزارش‌ها',today:'امروز',thisWeek:'این هفته',thisMonth:'این ماه',
    last3Months:'سه ماه اخیر',thisYear:'امسال',customRange:'بازه دلخواه',rangeStartAfterEnd:'تاریخ شروع نباید بعد از تاریخ پایان باشد.',noDataInRange:'در این بازه داده‌ای وجود ندارد.',
    totalIncomeReport:'مجموع درآمد',totalExpenseReport:'مجموع هزینه',balance:'مانده',transactionCount:'تعداد تراکنش',expenseDistribution:'توزیع هزینه بر اساس دسته',
    settings:'تنظیمات',appearance:'حالت نمایش',light:'روشن',dark:'تاریک',system:'سیستم',language:'زبان',currency:'ارز',defaultCurrency:'ارز پیش‌فرض',
    manageCategories:'مدیریت دسته‌بندی‌ها',addCategoryName:'نام دسته جدید',add:'افزودن',both:'هر دو',backupRestore:'پشتیبان‌گیری و بازیابی',
    downloadBackup:'دانلود پشتیبان (JSON)',exportCsv:'خروجی CSV',importFile:'وارد کردن فایل',deleteAllData:'حذف تمام اطلاعات',
    deleteAllWarning:'این کار همه تراکنش‌ها و دسته‌های سفارشی را حذف می‌کند و قابل بازگشت نیست.',confirmSure:'بله، مطمئنم',
    finalDeleteWarning:'تأیید نهایی: همه تراکنش‌ها و دسته‌های سفارشی حذف می‌شوند.',finalDelete:'تأیید نهایی حذف',cancel:'انصراف',
    about:'درباره',versionOffline:'نسخه ۱٫۱٫۰ — مدیریت شخصی درآمد و هزینه، آفلاین و بدون نیاز به حساب کاربری.',enterTransaction:'ثبت تراکنش',
    registerIncome:'ثبت درآمد',registerExpense:'ثبت هزینه',newInput:'ورودی جدید',newOutput:'خروجی جدید',amount:'مبلغ',amountExample:'مثلاً 2500000',
    title:'عنوان',titleExample:'مثلاً حقوق مرداد',category:'دسته‌بندی',select:'انتخاب کنید…',date:'تاریخ',time:'ساعت',descriptionOptional:'توضیح (اختیاری)',
    saveChanges:'ذخیره تغییرات',save:'ثبت',invalidCategory:'دسته‌بندی معتبر نیست.',invalidTime:'ساعت نامعتبر است.',descTooLong:'توضیح بیش از حد طولانی است.',
    saved:'تراکنش ثبت شد.',updated:'تراکنش ویرایش شد.',deleted:'تراکنش حذف شد.',backupDownloaded:'فایل پشتیبان دانلود شد.',csvDownloaded:'فایل CSV دانلود شد.',
    restored:'بازیابی با موفقیت انجام شد.',invalidFile:'فایل خراب است:',invalidFileKeepData:'فایل خراب است و اطلاعات فعلی حفظ شد.',localFallback:'اطلاعات در پشتیبان محلی ذخیره/بازیابی شد؛ پایگاه داده اصلی در دسترس نبود.',
    categoryAdded:'دسته اضافه شد.',categoryExists:'این دسته از قبل وجود دارد.',categoryDeleted:'دسته حذف شد.',categoryHasTransactions:'این دسته تراکنش دارد و حذف آن مجاز نیست.',
    defaultCategoryCannotDelete:'دسته‌های پیش‌فرض قابل حذف نیستند.',categoryNameRequired:'نام دسته را وارد کنید.',allDataDeleted:'همه اطلاعات حذف شد.',themeChanged:'تم تغییر کرد.',
    currencySummary:'خلاصه ارز',otherCurrencies:'ارزهای دیگر',noBalanceForCurrency:'برای این ارز هنوز تراکنشی ثبت نشده است.',currencyNote:'هر تراکنش ارز خودش را دارد و جمع ارزها با هم انجام نمی‌شود.',
    noAutoConversion:'نرخ تبدیل خودکار در برنامه وجود ندارد؛ برای جلوگیری از محاسبه ساختگی، ارزها جداگانه گزارش می‌شوند.',selectLanguage:'انتخاب زبان',selectCurrency:'انتخاب ارز',
    mainNavigation:'ناوبری اصلی',home:'خانه',transactionsTab:'تراکنش‌ها',reportsTab:'گزارش‌ها',settingsTab:'تنظیمات',incomeCategory:'درآمد',expenseCategory:'هزینه',
    customCategory:'سفارشی',currencyFilter:'فیلتر ارز',allCurrencies:'همه ارزها',thisCurrency:'این ارز',importVersion:'نسخه پشتیبان قدیمی نیز قابل بازیابی است.',
    privacyLocalOnly:'داده‌های مالی برای قابلیت اصلی در همین دستگاه نگهداری می‌شوند.',dataIntegrityNote:'قبل از تعویض یا پاک‌سازی دستگاه، از اطلاعات پشتیبان بگیرید.',openSource:'متن‌باز'
  },
  en: {}, ru: {}, ar: {}, tr: {}, de: {}, fr: {}, es: {}
};

D.en = {
  appName:'My Income & Expense',tagline:'Simple offline money management',currentBalance:'Current balance',recordedOnDevice:'Data is stored on this device',
  totalIncome:'Total income',totalExpense:'Total expense',transactions:'Transactions',currentMonthIncome:'Current month income',currentMonthExpense:'Current month expense',currentMonthBalance:'Current month balance',
  last7Days:'Last 7 days',income:'Income',expense:'Expense',greenIncomeRedExpense:'Green: income — Red: expense',financialSummary:'Financial summary',totalTransactions:'Total transactions',
  topExpenseCategory:'Top expense category',latestTransactions:'Latest transactions',noneYet:'No transactions yet.',registerFirst:'Use the buttons above to add your first transaction.',
  noTransactions:'No transactions.',transactionsTitle:'Transactions',search:'Search…',allTypes:'All types',allCategories:'All categories',newest:'Newest',oldest:'Oldest',
  highestAmount:'Highest amount',lowestAmount:'Lowest amount',fromDate:'From date',toDate:'To date',clearFilters:'Clear filters',details:'Details',edit:'Edit',delete:'Delete',
  noMatch:'No match found.',changeFilters:'Change the filters or add a new transaction.',reports:'Reports',today:'Today',thisWeek:'This week',thisMonth:'This month',
  last3Months:'Last 3 months',thisYear:'This year',customRange:'Custom range',rangeStartAfterEnd:'Start date must not be after end date.',noDataInRange:'No data in this range.',
  totalIncomeReport:'Total income',totalExpenseReport:'Total expense',balance:'Balance',transactionCount:'Transaction count',expenseDistribution:'Expense distribution by category',
  settings:'Settings',appearance:'Appearance',light:'Light',dark:'Dark',system:'System',language:'Language',currency:'Currency',defaultCurrency:'Default currency',
  manageCategories:'Manage categories',addCategoryName:'New category name',add:'Add',both:'Both',backupRestore:'Backup & restore',
  downloadBackup:'Download backup (JSON)',exportCsv:'Export CSV',importFile:'Import file',deleteAllData:'Delete all data',
  deleteAllWarning:'This deletes all transactions and custom categories. It cannot be undone.',confirmSure:'Yes, I am sure',
  finalDeleteWarning:'Final confirmation: all transactions and custom categories will be deleted.',finalDelete:'Delete permanently',cancel:'Cancel',
  about:'About',versionOffline:'Version 1.1.0 — personal income and expense tracking, offline and account-free.',enterTransaction:'Add transaction',
  registerIncome:'Add income',registerExpense:'Add expense',newInput:'New inflow',newOutput:'New outflow',amount:'Amount',amountExample:'e.g. 2500',
  title:'Title',titleExample:'e.g. Salary',category:'Category',select:'Select…',date:'Date',time:'Time',descriptionOptional:'Description (optional)',
  saveChanges:'Save changes',save:'Save',invalidCategory:'Invalid category.',invalidTime:'Invalid time.',descTooLong:'Description is too long.',
  saved:'Transaction saved.',updated:'Transaction updated.',deleted:'Transaction deleted.',backupDownloaded:'Backup downloaded.',csvDownloaded:'CSV downloaded.',
  restored:'Restore completed.',invalidFile:'Invalid file:',invalidFileKeepData:'Invalid file; existing data was kept.',localFallback:'Data was saved/restored using the local fallback because the primary database was unavailable.',
  categoryAdded:'Category added.',categoryExists:'This category already exists.',categoryDeleted:'Category deleted.',categoryHasTransactions:'This category has transactions and cannot be deleted.',
  defaultCategoryCannotDelete:'Default categories cannot be deleted.',categoryNameRequired:'Enter a category name.',allDataDeleted:'All data deleted.',themeChanged:'Theme changed.',
  currencySummary:'Currency summary',otherCurrencies:'Other currencies',noBalanceForCurrency:'There are no transactions in this currency yet.',currencyNote:'Each transaction keeps its own currency; currencies are never added together.',
  noAutoConversion:'There is no automatic exchange-rate conversion. This prevents fabricated or stale conversions; currencies are reported separately.',selectLanguage:'Select language',selectCurrency:'Select currency',
  mainNavigation:'Main navigation',home:'Home',transactionsTab:'Transactions',reportsTab:'Reports',settingsTab:'Settings',incomeCategory:'Income',expenseCategory:'Expense',
  customCategory:'Custom',currencyFilter:'Currency filter',allCurrencies:'All currencies',thisCurrency:'This currency',importVersion:'Older backups can also be restored.',
  privacyLocalOnly:'Financial data is stored locally for core features.',dataIntegrityNote:'Back up your data before resetting or replacing the device.',openSource:'Open source'
};

D.ru = {...D.en, appName:'Мои доходы и расходы', tagline:'Простой офлайн-учёт денег', currentBalance:'Текущий баланс', recordedOnDevice:'Данные хранятся на этом устройстве',
 totalIncome:'Общий доход', totalExpense:'Общие расходы', transactions:'Операции', currentMonthIncome:'Доход за текущий месяц', currentMonthExpense:'Расходы за текущий месяц', currentMonthBalance:'Баланс текущего месяца',
 last7Days:'Последние 7 дней', income:'Доход', expense:'Расход', greenIncomeRedExpense:'Зелёный: доход — красный: расход', financialSummary:'Финансовая сводка', totalTransactions:'Всего операций',
 topExpenseCategory:'Главная категория расходов', latestTransactions:'Последние операции', noneYet:'Операций пока нет.', registerFirst:'Используйте кнопки выше, чтобы добавить первую операцию.',
 noTransactions:'Операций нет.', transactionsTitle:'Операции', search:'Поиск…', allTypes:'Все типы', allCategories:'Все категории', newest:'Сначала новые', oldest:'Сначала старые', highestAmount:'Максимальная сумма', lowestAmount:'Минимальная сумма', fromDate:'Дата от', toDate:'Дата до', clearFilters:'Сбросить фильтры', details:'Подробнее', edit:'Изменить', delete:'Удалить', noMatch:'Ничего не найдено.', changeFilters:'Измените фильтры или добавьте новую операцию.', reports:'Отчёты', today:'Сегодня', thisWeek:'Эта неделя', thisMonth:'Этот месяц', last3Months:'Последние 3 месяца', thisYear:'Этот год', customRange:'Произвольный период', rangeStartAfterEnd:'Начальная дата не должна быть позже конечной.', noDataInRange:'В этом периоде нет данных.', totalIncomeReport:'Общий доход', totalExpenseReport:'Общие расходы', balance:'Баланс', transactionCount:'Количество операций', expenseDistribution:'Расходы по категориям', settings:'Настройки', appearance:'Оформление', light:'Светлая', dark:'Тёмная', system:'Система', language:'Язык', currency:'Валюта', defaultCurrency:'Валюта по умолчанию', manageCategories:'Категории', addCategoryName:'Название новой категории', add:'Добавить', both:'Оба', backupRestore:'Резервная копия и восстановление', downloadBackup:'Скачать резервную копию (JSON)', exportCsv:'Экспорт CSV', importFile:'Импорт файла', deleteAllData:'Удалить все данные', deleteAllWarning:'Удаление всех операций и пользовательских категорий необратимо.', confirmSure:'Да, я уверен', finalDeleteWarning:'Подтверждение: все операции и пользовательские категории будут удалены.', finalDelete:'Удалить навсегда', cancel:'Отмена', about:'О программе', versionOffline:'Версия 1.1.0 — личный учёт доходов и расходов, офлайн.', enterTransaction:'Добавить операцию', registerIncome:'Добавить доход', registerExpense:'Добавить расход', newInput:'Новый доход', newOutput:'Новый расход', amount:'Сумма', amountExample:'например, 2500', title:'Название', titleExample:'например, Зарплата', category:'Категория', select:'Выберите…', date:'Дата', time:'Время', descriptionOptional:'Описание (необязательно)', saveChanges:'Сохранить изменения', save:'Сохранить', invalidCategory:'Недопустимая категория.', invalidTime:'Недопустимое время.', descTooLong:'Описание слишком длинное.', saved:'Операция сохранена.', updated:'Операция изменена.', deleted:'Операция удалена.', backupDownloaded:'Резервная копия скачана.', csvDownloaded:'CSV скачан.', restored:'Восстановление завершено.', invalidFile:'Файл повреждён:', invalidFileKeepData:'Файл недействителен; текущие данные сохранены.', localFallback:'Данные сохранены/восстановлены через локальный резервный механизм.', categoryAdded:'Категория добавлена.', categoryExists:'Такая категория уже существует.', categoryDeleted:'Категория удалена.', categoryHasTransactions:'У категории есть операции, её нельзя удалить.', defaultCategoryCannotDelete:'Стандартные категории нельзя удалить.', categoryNameRequired:'Введите название категории.', allDataDeleted:'Все данные удалены.', themeChanged:'Тема изменена.', currencySummary:'Сводка по валютам', otherCurrencies:'Другие валюты', noBalanceForCurrency:'Операций в этой валюте пока нет.', currencyNote:'Каждая операция хранит свою валюту; разные валюты не складываются.', noAutoConversion:'Автоконвертации по курсу нет; валюты показываются отдельно.', selectLanguage:'Выберите язык', selectCurrency:'Выберите валюту', mainNavigation:'Основная навигация', home:'Главная', transactionsTab:'Операции', reportsTab:'Отчёты', settingsTab:'Настройки', incomeCategory:'Доход', expenseCategory:'Расход', customCategory:'Пользовательская', currencyFilter:'Фильтр валюты', allCurrencies:'Все валюты', thisCurrency:'Эта валюта', importVersion:'Можно восстановить и старые резервные копии.', privacyLocalOnly:'Финансовые данные для основной работы хранятся локально.', dataIntegrityNote:'Перед сбросом или заменой устройства создайте резервную копию.', openSource:'Открытый код'};

function fill(base: Record<TranslationKey,string>, lang: LanguageCode, patch: Partial<Record<TranslationKey,string>>) {
  D[lang] = { ...base, ...patch };
}
fill(D.en,'ar',{appName:'دخلي ومصروفي',tagline:'إدارة مالية بسيطة تعمل دون اتصال',currentBalance:'الرصيد الحالي',recordedOnDevice:'تُحفظ البيانات على هذا الجهاز',income:'دخل',expense:'مصروف',reports:'التقارير',settings:'الإعدادات',language:'اللغة',currency:'العملة',home:'الرئيسية',transactionsTab:'المعاملات',reportsTab:'التقارير',settingsTab:'الإعدادات',registerIncome:'إضافة دخل',registerExpense:'إضافة مصروف',amount:'المبلغ',title:'العنوان',category:'التصنيف',date:'التاريخ',time:'الوقت',save:'حفظ',delete:'حذف',edit:'تعديل',cancel:'إلغاء',add:'إضافة',light:'فاتح',dark:'داكن',system:'النظام',backupRestore:'النسخ الاحتياطي والاستعادة',downloadBackup:'تنزيل النسخة الاحتياطية (JSON)',importFile:'استيراد ملف',deleteAllData:'حذف كل البيانات',finalDelete:'حذف نهائي',currencyNote:'لكل معاملة عملتها الخاصة ولا يتم جمع العملات المختلفة.',noAutoConversion:'لا يوجد تحويل تلقائي لأسعار الصرف؛ تُعرض العملات بشكل منفصل.'});
fill(D.en,'tr',{appName:'Gelir Giderim',tagline:'Basit çevrimdışı para yönetimi',currentBalance:'Güncel bakiye',recordedOnDevice:'Veriler bu cihazda saklanır',income:'Gelir',expense:'Gider',reports:'Raporlar',settings:'Ayarlar',language:'Dil',currency:'Para birimi',home:'Ana sayfa',transactionsTab:'İşlemler',reportsTab:'Raporlar',settingsTab:'Ayarlar',registerIncome:'Gelir ekle',registerExpense:'Gider ekle',amount:'Tutar',title:'Başlık',category:'Kategori',date:'Tarih',time:'Saat',save:'Kaydet',delete:'Sil',edit:'Düzenle',cancel:'İptal',add:'Ekle',light:'Açık',dark:'Koyu',system:'Sistem',currencyNote:'Her işlem kendi para birimini saklar; farklı para birimleri toplanmaz.',noAutoConversion:'Otomatik kur dönüşümü yoktur; para birimleri ayrı raporlanır.'});
fill(D.en,'de',{appName:'Meine Einnahmen & Ausgaben',tagline:'Einfache Offline-Finanzverwaltung',currentBalance:'Aktueller Kontostand',recordedOnDevice:'Daten werden auf diesem Gerät gespeichert',income:'Einnahmen',expense:'Ausgaben',reports:'Berichte',settings:'Einstellungen',language:'Sprache',currency:'Währung',home:'Startseite',transactionsTab:'Buchungen',reportsTab:'Berichte',settingsTab:'Einstellungen',registerIncome:'Einnahme hinzufügen',registerExpense:'Ausgabe hinzufügen',amount:'Betrag',title:'Titel',category:'Kategorie',date:'Datum',time:'Uhrzeit',save:'Speichern',delete:'Löschen',edit:'Bearbeiten',cancel:'Abbrechen',add:'Hinzufügen',light:'Hell',dark:'Dunkel',system:'System',currencyNote:'Jede Buchung speichert ihre eigene Währung; verschiedene Währungen werden nicht addiert.',noAutoConversion:'Keine automatische Wechselkursumrechnung; Währungen werden getrennt berichtet.'});
fill(D.en,'fr',{appName:'Mes revenus & dépenses',tagline:'Gestion financière simple hors ligne',currentBalance:'Solde actuel',recordedOnDevice:'Les données sont stockées sur cet appareil',income:'Revenus',expense:'Dépenses',reports:'Rapports',settings:'Réglages',language:'Langue',currency:'Devise',home:'Accueil',transactionsTab:'Transactions',reportsTab:'Rapports',settingsTab:'Réglages',registerIncome:'Ajouter un revenu',registerExpense:'Ajouter une dépense',amount:'Montant',title:'Titre',category:'Catégorie',date:'Date',time:'Heure',save:'Enregistrer',delete:'Supprimer',edit:'Modifier',cancel:'Annuler',add:'Ajouter',light:'Clair',dark:'Sombre',system:'Système',currencyNote:'Chaque transaction conserve sa devise; les devises différentes ne sont pas additionnées.',noAutoConversion:'Pas de conversion automatique des taux; les devises sont rapportées séparément.'});
fill(D.en,'es',{appName:'Mis ingresos y gastos',tagline:'Gestión financiera sencilla sin conexión',currentBalance:'Saldo actual',recordedOnDevice:'Los datos se guardan en este dispositivo',income:'Ingresos',expense:'Gastos',reports:'Informes',settings:'Ajustes',language:'Idioma',currency:'Moneda',home:'Inicio',transactionsTab:'Transacciones',reportsTab:'Informes',settingsTab:'Ajustes',registerIncome:'Añadir ingreso',registerExpense:'Añadir gasto',amount:'Importe',title:'Título',category:'Categoría',date:'Fecha',time:'Hora',save:'Guardar',delete:'Eliminar',edit:'Editar',cancel:'Cancelar',add:'Añadir',light:'Claro',dark:'Oscuro',system:'Sistema',currencyNote:'Cada transacción conserva su moneda; las monedas distintas no se suman.',noAutoConversion:'No hay conversión automática de tipos de cambio; las monedas se muestran por separado.'});

export const LANGUAGE_NAMES: Record<LanguageCode,string> = {
  fa:'فارسی', en:'English', ru:'Русский', ar:'العربية', tr:'Türkçe', de:'Deutsch', fr:'Français', es:'Español'
};

export const RTL_LANGUAGES = new Set<LanguageCode>(['fa','ar']);

export function t(lang: LanguageCode, key: TranslationKey): string {
  return D[lang][key] ?? D.fa[key] ?? key;
}

export function categoryLabel(categoryId: string, customLabel: string, lang: LanguageCode): string {
  const labels: Record<string,Record<LanguageCode,string>> = {
    c1:{fa:'حقوق',en:'Salary',ru:'Зарплата',ar:'راتب',tr:'Maaş',de:'Gehalt',fr:'Salaire',es:'Salario'},
    c2:{fa:'درآمد جانبی',en:'Side income',ru:'Дополнительный доход',ar:'دخل جانبي',tr:'Ek gelir',de:'Nebeneinkommen',fr:'Revenu complémentaire',es:'Ingreso adicional'},
    c3:{fa:'خوراک',en:'Food',ru:'Продукты',ar:'طعام',tr:'Gıda',de:'Lebensmittel',fr:'Alimentation',es:'Alimentación'},
    c4:{fa:'حمل‌ونقل',en:'Transport',ru:'Транспорт',ar:'النقل',tr:'Ulaşım',de:'Transport',fr:'Transport',es:'Transporte'},
    c5:{fa:'خرید',en:'Shopping',ru:'Покупки',ar:'مشتريات',tr:'Alışveriş',de:'Einkäufe',fr:'Achats',es:'Compras'},
    c6:{fa:'قبض',en:'Bills',ru:'Счета',ar:'فواتير',tr:'Faturalar',de:'Rechnungen',fr:'Factures',es:'Facturas'},
    c7:{fa:'مسکن',en:'Housing',ru:'Жильё',ar:'السكن',tr:'Konut',de:'Wohnen',fr:'Logement',es:'Vivienda'},
    c8:{fa:'درمان',en:'Healthcare',ru:'Здоровье',ar:'الصحة',tr:'Sağlık',de:'Gesundheit',fr:'Santé',es:'Salud'},
    c9:{fa:'آموزش',en:'Education',ru:'Образование',ar:'التعليم',tr:'Eğitim',de:'Bildung',fr:'Éducation',es:'Educación'},
    c10:{fa:'تفریح',en:'Entertainment',ru:'Развлечения',ar:'ترفيه',tr:'Eğlence',de:'Freizeit',fr:'Divertimento',es:'Ocio'},
    c11:{fa:'سفر',en:'Travel',ru:'Путешествия',ar:'السفر',tr:'Seyahat',de:'Reisen',fr:'Viajes'},
    c12:{fa:'اقساط',en:'Installments',ru:'Рассрочка',ar:'أقساط',tr:'Taksitler',de:'Raten',fr:'Versements',es:'Cuotas'},
    c13:{fa:'سرمایه‌گذاری',en:'Investments',ru:'Инвестиции',ar:'استثمارات',tr:'Yatırımlar',de:'Investitionen',fr:'Investissements',es:'Inversiones'},
    c14:{fa:'سایر',en:'Other',ru:'Другое',ar:'أخرى',tr:'Diğer',de:'Sonstiges',fr:'Autre',es:'Otros'},
  };
  return labels[categoryId]?.[lang] ?? customLabel;
}

export function localizeCategories<T extends { id: string; label: string }>(cats: T[], lang: LanguageCode): T[] {
  return cats.map(c => ({ ...c, label: categoryLabel(c.id, c.label, lang) }));
}

export function localeForLanguage(lang: LanguageCode): string {
  return lang === 'fa' ? 'fa-IR' : lang === 'ru' ? 'ru-RU' : lang === 'ar' ? 'ar' : lang === 'tr' ? 'tr-TR' : lang === 'de' ? 'de-DE' : lang === 'fr' ? 'fr-FR' : lang === 'es' ? 'es-ES' : 'en-US';
}

export function currencyDisplayName(code: CurrencyCode, lang: LanguageCode): string {
  return currencyName(code, lang);
}
