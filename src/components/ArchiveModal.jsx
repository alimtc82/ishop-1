import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../context/PermissionContext';
import { verifyDeletePass, archiveDevice, fetchBranchSellers, fetchArchiveCustomers, ensurePurchaseCustomer } from '../lib/api';
import { useToast } from '../context/ToastContext';
import { printReceipt } from '../lib/receipt';
import Modal from './ui/Modal';
import Button from './ui/Button';
import Input from './ui/Input';
import ImeiInput from './ImeiInput';

/**
 * مودال الأرشفة — خطوتين زي الأصل:
 *   1) كلمة السر (تظهر بس لو reqArchPass && hasDelPass)
 *   2) السبب: بيع (+ بيانات المشتري) أو مرتجع، + IMEI اختياري + طباعة
 */
export default function ArchiveModal({ device, onArchived, onClose }) {
  const { hasDelPass, username } = useAuth();
  const { requires, display } = usePermissions();
  const { show } = useToast();

  const needPass = !!(requires('req_arch_pass') && hasDelPass);
  const [step, setStep] = useState(needPass ? 'pass' : 'reason');

  const [pass, setPass] = useState('');
  const [passErr, setPassErr] = useState('');

  const [reason, setReason] = useState(''); // 'sold' | 'return'
  const [buyerName, setBuyerName] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [customers, setCustomers] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [customerListOpen, setCustomerListOpen] = useState(false);
  const [unknownPhone, setUnknownPhone] = useState(false);
  const [dismissedPhone, setDismissedPhone] = useState('');
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ displayName: '', phone: '' });
  const [customerBusy, setCustomerBusy] = useState(false);
  const [customerErr, setCustomerErr] = useState('');
  const [wantImei, setWantImei] = useState(false);
  const [imei, setImei] = useState('');
  const [wantPrint, setWantPrint] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  // البائع — الافتراضي المستخدم الحالي، أو اختيار من نفس الفرع
  const [sellers, setSellers] = useState([]);
  const [seller, setSeller] = useState(display || '');
  useEffect(() => {
    fetchBranchSellers().then((list) => setSellers(list)).catch(() => setSellers([]));
    fetchArchiveCustomers().then((list) => setCustomers(list)).catch(() => setCustomers([]));
  }, [device]);

  useEffect(() => {
    setStep(needPass ? 'pass' : 'reason');
    setPass(''); setPassErr(''); setReason('');
    setBuyerName(''); setBuyerPhone(''); setSelectedCustomerId(null); setCustomerListOpen(false);
    setUnknownPhone(false); setDismissedPhone(''); setCustomerModalOpen(false);
    setNewCustomer({ displayName: '', phone: '' }); setCustomerErr('');
    // V11.33: لو الجهاز اتسجّل بـ IMEI وقت الإدخال، نجيبه جاهز
    // بدل ما الموظف يعيد مسحه — وبرضه عشان ما يتمسحش بالغلط.
    const saved = device?.imei && device.imei !== '-' ? String(device.imei) : '';
    setWantImei(Boolean(saved)); setImei(saved);
    setWantPrint(false); setErr('');
    setSeller(display || '');
  }, [device, needPass, display]);

  async function checkPass() {
    setPassErr('');
    const ok = await verifyDeletePass(pass);
    if (!ok) {
      setPassErr('❌ كلمة المرور غلط');
      setPass('');
      return;
    }
    setStep('reason');
  }

  const normPhone = (v) => String(v || '').replace(/\D/g, '');
  const normName = (v) => String(v || '').trim().toLocaleLowerCase('ar');
  const matchedCustomer = selectedCustomerId
    ? customers.find((c) => c.id === selectedCustomerId)
    : customers.find((c) => (buyerPhone && normPhone(c.phone) === normPhone(buyerPhone)) ||
                            (buyerName && normName(c.display_name) === normName(buyerName)));
  const customerMatches = customers.filter((c) => {
    const p = normPhone(buyerPhone);
    const n = normName(buyerName);
    if (!p && !n) return false;
    return (p && normPhone(c.phone).includes(p)) || (n && normName(c.display_name).includes(n));
  }).slice(0, 6);

  useEffect(() => {
    const phone = normPhone(buyerPhone);
    const exactMatch = phone && customers.some((c) => normPhone(c.phone) === phone);
    if (reason !== 'sold' || phone.length < 7 || exactMatch || dismissedPhone === phone) {
      setUnknownPhone(false);
      return undefined;
    }
    const timer = window.setTimeout(() => setUnknownPhone(true), 500);
    return () => window.clearTimeout(timer);
  }, [buyerPhone, customers, dismissedPhone, reason]);

  if (!device) return null;

  function chooseCustomer(c) {
    setSelectedCustomerId(c.id);
    setBuyerName(c.display_name || '');
    setBuyerPhone(c.phone || '');
    setCustomerListOpen(false);
  }

  function syncByPhone(value) {
    setBuyerPhone(value); setSelectedCustomerId(null); setCustomerListOpen(true);
    const p = normPhone(value);
    if (p !== dismissedPhone) setUnknownPhone(false);
    const found = p ? customers.find((c) => normPhone(c.phone) === p) : null;
    if (found) chooseCustomer(found);
  }

  function syncByName(value) {
    setBuyerName(value); setSelectedCustomerId(null); setCustomerListOpen(true);
    const n = normName(value);
    const found = n ? customers.find((c) => normName(c.display_name) === n) : null;
    if (found) chooseCustomer(found);
  }

  function openCustomerModal() {
    setNewCustomer({ displayName: buyerName, phone: buyerPhone });
    setCustomerErr('');
    setCustomerListOpen(false);
    setCustomerModalOpen(true);
  }

  async function saveCustomer() {
    const displayName = newCustomer.displayName.trim();
    const phone = newCustomer.phone.trim();
    if (!displayName) return setCustomerErr('اسم العميل مطلوب');

    const existing = phone
      ? customers.find((c) => normPhone(c.phone) === normPhone(phone))
      : null;
    if (existing) {
      chooseCustomer(existing);
      setCustomerModalOpen(false);
      setUnknownPhone(false);
      show('✓ الرقم مسجل بالفعل — تم اختيار العميل الموجود');
      return;
    }

    setCustomerBusy(true);
    setCustomerErr('');
    try {
      const id = await ensurePurchaseCustomer({ displayName, phone });
      const created = { id, display_name: displayName, phone, source: 'purchase' };
      setCustomers((list) => [...list, created].sort((a, b) =>
        String(a.display_name || '').localeCompare(String(b.display_name || ''), 'ar')
      ));
      chooseCustomer(created);
      setCustomerModalOpen(false);
      setUnknownPhone(false);
      show('✅ تمت إضافة العميل واختياره');
    } catch (e) {
      setCustomerErr(e.message || 'تعذر إضافة العميل');
    } finally {
      setCustomerBusy(false);
    }
  }

  async function confirm() {
    setErr('');
    if (!reason) return setErr('❗ اختر سبب الأرشفة');
    if (reason === 'sold' && !buyerName.trim()) return setErr('❗ اكتب اسم المشتري');
    if (wantImei && imei.trim().length !== 15) return setErr('❗ رقم IMEI لازم 15 رقم');

    setBusy(true);
    try {
      const customerId = reason === 'sold'
        ? await ensurePurchaseCustomer({ id: matchedCustomer?.id, displayName: buyerName, phone: buyerPhone })
        : null;
      const res = await archiveDevice(device.sheetRow, {
        reason,
        buyerName: buyerName.trim(),
        buyerPhone: buyerPhone.trim(),
        customerId,
        imei: wantImei ? imei.trim() : '',
        archivedBy: username,
        seller,
      });

      show('✅ تم الأرشفة بنجاح');

      if (wantPrint) {
        printReceipt({
          device,
          buyerName: reason === 'sold' ? buyerName.trim() : '',
          buyerPhone: reason === 'sold' ? buyerPhone.trim() : '',
          imei: wantImei ? imei.trim() : '',
          archiveDate: res.archiveDate,
          username,
          seller,
        });
      }

      onArchived();
      onClose();
    } catch (e) {
      setErr('❌ فشل الأرشفة: ' + (e.message || ''));
    } finally {
      setBusy(false);
    }
  }

  const toggleCls = (active) =>
    `flex-1 rounded-xl border px-3 py-2.5 text-sm font-bold transition ${
      active
        ? 'border-accent bg-accent text-on-accent'
        : 'border-border bg-surface text-muted hover:text-text'
    }`;

  return (
    <Modal
      open={!!device}
      onClose={onClose}
      closeOnOverlay={false}
      overlayClassName="archive-modal-overlay"
      icon="📦"
      title="أرشفة الجهاز"
      description={`📱 ${device.model}${device.code ? ` · #${device.code}` : ''}`}
    >
      {step === 'pass' ? (
        <div className="space-y-3">
          <Input
            type="password"
            placeholder="كلمة سر الأرشفة"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && checkPass()}
            autoFocus
          />
          {passErr && <p className="text-xs font-bold text-danger">{passErr}</p>}
          <div className="flex gap-2">
            <Button className="flex-1" onClick={checkPass}>متابعة</Button>
            <Button variant="plain" onClick={onClose}>إلغاء</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4 text-start">
          {/* البائع */}
          <div>
            <label className="mb-1.5 block text-xs font-bold text-muted">البائع</label>
            <select
              value={seller}
              onChange={(e) => setSeller(e.target.value)}
              className="w-full rounded-xl border border-border bg-input px-3 py-2.5 text-sm text-text outline-none focus:border-accent"
            >
              {[...new Set([display, ...sellers].filter(Boolean))].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* السبب */}
          <div>
            <label className="mb-1.5 block text-xs font-bold text-muted">سبب الأرشفة *</label>
            <div className="flex gap-2">
              <button type="button" className={toggleCls(reason === 'sold')}
                      onClick={() => setReason('sold')}>💰 تم البيع</button>
              <button type="button" className={toggleCls(reason === 'return')}
                      onClick={() => setReason('return')}>↩️ مرتجع للبائع</button>
            </div>
          </div>

          {/* بيانات المشتري — للبيع بس */}
          {reason === 'sold' && (
            <div className="space-y-3 rounded-2xl border border-border bg-surface/50 p-3">
              <div className="relative">
                <Input label="رقم هاتف العميل" value={buyerPhone}
                       onFocus={() => setCustomerListOpen(true)}
                       onChange={(e) => syncByPhone(e.target.value)} inputMode="tel" />
                {matchedCustomer && (
                  <span className="absolute end-3 top-8 text-sm font-black text-green-600" title="عميل موجود">✓</span>
                )}
                {customerListOpen && customerMatches.length > 0 && (
                  <div className="absolute z-30 mt-1 max-h-48 w-full overflow-auto rounded-xl border border-border bg-card shadow-xl">
                    {customerMatches.map((c) => (
                      <button key={c.id} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => chooseCustomer(c)}
                              className="block w-full border-b border-border px-3 py-2 text-start last:border-0 hover:bg-surface">
                        <span className="block text-sm font-black text-accent">{c.display_name}</span>
                        <span className="num block text-xs font-bold text-sky-500">{c.phone || 'بدون رقم'}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {unknownPhone && (
                <div className="rounded-xl border border-amber-500/60 bg-amber-500/10 p-3">
                  <p className="mb-2 text-xs font-bold text-amber-600">رقم الهاتف غير موجود في قائمة العملاء. هل تريد إضافة عميل جديد؟</p>
                  <div className="flex gap-2">
                    <button type="button" className="flex-1 rounded-lg border border-border px-3 py-2 text-xs font-black"
                            onClick={() => { setDismissedPhone(normPhone(buyerPhone)); setUnknownPhone(false); }}>لا</button>
                    <button type="button" className="flex-1 rounded-lg bg-accent px-3 py-2 text-xs font-black text-on-accent"
                            onClick={openCustomerModal}>نعم، إضافة عميل</button>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-[minmax(0,1fr)_44px] items-end gap-2">
                <div className="relative">
                  <Input label="اسم المشتري *" value={buyerName}
                         onFocus={() => setCustomerListOpen(true)}
                         onChange={(e) => syncByName(e.target.value)} />
                  {matchedCustomer && (
                    <span className="absolute end-3 top-8 text-sm font-black text-green-600" title="عميل موجود">✓</span>
                  )}
                </div>
                <button type="button" onClick={openCustomerModal} aria-label="إضافة عميل جديد" title="إضافة عميل جديد"
                        className="grid h-11 place-items-center rounded-xl border border-accent-line bg-accent-soft text-2xl font-black text-accent">+</button>
              </div>
              {matchedCustomer ? (
                <p className="text-xs font-black text-green-600">✓ عميل موجود — تم ربط الاسم ورقم الهاتف تلقائيًا</p>
              ) : (buyerName.trim() || buyerPhone.trim()) ? (
                <p className="text-xs font-bold text-muted">عميل جديد — سيُضاف إلى قائمة العملاء عند إتمام الأرشفة.</p>
              ) : null}
            </div>
          )}

          {/* IMEI اختياري */}
          <div>
            <label className="mb-1.5 block text-xs font-bold text-muted">تسجيل IMEI؟</label>
            <div className="flex gap-2">
              <button type="button" className={toggleCls(wantImei)}
                      onClick={() => setWantImei(true)}>نعم</button>
              <button type="button" className={toggleCls(!wantImei)}
                      onClick={() => setWantImei(false)}>لا</button>
            </div>
            {wantImei && (
              <ImeiInput className="mt-2" value={imei} onChange={setImei} />
            )}
          </div>

          {/* طباعة الإيصال */}
          <div>
            <label className="mb-1.5 block text-xs font-bold text-muted">طباعة إيصال؟</label>
            <div className="flex gap-2">
              <button type="button" className={toggleCls(wantPrint)}
                      onClick={() => setWantPrint(true)}>🖨️ نعم</button>
              <button type="button" className={toggleCls(!wantPrint)}
                      onClick={() => setWantPrint(false)}>لا</button>
            </div>
          </div>

          {err && (
            <p className="rounded-xl bg-danger/10 px-3 py-2 text-center text-xs font-bold text-danger">
              {err}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <Button className="flex-1" loading={busy} onClick={confirm}>
              {busy ? 'جاري الأرشفة...' : '📦 أرشفة'}
            </Button>
            <Button variant="plain" onClick={onClose} disabled={busy}>إلغاء</Button>
          </div>
        </div>
      )}
      <Modal
        open={customerModalOpen}
        onClose={() => !customerBusy && setCustomerModalOpen(false)}
        closeOnOverlay={!customerBusy}
        overlayClassName="customer-modal-overlay"
        icon="👤"
        title="إضافة عميل جديد"
        description="سيتم اختيار العميل وربطه بعملية الأرشفة فور الحفظ"
      >
        <div className="space-y-3 text-start">
          <Input label="اسم العميل *" value={newCustomer.displayName}
                 onChange={(e) => setNewCustomer((v) => ({ ...v, displayName: e.target.value }))} autoFocus />
          <Input label="رقم هاتف العميل" value={newCustomer.phone} inputMode="tel"
                 onChange={(e) => setNewCustomer((v) => ({ ...v, phone: e.target.value }))} />
          {customerErr && <p className="rounded-xl bg-danger/10 px-3 py-2 text-xs font-bold text-danger">{customerErr}</p>}
          <div className="flex gap-2">
            <Button className="flex-1" loading={customerBusy} onClick={saveCustomer}>إضافة واختيار العميل</Button>
            <Button variant="plain" disabled={customerBusy} onClick={() => setCustomerModalOpen(false)}>إلغاء</Button>
          </div>
        </div>
      </Modal>
    </Modal>
  );
}
