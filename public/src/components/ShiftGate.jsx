import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { usePermissions } from '../context/PermissionContext';
import { useAuth } from '../context/AuthContext';
import { fetchSetting } from '../lib/api';
import { openShift, getOpenShift } from '../lib/shiftService';

// ══════════════════════════════════════════════════════════════
//  ShiftGate — بوابة الوردية (V13.9.2)
//
//  تظهر قبل نقطة البيع. المستخدم يختار:
//    1. الفرع (من الفروع المسموح له بها)
//    2. الخزينة (من الخزائن المرتبطة بالفرع)
//    3. رصيد أول المدة (يُدخله يدوياً)
//
//  لو يوجد وردية مفتوحة → يعرضها ويسمح بالمتابعة أو فتح جديدة.
// ══════════════════════════════════════════════════════════════

const I = 'w-full rounded-xl border border-border bg-input px-3.5 py-3 text-sm text-text outline-none transition placeholder:text-muted focus:border-accent focus:ring-2 focus:ring-[var(--focus-ring)]';

const money = (n) => Number(n || 0).toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function ShiftGate({ onShiftReady }) {
  const { primaryBranch, can, display } = usePermissions();
  const { userRow } = useAuth();
  // user_id في pos_shifts هو UUID من auth.users — نستخدم auth_id وليس id (integer)
  const userId = userRow?.auth_id ?? null;

  const [allBranches, setAllBranches] = useState([]);
  const [treasuries, setTreasuries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  // حقول الفورم
  const [branch, setBranch] = useState('');
  const [treasuryId, setTreasuryId] = useState('');
  const [openingBalance, setOpeningBalance] = useState('');

  // الوردية المفتوحة الحالية (لو موجودة)
  const [existingShift, setExistingShift] = useState(null);
  const [checkingShift, setCheckingShift] = useState(true);

  const canSeeAll = can('can_erp_all_branches');
  const canOpenShift = can('can_pos_shift_open');

  // تحميل الفروع والخزائن
  useEffect(() => {
    Promise.all([
      fetchSetting('branches'),
      supabase.from('treasuries').select('id,name,branch,opening_balance').eq('is_active', true).order('name'),
    ]).then(([branches, { data: treas }]) => {
      setAllBranches(Array.isArray(branches) ? branches.filter(Boolean) : []);
      setTreasuries(treas || []);
    }).finally(() => setLoading(false));
  }, []);

  // تحديد الفرع الافتراضي
  useEffect(() => {
    if (!loading && !branch) {
      if (!canSeeAll && primaryBranch) setBranch(primaryBranch);
    }
  }, [loading, canSeeAll, primaryBranch]);

  // التحقق من وجود وردية مفتوحة
  useEffect(() => {
    if (!userId) return;
    setCheckingShift(true);
    getOpenShift(userId)
      .then((shift) => setExistingShift(shift))
      .catch(() => setExistingShift(null))
      .finally(() => setCheckingShift(false));
  }, [userId]);

  const allowedBranches = canSeeAll
    ? allBranches
    : allBranches.filter((b) => b === primaryBranch);

  const filteredTreasuries = treasuries.filter(
    (t) => !t.branch || t.branch === branch
  );

  const selectedTreasury = treasuries.find((t) => String(t.id) === String(treasuryId));

  async function handleOpen(e) {
    e.preventDefault();
    setMsg('');
    if (!branch) return setMsg('اختر الفرع أولاً.');
    if (!treasuryId) return setMsg('اختر الخزينة.');
    if (openingBalance === '' || isNaN(Number(openingBalance))) return setMsg('أدخل رصيد أول المدة (يمكن أن يكون صفراً).');

    setBusy(true);
    try {
      const shift = await openShift({
        userId,
        userName: display || userRow?.username || 'مستخدم',
        branch,
        treasuryId: Number(treasuryId),
        treasuryName: selectedTreasury?.name || '',
        openingBalance: Number(openingBalance),
      });
      onShiftReady(shift);
    } catch (err) {
      setMsg('❌ ' + (err.message || 'فشل فتح الوردية'));
    } finally {
      setBusy(false);
    }
  }

  function continueExisting() {
    onShiftReady(existingShift);
  }

  if (loading || checkingShift) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-bg">
        <div className="text-center">
          <div className="text-4xl">⏳</div>
          <p className="mt-3 text-sm font-bold text-muted">جارٍ التحميل…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-bg p-4" dir="rtl">
      <div className="w-full max-w-md space-y-4">

        {/* الهيدر */}
        <div className="rounded-3xl border-2 border-accent-line bg-card p-6 text-center">
          <div className="text-5xl">🕐</div>
          <h1 className="mt-3 text-2xl font-black text-accent">نظام الورديات</h1>
          <p className="mt-1 text-xs text-muted">افتح وردية جديدة لبدء العمل في نقطة البيع</p>
          {display && <p className="mt-2 text-sm font-bold text-text">👤 {display}</p>}
        </div>

        {/* وردية مفتوحة موجودة */}
        {existingShift && (
          <div className="rounded-2xl border-2 border-[var(--mtc-success)]/40 bg-[var(--mtc-success)]/8 p-5">
            <h3 className="font-black text-[var(--mtc-success)]">✅ يوجد وردية مفتوحة</h3>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              {[
                ['رقم الوردية', existingShift.shift_number],
                ['الفرع', existingShift.branch],
                ['الخزينة', existingShift.treasury_name],
                ['رصيد أول المدة', money(existingShift.opening_balance)],
                ['فُتحت في', new Date(existingShift.opened_at).toLocaleString('ar-EG')],
              ].map(([k, v]) => (
                <div key={k} className="rounded-xl border border-[var(--mtc-success)]/20 bg-card p-2">
                  <span className="block text-muted">{k}</span>
                  <b className="text-text">{v}</b>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={continueExisting}
              className="mt-4 w-full rounded-xl bg-[var(--mtc-success)] py-3 text-sm font-black text-white">
              ▶️ متابعة هذه الوردية
            </button>
          </div>
        )}

        {/* فورم فتح وردية جديدة */}
        {canOpenShift ? (
          <form onSubmit={handleOpen} className="rounded-2xl border border-border bg-card p-5 space-y-4">
            <h3 className="font-black text-text">
              {existingShift ? '➕ فتح وردية جديدة (في فرع آخر)' : '➕ فتح وردية جديدة'}
            </h3>

            {/* الفرع */}
            <div>
              <label className="mb-1.5 block text-xs font-black text-muted">🏬 الفرع *</label>
              {canSeeAll ? (
                <select className={I} value={branch} onChange={(e) => { setBranch(e.target.value); setTreasuryId(''); }}>
                  <option value="">اختر الفرع</option>
                  {allowedBranches.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              ) : (
                <div className="rounded-xl border border-border bg-surface px-4 py-3 text-sm font-bold text-accent">
                  {primaryBranch || 'لا يوجد فرع مخصص'}
                </div>
              )}
            </div>

            {/* الخزينة */}
            <div>
              <label className="mb-1.5 block text-xs font-black text-muted">🏦 الخزينة *</label>
              <select className={I} value={treasuryId} onChange={(e) => setTreasuryId(e.target.value)} disabled={!branch}>
                <option value="">اختر الخزينة</option>
                {filteredTreasuries.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              {branch && filteredTreasuries.length === 0 && (
                <p className="mt-1 text-xs text-danger">لا توجد خزائن نشطة لهذا الفرع</p>
              )}
            </div>

            {/* رصيد أول المدة */}
            <div>
              <label className="mb-1.5 block text-xs font-black text-muted">💰 رصيد أول المدة *</label>
              <input
                className={I}
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={openingBalance}
                onChange={(e) => setOpeningBalance(e.target.value)}
              />
              <p className="mt-1 text-[11px] text-muted">أدخل المبلغ النقدي الموجود في الخزينة عند بدء الوردية</p>
            </div>

            {msg && (
              <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-xs font-bold text-danger">
                {msg}
              </div>
            )}

            <button
              type="submit"
              disabled={busy || !branch || !treasuryId || openingBalance === ''}
              className="w-full rounded-xl bg-accent py-3.5 text-sm font-black text-on-accent disabled:opacity-50">
              {busy ? 'جارٍ فتح الوردية…' : '🚀 فتح الوردية والبدء'}
            </button>
          </form>
        ) : (
          <div className="rounded-2xl border border-danger/30 bg-danger/10 p-5 text-center">
            <p className="text-sm font-bold text-danger">ليس لديك صلاحية فتح وردية</p>
          </div>
        )}
      </div>
    </div>
  );
}
