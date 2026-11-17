import { requireSupabase } from './supabase';
// Poll only while the view is open. Authorization is checked by PostgreSQL on
// every refresh, including after membership removal; no cached access grant.
export function subscribeCommunity(groupId, onData, onError) {
  let active = true, timer, request;
  async function refresh() {
    if (!active) return;
    request = new AbortController();
    try {
      if (document.visibilityState !== 'hidden') {
        const { data, error } = await requireSupabase().rpc('app_read_communities', { p_group: groupId || null }).abortSignal(request.signal);
        if (error) throw error;
        if (active) onData(data || []);
      }
    } catch (error) { if (active) { onData([]); onError(error); } }
    finally { if (active) timer = setTimeout(refresh, 5000); }
  }
  void refresh();
  return () => { active = false; clearTimeout(timer); request?.abort(); };
}
