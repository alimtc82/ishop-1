# التوثيق التقني لمشروع iShop V13.9.0

## 1. نظرة عامة على البنية المعمارية

### 1.1 المكونات الرئيسية

#### الواجهة الأمامية (Frontend)
- **React 19**: مكتبة بناء واجهات المستخدم
- **Vite**: أداة بناء سريعة وحديثة
- **TailwindCSS**: إطار عمل تصميم الواجهات
- **React Router**: إدارة التوجيه والملاحة

#### الواجهة الخلفية (Backend)
- **Supabase**: منصة قاعدة بيانات مفتوحة المصدر
- **PostgreSQL**: قاعدة بيانات علائقية قوية
- **RLS (Row Level Security)**: حماية على مستوى الصفوف

#### إدارة الحالة
- **React Context API**: إدارة الحالة العامة
- **localStorage**: التخزين المحلي للبيانات

### 1.2 هيكل المشروع

```
src/
├── components/        # مكونات قابلة لإعادة الاستخدام
├── context/          # إدارة الحالة
├── hooks/            # خطافات React مخصصة
├── lib/              # مكتبات ووحدات مساعدة
│   ├── api.js        # طبقة التفاعل مع Supabase
│   ├── errorHandler.js  # معالجة الأخطاء
│   └── supabase.js   # تهيئة عميل Supabase
├── pages/            # مكونات الصفحات
├── utils/            # وظائف مساعدة عامة
└── styles/           # ملفات الأنماط
```

## 2. معالجة الأخطاء

### 2.1 نظام معالجة الأخطاء الموحد

يوفر المشروع نظام معالجة أخطاء مركزي عبر `errorHandler.js`:

```javascript
import { handleError, apiCall } from '@/lib/errorHandler';

// استخدام معالج الأخطاء
try {
  const data = await apiCall(async (signal) => {
    return await fetchData({ signal });
  }, { timeout: 30000, retries: 1 });
} catch (error) {
  const handled = handleError(error);
  console.error(handled.message);
}
```

### 2.2 أنواع الأخطاء المدعومة

- **NETWORK_ERROR**: أخطاء الاتصال بالشبكة
- **AUTH_ERROR**: أخطاء المصادقة
- **PERMISSION_ERROR**: أخطاء الصلاحيات
- **NOT_FOUND**: المورد غير موجود
- **VALIDATION_ERROR**: خطأ في التحقق من البيانات
- **SERVER_ERROR**: أخطاء الخادم
- **TIMEOUT_ERROR**: انتهاء مهلة الطلب

## 3. الاختبارات

### 3.1 إطار عمل الاختبارات

المشروع يستخدم:
- **Jest**: إطار عمل الاختبارات
- **React Testing Library**: اختبار المكونات
- **Cypress/Playwright**: اختبارات النهاية إلى النهاية

### 3.2 تشغيل الاختبارات

```bash
# اختبارات الوحدة
npm test

# اختبارات مع تغطية
npm test -- --coverage

# اختبارات النهاية إلى النهاية
npm run test:e2e
```

### 3.3 مثال على اختبار

```javascript
describe('errorHandler', () => {
  it('should handle network errors', () => {
    const error = new Error('Failed to fetch');
    const result = handleError(error);
    expect(result.code).toBe('NETWORK_ERROR');
  });
});
```

## 4. جودة الكود

### 4.1 أدوات Linting

- **ESLint**: التحقق من جودة الكود
- **Prettier**: تنسيق الكود التلقائي

### 4.2 تشغيل Linting

```bash
# فحص الكود
npm run lint

# إصلاح الأخطاء تلقائيًا
npm run lint:fix

# تنسيق الكود
npm run format
```

### 4.3 قواعد ESLint الرئيسية

- استخدام `const` و `let` بدلاً من `var`
- عدم ترك متغيرات غير مستخدمة
- استخدام `===` بدلاً من `==`
- إضافة فواصل منقوطة في نهاية الأسطر

## 5. الأمان

### 5.1 سياسات RLS

جميع جداول Supabase محمية بسياسات RLS:

```sql
-- مثال على سياسة RLS
CREATE POLICY "Users can view their own data"
ON devices
FOR SELECT
USING (auth.uid() = user_id);
```

### 5.2 متغيرات البيئة

جميع الإعدادات الحساسة مخزنة في ملف `.env`:

```env
VITE_SUPABASE_URL=https://...
VITE_SUPABASE_ANON_KEY=...
VITE_PROD_ORIGIN=https://...
```

### 5.3 التحقق من الصلاحيات

```javascript
import { usePermissions } from '@/context/PermissionContext';

function AdminPanel() {
  const { can } = usePermissions();
  
  if (!can('can_settings')) {
    return <div>ليس لديك صلاحية</div>;
  }
  
  return <div>محتوى إداري</div>;
}
```

## 6. الأداء

### 6.1 تحسينات الأداء

- **التحميل الكسول (Lazy Loading)**: تحميل المكونات عند الحاجة
- **ضغط الصور**: تقليل حجم الصور قبل الرفع
- **التخزين المؤقت**: استخدام localStorage للبيانات المتكررة

### 6.2 تحليل الأداء

```bash
# بناء الإصدار الإنتاجي
npm run build

# معاينة الإصدار
npm run preview

# تحليل حجم الحزمة
npm run build -- --analyze
```

## 7. الوصول (Accessibility)

### 7.1 معايير WCAG

المشروع يتبع معايير WCAG 2.1:

- استخدام سمات ARIA المناسبة
- توفير نصوص بديلة للصور
- دعم لوحة المفاتيح الكاملة
- تباين ألوان كافي

### 7.2 مثال على الوصول

```jsx
<button 
  aria-label="إغلاق القائمة"
  aria-expanded={isOpen}
  onClick={toggleMenu}
>
  القائمة
</button>
```

## 8. قابلية التوسع

### 8.1 إضافة ميزات جديدة

عند إضافة ميزة جديدة:

1. أنشئ مجلد جديد تحت `src/components/`
2. أضف اختبارات في `__tests__/`
3. وثّق الميزة في هذا الملف
4. أضف تعليقات برمجية مفصلة

### 8.2 تحسين الاستعلامات

```javascript
// ✓ جيد: استعلام محدد
const { data } = await supabase
  .from('devices')
  .select('id, model, brand')
  .eq('archived', false)
  .limit(100);

// ✗ سيء: استعلام عام بدون تحديد
const { data } = await supabase
  .from('devices')
  .select('*');
```

## 9. CI/CD

### 9.1 خط أنابيب GitHub Actions

يتم تشغيل الاختبارات والفحوصات تلقائيًا عند كل push:

- فحص الكود (ESLint)
- تشغيل الاختبارات
- بناء المشروع
- النشر التلقائي

### 9.2 ملف GitHub Actions

انظر `.github/workflows/ci-cd.yml` للتفاصيل الكاملة.

## 10. الإصدارات والتحديثات

### 10.1 نظام الإصدارات

- **MAJOR**: تغييرات كبيرة (V14.0.0)
- **MINOR**: ميزات جديدة (V13.9.0)
- **PATCH**: إصلاحات الأخطاء (V13.8.1)

### 10.2 سجل التغييرات

انظر `CHANGELOG.md` لقائمة كاملة بجميع التحديثات.

## 11. الموارد والمراجع

- [Supabase Documentation](https://supabase.com/docs)
- [React Documentation](https://react.dev)
- [Vite Documentation](https://vitejs.dev)
- [TailwindCSS Documentation](https://tailwindcss.com/docs)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [WCAG Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

## 12. الدعم والمساهمة

للإبلاغ عن الأخطاء أو المساهمة في المشروع، يرجى:

1. فتح Issue على GitHub
2. توفير وصف مفصل للمشكلة
3. إرسال Pull Request مع الحل المقترح
4. اتباع معايير الكود المحددة

---

**آخر تحديث**: أغسطس 2026
**الإصدار**: V13.9.0
