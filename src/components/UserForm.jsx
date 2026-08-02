import { useState, useEffect } from 'react';
import { useToast } from '../context/ToastContext';
import { createUser, updateUserRow, setUserEmail, setDeletePass, updateUserByUsername, setUserPassword, fetchUserBranchAccess, setUserBranchAccess, fetchActiveTreasuries, fetchUserTreasuryAccess, setUserTreasuryAccess } from '../lib/adminApi';
import { fetchRoles, fetchSetting, uploadUserAvatar } from '../lib/api';
import Button from './ui/Button';
import Input from './ui/Input';

const ROLES = [
  { v: 'entry', l: 'entry — إدخال' },
  { v: 'user', l: 'user — مستخدم' },
  { v: 'admin', l: 'admin — أدمن' },
];

// إعدادات أمان فردية للموظف — مش صلاحيات دور.
// الصلاحيات (إدخال/تعديل/حذف/أرشفة) بقت تتحدّد من الدور (V11.21).
const SECURITY = [
  ['reqDelPass', 'يطلب كلمة سر للحذف'],
  ['reqArchPass', 'يطلب كلمة سر للأرشفة'],
];

/**
 * فورم إنشاء/تعديل مستخدم.
 * إنشاء → Edge Function (create-user) بتعمله في الجدولين.
 * تعديل → PATCH على ishop_users + admin_set_user_email لو الإيميل اتغيّر.
 * الأدمن دايمًا صلاحياته كلها true (نفس الأصل).
 */
export default function UserForm({ user, onSaved, onCancel }) {
  const { show } = useToast();
  const isEdit = !!user;

  const [username, setUsername] = useState(user?.username ?? '');
  const [display, setDisplay] = useState(user?.display_name ?? '');
  const [role, setRole] = useState(user?.role ?? 'entry');
  const [branch, setBranch] = useState(user?.branch ?? '');
  const [branchesList, setBranchesList] = useState([]);
  const [allowedBranches, setAllowedBranches] = useState(user?.branch ? [user.branch] : []);
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [treasuriesList, setTreasuriesList] = useState([]);
  const [allowedTreasuries, setAllowedTreasuries] = useState([]);
  const [defaultTreasury, setDefaultTreasury] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url ?? '');
  const [avatarFile, setAvatarFile] = useState(null);

  // الباسورد — إنشاء بس (تعديل بيتم من Supabase)
  const [pass, setPass] = useState('');
  const [pass2, setPass2] = useState('');

  // الإيميل — مرتين للتأكيد
  const [email, setEmail] = useState(user?.email ?? '');
  const [email2, setEmail2] = useState('');
  const emailBefore = (user?.email ?? '').toLowerCase();

  // كلمة سر الحذف
  const [delpass, setDelpass] = useState('');

  // ملاحظة الافتراضيات: req_del_pass مفتوح، req_arch_pass مغلق (V11.21)
  const [perms, setPerms] = useState({
    reqDelPass: user ? user.req_del_pass !== false : true,
    reqArchPass: user ? user.req_arch_pass === true : false,
  });

  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const isAdmin = role === 'admin';
  const togglePerm = (k) => setPerms((p) => ({ ...p, [k]: !p[k] }));

  // الأدوار الديناميكية — واختيار دور بيطبّق صلاحياته
  const [rolesList, setRolesList] = useState([]);
  useEffect(() => { fetchRoles().then(setRolesList).catch(() => {}); }, []);
  useEffect(() => { fetchSetting('branches').then((v) => setBranchesList(Array.isArray(v) ? v.filter(Boolean) : [])).catch(() => {}); }, []);
  useEffect(() => { fetchActiveTreasuries().then(setTreasuriesList).catch(() => {}); }, []);
  useEffect(() => {
    if (!user?.id) return;
    fetchUserBranchAccess(user.id).then((xs) => {
      const merged = [...new Set([user.branch, ...xs].filter(Boolean))];
      setAllowedBranches(merged);
      if (!branch && merged.length) setBranch(merged[0]);
    }).catch(() => {});
  }, [user?.id]);
  useEffect(() => {
    if (!user?.id) return;
    fetchUserTreasuryAccess(user.id).then((rows) => {
      setAllowedTreasuries(rows.map((x) => Number(x.treasury_id)));
      const def = rows.find((x) => x.is_default);
      setDefaultTreasury(def ? String(def.treasury_id) : '');
    }).catch(() => {});
  }, [user?.id]);

  // لا تظهر إلا خزائن الفروع المختارة للمستخدم. الأدمن يحتفظ بسلوكه الحالي (كل الفروع).
  const treasuryBranches = isAdmin ? branchesList : allowedBranches;
  const visibleTreasuries = treasuriesList.filter((t) => t.branch && treasuryBranches.includes(t.branch));

  // عند إزالة فرع، نسقط تلقائيًا أي خزينة تابعة له من وصول المستخدم.
  useEffect(() => {
    const valid = new Set(visibleTreasuries.map((t) => Number(t.id)));
    setAllowedTreasuries((xs) => xs.filter((id) => valid.has(Number(id))));
    setDefaultTreasury((cur) => cur && valid.has(Number(cur)) ? cur : '');
  }, [treasuriesList, allowedBranches, isAdmin, branchesList]);

  function toggleTreasury(id) {
    const tid = Number(id);
    setAllowedTreasuries((xs) => {
      const next = xs.includes(tid) ? xs.filter((x) => x !== tid) : [...xs, tid];
      if (!next.includes(Number(defaultTreasury))) setDefaultTreasury('');
      return next;
    });
  }

  const roleOptions = rolesList.length ? rolesList.map((r) => ({ v: r.key, l: r.label })) : ROLES;

  function changeRole(newRole) {
    setRole(newRole);
    const r = rolesList.find((x) => x.key === newRole);
    if (r) {
      setPerms({
        reqDelPass: r.req_del_pass !== false,
        reqArchPass: r.req_arch_pass === true,
      });
    }
  }

  function toggleBranch(b) {
    setAllowedBranches((xs) => {
      const next = xs.includes(b) ? xs.filter((x) => x !== b) : [...xs, b];
      if (branch && !next.includes(branch)) setBranch(next[0] || '');
      return next;
    });
  }

  async function save() {
    setErr('');
    const u = username.trim().toLowerCase();
    const d = display.trim();

    let finalAvatar = avatarUrl || null;
    if (avatarFile) {
      try { finalAvatar = await uploadUserAvatar(avatarFile, user?.id || u); }
      catch (e) { return setErr('❌ فشل رفع صورة المستخدم: ' + (e.message || '')); }
    }

    if (!u) return setErr('❗ اسم المستخدم مطلوب');
    if (!d) return setErr('❗ الاسم الكامل مطلوب');
    if (!isAdmin && !allowedBranches.length) return setErr('❗ اختر فرعًا واحدًا على الأقل للمستخدم');
    if (!isAdmin && branch && !allowedBranches.includes(branch)) return setErr('❗ الفرع الافتراضي يجب أن يكون ضمن الفروع المسموح بها');
    if (defaultTreasury && !allowedTreasuries.includes(Number(defaultTreasury))) return setErr('❗ الخزينة الافتراضية يجب أن تكون ضمن الخزائن المسموح بها');

    // الأدمن كل صلاحياته true (نفس الأصل)
    // الصلاحيات بقت من الدور — هنا بنحفظ إعدادات الأمان الفردية بس
    const finalPerms = perms;

    setBusy(true);
    try {
      if (!isEdit) {
        // ── إنشاء ──
        if (!/^[a-z0-9._-]{3,32}$/.test(u)) {
          setBusy(false);
          return setErr('❗ اسم المستخدم: إنجليزي وأرقام و . _ - فقط (3–32)');
        }
        if (pass.length < 8) { setBusy(false); return setErr('❗ كلمة السر: 8 أحرف على الأقل'); }
        if (pass !== pass2) { setBusy(false); return setErr('❗ كلمتا السر غير متطابقتين'); }

        const em = email.trim().toLowerCase();
        if (em) {
          if (em !== email2.trim().toLowerCase()) {
            setBusy(false);
            return setErr('❗ البريدان غير متطابقين');
          }
          if (/\.(local|test|invalid)$/.test(em)) {
            setBusy(false);
            return setErr('❗ لازم بريد حقيقي — الدومينات الوهمية مش هتستقبل رسالة الاستعادة');
          }
        }

        const BUILTINS = ['admin', 'entry', 'user'];
        const isCustomRole = !BUILTINS.includes(role);

        const res = await createUser({
          username: u,
          display_name: d,
          role: isCustomRole ? 'entry' : role,
          password: pass,
          email: em || undefined,
          phone: phone.trim() || undefined,
          req_del_pass: finalPerms.reqDelPass,
          req_arch_pass: finalPerms.reqArchPass,
        });

        // كلمة سر الحذف (لو اتكتبت) — بالـ id الراجع من الإنشاء
        if (delpass.trim() && res?.user?.id) {
          await setDeletePass(res.user.id, delpass.trim());
        }

        // تعيين الدور المخصّص (لو الـ Edge Function ما بتقبلوش) + الفرع — بالـ username
        const postPatch = {};
        if (isCustomRole) {
          postPatch.role = role;
          postPatch.req_del_pass = finalPerms.reqDelPass;
          postPatch.req_arch_pass = finalPerms.reqArchPass;
        }
        if (branch) postPatch.branch = branch;
        if (finalAvatar) postPatch.avatar_url = finalAvatar;
        if (Object.keys(postPatch).length) {
          try { await updateUserByUsername(u, postPatch); }
          catch (e) { show('⚠️ المستخدم اتعمل بس فيه مشكلة في الدور/الفرع: ' + (e.message || ''), 'error'); }
        }

        const createdId = res?.user?.id;
        if (createdId) {
          await setUserBranchAccess(createdId, allowedBranches, branch);
          await setUserTreasuryAccess(createdId, allowedTreasuries, defaultTreasury);
        }
        show('✅ تم إنشاء المستخدم وربط الفروع والخزائن');
      } else {
        // ── تعديل ──
        await updateUserRow(user.id, {
          role,
          display_name: d,
          phone: phone.trim() || null,
          branch: branch || null,
          avatar_url: finalAvatar,
          req_del_pass: finalPerms.reqDelPass,
          req_arch_pass: finalPerms.reqArchPass,
        });

        // الإيميل لو اتغيّر
        const em = email.trim().toLowerCase();
        if (em !== emailBefore) {
          if (!em) { setBusy(false); return setErr('❗ البريد مطلوب'); }
          if (!/^[^@\s]+@[^@\s]+\.[a-zA-Z]{2,}$/.test(em)) {
            setBusy(false); return setErr('❗ صيغة البريد غير صحيحة');
          }
          if (em !== email2.trim().toLowerCase()) {
            setBusy(false); return setErr('❗ البريدان غير متطابقين');
          }
          if (/\.(local|test|invalid)$/.test(em)) {
            setBusy(false); return setErr('❗ لازم بريد حقيقي');
          }
          await setUserEmail(user.id, em);
        }

        // كلمة سر الحذف لو اتكتبت
        if (delpass.trim()) {
          await setDeletePass(user.id, delpass.trim());
        }

        // تغيير كلمة سر الدخول لو اتكتبت
        if (pass) {
          if (pass.length < 8) { setBusy(false); return setErr('❗ كلمة السر: 8 أحرف على الأقل'); }
          if (pass !== pass2) { setBusy(false); return setErr('❗ كلمتا السر غير متطابقتين'); }
          await setUserPassword(username, pass);
        }

        await setUserBranchAccess(user.id, allowedBranches, branch);
        await setUserTreasuryAccess(user.id, allowedTreasuries, defaultTreasury);
        show('✅ تم حفظ التعديلات والفروع والخزائن');
      }

      onSaved();
    } catch (e) {
      setErr('❌ ' + (e.message || 'حصل خطأ'));
    } finally {
      setBusy(false);
    }
  }

  const sel =
    'w-full rounded-xl border border-border bg-input px-3.5 py-2.5 text-sm text-text outline-none focus:border-accent';

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Input label="اسم المستخدم *" value={username}
               onChange={(e) => setUsername(e.target.value)} disabled={isEdit} />
        <Input label="الاسم الكامل *" value={display} onChange={(e) => setDisplay(e.target.value)} />
      </div>

      <div className="flex w-full flex-col gap-1.5">
        <label className="text-xs font-bold text-muted">الدور</label>
        <select className={sel} value={role} onChange={(e) => changeRole(e.target.value)}>
          {roleOptions.map((r) => <option key={r.v} value={r.v}>{r.l}</option>)}
        </select>
      </div>

      <div className="rounded-2xl border border-border bg-surface/50 p-3">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div><p className="text-xs font-black text-text">الفروع المسموح بالوصول إليها</p><p className="mt-1 text-[11px] text-muted">تُجلب ديناميكيًا من قائمة الفروع. الصلاحيات تحدد ما يستطيع المستخدم فعله داخل الفروع المختارة.</p></div>
          {!isAdmin && <div className="flex gap-2"><button type="button" onClick={() => setAllowedBranches([...branchesList])} className="text-[11px] font-black text-accent">تحديد الكل</button><button type="button" onClick={() => { setAllowedBranches([]); setBranch(''); }} className="text-[11px] font-black text-muted">إلغاء الكل</button></div>}
        </div>
        {isAdmin ? <div className="rounded-xl bg-accent-soft px-3 py-2 text-xs font-bold text-accent">👑 الأدمن لديه وصول تلقائي إلى جميع الفروع الحالية والمستقبلية.</div> : <>
          <div className="grid gap-2 sm:grid-cols-2">{branchesList.map((b) => <label key={b} className="flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm text-text"><input type="checkbox" checked={allowedBranches.includes(b)} onChange={() => toggleBranch(b)} className="size-4 accent-[var(--accent)]"/><span className="font-bold">{b}</span></label>)}</div>
          {!branchesList.length && <p className="text-xs text-muted">لا توجد فروع نشطة في الإعدادات.</p>}
          <div className="mt-3 flex w-full flex-col gap-1.5"><label className="text-xs font-bold text-muted">الفرع الافتراضي *</label><select className={sel} value={branch} onChange={(e) => setBranch(e.target.value)}><option value="">اختر الفرع الافتراضي</option>{allowedBranches.map((b) => <option key={b} value={b}>{b}</option>)}</select></div>
        </>}
      </div>

      <div className="rounded-2xl border border-border bg-surface/50 p-3">
        <div className="mb-3">
          <p className="text-xs font-black text-text">الخزائن المتاحة للمستخدم</p>
          <p className="mt-1 text-[11px] text-muted">تظهر خزائن الفروع المسموح بها فقط. فعّل الخزائن التي يستطيع المستخدم التعامل عليها وحدد خزينة افتراضية واحدة.</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {visibleTreasuries.map((t) => {
            const checked = allowedTreasuries.includes(Number(t.id));
            return <div key={t.id} className="rounded-xl border border-border bg-card px-3 py-2">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-text">
                <input type="checkbox" checked={checked} onChange={() => toggleTreasury(t.id)} className="size-4 accent-[var(--accent)]" />
                <span className="min-w-0 flex-1"><span className="block truncate font-bold">{t.name}</span><span className="num text-[10px] text-muted">{t.branch}{t.code ? ` · ${t.code}` : ''}</span></span>
              </label>
              <label className={`mt-2 flex items-center gap-2 border-t border-border pt-2 text-[11px] font-bold ${checked ? 'cursor-pointer text-accent' : 'cursor-not-allowed text-muted opacity-50'}`}>
                <input type="radio" name="default-treasury" disabled={!checked} checked={String(defaultTreasury) === String(t.id)} onChange={() => setDefaultTreasury(String(t.id))} className="size-4 accent-[var(--accent)]" />
                الخزينة الافتراضية
              </label>
            </div>;
          })}
        </div>
        {!visibleTreasuries.length && <p className="rounded-xl bg-card px-3 py-2 text-xs text-muted">لا توجد خزائن نشطة في الفروع المحددة لهذا المستخدم.</p>}
        {!!visibleTreasuries.length && !allowedTreasuries.length && <p className="mt-2 text-[11px] font-bold text-muted">لم يتم منح وصول لأي خزينة بعد.</p>}
      </div>

      <Input label="الهاتف" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" />

      <div className="rounded-2xl border border-border bg-surface/50 p-3">
        <label className="mb-2 block text-xs font-bold text-muted">صورة المستخدم</label>
        <div className="flex items-center gap-3">
          <div className="size-14 overflow-hidden rounded-full border border-border bg-card">
            {avatarFile || avatarUrl ? <img className="h-full w-full object-cover" src={avatarFile ? URL.createObjectURL(avatarFile) : avatarUrl} alt="" /> : <div className="flex h-full items-center justify-center text-lg font-black text-accent">{display?.charAt(0) || '؟'}</div>}
          </div>
          <input type="file" accept="image/*" onChange={(e) => setAvatarFile(e.target.files?.[0] || null)} className="min-w-0 flex-1 text-xs text-muted file:mr-2 file:rounded-lg file:border-0 file:bg-accent-soft file:px-3 file:py-2 file:font-bold file:text-accent" />
          {(avatarUrl || avatarFile) && <Button variant="plain" onClick={() => { setAvatarFile(null); setAvatarUrl(''); }}>حذف</Button>}
        </div>
      </div>

      {/* الباسورد */}
      {!isEdit ? (
        <div className="grid grid-cols-2 gap-3">
          <Input label="كلمة السر *" type="password" value={pass}
                 onChange={(e) => setPass(e.target.value)} autoComplete="new-password" />
          <Input label="تأكيد كلمة السر *" type="password" value={pass2}
                 onChange={(e) => setPass2(e.target.value)} autoComplete="new-password" />
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-surface/40 p-3">
          <p className="mb-2 text-[11px] font-bold text-muted">🔑 تغيير كلمة سر الدخول (سيبها فاضية عشان ما تتغيّرش)</p>
          <div className="grid grid-cols-2 gap-3">
            <Input label="كلمة سر جديدة" type="password" value={pass}
                   onChange={(e) => setPass(e.target.value)} autoComplete="new-password" placeholder="8 أحرف على الأقل" />
            <Input label="تأكيد كلمة السر" type="password" value={pass2}
                   onChange={(e) => setPass2(e.target.value)} autoComplete="new-password" placeholder="أعد كتابتها" />
          </div>
        </div>
      )}

      {/* الإيميل — مرتين */}
      <div className="grid grid-cols-2 gap-3">
        <Input label="البريد (للاستعادة)" type="email" value={email}
               onChange={(e) => setEmail(e.target.value)} placeholder="اختياري" />
        <Input label="تأكيد البريد" type="email" value={email2}
               onChange={(e) => setEmail2(e.target.value)} placeholder="أعد كتابته" />
      </div>

      {/* كلمة سر الحذف */}
      <Input label="كلمة سر الحذف/الأرشفة" type="password" value={delpass}
             onChange={(e) => setDelpass(e.target.value)}
             placeholder={isEdit ? 'سيبها فاضية عشان ما تتغيّرش' : 'اختياري'} />

      {/* ملاحظة: الصلاحيات بقت من الدور */}
      <div className="rounded-xl border border-border bg-surface/50 px-3 py-2 text-[11px] font-bold text-muted">
        ℹ️ صلاحيات الإدخال والتعديل والحذف والأرشفة بتتحدّد من <span className="text-accent">الدور</span> المختار فوق —
        عدّلها من صفحة «الأدوار والصلاحيات».
      </div>

      {/* إعدادات أمان فردية للموظف */}
      {!isAdmin && (
        <div className="rounded-2xl border border-border bg-surface/50 p-3">
          <p className="mb-2 text-xs font-bold text-muted">إعدادات أمان</p>
          <div className="space-y-2">
            {SECURITY.map(([k, label]) => (
              <label key={k} className="flex cursor-pointer items-center gap-2 text-sm text-text">
                <input type="checkbox" checked={perms[k]} onChange={() => togglePerm(k)}
                       className="size-4 accent-[var(--accent)]" />
                {label}
              </label>
            ))}
          </div>
        </div>
      )}
      {isAdmin && (
        <div className="rounded-xl bg-accent-soft px-3 py-2 text-[11px] font-bold text-accent">
          👑 الأدمن عنده كل الصلاحيات تلقائيًا
        </div>
      )}

      {err && (
        <p className="whitespace-pre-line rounded-xl bg-danger/10 px-3 py-2 text-center text-xs font-bold text-danger">
          {err}
        </p>
      )}

      <div className="flex gap-2 pt-1">
        <Button className="flex-1" loading={busy} onClick={save}>
          {busy ? 'جاري الحفظ...' : isEdit ? 'حفظ التعديلات' : '➕ إنشاء المستخدم'}
        </Button>
        <Button variant="plain" onClick={onCancel} disabled={busy}>إلغاء</Button>
      </div>
    </div>
  );
}
