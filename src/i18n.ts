import type { LanguageCode, CurrencyCode } from './types';
import { currencyName } from './currencies';

export type TranslationKey =
  | 'appName'|'tagline'|'currentBalance'|'recordedOnDevice'|'totalIncome'|'totalExpense'|'transactions'
  | 'currentMonthIncome'|'currentMonthExpense'|'currentMonthBalance'|'last7Days'|'incomeExpenseTrend'|'income'|'expense'
  | 'greenIncomeRedExpense'|'financialSummary'|'totalTransactions'|'topExpenseCategory'|'latestTransactions'
  | 'noneYet'|'registerFirst'|'noTransactions'|'transactionsTitle'|'search'|'allTypes'|'allCategories'
  | 'newest'|'oldest'|'highestAmount'|'lowestAmount'|'fromDate'|'toDate'|'clearFilters'|'details'|'edit'
  | 'delete'|'noMatch'|'changeFilters'|'reports'|'today'|'thisWeek'|'thisMonth'|'last3Months'|'thisYear'
  | 'customRange'|'rangeStartAfterEnd'|'noDataInRange'|'totalIncomeReport'|'totalExpenseReport'|'balance'
  | 'transactionCount'|'expenseDistribution'|'settings'|'appearance'|'light'|'dark'|'system'|'language'
  | 'currency'|'defaultCurrency'|'manageCategories'|'addCategoryName'|'add'|'both'|'backupRestore'
  | 'downloadBackup'|'exportCsv'|'importFile'|'deleteAllData'|'deleteAllWarning'|'confirmSure'
  | 'finalDeleteWarning'|'finalDelete'|'cancel'|'about'|'versionOffline'|'registerIncome'|'registerExpense'
  | 'newInput'|'newOutput'|'amount'|'amountExample'|'title'|'titleExample'|'category'|'select'|'date'|'time'
  | 'descriptionOptional'|'saveChanges'|'save'|'invalidCategory'|'invalidTime'|'invalidAmount'|'titleRequired'|'titleTooLong'|'categoryRequired'|'dateInvalid'|'descTooLong'|'saved'|'updated'
  | 'deleted'|'backupDownloaded'|'csvDownloaded'|'restored'|'invalidFile'|'invalidFileKeepData'|'localFallback'
  | 'categoryAdded'|'categoryExists'|'categoryDeleted'|'categoryHasTransactions'|'defaultCategoryCannotDelete'
  | 'categoryNameRequired'|'allDataDeleted'|'themeChanged'|'currencySummary'|'otherCurrencies'
  | 'noBalanceForCurrency'|'currencyNote'|'noAutoConversion'|'mainNavigation'|'home'|'transactionsTab'
  | 'reportsTab'|'settingsTab'|'currencyFilter'|'allCurrencies'|'thisCurrency'|'privacyLocalOnly'
  | 'dataIntegrityNote'|'openSource'|'languageReload'|'selectedCurrency'|'customCategory'|'confirmDeleteTransaction';

type Dict = Record<TranslationKey,string>;

const fa: Dict = {
 appName:'دخل‌وخرج من',tagline:'مدیریت ساده و آفلاین',currentBalance:'موجودی فعلی',recordedOnDevice:'اطلاعات روی همین دستگاه ذخیره می‌شود',
 totalIncome:'درآمد کل',totalExpense:'هزینه کل',transactions:'تراکنش',currentMonthIncome:'درآمد ماه جاری',currentMonthExpense:'هزینه ماه جاری',currentMonthBalance:'مانده ماه جاری',
 last7Days:'هفت روز اخیر',incomeExpenseTrend:'روند درآمد و هزینه',income:'درآمد',expense:'هزینه',greenIncomeRedExpense:'سبز: درآمد — قرمز: هزینه',financialSummary:'خلاصه مالی',totalTransactions:'تعداد کل تراکنش‌ها',
 topExpenseCategory:'بیشترین دسته هزینه',latestTransactions:'آخرین تراکنش‌ها',noneYet:'هنوز تراکنشی ثبت نشده است.',registerFirst:'از دکمه‌های بالا اولین تراکنش را ثبت کنید.',
 noTransactions:'تراکنشی وجود ندارد.',transactionsTitle:'تراکنش‌ها',search:'جستجو…',allTypes:'همه انواع',allCategories:'همه دسته‌ها',newest:'جدیدترین',oldest:'قدیمی‌ترین',
 highestAmount:'بیشترین مبلغ',lowestAmount:'کمترین مبلغ',fromDate:'از تاریخ',toDate:'تا تاریخ',clearFilters:'پاک کردن فیلتر',details:'جزئیات',edit:'ویرایش',delete:'حذف',
 noMatch:'موردی یافت نشد.',changeFilters:'فیلترها را تغییر دهید یا تراکنش جدید ثبت کنید.',reports:'گزارش‌ها',today:'امروز',thisWeek:'این هفته',thisMonth:'این ماه',
 last3Months:'سه ماه اخیر',thisYear:'امسال',customRange:'بازه دلخواه',rangeStartAfterEnd:'تاریخ شروع نباید بعد از تاریخ پایان باشد.',noDataInRange:'در این بازه داده‌ای وجود ندارد.',
 totalIncomeReport:'مجموع درآمد',totalExpenseReport:'مجموع هزینه',balance:'مانده',transactionCount:'تعداد تراکنش',expenseDistribution:'توزیع هزینه بر اساس دسته',
 settings:'تنظیمات',appearance:'حالت نمایش',light:'روشن',dark:'تاریک',system:'سیستم',language:'زبان',currency:'ارز',defaultCurrency:'ارز پیش‌فرض',
 manageCategories:'مدیریت دسته‌بندی‌ها',addCategoryName:'نام دسته جدید',add:'افزودن',both:'هر دو',backupRestore:'پشتیبان‌گیری و بازیابی',downloadBackup:'دانلود پشتیبان (JSON)',exportCsv:'خروجی CSV',importFile:'وارد کردن فایل',
 deleteAllData:'حذف تمام اطلاعات',deleteAllWarning:'این کار همه تراکنش‌ها و دسته‌های سفارشی را حذف می‌کند و قابل بازگشت نیست.',confirmSure:'بله، مطمئنم',finalDeleteWarning:'تأیید نهایی: همه تراکنش‌ها و دسته‌های سفارشی حذف می‌شوند.',finalDelete:'تأیید نهایی حذف',cancel:'انصراف',
 about:'درباره',versionOffline:'نسخه ۱٫۱٫۰ — مدیریت شخصی درآمد و هزینه، آفلاین و بدون نیاز به حساب کاربری.',registerIncome:'ثبت درآمد',registerExpense:'ثبت هزینه',newInput:'ورودی جدید',newOutput:'خروجی جدید',
 amount:'مبلغ',amountExample:'مثلاً 2500000',title:'عنوان',titleExample:'مثلاً حقوق',category:'دسته‌بندی',select:'انتخاب کنید…',date:'تاریخ',time:'ساعت',descriptionOptional:'توضیح (اختیاری)',
 saveChanges:'ذخیره تغییرات',invalidAmount:'مبلغ نامعتبر است.',titleRequired:'عنوان را وارد کنید.',titleTooLong:'عنوان بیش از حد طولانی است.',categoryRequired:'دسته‌بندی را انتخاب کنید.',dateInvalid:'تاریخ نامعتبر است.',save:'ثبت',invalidCategory:'دسته‌بندی معتبر نیست.',invalidTime:'ساعت نامعتبر است.',descTooLong:'توضیح بیش از حد طولانی است.',saved:'تراکنش ثبت شد.',updated:'تراکنش ویرایش شد.',deleted:'تراکنش حذف شد.',
 backupDownloaded:'فایل پشتیبان دانلود شد.',csvDownloaded:'فایل CSV دانلود شد.',restored:'بازیابی با موفقیت انجام شد.',invalidFile:'فایل خراب است:',invalidFileKeepData:'فایل خراب است و اطلاعات فعلی حفظ شد.',localFallback:'اطلاعات در پشتیبان محلی ذخیره/بازیابی شد؛ پایگاه داده اصلی در دسترس نبود.',
 categoryAdded:'دسته اضافه شد.',categoryExists:'این دسته از قبل وجود دارد.',categoryDeleted:'دسته حذف شد.',categoryHasTransactions:'این دسته تراکنش دارد و حذف آن مجاز نیست.',defaultCategoryCannotDelete:'دسته‌های پیش‌فرض قابل حذف نیستند.',categoryNameRequired:'نام دسته را وارد کنید.',
 allDataDeleted:'همه اطلاعات حذف شد.',themeChanged:'تم تغییر کرد.',currencySummary:'خلاصه ارز',otherCurrencies:'ارزهای دیگر',noBalanceForCurrency:'برای این ارز هنوز تراکنشی ثبت نشده است.',
 currencyNote:'هر تراکنش ارز خودش را دارد و ارزها با هم جمع نمی‌شوند.',noAutoConversion:'نرخ تبدیل خودکار در برنامه وجود ندارد؛ برای جلوگیری از محاسبه ساختگی، ارزها جداگانه گزارش می‌شوند.',
 mainNavigation:'ناوبری اصلی',home:'خانه',transactionsTab:'تراکنش‌ها',reportsTab:'گزارش‌ها',settingsTab:'تنظیمات',currencyFilter:'فیلتر ارز',allCurrencies:'همه ارزها',thisCurrency:'این ارز',
 privacyLocalOnly:'داده‌های مالی برای قابلیت اصلی در همین دستگاه نگهداری می‌شوند.',dataIntegrityNote:'قبل از تعویض یا پاک‌سازی دستگاه، پشتیبان بگیرید.',openSource:'متن‌باز',customCategory:'دسته‌های سفارشی',confirmDeleteTransaction:'این تراکنش حذف شود؟',languageReload:'زبان برنامه تغییر کرد.',selectedCurrency:'ارز انتخاب‌شده'
};

const en: Dict = {
 appName:'My Income & Expense',tagline:'Simple offline money management',currentBalance:'Current balance',recordedOnDevice:'Data is stored on this device',
 totalIncome:'Total income',totalExpense:'Total expense',transactions:'Transactions',currentMonthIncome:'Current month income',currentMonthExpense:'Current month expense',currentMonthBalance:'Current month balance',
 last7Days:'Last 7 days',incomeExpenseTrend:'Income and expense trend',income:'Income',expense:'Expense',greenIncomeRedExpense:'Green: income — Red: expense',financialSummary:'Financial summary',totalTransactions:'Total transactions',
 topExpenseCategory:'Top expense category',latestTransactions:'Latest transactions',noneYet:'No transactions yet.',registerFirst:'Use the buttons above to add your first transaction.',
 noTransactions:'No transactions.',transactionsTitle:'Transactions',search:'Search…',allTypes:'All types',allCategories:'All categories',newest:'Newest',oldest:'Oldest',
 highestAmount:'Highest amount',lowestAmount:'Lowest amount',fromDate:'From date',toDate:'To date',clearFilters:'Clear filters',details:'Details',edit:'Edit',delete:'Delete',noMatch:'No match found.',changeFilters:'Change the filters or add a new transaction.',
 reports:'Reports',today:'Today',thisWeek:'This week',thisMonth:'This month',last3Months:'Last 3 months',thisYear:'This year',customRange:'Custom range',rangeStartAfterEnd:'Start date must not be after end date.',noDataInRange:'No data in this range.',
 totalIncomeReport:'Total income',totalExpenseReport:'Total expense',balance:'Balance',transactionCount:'Transaction count',expenseDistribution:'Expense distribution by category',
 settings:'Settings',appearance:'Appearance',light:'Light',dark:'Dark',system:'System',language:'Language',currency:'Currency',defaultCurrency:'Default currency',
 manageCategories:'Manage categories',addCategoryName:'New category name',add:'Add',both:'Both',backupRestore:'Backup & restore',downloadBackup:'Download backup (JSON)',exportCsv:'Export CSV',importFile:'Import file',
 deleteAllData:'Delete all data',deleteAllWarning:'This deletes all transactions and custom categories. It cannot be undone.',confirmSure:'Yes, I am sure',finalDeleteWarning:'Final confirmation: all transactions and custom categories will be deleted.',finalDelete:'Delete permanently',cancel:'Cancel',
 about:'About',versionOffline:'Version 1.1.0 — personal income and expense tracking, offline and account-free.',registerIncome:'Add income',registerExpense:'Add expense',newInput:'New inflow',newOutput:'New outflow',
 amount:'Amount',amountExample:'e.g. 2500.00',title:'Title',titleExample:'e.g. Salary',category:'Category',select:'Select…',date:'Date',time:'Time',descriptionOptional:'Description (optional)',
 saveChanges:'Save changes',invalidAmount:'Invalid amount.',titleRequired:'Enter a title.',titleTooLong:'Title is too long.',categoryRequired:'Select a category.',dateInvalid:'Invalid date.',save:'Save',invalidCategory:'Invalid category.',invalidTime:'Invalid time.',descTooLong:'Description is too long.',saved:'Transaction saved.',updated:'Transaction updated.',deleted:'Transaction deleted.',
 backupDownloaded:'Backup downloaded.',csvDownloaded:'CSV downloaded.',restored:'Restore completed.',invalidFile:'Invalid file:',invalidFileKeepData:'Invalid file; existing data was kept.',localFallback:'Data was saved/restored using the local fallback because the primary database was unavailable.',
 categoryAdded:'Category added.',categoryExists:'This category already exists.',categoryDeleted:'Category deleted.',categoryHasTransactions:'This category has transactions and cannot be deleted.',defaultCategoryCannotDelete:'Default categories cannot be deleted.',categoryNameRequired:'Enter a category name.',
 allDataDeleted:'All data deleted.',themeChanged:'Theme changed.',currencySummary:'Currency summary',otherCurrencies:'Other currencies',noBalanceForCurrency:'There are no transactions in this currency yet.',
 currencyNote:'Each transaction keeps its own currency; currencies are never added together.',noAutoConversion:'There is no automatic exchange-rate conversion. Currencies are reported separately.',
 mainNavigation:'Main navigation',home:'Home',transactionsTab:'Transactions',reportsTab:'Reports',settingsTab:'Settings',currencyFilter:'Currency filter',allCurrencies:'All currencies',thisCurrency:'This currency',
 privacyLocalOnly:'Financial data is stored locally for core features.',dataIntegrityNote:'Back up before resetting or replacing the device.',openSource:'Open source',customCategory:'Custom categories',confirmDeleteTransaction:'Delete this transaction?',languageReload:'Language changed.',selectedCurrency:'Selected currency'
};

const ru: Dict = {
 ...en, appName:'Мои доходы и расходы', tagline:'Простой офлайн-учёт денег', currentBalance:'Текущий баланс', recordedOnDevice:'Данные хранятся на этом устройстве',
 totalIncome:'Общий доход',totalExpense:'Общие расходы',transactions:'Операции',currentMonthIncome:'Доход за текущий месяц',currentMonthExpense:'Расходы за текущий месяц',currentMonthBalance:'Баланс текущего месяца',
 last7Days:'Последние 7 дней',incomeExpenseTrend:'Динамика доходов и расходов',income:'Доход',expense:'Расход',greenIncomeRedExpense:'Зелёный: доход — красный: расход',financialSummary:'Финансовая сводка',totalTransactions:'Всего операций',topExpenseCategory:'Главная категория расходов',latestTransactions:'Последние операции',
 noneYet:'Операций пока нет.',registerFirst:'Используйте кнопки выше, чтобы добавить первую операцию.',noTransactions:'Операций нет.',transactionsTitle:'Операции',search:'Поиск…',allTypes:'Все типы',allCategories:'Все категории',newest:'Сначала новые',oldest:'Сначала старые',
 highestAmount:'Максимальная сумма',lowestAmount:'Минимальная сумма',fromDate:'Дата от',toDate:'Дата до',clearFilters:'Сбросить фильтры',details:'Подробнее',edit:'Изменить',delete:'Удалить',noMatch:'Ничего не найдено.',changeFilters:'Измените фильтры или добавьте новую операцию.',
 reports:'Отчёты',today:'Сегодня',thisWeek:'Эта неделя',thisMonth:'Этот месяц',last3Months:'Последние 3 месяца',thisYear:'Этот год',customRange:'Произвольный период',rangeStartAfterEnd:'Начальная дата не должна быть позже конечной.',noDataInRange:'В этом периоде нет данных.',
 totalIncomeReport:'Общий доход',totalExpenseReport:'Общие расходы',balance:'Баланс',transactionCount:'Количество операций',expenseDistribution:'Расходы по категориям',settings:'Настройки',appearance:'Оформление',light:'Светлая',dark:'Тёмная',system:'Система',language:'Язык',currency:'Валюта',defaultCurrency:'Валюта по умолчанию',
 manageCategories:'Категории',addCategoryName:'Название новой категории',add:'Добавить',both:'Оба',backupRestore:'Резервная копия и восстановление',downloadBackup:'Скачать резервную копию (JSON)',exportCsv:'Экспорт CSV',importFile:'Импорт файла',deleteAllData:'Удалить все данные',deleteAllWarning:'Удаление всех операций и пользовательских категорий необратимо.',confirmSure:'Да, я уверен',
 finalDeleteWarning:'Подтверждение: все операции и пользовательские категории будут удалены.',finalDelete:'Удалить навсегда',cancel:'Отмена',about:'О программе',versionOffline:'Версия 1.1.0 — личный учёт доходов и расходов, офлайн.',registerIncome:'Добавить доход',registerExpense:'Добавить расход',newInput:'Новый доход',newOutput:'Новый расход',
 amount:'Сумма',amountExample:'например, 2500.00',title:'Название',titleExample:'например, Зарплата',category:'Категория',select:'Выберите…',date:'Дата',time:'Время',descriptionOptional:'Описание (необязательно)',saveChanges:'Сохранить изменения',invalidAmount:'Недопустимая сумма.',titleRequired:'Введите название.',titleTooLong:'Название слишком длинное.',categoryRequired:'Выберите категорию.',dateInvalid:'Недопустимая дата.',save:'Сохранить',invalidCategory:'Недопустимая категория.',invalidTime:'Недопустимое время.',descTooLong:'Описание слишком длинное.',
 saved:'Операция сохранена.',updated:'Операция изменена.',deleted:'Операция удалена.',backupDownloaded:'Резервная копия скачана.',csvDownloaded:'CSV скачан.',restored:'Восстановление завершено.',invalidFile:'Файл недействителен:',invalidFileKeepData:'Файл недействителен; текущие данные сохранены.',localFallback:'Данные сохранены через локальный резервный механизм.',categoryAdded:'Категория добавлена.',categoryExists:'Такая категория уже существует.',categoryDeleted:'Категория удалена.',categoryHasTransactions:'У категории есть операции, её нельзя удалить.',defaultCategoryCannotDelete:'Стандартные категории нельзя удалить.',categoryNameRequired:'Введите название категории.',
 allDataDeleted:'Все данные удалены.',themeChanged:'Тема изменена.',currencySummary:'Сводка по валютам',otherCurrencies:'Другие валюты',noBalanceForCurrency:'Операций в этой валюте пока нет.',currencyNote:'Каждая операция хранит свою валюту; разные валюты не складываются.',noAutoConversion:'Нет автоматической конвертации курсов; валюты показываются отдельно.',mainNavigation:'Основная навигация',home:'Главная',transactionsTab:'Операции',reportsTab:'Отчёты',settingsTab:'Настройки',currencyFilter:'Фильтр валюты',allCurrencies:'Все валюты',thisCurrency:'Эта валюта',privacyLocalOnly:'Финансовые данные хранятся локально.',dataIntegrityNote:'Перед заменой или очисткой устройства сделайте резервную копию.',openSource:'Открытый код',customCategory:'Пользовательские категории',confirmDeleteTransaction:'Удалить эту операцию?',languageReload:'Язык изменён.',selectedCurrency:'Выбранная валюта'
};

const ar: Dict = {
 ...en, appName:'دخلي ومصروفي',tagline:'إدارة مالية بسيطة دون اتصال',currentBalance:'الرصيد الحالي',recordedOnDevice:'تُحفظ البيانات على هذا الجهاز',totalIncome:'إجمالي الدخل',totalExpense:'إجمالي المصروفات',transactions:'المعاملات',
 currentMonthIncome:'دخل الشهر الحالي',currentMonthExpense:'مصروفات الشهر الحالي',currentMonthBalance:'رصيد الشهر الحالي',last7Days:'آخر 7 أيام',incomeExpenseTrend:'اتجاه الدخل والمصروفات',income:'دخل',expense:'مصروف',greenIncomeRedExpense:'الأخضر: دخل — الأحمر: مصروف',financialSummary:'الملخص المالي',totalTransactions:'إجمالي المعاملات',topExpenseCategory:'أعلى فئة مصروفات',latestTransactions:'أحدث المعاملات',
 noneYet:'لا توجد معاملات بعد.',registerFirst:'استخدم الأزرار أعلاه لإضافة أول معاملة.',noTransactions:'لا توجد معاملات.',transactionsTitle:'المعاملات',search:'بحث…',allTypes:'كل الأنواع',allCategories:'كل الفئات',newest:'الأحدث',oldest:'الأقدم',highestAmount:'أعلى مبلغ',lowestAmount:'أقل مبلغ',fromDate:'من تاريخ',toDate:'إلى تاريخ',clearFilters:'مسح الفلاتر',details:'التفاصيل',edit:'تعديل',delete:'حذف',
 noMatch:'لم يتم العثور على نتائج.',changeFilters:'غيّر الفلاتر أو أضف معاملة جديدة.',reports:'التقارير',today:'اليوم',thisWeek:'هذا الأسبوع',thisMonth:'هذا الشهر',last3Months:'آخر 3 أشهر',thisYear:'هذه السنة',customRange:'نطاق مخصص',rangeStartAfterEnd:'يجب ألا يسبق تاريخ البداية تاريخ النهاية.',noDataInRange:'لا توجد بيانات في هذا النطاق.',
 totalIncomeReport:'إجمالي الدخل',totalExpenseReport:'إجمالي المصروفات',balance:'الرصيد',transactionCount:'عدد المعاملات',expenseDistribution:'توزيع المصروفات حسب الفئة',settings:'الإعدادات',appearance:'المظهر',light:'فاتح',dark:'داكن',system:'النظام',language:'اللغة',currency:'العملة',defaultCurrency:'العملة الافتراضية',
 manageCategories:'إدارة الفئات',addCategoryName:'اسم الفئة الجديدة',add:'إضافة',both:'كلاهما',backupRestore:'النسخ الاحتياطي والاستعادة',downloadBackup:'تنزيل النسخة الاحتياطية (JSON)',exportCsv:'تصدير CSV',importFile:'استيراد ملف',deleteAllData:'حذف جميع البيانات',deleteAllWarning:'سيؤدي ذلك إلى حذف جميع المعاملات والفئات المخصصة ولا يمكن التراجع عنه.',confirmSure:'نعم، أنا متأكد',
 finalDeleteWarning:'تأكيد نهائي: سيتم حذف جميع المعاملات والفئات المخصصة.',finalDelete:'حذف نهائي',cancel:'إلغاء',about:'حول التطبيق',versionOffline:'الإصدار 1.1.0 — إدارة شخصية للدخل والمصروفات دون اتصال.',registerIncome:'إضافة دخل',registerExpense:'إضافة مصروف',newInput:'دخل جديد',newOutput:'مصروف جديد',
 amount:'المبلغ',amountExample:'مثال: 2500.00',title:'العنوان',titleExample:'مثال: راتب',category:'الفئة',select:'اختر…',date:'التاريخ',time:'الوقت',descriptionOptional:'الوصف (اختياري)',saveChanges:'حفظ التغييرات',invalidAmount:'المبلغ غير صالح.',titleRequired:'أدخل عنواناً.',titleTooLong:'العنوان طويل جداً.',categoryRequired:'اختر فئة.',dateInvalid:'التاريخ غير صالح.',save:'حفظ',invalidCategory:'الفئة غير صالحة.',invalidTime:'الوقت غير صالح.',descTooLong:'الوصف طويل جداً.',saved:'تم حفظ المعاملة.',updated:'تم تحديث المعاملة.',deleted:'تم حذف المعاملة.',
 backupDownloaded:'تم تنزيل النسخة الاحتياطية.',csvDownloaded:'تم تنزيل CSV.',restored:'تمت الاستعادة بنجاح.',invalidFile:'ملف غير صالح:',invalidFileKeepData:'الملف غير صالح؛ تم الحفاظ على البيانات الحالية.',localFallback:'تم الحفظ/الاستعادة عبر التخزين المحلي الاحتياطي.',categoryAdded:'تمت إضافة الفئة.',categoryExists:'هذه الفئة موجودة بالفعل.',categoryDeleted:'تم حذف الفئة.',categoryHasTransactions:'تحتوي هذه الفئة على معاملات ولا يمكن حذفها.',defaultCategoryCannotDelete:'لا يمكن حذف الفئات الافتراضية.',categoryNameRequired:'أدخل اسم الفئة.',
 allDataDeleted:'تم حذف جميع البيانات.',themeChanged:'تم تغيير المظهر.',currencySummary:'ملخص العملات',otherCurrencies:'عملات أخرى',noBalanceForCurrency:'لا توجد معاملات بهذه العملة بعد.',currencyNote:'كل معاملة تحتفظ بعملتها ولا يتم جمع العملات المختلفة.',noAutoConversion:'لا يوجد تحويل تلقائي لأسعار الصرف؛ تُعرض العملات بشكل منفصل.',mainNavigation:'التنقل الرئيسي',home:'الرئيسية',transactionsTab:'المعاملات',reportsTab:'التقارير',settingsTab:'الإعدادات',currencyFilter:'فلتر العملة',allCurrencies:'كل العملات',thisCurrency:'هذه العملة',privacyLocalOnly:'تُخزّن البيانات المالية محلياً للوظائف الأساسية.',dataIntegrityNote:'أنشئ نسخة احتياطية قبل إعادة ضبط الجهاز أو تغييره.',openSource:'مفتوح المصدر',customCategory:'الفئات المخصصة',confirmDeleteTransaction:'هل تريد حذف هذه المعاملة؟',languageReload:'تم تغيير اللغة.',selectedCurrency:'العملة المحددة'
};

const tr: Dict = {
 ...en, appName:'Gelir Giderim',tagline:'Basit çevrimdışı para yönetimi',currentBalance:'Güncel bakiye',recordedOnDevice:'Veriler bu cihazda saklanır',totalIncome:'Toplam gelir',totalExpense:'Toplam gider',transactions:'İşlemler',
 currentMonthIncome:'Bu ay geliri',currentMonthExpense:'Bu ay gideri',currentMonthBalance:'Bu ay bakiyesi',last7Days:'Son 7 gün',incomeExpenseTrend:'Gelir ve gider eğilimi',income:'Gelir',expense:'Gider',greenIncomeRedExpense:'Yeşil: gelir — Kırmızı: gider',financialSummary:'Finans özeti',totalTransactions:'Toplam işlem',topExpenseCategory:'En yüksek gider kategorisi',latestTransactions:'Son işlemler',
 noneYet:'Henüz işlem yok.',registerFirst:'İlk işlemi eklemek için yukarıdaki düğmeleri kullanın.',noTransactions:'İşlem yok.',transactionsTitle:'İşlemler',search:'Ara…',allTypes:'Tüm türler',allCategories:'Tüm kategoriler',newest:'En yeni',oldest:'En eski',highestAmount:'En yüksek tutar',lowestAmount:'En düşük tutar',fromDate:'Başlangıç',toDate:'Bitiş',clearFilters:'Filtreleri temizle',details:'Detaylar',edit:'Düzenle',delete:'Sil',
 noMatch:'Sonuç bulunamadı.',changeFilters:'Filtreleri değiştirin veya yeni işlem ekleyin.',reports:'Raporlar',today:'Bugün',thisWeek:'Bu hafta',thisMonth:'Bu ay',last3Months:'Son 3 ay',thisYear:'Bu yıl',customRange:'Özel aralık',rangeStartAfterEnd:'Başlangıç tarihi bitiş tarihinden sonra olamaz.',noDataInRange:'Bu aralıkta veri yok.',
 totalIncomeReport:'Toplam gelir',totalExpenseReport:'Toplam gider',balance:'Bakiye',transactionCount:'İşlem sayısı',expenseDistribution:'Kategoriye göre gider dağılımı',settings:'Ayarlar',appearance:'Görünüm',light:'Açık',dark:'Koyu',system:'Sistem',language:'Dil',currency:'Para birimi',defaultCurrency:'Varsayılan para birimi',
 manageCategories:'Kategori yönetimi',addCategoryName:'Yeni kategori adı',add:'Ekle',both:'İkisi',backupRestore:'Yedekleme ve geri yükleme',downloadBackup:'Yedeği indir (JSON)',exportCsv:'CSV dışa aktar',importFile:'Dosya içe aktar',deleteAllData:'Tüm verileri sil',deleteAllWarning:'Bu işlem tüm işlemleri ve özel kategorileri siler ve geri alınamaz.',confirmSure:'Evet, eminim',finalDeleteWarning:'Son onay: tüm işlemler ve özel kategoriler silinecek.',finalDelete:'Kalıcı olarak sil',cancel:'İptal',
 about:'Hakkında',versionOffline:'Sürüm 1.1.0 — kişisel gelir-gider takibi, çevrimdışı.',registerIncome:'Gelir ekle',registerExpense:'Gider ekle',newInput:'Yeni giriş',newOutput:'Yeni çıkış',amount:'Tutar',amountExample:'ör. 2500,00',title:'Başlık',titleExample:'ör. Maaş',category:'Kategori',select:'Seçin…',date:'Tarih',time:'Saat',descriptionOptional:'Açıklama (isteğe bağlı)',saveChanges:'Değişiklikleri kaydet',invalidAmount:'Geçersiz tutar.',titleRequired:'Başlık girin.',titleTooLong:'Başlık çok uzun.',categoryRequired:'Kategori seçin.',dateInvalid:'Geçersiz tarih.',save:'Kaydet',invalidCategory:'Geçersiz kategori.',invalidTime:'Geçersiz saat.',descTooLong:'Açıklama çok uzun.',
 saved:'İşlem kaydedildi.',updated:'İşlem güncellendi.',deleted:'İşlem silindi.',backupDownloaded:'Yedek indirildi.',csvDownloaded:'CSV indirildi.',restored:'Geri yükleme tamamlandı.',invalidFile:'Geçersiz dosya:',invalidFileKeepData:'Dosya geçersiz; mevcut veriler korundu.',localFallback:'Veriler yerel yedek mekanizmasıyla işlendi.',categoryAdded:'Kategori eklendi.',categoryExists:'Bu kategori zaten var.',categoryDeleted:'Kategori silindi.',categoryHasTransactions:'Bu kategoride işlemler var, silinemez.',defaultCategoryCannotDelete:'Varsayılan kategoriler silinemez.',categoryNameRequired:'Kategori adı girin.',
 allDataDeleted:'Tüm veriler silindi.',themeChanged:'Tema değişti.',currencySummary:'Para birimi özeti',otherCurrencies:'Diğer para birimleri',noBalanceForCurrency:'Bu para biriminde henüz işlem yok.',currencyNote:'Her işlem kendi para birimini saklar; farklı para birimleri toplanmaz.',noAutoConversion:'Otomatik kur dönüşümü yoktur; para birimleri ayrı raporlanır.',mainNavigation:'Ana gezinme',home:'Ana sayfa',transactionsTab:'İşlemler',reportsTab:'Raporlar',settingsTab:'Ayarlar',currencyFilter:'Para birimi filtresi',allCurrencies:'Tüm para birimleri',thisCurrency:'Bu para birimi',privacyLocalOnly:'Finans verileri temel özellikler için yerel tutulur.',dataIntegrityNote:'Cihazı sıfırlamadan veya değiştirmeden önce yedek alın.',openSource:'Açık kaynak',customCategory:'Özel kategoriler',confirmDeleteTransaction:'Bu işlem silinsin mi?',languageReload:'Dil değiştirildi.',selectedCurrency:'Seçili para birimi'
};

export const DICTS: Record<LanguageCode, Dict> = { fa, en, ru, ar, tr };
export const LANGUAGE_NAMES: Record<LanguageCode,string> = { fa:'فارسی', en:'English', ru:'Русский', ar:'العربية', tr:'Türkçe' };
export const RTL_LANGUAGES = new Set<LanguageCode>(['fa','ar']);

export function t(lang: LanguageCode, key: TranslationKey): string {
  return DICTS[lang][key] ?? DICTS.en[key] ?? key;
}

const CATEGORY_LABELS: Record<string, Record<LanguageCode,string>> = {
 c1:{fa:'حقوق',en:'Salary',ru:'Зарплата',ar:'راتب',tr:'Maaş'},
 c2:{fa:'درآمد جانبی',en:'Side income',ru:'Дополнительный доход',ar:'دخل جانبي',tr:'Ek gelir'},
 c3:{fa:'خوراک',en:'Food',ru:'Продукты',ar:'طعام',tr:'Gıda'},
 c4:{fa:'حمل‌ونقل',en:'Transport',ru:'Транспорт',ar:'النقل',tr:'Ulaşım'},
 c5:{fa:'خرید',en:'Shopping',ru:'Покупки',ar:'مشتريات',tr:'Alışveriş'},
 c6:{fa:'قبض',en:'Bills',ru:'Счета',ar:'فواتير',tr:'Faturalar'},
 c7:{fa:'مسکن',en:'Housing',ru:'Жильё',ar:'السكن',tr:'Konut'},
 c8:{fa:'درمان',en:'Healthcare',ru:'Здоровье',ar:'الصحة',tr:'Sağlık'},
 c9:{fa:'آموزش',en:'Education',ru:'Образование',ar:'التعليم',tr:'Eğitim'},
 c10:{fa:'تفریح',en:'Entertainment',ru:'Развлечения',ar:'ترفيه',tr:'Eğlence'},
 c11:{fa:'سفر',en:'Travel',ru:'Путешествия',ar:'السفر',tr:'Seyahat'},
 c12:{fa:'اقساط',en:'Installments',ru:'Рассрочка',ar:'أقساط',tr:'Taksitler'},
 c13:{fa:'سرمایه‌گذاری',en:'Investments',ru:'Инвестиции',ar:'استثمارات',tr:'Yatırımlar'},
 c14:{fa:'سایر',en:'Other',ru:'Другое',ar:'أخرى',tr:'Diğer'}
};

export function categoryLabel(categoryId: string, customLabel: string, lang: LanguageCode): string {
  return CATEGORY_LABELS[categoryId]?.[lang] ?? customLabel;
}

export function localeForLanguage(lang: LanguageCode): string {
  return lang === 'fa' ? 'fa-IR' : lang === 'ru' ? 'ru-RU' : lang === 'ar' ? 'ar' : lang === 'tr' ? 'tr-TR' : 'en-US';
}

export function currencyDisplayName(code: CurrencyCode, lang: LanguageCode): string {
  return currencyName(code, lang);
}
