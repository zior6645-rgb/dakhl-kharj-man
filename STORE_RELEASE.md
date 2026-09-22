# Cashio — راهنمای انتشار تجاری

## وضعیت فنی
نسخه 1.7.0 با Android target API 36، APK امضاشده Release و AAB امضاشده Release ساخته می‌شود.

## مدل انتشار
Cashio برای تجربه ساده و خصوصی بدون تبلیغات و بدون نیاز به حساب کاربری طراحی شده است. در صورت فروش برنامه، انتشار Paid App در Google Play یکی از مدل‌های ممکن است.

## موارد لازم در Play Console
1. نام برنامه: Cashio
2. Application ID: `com.dakhlkharj.man`
3. فایل انتشار: AAB نسخه Release
4. قیمت و کشورهای عرضه
5. Privacy Policy با محتوای `PRIVACY.md`
6. Content Rating
7. Data Safety بر اساس رفتار واقعی برنامه
8. Store listing شامل آیکون، اسکرین‌شات‌ها و توضیحات
9. تست داخلی و سپس Production

## نکات مهم
- APK برای نصب و تست مستقیم مناسب است؛ برای Google Play از AAB استفاده شود.
- هیچ کلید امضای Release نباید داخل Git قرار گیرد.
- هر نسخه جدید باید versionCode بالاتری داشته باشد.
