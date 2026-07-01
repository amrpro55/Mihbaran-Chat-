# ربط محبران شات بـ Firebase

1. افتح Firebase Console وأنشئ مشروعًا.
2. من **Authentication > Sign-in method** فعّل **Email/Password**.
3. من **Firestore Database** أنشئ قاعدة بيانات.
4. من **Project settings > Your apps** أضف تطبيق Web.
5. انسخ `.env.example` باسم `.env.local` وضع قيم `firebaseConfig` في الحقول المقابلة.
6. افتح **Firestore Database > Rules** والصق محتوى `firestore.rules` ثم اضغط **Publish**.
7. شغّل:

```bash
pnpm install
pnpm dev
```

عند اكتمال جميع قيم `.env.local` يتحول تسجيل البريد، الدخول، استعادة كلمة المرور، وتسجيل الخروج إلى Firebase تلقائيًا. دون هذه القيم يبقى الوضع التجريبي المحلي متاحًا.

## ما تم ربطه في المرحلة الأولى

- إنشاء حساب بالبريد وكلمة المرور عبر Firebase Authentication.
- تسجيل الدخول الحقيقي.
- إرسال رابط استعادة كلمة المرور.
- حفظ ملف المستخدم داخل `users/{uid}` في Firestore دون حفظ كلمة المرور.
- تسجيل الخروج من Firebase.

المحادثات والرسائل والمرفقات ما زالت محلية في هذه المرحلة، وستُنقل في المرحلة التالية بعد تزويد المشروع بإعداد Firebase واختبار المصادقة.
