import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

const LiveSyncContext = createContext({ revision: 0, connected: false });

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
 * مرئية للمستخدم تغيرت. RLS في Supabase هي التي تقرر أصلًا من يتلقى الحدث.
 * عند الكتابة داخل حقل نؤجل إعادة التحميل حتى يخرج المستخدم من الحقل.
 */
export function LiveSyncProvider({ children }) {
  const { isAuthed } = useAuth();
  const [revision, setRevision] = useState(0);
  const [connected, setConnected] = useState(false);
  const pending = useRef(false);
  const channelRef = useRef(null);
  const tabId = useRef(`tab-${crypto.randomUUID?.() || Math.random().toString(36).slice(2)}`);

  const refresh = useCallback(() => {
    pending.current = false;
    setRevision((value) => value + 1);
  }, []);

  const receiveChange = useCallback(() => {
    if (hasActiveEditor()) {
      pending.current = true;
      return;
    }
    refresh();
  }, [refresh]);

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
