import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../context/PermissionContext';
import {
  verifyDeletePass,
  archiveDevice,
  fetchBranchSellers,
  fetchArchiveCustomers,
  ensurePurchaseCustomer,
} from '../lib/api';
import { useToast } from '../context/ToastContext';
import { printReceipt } from '../lib/receipt';
import Modal from './ui/Modal';
import Button from './ui/Button';
import Input from './ui/Input';
import ImeiInput from './ImeiInput';
import { fetchBranchProfiles } from '../lib/branchProfiles';

/**
 * مودال الأرشفة — خطوتين زي الأصل:
 *   1) كلمة السر (تظهر بس لو reqArchPass && hasDelPass)
 *   2) السبب: بيع (+ بيانات المشتري) أو مرتجع، + IMEI اختياري + طباعة
 */
export default function ArchiveModal({ device, onArchived, onClose }) {
  const { hasDelPass, username } = useAuth();
  const { requires, display, primaryBranch } = usePermissions();
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
  const [wantImei, setWantImei] = useState(false);
  const [imei, setImei] = useState('');
  const [wantPrint, setWantPrint] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  // البائع — الافتراضي المستخدم الحالي، أو اختيار من نفس الفرع
  const [sellers, setSellers] = useState([]);
  const [branchProfiles, setBranchProfiles] = useState({});
  const [seller, setSeller] = useState(display || '');
  useEffect(() => {
    fetchBranchSellers()
      .then((list) => setSellers(list))
      .catch(() => setSellers([]));
    fetchBranchProfiles()
      .then(setBranchProfiles)
      .catch(() => setBranchProfiles({}));
    fetchArchiveCustomers()
      .then((list) => setCustomers(list))
      .catch(() => setCustomers([]));
  }, [device]);

  useEffect(() => {
    setStep(needPass ? 'pass' : 'reason');
    setPass('');
    setPassErr('');
    setReason('');
    setBuyerName('');
    setBuyerPhone('');
    setSelectedCustomerId(null);
    setCustomerListOpen(false);
    // V11.33: لو الجهاز اتسجّل بـ IMEI وقت الإدخال، نجيبه جاهز
    // بدل ما الموظف يعيد مسحه — وبرضه عشان ما يتمسحش بالغلط.
    const saved = device?.imei && device.imei !== '-' ? String(device.imei) : '';
    setWantImei(Boolean(saved));
    setImei(saved);
    setWantPrint(false);
    setErr('');
    setSeller(display || '');
  }, [device, needPass, display]);

  if (!device) return null;
  const selectedSeller = sellers.find((x) => x.display_name === seller);
  const sellerBranch = selectedSeller?.branch || primaryBranch || '';
  const sellerPhone = branchProfiles[sellerBranch]?.phone || '';

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
  const normName = (v) =>
    String(v || '')
      .trim()
      .toLocaleLowerCase('ar');
  const matchedCustomer = selectedCustomerId
    ? customers.find((c) => c.id === selectedCustomerId)
    : customers.find(
        (c) =>
          (buyerPhone && normPhone(c.phone) === normPhone(buyerPhone)) ||
          (buyerName && normName(c.display_name) === normName(buyerName)),
      );
  const customerMatches = customers
    .filter((c) => {
      const p = normPhone(buyerPhone);
      const n = normName(buyerName);
      if (!p && !n) return false;
      return (p && normPhone(c.phone).includes(p)) || (n && normName(c.display_name).includes(n));
    })
    .slice(0, 6);

  function chooseCustomer(c) {
    setSelectedCustomerId(c.id);
    setBuyerName(c.display_name || '');
    setBuyerPhone(c.phone || '');
    setCustomerListOpen(false);
  }

  function syncByPhone(value) {
    setBuyerPhone(value);
    setSelectedCustomerId(null);
    setCustomerListOpen(true);
    const p = normPhone(value);
    const found = p ? customers.find((c) => normPhone(c.phone) === p) : null;
    if (found) chooseCustomer(found);
  }

  function syncByName(value) {
    setBuyerName(value);
    setSelectedCustomerId(null);
    setCustomerListOpen(true);
    const n = normName(value);
    const found = n ? customers.find((c) => normName(c.display_name) === n) : null;
    if (found) chooseCustomer(found);
  }

  async function confirm() {
    setErr('');
    if (!reason) return setErr('❗ اختر سبب الأرشفة');
    if (reason === 'sold' && !buyerName.trim()) return setErr('❗ اكتب اسم المشتري');
    if (wantImei && imei.trim().length !== 15) return setErr('❗ رقم IMEI لازم 15 رقم');

    setBusy(true);
    try {
      const customerId =
        reason === 'sold'
          ? await ensurePurchaseCustomer({
              id: matchedCustomer?.id,
              displayName: buyerName,
              phone: buyerPhone,
            })
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
          sellerBranch,
          sellerPhone,
          issuerBranch: primaryBranch || device.branch || '',
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
            <Button className="flex-1" onClick={checkPass}>
              متابعة
            </Button>
            <Button variant="plain" onClick={onClose}>
              إلغاء
            </Button>
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
              {[
                ...new Map(
                  [{ display_name: display, branch: primaryBranch }, ...sellers]
                    .filter((x) => x.display_name)
                    .map((x) => [x.display_name, x]),
                ).values(),
              ].map((s) => (
                <option key={s.display_name} value={s.display_name}>
                  {s.display_name}
                  {s.branch ? ` — ${s.branch}` : ''}
                </option>
              ))}
            </select>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <Input label="فرع البائع" value={sellerBranch} readOnly disabled />
              <Input label="هاتف البائع (هاتف الفرع)" value={sellerPhone} readOnly disabled />
            </div>
          </div>

          {/* السبب */}
          <div>
            <label className="mb-1.5 block text-xs font-bold text-muted">سبب الأرشفة *</label>
            <div className="flex gap-2">
              <button
                type="button"
                className={toggleCls(reason === 'sold')}
                onClick={() => setReason('sold')}
              >
                💰 تم البيع
              </button>
              <button
                type="button"
                className={toggleCls(reason === 'return')}
                onClick={() => setReason('return')}
              >
                ↩️ مرتجع للبائع
              </button>
            </div>
          </div>

          {/* بيانات المشتري — للبيع بس */}
          {reason === 'sold' && (
            <div className="space-y-3 rounded-2xl border border-border bg-surface/50 p-3">
              <div className="relative">
                <Input
                  label="رقم هاتف المشتري"
                  value={buyerPhone}
                  onFocus={() => setCustomerListOpen(true)}
                  onChange={(e) => syncByPhone(e.target.value)}
                  inputMode="tel"
                />
                {matchedCustomer && (
                  <span
                    className="absolute end-3 top-8 text-sm font-black text-green-600"
                    title="عميل موجود"
                  >
                    ✓
                  </span>
                )}
                {customerListOpen && customerMatches.length > 0 && (
                  <div className="absolute z-30 mt-1 max-h-48 w-full overflow-auto rounded-xl border border-border bg-card shadow-xl">
                    {customerMatches.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => chooseCustomer(c)}
                        className="block w-full border-b border-border px-3 py-2 text-start last:border-0 hover:bg-surface"
                      >
                        <span className="block text-sm font-black text-text">{c.display_name}</span>
                        <span className="num block text-xs text-muted">
                          {c.phone || 'بدون رقم'}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="relative">
                <Input
                  label="اسم المشتري *"
                  value={buyerName}
                  onFocus={() => setCustomerListOpen(true)}
                  onChange={(e) => syncByName(e.target.value)}
                />
                {matchedCustomer && (
                  <span
                    className="absolute end-3 top-8 text-sm font-black text-green-600"
                    title="عميل موجود"
                  >
                    ✓
                  </span>
                )}
              </div>
              {matchedCustomer ? (
                <p className="text-xs font-black text-green-600">
                  ✓ عميل موجود — تم ربط الاسم ورقم الهاتف تلقائيًا
                </p>
              ) : buyerName.trim() || buyerPhone.trim() ? (
                <p className="text-xs font-bold text-muted">
                  عميل جديد — سيُضاف إلى قائمة العملاء عند إتمام الأرشفة.
                </p>
              ) : null}
            </div>
          )}

          {/* IMEI اختياري */}
          <div>
            <label className="mb-1.5 block text-xs font-bold text-muted">تسجيل IMEI؟</label>
            <div className="flex gap-2">
              <button
                type="button"
                className={toggleCls(wantImei)}
                onClick={() => setWantImei(true)}
              >
                نعم
              </button>
              <button
                type="button"
                className={toggleCls(!wantImei)}
                onClick={() => setWantImei(false)}
              >
                لا
              </button>
            </div>
            {wantImei && <ImeiInput className="mt-2" value={imei} onChange={setImei} />}
          </div>

          {/* طباعة الإيصال */}
          <div>
            <label className="mb-1.5 block text-xs font-bold text-muted">طباعة إيصال؟</label>
            <div className="flex gap-2">
              <button
                type="button"
                className={toggleCls(wantPrint)}
                onClick={() => setWantPrint(true)}
              >
                🖨️ نعم
              </button>
              <button
                type="button"
                className={toggleCls(!wantPrint)}
                onClick={() => setWantPrint(false)}
              >
                لا
              </button>
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
            <Button variant="plain" onClick={onClose} disabled={busy}>
              إلغاء
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
