import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

const LiveSyncContext = createContext({ revision: 0, connected: false });

/**
 * جداول تُكتب بكثرة لكن لا تُعرض لحظيًا لأي مستخدم → لا داعي لإطلاق تحديث عندها.
 * (سجلّ التدقيق مثلًا يُكتب مع كل عملية، وتحديثه كان يسبب إعادة جلب بلا فائدة.)
 */
const IGNORE_TABLES = new Set([
  'erp_audit_log',
]);

/** تجميع دفعات الأحداث المتتالية في تحديث واحد بدل تحديث لكل حدث. */
const DEBOUNCE_MS = 500;

function hasActiveEditor() {
  const el = document.activeElement;
  return !!el && (
    el.matches?.('input:not([type="checkbox"]):not([type="radio"]), textarea, select, [contenteditable="true"]')
  );
}

/**
 * مزامنة شاشات الموظفين بين التبويبات.
 *
 * لا تمرر هذه الطبقة أي بيانات بين التبويبات؛ تصل فقط إشارة أن بيانات
 * مرئية للمستخدم تغيّرت، فتعيد الشاشات جلب بياناتها فقط (بدون remount
 * ولا إعادة تحميل للصور). RLS في Supabase هي التي تقرر أصلًا من يتلقى الحدث.
 * عند الكتابة داخل حقل نؤجل التحديث حتى يخرج المستخدم من الحقل.
 */
export function LiveSyncProvider({ children }) {
  const { isAuthed } = useAuth();
  const [revision, setRevision] = useState(0);
  const [connected, setConnected] = useState(false);
  const pending = useRef(false);
  const debounceTimer = useRef(null);
  const channelRef = useRef(null);
  const tabId = useRef(`tab-${crypto.randomUUID?.() || Math.random().toString(36).slice(2)}`);

  const refresh = useCallback(() => {
    pending.current = false;
    setRevision((value) => value + 1);
  }, []);

  /** يؤجّل عند وجود حقل نشط، ويجمّع الدفعات المتتالية في تحديث واحد. */
  const scheduleRefresh = useCallback(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      debounceTimer.current = null;
      if (hasActiveEditor()) {
        pending.current = true;
        return;
      }
      refresh();
    }, DEBOUNCE_MS);
  }, [refresh]);

  const receiveChange = useCallback((payload) => {
    const table = payload?.table;
    if (table && IGNORE_TABLES.has(table)) return; // تجاهل ضوضاء السجلّ
    scheduleRefresh();
  }, [scheduleRefresh]);

  useEffect(() => {
    const flushWhenSafe = () => {
      window.setTimeout(() => {
        if (pending.current && !hasActiveEditor()) refresh();
      }, 0);
    };
    window.addEventListener('focusout', flushWhenSafe);
    window.addEventListener('focus', flushWhenSafe);
    return () => {
      window.removeEventListener('focusout', flushWhenSafe);
      window.removeEventListener('focus', flushWhenSafe);
    };
  }, [refresh]);

  useEffect(() => {
    if (!isAuthed) {
      setConnected(false);
      return undefined;
    }

    const channel = supabase
      .channel(`ishop-live-sync-${tabId.current}`)
      .on('postgres_changes', { event: '*', schema: 'public' }, receiveChange)
      .subscribe((status) => setConnected(status === 'SUBSCRIBED'));

    channelRef.current = channel;
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      channelRef.current = null;
      setConnected(false);
      supabase.removeChannel(channel);
    };
  }, [isAuthed, receiveChange]);

  return (
    <LiveSyncContext.Provider value={{ revision, connected }}>
      {children}
    </LiveSyncContext.Provider>
  );
}

export function useLiveSync() {
  return useContext(LiveSyncContext);
}
