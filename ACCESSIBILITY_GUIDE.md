# دليل إمكانية الوصول - iShop V13.9.0

## 1. معايير WCAG 2.1

المشروع يتبع معايير WCAG 2.1 Level AA:

- **Perceivable**: يمكن إدراك المحتوى
- **Operable**: يمكن التفاعل مع المحتوى
- **Understandable**: يمكن فهم المحتوى
- **Robust**: يعمل مع تقنيات مساعدة

## 2. الألوان والتباين

### 2.1 نسبة التباين

```
✓ جيد: نسبة تباين 4.5:1 أو أعلى للنصوص العادية
✓ جيد: نسبة تباين 3:1 أو أعلى للنصوص الكبيرة
✗ سيء: نسبة تباين أقل من 3:1
```

### 2.2 عدم الاعتماد على الألوان وحدها

```jsx
// ✗ سيء: الاعتماد على اللون فقط
<button style={{ backgroundColor: 'red' }}>حذف</button>

// ✓ جيد: استخدام لون وأيقونة
<button className="bg-red-600">
  <TrashIcon /> حذف
</button>
```

### 2.3 دعم الوضع الليلي

```css
/* ✓ جيد: دعم الوضع الليلي */
@media (prefers-color-scheme: dark) {
  body {
    background-color: #1a1a1a;
    color: #ffffff;
  }
}
```

## 3. النصوص البديلة (Alt Text)

### 3.1 الصور

```jsx
// ✗ سيء: بدون نص بديل
<img src="device.jpg" />

// ✓ جيد: نص بديل وصفي
<img 
  src="device.jpg" 
  alt="جهاز iPhone 13 Pro باللون الأسود"
/>

// ✓ جيد: صورة زخرفية
<img 
  src="decoration.svg" 
  alt=""
  aria-hidden="true"
/>
```

### 3.2 الأيقونات

```jsx
// ✗ سيء: أيقونة بدون تسمية
<button><TrashIcon /></button>

// ✓ جيد: أيقونة مع aria-label
<button aria-label="حذف">
  <TrashIcon />
</button>

// ✓ جيد: أيقونة مع نص
<button>
  <TrashIcon /> حذف
</button>
```

## 4. لوحة المفاتيح

### 4.1 التنقل بلوحة المفاتيح

```jsx
// ✓ جيد: جميع العناصر التفاعلية قابلة للوصول بلوحة المفاتيح
<button onClick={handleClick}>اضغط هنا</button>

// ✗ سيء: عنصر غير تفاعلي يبدو قابلاً للنقر
<div onClick={handleClick}>اضغط هنا</div>

// ✓ جيد: إذا كان يجب استخدام div
<div 
  role="button"
  onClick={handleClick}
  onKeyDown={(e) => e.key === 'Enter' && handleClick()}
  tabIndex={0}
>
  اضغط هنا
</div>
```

### 4.2 ترتيب التركيز (Tab Order)

```jsx
// ✓ جيد: ترتيب تركيز منطقي
<form>
  <input placeholder="الاسم" />
  <input placeholder="البريد الإلكتروني" />
  <button>إرسال</button>
</form>

// ✗ سيء: ترتيب تركيز غير منطقي
<button tabIndex={10}>الزر الأول</button>
<input tabIndex={1} placeholder="الإدخال" />
```

### 4.3 Skip Links

```jsx
// ✓ جيد: رابط للتخطي إلى المحتوى الرئيسي
<a href="#main-content" className="sr-only">
  تخطي إلى المحتوى الرئيسي
</a>

<nav>...</nav>

<main id="main-content">
  {/* المحتوى الرئيسي */}
</main>
```

## 5. سمات ARIA

### 5.1 الأدوار (Roles)

```jsx
// ✓ جيد: استخدام الأدوار المناسبة
<div role="alert">تنبيه مهم</div>
<div role="status">الحالة الحالية</div>
<div role="navigation">القائمة الرئيسية</div>

// ✗ سيء: استخدام أدوار غير مناسبة
<div role="button">هذا ليس زر</div>
```

### 5.2 الخصائص (Properties)

```jsx
// ✓ جيد: استخدام خصائص ARIA
<button aria-label="إغلاق">×</button>
<div aria-live="polite">رسالة ديناميكية</div>
<input aria-required="true" />
<div aria-expanded={isOpen}>القائمة</div>

// ✗ سيء: خصائص غير واضحة
<button>×</button>
```

### 5.3 العلاقات (Relationships)

```jsx
// ✓ جيد: ربط التسميات بالإدخالات
<label htmlFor="email">البريد الإلكتروني</label>
<input id="email" type="email" />

// ✓ جيد: استخدام aria-labelledby
<h2 id="dialog-title">تأكيد الحذف</h2>
<div role="dialog" aria-labelledby="dialog-title">
  هل أنت متأكد؟
</div>
```

## 6. الحركة والرسوم المتحركة

### 6.1 احترام تفضيلات الحركة

```css
/* ✓ جيد: احترام prefers-reduced-motion */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

### 6.2 تجنب الومضات

```jsx
// ✗ سيء: رسوم متحركة سريعة جدًا
<div style={{ animation: 'flash 0.1s' }} />

// ✓ جيد: رسوم متحركة بسرعة معقولة
<div style={{ animation: 'fade 0.3s' }} />
```

## 7. الهيكل والدلالات

### 7.1 الهيكل الصحيح

```jsx
// ✓ جيد: هيكل دلالي صحيح
<header>
  <nav>...</nav>
</header>
<main>
  <article>
    <h1>العنوان الرئيسي</h1>
    <section>
      <h2>قسم فرعي</h2>
    </section>
  </article>
</main>
<footer>...</footer>

// ✗ سيء: هيكل بدون دلالات
<div>
  <div>
    <div>العنوان الرئيسي</div>
    <div>
      <div>قسم فرعي</div>
    </div>
  </div>
</div>
```

### 7.2 العناوين

```jsx
// ✓ جيد: عناوين بترتيب منطقي
<h1>الصفحة الرئيسية</h1>
<h2>القسم الأول</h2>
<h3>تفصيل إضافي</h3>

// ✗ سيء: عناوين بترتيب غير منطقي
<h1>الصفحة الرئيسية</h1>
<h3>القسم الأول</h3>
<h2>تفصيل إضافي</h2>
```

## 8. النماذج

### 8.1 تسميات النماذج

```jsx
// ✓ جيد: تسميات واضحة
<label htmlFor="name">الاسم</label>
<input id="name" type="text" />

// ✗ سيء: بدون تسميات
<input type="text" placeholder="الاسم" />
```

### 8.2 رسائل الخطأ

```jsx
// ✓ جيد: رسائل خطأ واضحة
<input 
  aria-invalid={hasError}
  aria-describedby="error-message"
/>
<div id="error-message" role="alert">
  البريد الإلكتروني غير صحيح
</div>

// ✗ سيء: رسائل خطأ غير واضحة
<input />
<span style={{ color: 'red' }}>خطأ</span>
```

## 9. الجداول

### 9.1 جداول دلالية

```jsx
// ✓ جيد: جدول دلالي
<table>
  <thead>
    <tr>
      <th>الاسم</th>
      <th>السعر</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>جهاز</td>
      <td>100 ريال</td>
    </tr>
  </tbody>
</table>

// ✗ سيء: جدول بدون دلالات
<div>
  <div>الاسم | السعر</div>
  <div>جهاز | 100 ريال</div>
</div>
```

## 10. قائمة التحقق من الوصول

- [ ] نسبة تباين كافية (4.5:1)
- [ ] نصوص بديلة لجميع الصور
- [ ] التنقل الكامل بلوحة المفاتيح
- [ ] سمات ARIA مناسبة
- [ ] هيكل دلالي صحيح
- [ ] عناوين بترتيب منطقي
- [ ] تسميات نماذج واضحة
- [ ] رسائل خطأ مفيدة
- [ ] احترام تفضيلات الحركة
- [ ] اختبار مع قارئات الشاشة

## 11. أدوات الاختبار

- [axe DevTools](https://www.deque.com/axe/devtools/)
- [WAVE](https://wave.webaim.org/)
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)
- [NVDA Screen Reader](https://www.nvaccess.org/)
- [JAWS Screen Reader](https://www.freedomscientific.com/products/software/jaws/)

## 12. المراجع

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [WebAIM](https://webaim.org/)
- [A11y Project](https://www.a11yproject.com/)

---

**آخر تحديث**: أغسطس 2026
**الإصدار**: V13.9.0
