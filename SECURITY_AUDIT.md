# دليل تدقيق الأمان - APP TECH V13.9.0

## 1. سياسات Row Level Security (RLS)

### 1.1 التحقق من سياسات RLS

```sql
-- عرض جميع السياسات على جدول معين
SELECT * FROM pg_policies WHERE tablename = 'devices';

-- التحقق من أن RLS مفعل
SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'devices';
```

### 1.2 أمثلة على سياسات آمنة

```sql
-- ✓ جيد: السماح للمستخدم برؤية بيانته فقط
CREATE POLICY "Users can view their own devices"
ON devices
FOR SELECT
USING (auth.uid() = user_id);

-- ✓ جيد: السماح بالتعديل على البيانات الخاصة فقط
CREATE POLICY "Users can update their own devices"
ON devices
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ✗ سيء: السماح بالوصول الكامل
CREATE POLICY "Allow all"
ON devices
FOR ALL
USING (true);
```

## 2. أمان المصادقة

### 2.1 إدارة الجلسات

```javascript
// ✓ جيد: التحقق من صلاحية الجلسة
const { data: { session } } = await supabase.auth.getSession();

if (!session) {
  // إعادة التوجيه إلى صفحة تسجيل الدخول
  navigate('/login');
}
```

### 2.2 تخزين الرموز (Tokens)

```javascript
// ✓ جيد: تخزين آمن للرموز
// Supabase يتعامل مع التخزين الآمن تلقائيًا
// استخدم persistSession: true في الإعدادات

// ✗ سيء: تخزين الرموز في localStorage يدويًا
localStorage.setItem('token', token); // خطر!
```

### 2.3 انتهاء الصلاحية التلقائي

```javascript
// تفعيل التحديث التلقائي للرموز
const supabase = createClient(URL, KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
```

## 3. أمان نقاط النهاية (API Endpoints)

### 3.1 التحقق من الصلاحيات

```javascript
// ✓ جيد: التحقق من الصلاحيات قبل كل عملية
export async function updateDevice(id, fields) {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) throw new Error('Unauthorized');
  
  // التحقق من الصلاحيات
  const { data: userRow } = await supabase
    .from('ishop_users')
    .select('can_edit')
    .eq('auth_id', user.id)
    .single();
  
  if (!userRow?.can_edit) throw new Error('Permission denied');
  
  return supabase
    .from('devices')
    .update(fields)
    .eq('id', id);
}
```

### 3.2 التحقق من الإدخال

```javascript
// ✓ جيد: التحقق من صحة البيانات
import { z } from 'zod';

const deviceSchema = z.object({
  model: z.string().min(1).max(100),
  brand: z.string().min(1).max(50),
  price: z.number().positive(),
});

export async function addDevice(data) {
  const validated = deviceSchema.parse(data);
  // ... المتابعة
}
```

### 3.3 منع SQL Injection

```javascript
// ✓ جيد: استخدام Parameterized Queries
const { data } = await supabase
  .from('devices')
  .select('*')
  .eq('brand', userInput); // معامل آمن

// ✗ سيء: بناء الاستعلام بشكل ديناميكي
const query = `SELECT * FROM devices WHERE brand = '${userInput}'`; // خطر!
```

## 4. أمان البيانات الحساسة

### 4.1 متغيرات البيئة

```env
# ✓ جيد: استخدام متغيرات البيئة
VITE_SUPABASE_URL=https://...
VITE_SUPABASE_ANON_KEY=...

# ✗ سيء: تخزين المفاتيح في الكود
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; // خطر!
```

### 4.2 عدم تسرب البيانات الحساسة

```javascript
// ✓ جيد: عدم إرسال بيانات حساسة للعميل
export async function getUserData(userId) {
  const { data } = await supabase
    .from('users')
    .select('id, name, email') // بدون كلمات المرور
    .eq('id', userId)
    .single();
  
  return data;
}

// ✗ سيء: إرسال جميع البيانات
export async function getUserData(userId) {
  const { data } = await supabase
    .from('users')
    .select('*') // يتضمن كلمات المرور!
    .eq('id', userId)
    .single();
  
  return data;
}
```

## 5. أمان الجلسة

### 5.1 منع CSRF

```javascript
// ✓ جيد: استخدام CSRF tokens
// Supabase يتعامل مع CSRF تلقائيًا
```

### 5.2 منع XSS

```javascript
// ✓ جيد: استخدام React (يهرب من HTML تلقائيًا)
<div>{userInput}</div>

// ✗ سيء: استخدام dangerouslySetInnerHTML
<div dangerouslySetInnerHTML={{ __html: userInput }} /> // خطر!
```

### 5.3 منع Clickjacking

```html
<!-- ✓ جيد: إضافة X-Frame-Options -->
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta http-equiv="X-Frame-Options" content="DENY">
```

## 6. تحديث المكتبات

### 6.1 فحص الثغرات الأمنية

```bash
# فحص الثغرات
npm audit

# إصلاح الثغرات
npm audit fix

# فحص صارم
npm audit --audit-level=moderate
```

### 6.2 تحديث المكتبات

```bash
# التحقق من التحديثات المتاحة
npm outdated

# تحديث المكتبات
npm update
```

## 7. قائمة التحقق من الأمان

- [ ] تفعيل RLS على جميع الجداول
- [ ] التحقق من سياسات RLS
- [ ] استخدام متغيرات البيئة للبيانات الحساسة
- [ ] التحقق من صلاحيات المستخدم
- [ ] التحقق من صحة الإدخال
- [ ] منع SQL Injection
- [ ] منع XSS
- [ ] منع CSRF
- [ ] تحديث المكتبات بانتظام
- [ ] فحص الثغرات الأمنية
- [ ] استخدام HTTPS
- [ ] تفعيل HSTS
- [ ] إضافة CSP headers
- [ ] مراقبة السجلات الأمنية

## 8. الأدوات الأمنية

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [npm audit](https://docs.npmjs.com/cli/v8/commands/npm-audit)
- [Snyk](https://snyk.io/)
- [GitHub Security Alerts](https://docs.github.com/en/code-security)
- [Trivy](https://github.com/aquasecurity/trivy)

## 9. الإبلاغ عن الثغرات الأمنية

إذا اكتشفت ثغرة أمنية:

1. **لا تنشرها علنًا**
2. أرسل بريدًا إلى security@example.com
3. قدم وصفًا مفصلاً للثغرة
4. انتظر الرد من الفريق

## 10. المراجع الأمنية

- [Supabase Security](https://supabase.com/docs/guides/security)
- [OWASP Security](https://owasp.org/)
- [Node.js Security](https://nodejs.org/en/docs/guides/security/)
- [React Security](https://react.dev/learn/security)

---

**آخر تحديث**: أغسطس 2026
**الإصدار**: V13.9.0
