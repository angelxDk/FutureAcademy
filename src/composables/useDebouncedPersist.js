import { onUnmounted } from 'vue';
import { useSyncStore } from '../stores/useSyncStore';

/**
 * Retorna uma função persistState com debounce LOCAL por instância de componente.
 *
 * Por que isso importa:
 *   - Cada componente tem seu próprio timer — ProfileSection digitando
 *     NÃO cancela o debounce de AgendaSection (isolamento de fila).
 *   - O timer é limpo automaticamente quando o componente é destruído.
 *
 * @param {number} wait - delay em ms (padrão 500ms)
 */
export function useDebouncedPersist(wait = 500) {
    const syncStore = useSyncStore();
    let _timer = null;

    const persist = () => {
        if (_timer) clearTimeout(_timer);
        _timer = setTimeout(() => {
            syncStore.persistState();
            _timer = null;
        }, wait);
    };

    // Limpeza automática ao desmontar o componente
    onUnmounted(() => {
        if (_timer) {
            clearTimeout(_timer);
            _timer = null;
        }
    });

    return persist;
}
