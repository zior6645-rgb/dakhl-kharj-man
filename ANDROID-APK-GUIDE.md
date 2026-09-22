# راهنمای ساخت APK — دخل‌وخرج من

این پروژه وب آن آماده است (`dist/`) و `capacitor.config.ts`  `webDir: dist`.

## پیش‌نیاز (یک‌بار)
- Java 17+, Android SDK (platform + build-tools), Gradle, Node 20+

## مراحل
```bash
cd dakhl-kharj-man
npm install
npm run build
npm i @capacitor/core @capacitor/cli @capacitor/android
npx cap add android
npx cap sync
cd android
./gradlew assembleDebug
```
## خروجی
`android/app/build/outputs/apk/debug/app-debug.apk`
کپی روی گوشی → نصب → اجرا (بدون نیاز به محیط توسعه).

## وضعیت این محیط
در کانتینر فعلی Java/Android SDK نصب نبود و `apt-get update` برای نصب JDK به‌طور کامل تمام نشد (شبکه کند/زمان‌بر).
بنابراین APK در همین محیط ساخته نشد؛ با دستورات بالا روی هر سیستم دارای JDK و SDK در چند دقیقه ساخته می‌شود.

## وضعیت تلاش در این محیط (2026-09-22)
- جاوا ۱۷ نصب شد (`java -version` سالم).
- پروژه اندروید ساخته شد: `android/` (۱٫۳ مگ، `gradlew` موجود).
- گریدل در حال دانلود است (`~/.gradle` ‏۱۱۷ مگ و در حال رشد؛ `gradle-8.14.3-all.zip` حوالی ۵۰٪).
- Android SDK هنوز نصب نشده؛ ادامه مسیر روی ماشین با SDK:
```bash
export ANDROID_HOME=/opt/android-sdk
# نصب cmdline-tools، بعد:
sdkmanager "platform-tools" "platforms;android-34" "build-tools;34.0.0"
cd android && ./gradlew assembleDebug
```
- نکته معماری: این کانتینر `aarch64` است؛ ابزارهای بیلد اندروید (aapt2 و…) نسخه لینوکس `x86_64` دارند و بدون شبیه‌ساز روی arm اجرا نمی‌شوند؛ ساخت نهایی APK را روی سیستم x86_64 (یا با qemu-user) انجام دهید.
