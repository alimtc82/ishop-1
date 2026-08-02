import { useState, useRef, useEffect } from 'react';
import { BRAND_MODELS } from '../lib/brands';
import { MODEL_COLORS } from '../lib/modelColors';
import Input from './ui/Input';
import Button from './ui/Button';
import Toggle from './ui/Toggle';
import ModelAutocomplete from './ui/ModelAutocomplete';
import ImeiInput from './ImeiInput';
import { MAX_IMAGES, deviceImageUrl, fetchSetting, fetchCatalog } from '../lib/api';
import { toWhiteBg } from '../lib/whiteBg';
import { usePricing } from '../context/PricingContext';

// خيارات القوايم — منقولة حرفيًا من index.html
const STORAGE = ['64GB', '128GB', '256GB', '512GB', '1T', '2T'];
const SIM = ['شريحة', 'E-SIM'];
const YESNO = ['نعم', 'لا'];
const TAX = ['مسجل', 'غير مسجل'];
const WARRANTY = ['ساري', 'منتهي'];
const LOCK = ['مشفر على شبكة', 'غير مشفر على اي شبكة'];
const BRANDS = Object.keys(BRAND_MODELS);

const sel =
  'w-full rounded-xl border border-border bg-input px-3.5 py-2.5 text-sm text-text ' +
  'outline-none focus:border-accent focus:ring-3 focus:ring-[var(--focus-ring)]';

function Field({ label, children }) {
  return (
    <div className="flex w-full flex-col gap-1.5">
      <label className="text-xs font-bold text-muted">{label}</label>
      {children}
    </div>
  );
}

/**
 * فورم موحّد للإدخال والتعديل.
 * mode='add' | 'edit'. عند التعديل، initial بيملأ القيم.
 * القيم الفاضية بتتحول لـ '-' وقت الحفظ (نفس منطق الأصل).
 */
export default function DeviceForm({ mode, initial, defaultAddedby, onSubmit, onCancel, busy }) {
  const isEdit = mode === 'edit';
  const { activePolicies } = usePricing();

  // أسعار السياسات — مفهرسة بـ policy_id. في التعديل نملأها من الجهاز.
  const [prices, setPrices] = useState(() => {
    const init = {};
    const src = initial?.pricesByPolicy || {};
    for (const p of activePolicies) {
      const v = src[p.id];
      init[p.id] = v == null ? '' : String(v);
    }
    return init;
  });
  const setPrice = (pid) => (e) => setPrices((prev) => ({ ...prev, [pid]: e.target.value }));

  // لو السياسات وصلت بعد فتح الفورم، نملأ الحقول الناقصة بس (من غير مسح إدخال المستخدم)
  useEffect(() => {
    setPrices((prev) => {
      const next = { ...prev };
      const src = initial?.pricesByPolicy || {};
      let changed = false;
      for (const p of activePolicies) {
        if (!(p.id in next)) {
          const v = src[p.id];
          next[p.id] = v == null ? '' : String(v);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [activePolicies, initial]);
  const [brand, setBrand] = useState(initial?.brand ?? '');
  const [model, setModel] = useState(initial?.model ?? '');

  // الكتالوج من الجداول الجديدة (المصدر الأساسي) + fallback للإعدادات/الثابت
  const [catalog, setCatalog] = useState(null);
  const [types, setTypes] = useState(null);
  const [modelsMap, setModelsMap] = useState(null);
  useEffect(() => {
    fetchCatalog().then((c) => { if (c && c.typeNames.length) setCatalog(c); }).catch(() => {});
    fetchSetting('device_types').then((v) => Array.isArray(v) && setTypes(v)).catch(() => {});
    fetchSetting('device_models').then((v) => {
      if (Array.isArray(v)) setModelsMap(Object.fromEntries(v.map((m) => [m.name, m.colors || []])));
    }).catch(() => {});
  }, []);
  const [f, setF] = useState({
    storage: initial?.storage ?? '',
    battery: initial ? String(initial.battery ?? '').replace('%', '') : '',
    cycles: initial?.cycles ?? '',
    color: initial?.color && initial.color !== '-' ? initial.color : '',
    sim: initial?.sim && initial.sim !== '-' ? initial.sim : '',
    box: initial?.box && initial.box !== '-' ? initial.box : '',
    repair: initial?.repair && initial.repair !== '-' ? initial.repair : '',
    tax: initial?.tax && initial.tax !== '-' ? initial.tax : '',
    warranty: initial?.warranty && initial.warranty !== '-' ? initial.warranty : '',
    warrantyDate: initial?.warrantyDateRaw ?? '',
    lock: initial?.lock && initial.lock !== '-' ? initial.lock : '',
    defects: initial?.defects && initial.defects !== '-' ? initial.defects : '',
    extras: initial?.extras && initial.extras !== '-' ? initial.extras : '',
    addedby: initial?.addedby ?? defaultAddedby ?? '',
    phone: initial?.phone && initial.phone !== '-' ? initial.phone : '',
    imei: initial?.imei && initial.imei !== '-' ? initial.imei : '',
  });
  const [images, setImages] = useState([]); // {id, file, original, status:'raw'|'processing'|'done'|'failed'}
  // الصور الحالية المرفوعة (تعديل بس) — نقدر نمسح منها
  const [existing, setExisting] = useState(() =>
    isEdit && Array.isArray(initial?.images) ? [...initial.images] : []
  );
  const [whiteBg, setWhiteBg] = useState(false);
  const [bgErr, setBgErr] = useState(false);
  const [err, setErr] = useState('');
  const fileRef = useRef(null);
  const idRef = useRef(0);

  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  const isIphone = brand === 'iPhone';
  const bgProcessing = images.some((x) => x.status === 'processing');

  // الأنواع/الموديلات/الألوان — الكتالوج الجديد أولًا، ثم الإعدادات، ثم الثابت
  const brandsList = catalog ? catalog.typeNames : (types ? types.map((t) => t.name) : BRANDS);
  const typeModels = (catalog
    ? catalog.modelsByType[brand]
    : (types
      ? types.find((t) => t.name === brand)?.models
      : (brand === 'iPhone' ? BRAND_MODELS.iPhone : []))) || [];
  const mColors = catalog ? catalog.colorsByModel : (modelsMap || MODEL_COLORS);
  const colorOptions = (mColors[model] && mColors[model].length) ? mColors[model] : null;
  const [colorCustom, setColorCustom] = useState(
    !!(initial?.color && MODEL_COLORS[initial?.model] && !MODEL_COLORS[initial.model].includes(initial.color))
  );

  function pickImages(e) {
    const files = Array.from(e.target.files || []);
    if (fileRef.current) fileRef.current.value = '';
    setImages((prev) => {
      const room = Math.max(0, MAX_IMAGES - existing.length - prev.length);
      const items = files.slice(0, room).map((f) => ({
        id: ++idRef.current, file: f, original: f, status: 'raw',
      }));
      return [...prev, ...items];
    });
  }

  // إزالة الخلفية: نعالج الصور "raw" واحدة-واحدة لما الزر ON، ونرجّع الأصل لما OFF
  useEffect(() => {
    if (!whiteBg) {
      setImages((p) =>
        p.some((x) => x.status !== 'raw' || x.file !== x.original)
          ? p.map((x) => ({ ...x, file: x.original, status: 'raw' }))
          : p
      );
      return;
    }
    const pending = images.find((x) => x.status === 'raw');
    if (!pending) return;
    let cancelled = false;
    (async () => {
      setImages((p) => p.map((x) => (x.id === pending.id ? { ...x, status: 'processing' } : x)));
      try {
        // مهلة زمنية: لو المعالجة علّقت (تحميل/تشغيل)، تفشل بدل ما تعلّق للأبد
        const white = await Promise.race([
          toWhiteBg(pending.original),
          new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 90000)),
        ]);
        if (!cancelled) {
          setImages((p) => p.map((x) => (x.id === pending.id ? { ...x, file: white, status: 'done' } : x)));
        }
      } catch {
        if (!cancelled) {
          setImages((p) => p.map((x) => (x.id === pending.id ? { ...x, status: 'failed' } : x)));
          setBgErr(true);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [whiteBg, images]);

  function submit() {
    setErr('');
    if (bgProcessing) return setErr('⏳ استنى معالجة الصور تخلص');
    // نفس ترتيب تحقّقات الأصل بالظبط
    if (!brand) return setErr('❗ اختر نوع الموبايل');
    if (!model.trim()) return setErr('❗ اختر أو اكتب الموديل');
    if (!f.storage) return setErr('❗ اختر الذاكرة');
    if (!f.addedby.trim()) return setErr('❗ اكتب اسم المُدخِل');
    if (!f.phone.trim()) return setErr('❗ اكتب رقم التواصل');
    // IMEI اختياري (الأجهزة القديمة مالهاش) — بس لو اتكتب لازم يكون كامل
    if (f.imei && f.imei.length !== 15) return setErr('❗ رقم IMEI لازم 15 رقم');

    // القيم الفاضية → '-' (نفس الأصل)
    const dash = (v) => (v && String(v).trim() ? String(v).trim() : '-');
    const fields = {
      model: model.trim(),
      brand: brand || '-',
      storage: f.storage,
      battery: isIphone ? (f.battery || '0') + '%' : '-',
      cycles: dash(f.cycles),
      color: dash(f.color),
      sim: dash(f.sim),
      box: dash(f.box),
      repair: dash(f.repair),
      tax: dash(f.tax),
      warranty: dash(f.warranty),
      warranty_date: f.warranty === 'ساري' ? dash(f.warrantyDate) : '-',
      lock: dash(f.lock),
      defects: dash(f.defects),
      extras: dash(f.extras),
      addedby: f.addedby.trim(),
      phone: f.phone.trim(),
      // مش dash() — الاتفاق المتبع في imei هو '' مش '-'
      // (useDevices و Archive و archiveDevice كلهم على ده)
      imei: f.imei.trim(),
    };
    const priceEntries = activePolicies.map((p) => ({ policyId: p.id, price: prices[p.id] ?? '' }));
    onSubmit(fields, images.map((x) => x.file), priceEntries, existing);
  }

  return (
    <div className="space-y-4">
      {/* النوع والموديل */}
      <div className="grid grid-cols-2 gap-3">
        <Field label="النوع *">
          <select
            className={sel}
            value={brand}
            onChange={(e) => { setBrand(e.target.value); setModel(''); setF((p) => ({ ...p, color: '' })); setColorCustom(false); }}
          >
            <option value="">-- اختر --</option>
            {brandsList.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </Field>

        <Field label="الموديل *">
          <ModelAutocomplete
            brand={brand}
            value={model}
            extraModels={typeModels}
            onChange={(v) => { setModel(v); setF((p) => ({ ...p, color: '' })); setColorCustom(false); }}
          />
        </Field>
      </div>

      {/* الذاكرة والبطارية — البطارية بس لأجهزة iPhone */}
      <ImeiInput label="IMEI" value={f.imei}
                 onChange={(v) => setF((p) => ({ ...p, imei: v }))} />

      <div className="grid grid-cols-2 gap-3">
        <Field label="الذاكرة *">
          <select className={sel} value={f.storage} onChange={set('storage')}>
            <option value="">-- اختر --</option>
            {STORAGE.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
        {isIphone && (
          <Input label="البطارية %" type="number" min="0" max="100"
                 value={f.battery} onChange={set('battery')} placeholder="مثال: 87" />
        )}
      </div>

      {/* اللون والدورات */}
      <div className="grid grid-cols-2 gap-3">
        {colorOptions ? (
          <Field label="اللون">
            <select className={sel}
                    value={colorCustom ? '__other__' : f.color}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === '__other__') { setColorCustom(true); setF((p) => ({ ...p, color: '' })); }
                      else { setColorCustom(false); setF((p) => ({ ...p, color: v })); }
                    }}>
              <option value="">-- اختر اللون --</option>
              {colorOptions.map((c) => <option key={c} value={c}>{c}</option>)}
              <option value="__other__">لون آخر…</option>
            </select>
            {colorCustom && (
              <input className={`${sel} mt-2`} value={f.color} onChange={set('color')} placeholder="اكتب اللون" />
            )}
          </Field>
        ) : (
          <Input label="اللون" value={f.color} onChange={set('color')} placeholder="أسود، أبيض..." />
        )}
        <Input label="الدورات" type="number" value={f.cycles} onChange={set('cycles')} />
      </div>

      {/* الشريحة والكرتونة */}
      <div className="grid grid-cols-2 gap-3">
        <Field label="الشريحة">
          <select className={sel} value={f.sim} onChange={set('sim')}>
            <option value="">-- اختر --</option>
            {SIM.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="الكرتونة">
          <select className={sel} value={f.box} onChange={set('box')}>
            <option value="">-- اختر --</option>
            {YESNO.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
      </div>

      {/* الصيانة والجمارك */}
      <div className="grid grid-cols-2 gap-3">
        <Field label="صيانة">
          <select className={sel} value={f.repair} onChange={set('repair')}>
            <option value="">-- اختر --</option>
            {YESNO.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="الجمارك">
          <select className={sel} value={f.tax} onChange={set('tax')}>
            <option value="">-- اختر --</option>
            {TAX.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
      </div>

      {/* الضمان وتاريخه */}
      <div className="grid grid-cols-2 gap-3">
        <Field label="الضمان">
          <select className={sel} value={f.warranty} onChange={set('warranty')}>
            <option value="">-- اختر --</option>
            {WARRANTY.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
        {f.warranty === 'ساري' && (
          <Input label="تاريخ الضمان" type="date" value={f.warrantyDate} onChange={set('warrantyDate')} />
        )}
      </div>

      {/* القفل */}
      <Field label="القفل / الشفرة">
        <select className={sel} value={f.lock} onChange={set('lock')}>
          <option value="">-- اختر --</option>
          {LOCK.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </Field>

      {/* العيوب والإضافات */}
      <Input label="العيوب" value={f.defects} onChange={set('defects')} placeholder="اختياري" />
      <Input label="إضافات" value={f.extras} onChange={set('extras')} placeholder="اختياري" />

      {/* المُدخِل والتواصل */}
      <div className="grid grid-cols-2 gap-3">
        <Input label="اسم المُدخِل *" value={f.addedby} onChange={set('addedby')} />
        <Input label="رقم التواصل *" value={f.phone} onChange={set('phone')} inputMode="tel" />
      </div>

      {/* الأسعار — حقول ديناميكية تتولّد من السياسات النشطة */}
      {activePolicies.length > 0 && (
        <div className="rounded-2xl border border-border bg-surface/40 p-3">
          <p className="mb-2 text-xs font-bold text-muted">الأسعار</p>
          <div className="grid grid-cols-2 gap-3">
            {activePolicies.map((p) => (
              <Input
                key={p.id}
                label={p.name}
                type="number"
                inputMode="numeric"
                min="0"
                value={prices[p.id] ?? ''}
                onChange={setPrice(p.id)}
                placeholder="ج.م"
              />
            ))}
          </div>
        </div>
      )}

      {/* الصور */}
      <Field label={`الصور (${existing.length + images.length}/${MAX_IMAGES})`}>
        {/* الصور الحالية المرفوعة — قابلة للمسح (تعديل بس) */}
        {isEdit && existing.length > 0 && (
          <div className="mb-2">
            <p className="mb-1.5 text-[11px] font-bold text-muted">الصور الحالية — دوس ✕ لمسح أي صورة</p>
            <div className="flex flex-wrap gap-2">
              {existing.map((url) => (
                <div key={url} className="relative">
                  <img
                    src={deviceImageUrl(url)}
                    alt=""
                    className="size-16 rounded-lg border border-border object-cover"
                  />
                  <button
                    type="button"
                    aria-label="مسح الصورة"
                    onClick={() => setExisting((p) => p.filter((u) => u !== url))}
                    className="absolute -top-1.5 -end-1.5 grid size-5 place-items-center rounded-full bg-danger text-[10px] text-white"
                  >✕</button>
                </div>
              ))}
            </div>
          </div>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          onChange={pickImages}
          disabled={existing.length + images.length >= MAX_IMAGES}
          className="text-xs text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-accent-soft file:px-3 file:py-2 file:text-xs file:font-bold file:text-accent"
        />

        {/* زر اختياري: إزالة الخلفية → خلفية سوداء */}
        <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface/40 p-3">
          <div className="min-w-0">
            <p className="text-xs font-bold text-text">خلفية بيضاء</p>
            <p className="mt-0.5 text-[11px] text-muted">
              بيشيل الخلفية ويسيب الموبايل والكرتونة بس على خلفية بيضاء. أول مرة بتاخد وقت لتحميل الموديل والمحرّك، وبعدها أسرع (ثواني لكل صورة).
            </p>
          </div>
          <Toggle checked={whiteBg} onChange={setWhiteBg} busy={bgProcessing} label="خلفية بيضاء" />
        </div>

        {bgErr && (
          <p className="mt-2 text-[11px] font-bold text-danger">⚠️ بعض الصور تعذّر إزالة خلفيتها — هتترفع بخلفيتها الأصلية.</p>
        )}

        {images.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {images.map((img) => (
              <div key={img.id} className="relative">
                <img
                  src={URL.createObjectURL(img.file)}
                  alt=""
                  className="size-16 rounded-lg border border-border object-cover"
                />
                {img.status === 'processing' && (
                  <div className="absolute inset-0 grid place-items-center rounded-lg bg-black/60 text-[10px] font-bold text-white">
                    <span className="animate-spin text-base">◌</span>
                  </div>
                )}
                {img.status === 'failed' && (
                  <div className="absolute inset-x-0 bottom-0 bg-danger/80 text-center text-[9px] font-bold text-white">
                    تعذّر
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setImages((p) => p.filter((x) => x.id !== img.id))}
                  className="absolute -top-1.5 -end-1.5 grid size-5 place-items-center rounded-full bg-danger text-[10px] text-white"
                >✕</button>
              </div>
            ))}
          </div>
        )}
        {isEdit && (
          <p className="mt-1 text-[11px] text-muted">
            ⚠️ الصور الجديدة تُضاف للحالية · دوس ✕ لمسح أي صورة · التغيير يتحفظ لما تدوس حفظ
          </p>
        )}
      </Field>

      {err && (
        <p className="rounded-xl bg-danger/10 px-3 py-2 text-center text-xs font-bold text-danger">
          {err}
        </p>
      )}

      <div className="flex gap-2 pt-1">
        <Button className="flex-1" loading={busy} disabled={bgProcessing} onClick={submit}>
          {busy ? 'جاري الحفظ...' : bgProcessing ? 'جاري معالجة الصور...' : isEdit ? 'حفظ التعديلات' : 'إضافة الجهاز'}
        </Button>
        <Button variant="plain" onClick={onCancel} disabled={busy}>إلغاء</Button>
      </div>
    </div>
  );
}
