import { useCallback, useEffect, useState } from 'react';
import { useToast } from '../context/ToastContext';
import { usePricing } from '../context/PricingContext';
import {
  fetchPricingPoliciesAdmin,
  createPricingPolicy,
  updatePricingPolicy,
  deletePricingPolicy,
  setPolicyPublic,
} from '../lib/adminApi';
import Modal from './ui/Modal';
import Button from './ui/Button';
import Input from './ui/Input';
import Toggle from './ui/Toggle';

// مقارنة اسم السياسة مع تجاهل فروق المسافات الزيادة
const norm = (s) => String(s || '').replace(/\s+/g, ' ').trim();

const subPill = (active) =>
  `-mb-px border-b-2 px-3 py-2 text-sm font-bold transition ${
    active ? 'border-accent text-accent' : 'border-transparent text-muted hover:text-text'
  }`;

/** قسم "الأسعار" في لوحة الأدمن — تبويبان فرعيان. */
export default function Pricing() {
  const [sub, setSub] = useState('policies'); // policies | display

  return (
    <div className="space-y-5">
      <div className="flex gap-2 border-b border-border">
        <button type="button" onClick={() => setSub('policies')} className={subPill(sub === 'policies')}>
          💲 السياسات السعرية
        </button>
        <button type="button" onClick={() => setSub('display')} className={subPill(sub === 'display')}>
          👁️ عرض الأسعار
        </button>
      </div>

      {sub === 'policies' ? <PoliciesList /> : <DisplayToggle />}
    </div>
  );
}

// ── السياسات السعرية: قائمة (بالأكواد السرية) + إنشاء/تعديل ────
function PoliciesList() {
  const { refresh } = usePricing();
  const { show } = useToast();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // 'new' | policyObject | null

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setList(await fetchPricingPoliciesAdmin());
    } catch (e) {
      show('❌ فشل التحميل: ' + (e.message || ''), 'error');
    } finally {
      setLoading(false);
    }
  }, [show]);

  useEffect(() => { load(); }, [load]);

  // بعد أي تغيير: نحدّث قائمة الأدمن (بالأكواد) + السياق العام لباقي التطبيق
  async function afterChange() {
    await load();
    refresh();
  }

  // مودال الحذف النهائي — لازم يتكتب اسم السياسة بالظبط
  const [toDelete, setToDelete] = useState(null);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  function askDelete(p) {
    setConfirmText('');
    setToDelete(p);
  }

  const canDelete = !!toDelete && norm(confirmText) === norm(toDelete.name);

  async function confirmDelete() {
    if (!canDelete || deleting) return;
    setDeleting(true);
    try {
      await deletePricingPolicy(toDelete.id);
      show('🗑️ تم حذف السياسة وكل أسعارها نهائيًا');
      setToDelete(null);
      afterChange();
    } catch (e) {
      show('❌ فشل الحذف: ' + (e.message || ''), 'error');
    } finally {
      setDeleting(false);
    }
  }

  if (editing) {
    return (
      <PolicyForm
        policy={editing === 'new' ? null : editing}
        onDone={() => { setEditing(null); afterChange(); }}
        onCancel={() => setEditing(null)}
      />
    );
  }

  return (
    <>
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="num text-sm text-muted">{list.length} سياسة</p>
        <Button onClick={() => setEditing('new')}>➕ سياسة جديدة</Button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-2xl bg-surface" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface/40 p-5 text-center text-sm text-muted">
          مفيش سياسات بعد.
        </div>
      ) : (
        <div className="space-y-2">
          {list.map((p) => (
            <div
              key={p.id}
              className={`flex flex-wrap items-center gap-3 rounded-2xl border bg-card p-4 ${
                p.is_active ? 'border-border' : 'border-danger/30 opacity-60'
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="truncate text-sm font-black text-text">{p.name}</h3>
                  {p.is_default && (
                    <span className="rounded-full border border-accent-line bg-accent-soft px-2 py-0.5 text-[10px] font-bold text-accent">
                      افتراضية
                    </span>
                  )}
                  {p.is_public && (
                    <span className="rounded-full border border-[var(--mtc-success)]/30 bg-[var(--mtc-success)]/12 px-2 py-0.5 text-[10px] font-bold text-[var(--mtc-success)]">
                      معلَنة
                    </span>
                  )}
                  {!p.is_active && (
                    <span className="rounded-full border border-danger/30 bg-danger/10 px-2 py-0.5 text-[10px] font-bold text-danger">
                      معطّلة
                    </span>
                  )}
                </div>
                <p className="num text-xs text-muted">
                  {p.code}
                  {p.access_code && <span className="ms-2 text-accent">🔑 {p.access_code}</span>}
                </p>
              </div>

              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setEditing(p)}
                  className="rounded-lg border border-accent-line bg-accent-soft px-2.5 py-1.5 text-[11px] font-bold text-accent transition hover:bg-accent hover:text-on-accent"
                >
                  ✏️ تعديل
                </button>
                {!p.is_default && (
                  <button
                    type="button"
                    onClick={() => askDelete(p)}
                    className="rounded-lg border border-danger/25 bg-danger/10 px-2.5 py-1.5 text-[11px] font-bold text-danger transition hover:bg-danger/25"
                  >
                    🗑️ حذف نهائي
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>

    <Modal
      open={!!toDelete}
      onClose={() => { if (!deleting) setToDelete(null); }}
      icon="🗑️"
      title="حذف نهائي للسياسة"
      description={
        toDelete
          ? `للتأكيد، اكتب اسم السياسة بالظبط زي ما هو مكتوب تحت. الحذف بيمسح السياسة وكل أسعارها ومش هينفع يترجع.`
          : ''
      }
      actions={
        <>
          <Button variant="plain" onClick={() => setToDelete(null)} disabled={deleting}>إلغاء</Button>
          <Button variant="danger" loading={deleting} disabled={!canDelete} onClick={confirmDelete}>
            {deleting ? 'جاري الحذف...' : '🗑️ حذف نهائي'}
          </Button>
        </>
      }
    >
      {toDelete && (
        <div className="space-y-2">
          <div className="rounded-xl border border-danger/30 bg-danger/5 px-3 py-2 text-center">
            <span className="text-sm font-black text-danger">{toDelete.name}</span>
          </div>
          <Input
            placeholder="اكتب اسم السياسة هنا"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && confirmDelete()}
            autoFocus
          />
          <p className="text-[11px] font-bold text-danger">
            ⚠️ حذف نهائي — السياسة وكل الأسعار المرتبطة بيها هتتمسح خالص.
          </p>
        </div>
      )}
    </Modal>
    </>
  );
}

// ── فورم إنشاء/تعديل سياسة (بالكود السري) ──────────────────────
function PolicyForm({ policy, onDone, onCancel }) {
  const { show } = useToast();
  const isEdit = !!policy;
  const isDefault = !!policy?.is_default;

  const [name, setName] = useState(policy?.name ?? '');
  const [code, setCode] = useState(policy?.code ?? '');
  const [accessCode, setAccessCode] = useState(policy?.access_code ?? '');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function save() {
    setErr('');
    const nm = name.trim();
    const cd = code.trim().toLowerCase();
    const ac = accessCode.trim();
    if (!nm) return setErr('❗ الاسم مطلوب');
    if (!isEdit && !/^[a-z0-9_]{2,20}$/.test(cd)) {
      return setErr('❗ الكود: إنجليزي وأرقام و _ فقط (2–20)');
    }

    setBusy(true);
    try {
      if (isEdit) {
        // الكود ثابت — نعدّل الاسم والكود السري بس
        await updatePricingPolicy(policy.id, { name: nm, access_code: ac || null });
        show('✅ تم حفظ السياسة');
      } else {
        await createPricingPolicy({ name: nm, code: cd, access_code: ac || undefined });
        show('✅ تم إنشاء السياسة');
      }
      onDone();
    } catch (e) {
      const m = String(e.message || '');
      setErr(
        m.includes('duplicate') || m.includes('unique')
          ? '❗ فيه كود متكرر (كود السياسة أو الكود السري لازم يكونوا فريدين)'
          : '❌ ' + m
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button type="button" onClick={onCancel} className="text-sm font-bold text-muted transition hover:text-accent">
          ‹ رجوع
        </button>
        <h2 className="text-lg font-black text-accent">
          {isEdit ? `✏️ تعديل: ${policy.name}` : '➕ سياسة جديدة'}
        </h2>
      </div>

      <div className="rounded-3xl border border-border bg-card p-6 space-y-4">
        <Input label="الاسم *" value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: سعر الجملة" />
        <Input
          label="الكود *"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="wholesale"
          disabled={isEdit}
        />
        {isEdit && (
          <p className="text-[11px] text-muted">🔒 الكود ثابت بعد الإنشاء عشان الأسعار المرتبطة ما تتفصلش.</p>
        )}

        <Input
          label="الكود السري للعميل"
          value={accessCode}
          onChange={(e) => setAccessCode(e.target.value)}
          placeholder="سيبه فاضي لو مش عايز فتح بالكود"
        />
        <p className="text-[11px] text-muted">
          🔑 العميل يكتب الكود ده في خانة «اكتب الكود الخاص بك هنا» فتظهرله أسعار السياسة دي — حتى لو «عرض الأسعار» مقفول.
          الكود مخفي عن الزوّار.
        </p>

        {isDefault && (
          <p className="rounded-xl bg-accent-soft px-3 py-2 text-[11px] font-bold text-accent">
            دي السياسة الافتراضية اللي توجل «عرض الأسعار» بيتحكم فيها.
          </p>
        )}

        {err && (
          <p className="rounded-xl bg-danger/10 px-3 py-2 text-center text-xs font-bold text-danger">{err}</p>
        )}

        <div className="flex gap-2 pt-1">
          <Button className="flex-1" loading={busy} onClick={save}>
            {busy ? 'جاري الحفظ...' : isEdit ? 'حفظ' : '➕ إنشاء'}
          </Button>
          <Button variant="plain" onClick={onCancel} disabled={busy}>إلغاء</Button>
        </div>
      </div>
    </div>
  );
}

// ── عرض الأسعار: توجل على السياسة الافتراضية ───────────────────
function DisplayToggle() {
  const { defaultPolicy, refresh } = usePricing();
  const { show } = useToast();
  const [busy, setBusy] = useState(false);

  if (!defaultPolicy) {
    return (
      <div className="rounded-2xl border border-border bg-surface/40 p-5 text-center text-sm text-muted">
        السياسة الافتراضية لسه مش موجودة.
      </div>
    );
  }

  const on = !!defaultPolicy.is_public;

  async function toggle(next) {
    setBusy(true);
    try {
      await setPolicyPublic(defaultPolicy.id, next);
      show(next ? '✅ الأسعار ظاهرة للكل دلوقتي' : '🙈 الأسعار مخفية');
      await refresh();
    } catch (e) {
      show('❌ ' + (e.message || ''), 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-sm font-black text-text">عرض الأسعار للعملاء</h3>
          <p className="mt-1 text-xs text-muted">
            لما يكون مفعّل، سعر «{defaultPolicy.name}» بيظهر للكل (زائر + مستخدم). الوضع الافتراضي مخفي.
          </p>
        </div>
        <Toggle checked={on} onChange={toggle} busy={busy} label="عرض الأسعار" />
      </div>
      <p className={`mt-3 text-xs font-bold ${on ? 'text-[var(--mtc-success)]' : 'text-muted'}`}>
        {on ? '● ظاهرة الآن' : '○ مخفية الآن'}
      </p>
    </div>
  );
}
