# راه‌اندازی حافظه ابری و حساب Cashio

این پروژه برای حساب ابری از Supabase Auth و جدول‌های اختصاصی Cashio استفاده می‌کند. آدرس Gmail برای کاربر کاملاً قابل استفاده است؛ منظور «Gmail» در این پروژه ورود با آدرس ایمیل است، نه Google OAuth.

## 1) ساخت پروژه Supabase
یک پروژه در Supabase بسازید و از بخش Project Settings > API این دو مقدار عمومی را بردارید:
- Project URL
- Publishable key (یا anon key در پروژه‌های قدیمی)

هرگز service_role key را داخل برنامه، GitHub Actions مربوط به build کلاینت یا فایل‌های این مخزن قرار ندهید.

## 2) ساخت جدول‌های Cashio
فایل `supabase/schema.sql` را کامل در SQL Editor همان پروژه اجرا کنید. این فایل جدول تراکنش‌ها و دسته‌بندی‌ها و Row Level Security را می‌سازد.

## 3) فعال‌کردن ایمیل و کد تأیید
در Authentication > Sign In / Providers، Email را فعال و Email Confirmation را روشن نگه دارید.

در Authentication > Email Templates، قالب Confirm signup را طوری تنظیم کنید که کد عددی را نمایش دهد. برای نمونه:

```html
<h2>Cashio</h2>
<p>کد تأیید حساب شما:</p>
<p style="font-size:32px;font-weight:700;letter-spacing:8px">{{ .Token }}</p>
<p>این کد را در برنامه Cashio وارد کنید.</p>
```

Cashio پس از ثبت ایمیل و گذرواژه، منتظر همین کد می‌ماند. بعد از تأیید، همان گذرواژه برای ورود ایمیل/گذرواژه استفاده می‌شود.

## 4) ارسال واقعی ایمیل
برای تست محدود می‌توان از سرویس ایمیل پیش‌فرض Supabase استفاده کرد، اما برای استفاده واقعی بهتر است Custom SMTP تنظیم شود. مسیر معمول:
Authentication > SMTP Settings

## 5) اتصال Buildهای Cashio
در GitHub مخزن Cashio بروید:
Settings > Secrets and variables > Actions > New repository secret

این دو Secret را بسازید:
`VITE_SUPABASE_URL`
`VITE_SUPABASE_PUBLISHABLE_KEY`

مقدارشان همان Project URL و Publishable/anon key مرحله 1 باشد.

بعد workflowهای Deploy Web و Release APK/AAB را دوباره اجرا کنید. هر دو workflow همین Secretها را هنگام build به Vite می‌دهند.

## 6) تست نهایی
پس از Deploy:
1. Cashio را باز کنید.
2. Settings > Cloud را انتخاب کنید.
3. Create account را بزنید.
4. یک Gmail وارد کنید و گذرواژه حداقل 8 کاراکتری بسازید.
5. کد ایمیل را وارد کنید.
6. پس از ورود، Cloud را انتخاب کنید و یک تراکنش آزمایشی ثبت کنید.
7. با خروج و ورود دوباره بررسی کنید که همان تراکنش از Cloud برگشته باشد.

## نکته مهم
تا وقتی Project URL و Publishable key واقعی در Build وارد نشده باشند، گزینه Cloud عمداً فعال نمی‌شود. این رفتار برای جلوگیری از نشان‌دادن «حافظه ابری فعال است» در حالی که backend واقعاً وجود ندارد، طراحی شده است.
