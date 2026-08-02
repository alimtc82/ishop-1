# دليل التعليقات البرمجية - iShop V13.9.0

## 1. معايير التعليقات

### 1.1 التعليقات على المستوى العام

```javascript
/**
 * وصف الملف والغرض منه
 * 
 * الاستخدام:
 * ```javascript
 * import { function } from '@/lib/module';
 * ```
 * 
 * ملاحظات:
 * - نقطة مهمة 1
 * - نقطة مهمة 2
 */
```

### 1.2 التعليقات على الدوال

```javascript
/**
 * وصف الدالة بوضوح
 * 
 * @param {type} paramName - وصف المعامل
 * @returns {type} وصف القيمة المرجعة
 * @throws {ErrorType} وصف الخطأ المحتمل
 * 
 * @example
 * const result = myFunction('input');
 * console.log(result); // output
 */
function myFunction(paramName) {
  // ...
}
```

### 1.3 التعليقات على الأسطر

```javascript
// استخدم تعليقات قصيرة لشرح الكود المعقد
const result = complexCalculation(); // حساب النتيجة النهائية

// تجنب التعليقات الواضحة
const count = 0; // ✗ واضح بالفعل

// استخدم التعليقات لشرح "لماذا" وليس "ماذا"
if (user.age < 18) {
  // نحتاج إلى التحقق من العمر للامتثال للقوانين المحلية
  return false;
}
```

## 2. تعليقات معالجة الأخطاء

```javascript
/**
 * جلب قائمة الأجهزة مع معالجة الأخطاء
 * 
 * @returns {Promise<Array>} قائمة الأجهزة
 * @throws {AppError} إذا فشل الاتصال بقاعدة البيانات
 */
export async function fetchDevices() {
  try {
    const { data, error } = await supabase
      .from('devices')
      .select('*');
    
    if (error) {
      throw new AppError(error.message, 'FETCH_ERROR', 500);
    }
    
    return data;
  } catch (error) {
    const handled = handleError(error);
    console.error('Failed to fetch devices:', handled);
    throw handled;
  }
}
```

## 3. تعليقات الأمان

```javascript
/**
 * ⚠️ تحذير أمني: هذه الدالة تتعامل مع بيانات حساسة
 * - لا تسجل كلمات المرور أبدًا
 * - تحقق دائمًا من صلاحيات المستخدم
 * - استخدم متغيرات البيئة للمفاتيح السرية
 */
export async function authenticateUser(username, password) {
  // ...
}
```

## 4. تعليقات الأداء

```javascript
/**
 * ملاحظة الأداء: هذه الدالة قد تكون بطيئة مع مجموعات بيانات كبيرة
 * استخدم pagination أو caching إذا لزم الأمر
 */
export async function fetchAllDevices() {
  // استخدم limit و offset للترقيم
  const { data } = await supabase
    .from('devices')
    .select('*')
    .limit(100);
  
  return data;
}
```

## 5. تعليقات الإصلاحات المؤقتة

```javascript
// TODO: إزالة هذا الحل المؤقت في V14.0.0
// السبب: هذا حل مؤقت لمشكلة في Supabase
if (data.length === 0) {
  return []; // حل مؤقت
}

// FIXME: هذا الكود قد يسبب مشاكل في الأداء
// يجب إعادة كتابته باستخدام algorithm أفضل
const result = inefficientAlgorithm(data);

// HACK: حل مؤقت لمشكلة في المتصفح
// يجب إزالته عندما يتم إصلاح المشكلة
if (isIE11) {
  applyWorkaround();
}
```

## 6. تعليقات الوثائق

```javascript
/**
 * نموذج بيانات الجهاز
 * 
 * @typedef {Object} Device
 * @property {number} id - معرف فريد للجهاز
 * @property {string} model - موديل الجهاز
 * @property {string} brand - العلامة التجارية
 * @property {number} price - السعر بالريال
 * @property {string} status - حالة الجهاز (active, archived)
 * @property {Date} createdAt - تاريخ الإنشاء
 */

/**
 * إضافة جهاز جديد
 * 
 * @param {Device} device - بيانات الجهاز
 * @returns {Promise<Device>} الجهاز المضاف مع المعرف
 * 
 * @example
 * const newDevice = await addDevice({
 *   model: 'iPhone 13',
 *   brand: 'Apple',
 *   price: 3500
 * });
 */
export async function addDevice(device) {
  // ...
}
```

## 7. تعليقات الحالات الخاصة

```javascript
/**
 * حالة خاصة: يجب التعامل مع الأجهزة المحذوفة بشكل مختلف
 * - الأجهزة المحذوفة لا تظهر في القوائم العادية
 * - يمكن استرجاعها من سلة المحذوفات لمدة 30 يوم
 */
export function filterActiveDevices(devices) {
  return devices.filter(d => d.status !== 'deleted');
}
```

## 8. تعليقات التوافقية

```javascript
/**
 * توافقية: هذا الكود يدعم الإصدارات القديمة من Supabase
 * في الإصدار الأحدث، يمكن استخدام:
 * const { data } = await supabase.from('devices').select('*');
 */
export async function fetchDevicesLegacy() {
  // كود قديم للتوافقية مع الإصدارات السابقة
}
```

## 9. قائمة التحقق من التعليقات

- [ ] جميع الدوال لها JSDoc comments
- [ ] جميع المعاملات موثقة
- [ ] جميع القيم المرجعة موثقة
- [ ] الأخطاء المحتملة موثقة
- [ ] أمثلة الاستخدام موفرة
- [ ] التحذيرات الأمنية واضحة
- [ ] الحلول المؤقتة موثقة
- [ ] ملاحظات الأداء موجودة
- [ ] الحالات الخاصة موثقة
- [ ] لا توجد تعليقات واضحة غير ضرورية

## 10. أدوات التعليقات

- [JSDoc](https://jsdoc.app/)
- [TypeScript JSDoc](https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html)
- [Better Comments](https://marketplace.visualstudio.com/items?itemName=aaron-bond.better-comments)
- [Document This](https://marketplace.visualstudio.com/items?itemName=joelday.docthis)

---

**آخر تحديث**: أغسطس 2026
**الإصدار**: V13.9.0
