import { useEffect, useMemo, useState } from 'react';
import { fetchSetting } from '../lib/api';
import { supabase } from '../lib/supabase';
import { usePermissions } from '../context/PermissionContext';

export function useAllowedBranches() {
  const { can, userId, primaryBranch } = usePermissions();
  const [allBranches, setAllBranches] = useState([]);
  const [extraBranches, setExtraBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const all = can('can_erp_all_branches');

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const branches = await fetchSetting('branches');
        if (live) setAllBranches(Array.isArray(branches) ? branches.filter(Boolean) : []);
        if (userId && !all) {
          const { data } = await supabase.from('user_branch_access').select('branch').eq('user_id', userId);
          if (live) setExtraBranches((data || []).map(x => x.branch).filter(Boolean));
        } else if (live) setExtraBranches([]);
      } finally { if (live) setLoading(false); }
    })();
    return () => { live = false; };
  }, [userId, all]);

  const branches = useMemo(() => {
    if (all) return [...new Set(allBranches)];
    const allowed = new Set([primaryBranch, ...extraBranches].filter(Boolean));
    return allBranches.filter(b => allowed.has(b));
  }, [all, allBranches, primaryBranch, extraBranches]);

  const canAccessBranch = (branch) => !!branch && (all || branches.includes(branch));
  return { branches, loading, canAccessBranch, canSeeAllBranches: all };
}
