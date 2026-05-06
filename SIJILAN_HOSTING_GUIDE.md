# سِجلان - دليل الرفع والاستضافة

هذه النسخة مجهزة باسم جديد: `سِجلان`.

## الحزم التي سيتم تجهيزها

### 1. `SIJILAN_STATIC_UPLOAD`
مناسبة لـ:
- Netlify
- Vercel
- cPanel static hosting
- أي استضافة ترفع ملفات HTML/CSS/JS فقط

الخصائص:
- تعمل مباشرة من مجلد `dist`
- تحفظ البيانات محليًا داخل المتصفح
- تدعم PWA والتثبيت على الجهاز
- روابط واتساب تعمل بوضع الفتح المباشر كحل بديل

ملاحظة:
هذه الحزمة لا تشغّل `server.mjs`، لذلك مزايا API والمزامنة المباشرة تعتمد على وجود خادم منفصل إن رغبت بها.

### 2. `SIJILAN_FULL_NODE_HOST`
مناسبة لـ:
- VPS
- Railway
- Render
- أي استضافة تدعم Node.js

الخصائص:
- تشغل الواجهة + `server.mjs`
- تدعم API الداخلي
- تدعم طابور الإيصالات والمزامنة المباشرة
- تسمح بتكامل واتساب المباشر عند ضبط متغيرات البيئة

ملاحظة مهمة:
إذا كنت تريد نسخة "حقيقية" تحتفظ بطابور الرسائل والإيصالات بعد إعادة التشغيل، فاستخدم استضافة Node مع تخزين دائم. تم تجهيز ملف [render.yaml](/E:/money%20abdalalm/render.yaml:1) لرفع المشروع على Render مع قرص دائم و`health check`.

## متغيرات البيئة للحزمة الكاملة

انسخ الملف `.env.whatsapp.example` إلى `.env` أو `.env.whatsapp.local` ثم عبئ القيم:

- `VITE_WHATSAPP_API_BASE`
- `VITE_WHATSAPP_ADMIN_NUMBER`
- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_BUSINESS_ACCOUNT_ID`
- `WHATSAPP_ADMIN_NUMBER`
- `WHATSAPP_DIRECT_PORT`
- `PORT`

إذا كانت الواجهة والخادم على نفس الدومين اترك `VITE_WHATSAPP_API_BASE` فارغًا.

في Render غالبًا لا تحتاج تعيين `PORT` يدويًا داخل لوحة التحكم، لكن الخادم الآن يدعمه تلقائيًا.

## أوامر التشغيل

### بناء الواجهة
```bash
npm run build
```

### تشغيل الخادم الكامل
```bash
npm start
```

### فحص صحة الخادم
```bash
curl http://localhost:8787/api/health
```

## ملاحظات سريعة

- ملفات التوجيه للاستضافة الثابتة موجودة أصلًا داخل `public` مثل `_redirects` و `.htaccess` و `web.config`.
- عند تغيير الدومين أو ربط واتساب، يكفي تعديل متغيرات البيئة ثم إعادة البناء.
- إذا رفعت النسخة الكاملة على Render فاختر `Web Service` وليس `Static Site`.
- إذا استخدمت Render، اربط القرص الدائم على المسار `/opt/render/project/src/data` حتى لا تضيع الرسائل والطابور بعد إعادة التشغيل.
- الاسم الحالي المعتمد للنشر هو `سِجلان` وبالإنجليزية `Sijilan`.
