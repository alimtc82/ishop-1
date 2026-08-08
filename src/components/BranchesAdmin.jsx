import { useEffect, useState } from 'react';
import { useToast } from '../context/ToastContext';
import { fetchSetting } from '../lib/api';
import { saveSetting } from '../lib/adminApi';
import { supabase } from '../lib/supabase';
import {
  emptyBranchProfile,
  fetchBranchProfiles,
  saveBranchProfiles,
  uploadBranchAsset,
} from '../lib/branchProfiles';
import Input from './ui/Input';
import Button from './ui/Button';

export default function BranchesAdmin() {
  const { show } = useToast();
  const [branches, setBranches] = useState([]);
  const [profiles, setProfiles] = useState({});
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [editIdx, setEditIdx] = useState(-1);
  const [editVal, setEditVal] = useState('');
  const [profileBranch, setProfileBranch] = useState('');

  useEffect(() => {
    Promise.all([fetchSetting('branches'), fetchBranchProfiles()])
      .then(([list, details]) => {
        setBranches(Array.isArray(list) ? list : []);
        setProfiles(details);
      })
      .finally(() => setLoading(false));
  }, []);

  const profile = (branch) => ({ ...emptyBranchProfile(), ...(profiles[branch] || {}) });
  const patchProfile = (branch, values) =>
    setProfiles((current) => ({ ...current, [branch]: { ...profile(branch), ...values } }));

  async function persist(list) {
    setBusy(true);
    try {
      await saveSetting('branches', list);
      setBranches(list);
    } catch (e) {
      show('❌ ' + (e.message || ''), 'error');
    } finally {
      setBusy(false);
    }
  }

  function add() {
    const branch = name.trim();
    if (!branch || branches.some((x) => x.toLowerCase() === branch.toLowerCase())) return;
    persist([...branches, branch]);
    setName('');
    setProfileBranch(branch);
    show('✅ اتضاف الفرع — أكمل الهاتف واللوجو والختم');
  }

  async function saveEdit(i) {
    const value = editVal.trim();
    const old = branches[i];
    if (!value || value === old) return setEditIdx(-1);
    if (branches.some((x, idx) => idx !== i && x.toLowerCase() === value.toLowerCase()))
      return show('❌ فيه فرع بنفس الاسم بالفعل', 'error');
    setBusy(true);
    try {
      const { error } = await supabase.rpc('rename_branch', { p_old: old, p_new: value });
      if (error) throw error;
      const nextBranches = branches.map((x, idx) => (idx === i ? value : x));
      const nextProfiles = { ...profiles, [value]: profile(old) };
      delete nextProfiles[old];
      await Promise.all([saveSetting('branches', nextBranches), saveBranchProfiles(nextProfiles)]);
      setBranches(nextBranches);
      setProfiles(nextProfiles);
      if (profileBranch === old) setProfileBranch(value);
      setEditIdx(-1);
      show('✅ تم تعديل اسم الفرع وكل بياناته المرتبطة');
    } catch (e) {
      show('❌ ' + (e.message || ''), 'error');
    } finally {
      setBusy(false);
    }
  }

  async function saveProfile(branch) {
    setBusy(true);
    try {
      await saveBranchProfiles(profiles);
      show('✅ تم حفظ بيانات الفرع');
    } catch (e) {
      show('❌ ' + (e.message || ''), 'error');
    } finally {
      setBusy(false);
    }
  }

  async function upload(branch, kind, file) {
    if (!file) return;
    setBusy(true);
    try {
      const url = await uploadBranchAsset(file, branch, kind);
      const next = { ...profiles, [branch]: { ...profile(branch), [`${kind}_url`]: url } };
      await saveBranchProfiles(next);
      setProfiles(next);
      show(`✅ تم ضغط ورفع ${kind === 'logo' ? 'اللوجو' : 'الختم'}`);
    } catch (e) {
      show('❌ ' + (e.message || ''), 'error');
    } finally {
      setBusy(false);
    }
  }

  async function remove(branch) {
    if (!window.confirm(`حذف فرع «${branch}»؟`)) return;
    const nextProfiles = { ...profiles };
    delete nextProfiles[branch];
    await Promise.all([
      saveSetting(
        'branches',
        branches.filter((x) => x !== branch),
      ),
      saveBranchProfiles(nextProfiles),
    ]);
    setBranches((current) => current.filter((x) => x !== branch));
    setProfiles(nextProfiles);
    if (profileBranch === branch) setProfileBranch('');
    show('🗑️ اتحذف');
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black text-accent">الفروع</h1>
        <p className="mt-1 text-sm text-muted">
          بيانات الهوية المستخدمة تلقائيًا في الفواتير والمستندات وإيصالات الأرشفة.
        </p>
      </div>
      <div className="rounded-3xl border border-border bg-card p-4">
        <p className="mb-2 text-sm font-black text-text">➕ فرع جديد</p>
        <div className="flex gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
            placeholder="اسم الفرع"
            className="flex-1"
          />
          <Button onClick={add} loading={busy} disabled={!name.trim()}>
            إضافة
          </Button>
        </div>
      </div>
      {loading ? (
        <div className="h-20 animate-pulse rounded-2xl bg-surface" />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {branches.map((branch, i) => {
            const details = profile(branch);
            const open = profileBranch === branch;
            return (
              <div key={branch} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-center gap-2">
                  {details.logo_url ? (
                    <img
                      src={details.logo_url}
                      alt=""
                      className="h-14 w-14 rounded-xl object-contain"
                    />
                  ) : (
                    <span className="grid h-14 w-14 place-items-center rounded-xl bg-surface text-2xl">
                      🏬
                    </span>
                  )}
                  {editIdx === i ? (
                    <>
                      <Input
                        value={editVal}
                        onChange={(e) => setEditVal(e.target.value)}
                        className="flex-1"
                      />
                      <Button onClick={() => saveEdit(i)} loading={busy}>
                        حفظ
                      </Button>
                    </>
                  ) : (
                    <div className="min-w-0 flex-1">
                      <b className="block truncate">{branch}</b>
                      <span className="text-xs text-muted">
                        {details.phone || 'لم يسجل هاتف الفرع'}
                      </span>
                    </div>
                  )}
                  <button
                    onClick={() => setProfileBranch(open ? '' : branch)}
                    className="rounded-lg border border-accent-line px-3 py-2 text-xs font-black text-accent"
                  >
                    {open ? 'إغلاق' : 'البيانات'}
                  </button>
                </div>
                {open && (
                  <div className="mt-4 space-y-3 border-t border-border pt-4">
                    <Input
                      label="رقم هاتف الفرع"
                      value={details.phone}
                      onChange={(e) => patchProfile(branch, { phone: e.target.value })}
                      inputMode="tel"
                    />
                    <Input
                      label="عنوان الفرع"
                      value={details.address}
                      onChange={(e) => patchProfile(branch, { address: e.target.value })}
                    />
                    <label className="flex items-center gap-2 text-xs font-bold">
                      <input
                        type="checkbox"
                        checked={details.show_address_on_documents}
                        onChange={(e) =>
                          patchProfile(branch, { show_address_on_documents: e.target.checked })
                        }
                      />{' '}
                      إظهار العنوان في المستندات والفواتير
                    </label>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="rounded-xl border border-border p-3 text-xs font-bold">
                        لوجو الفرع
                        <input
                          type="file"
                          accept="image/*"
                          disabled={busy}
                          onChange={(e) => upload(branch, 'logo', e.target.files?.[0])}
                          className="mt-2 block w-full text-xs"
                        />
                        {details.logo_url && (
                          <img
                            src={details.logo_url}
                            alt=""
                            className="mt-2 h-20 w-full object-contain"
                          />
                        )}
                      </label>
                      <label className="rounded-xl border border-border p-3 text-xs font-bold">
                        ختم الفرع
                        <input
                          type="file"
                          accept="image/*"
                          disabled={busy}
                          onChange={(e) => upload(branch, 'stamp', e.target.files?.[0])}
                          className="mt-2 block w-full text-xs"
                        />
                        {details.stamp_url && (
                          <img
                            src={details.stamp_url}
                            alt=""
                            className="mt-2 h-20 w-full object-contain"
                          />
                        )}
                      </label>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button onClick={() => saveProfile(branch)} loading={busy}>
                        حفظ بيانات الفرع
                      </Button>
                      <button
                        onClick={() => {
                          setEditIdx(i);
                          setEditVal(branch);
                        }}
                        className="rounded-lg border border-border px-3 py-2 text-xs font-bold"
                      >
                        تعديل الاسم
                      </button>
                      <button
                        onClick={() => remove(branch)}
                        className="rounded-lg border border-danger/25 px-3 py-2 text-xs font-bold text-danger"
                      >
                        حذف الفرع
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
