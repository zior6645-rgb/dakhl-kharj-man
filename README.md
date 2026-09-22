# دخل‌وخرج من

وب‌اپ واقعی مدیریت درآمد و هزینه — فارسی، راست‌چین، آفلاین.

## فناوری
- React + TypeScript + Vite (بدون وابستگی اضافه)
- ذخیره‌سازی: IndexedDB + پشتیبان localStorage
- اندروید: Capacitor (پوشه `android/` با یک دستور ساخته می‌شود)

## اجرای نسخه Production (ساخته‌شده)
مسیر بیلد: `dakhl-kharj-man/dist/`
```bash
cd dakhl-kharj-man
node node_modules/vite/bin/vite.js preview --port 4173
# باز کردن: http://127.0.0.1:4173/
```
یا با هر استاتیک‌سرور:
```bash
npx serve dist
```

## توسعه
```bash
cd dakhl-kharj-man
npm install
npm run dev
```

## تست منطق مالی (سناریوی واقعی)
```bash
node tests/logic.test.mjs
```
سناریو: درآمد ۱۰٬۰۰۰٬۰۰۰ − هزینه ۲٬۵۰۰٬۰۰۰ = موجودی ۷٬۵۰۰٬۰۰۰؛ سپس ویرایش، افزودن، حذف، بکاپ/ریستور.

## اندروید (APK)
فایل `ANDROID-APK-GUIDE.md` را ببینید. خلاصه:
```bash
npm i @capacitor/core @capacitor/cli @capacitor/android
npx cap add android
npx cap sync
cd android && ./gradlew assembleDebug
# خروجی: android/app/build/outputs/apk/debug/app-debug.apk
```
