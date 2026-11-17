import { useSyncStore } from '../stores/useSyncStore';

// Local recovery must happen immediately, including before a hard navigation.
// The sync store already debounces network writes; a second UI timer could lose edits.
export function useDebouncedPersist() {
    const syncStore = useSyncStore();
    return () => syncStore.persistState();
}
