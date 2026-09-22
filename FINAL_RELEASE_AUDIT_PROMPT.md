# Final Release Audit Prompt — دخل‌وخرج من

این فایل «دستور ممیزی نهایی انتشار» پروژه است و باید در هر نسخه مهم قبل از انتشار دوباره اجرا شود.

## نقش
به‌عنوان مهندس ارشد محصول، فرانت‌اند، اندروید، امنیت، داده و QA پروژه را بررسی کن. هدف، صرفاً اضافه‌کردن قابلیت نیست؛ هدف جلوگیری از خطای مالی، از دست‌رفتن داده، جمع‌زدن نادرست ارزها، شکست چندزبانه، شکست آفلاین و شکست Release است.

## قواعد قطعی
1. حدس نزن. هر رفتار یا نتیجه باید از کد، تست یا خروجی واقعی CI قابل اثبات باشد.
2. داده مالی را هرگز بین ارزهای مختلف بدون نرخ معتبر جمع نکن.
3. برای نرخ ارز آنلاینِ ناموجود، عدد ساختگی یا نرخ کهنه تولید نکن.
4. مهاجرت داده نسخه‌های قدیمی باید backward-compatible باشد.
5. هیچ کلید امضای Android یا رمز Release نباید وارد Git شود.
6. حذف داده باید قابل‌فهم، چندمرحله‌ای و در برابر بازگشت داده stale مقاوم باشد.
7. UI همه زبان‌های رسمی پروژه باید واقعاً ترجمه شود؛ متن مخفیِ فارسی/انگلیسی در مسیرهای اصلی باقی نماند.
8. جهت RTL برای فارسی و عربی و LTR برای زبان‌های دیگر باید صحیح باشد.
9. آیکون و برند نباید به یک حرف، زبان یا واحد پول خاص وابسته باشد.
10. Web/PWA و Android باید از همان منطق مالی استفاده کنند و build هر دو مسیر باید از CI عبور کند.
11. قبل از انتشار، build، تست منطقی، Capacitor sync و signed APK/AAB باید موفق باشند.
12. هر تغییر پس از Release قبلی باید Release را دوباره بسازد و نسخه جدید را قابل شناسایی کند.

## محدوده نسخه 1.1
- زبان‌ها: فارسی، English، Русский، العربية، Türkçe.
- ارزها: IRT تومان، IRR ریال ایران، USD، EUR، GBP، RUB، TRY، AED، SAR، CNY، JPY، CAD، AUD، CHF.
- هر تراکنش یک currency مستقل دارد.
- ارز پیش‌فرض کاربر قابل تغییر است.
- گزارش‌ها و موجودی بر اساس ارز انتخابی محاسبه می‌شوند.
- گزارش «خلاصه ارزها» مانده هر ارز را جدا نشان می‌دهد.
- پشتیبان JSON از نسخه 1 به نسخه 2 مهاجرت می‌کند و در نسخه جدید currency را نگهداری می‌کند.
- تبدیل خودکار ارز عمداً وجود ندارد مگر زمانی که یک زیرساخت معتبر و قابل‌راستی‌آزمایی برای نرخ‌ها اضافه شود.

## چک‌لیست نهایی
- TypeScript compile
- Vite production build
- logic tests
- validation of amount/date/time/title/category/backup
- isolated multi-currency calculations
- legacy backup migration
- localStorage fallback + IndexedDB consistency
- deletion tombstone
- JSON/CSV export
- language/RTL/LTR switching
- theme switching
- responsive mobile UI
- icon and manifest
- Android localized launcher labels
- Android INTERNET permission policy
- release signing from GitHub secrets only
- signed APK and AAB creation
- GitHub Pages deployment
- service-worker cache version
- no secrets or keystore files in repository

## خروجی مورد انتظار
اگر یک مورد شکست خورد، همان مورد را اصلاح کن، سپس کل تست انتشار را دوباره اجرا کن. تنها وقتی نسخه را «آماده انتشار» اعلام کن که شواهد CI برای commit نهایی موجود باشد.
