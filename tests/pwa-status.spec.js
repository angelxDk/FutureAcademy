import { beforeEach, expect, it, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { nextTick } from 'vue';

const mocks = vi.hoisted(() => ({ flush: vi.fn(), update: vi.fn(), sync: { pending: false }, refresh: null }));
vi.mock('../src/stores/useSyncStore', () => ({ useSyncStore: () => ({ flushPersist: mocks.flush, get pending() { return mocks.sync.pending; } }) }));
vi.mock('virtual:pwa-register/vue', async () => {
  const { ref } = await import('vue');
  mocks.refresh = ref(true);
  return { useRegisterSW: () => ({ needRefresh: mocks.refresh, updateServiceWorker: mocks.update }) };
});
import PwaStatus from '../src/components/PwaStatus.vue';

beforeEach(() => {
  mocks.flush.mockReset().mockResolvedValue(true);
  mocks.update.mockReset().mockResolvedValue(undefined);
  mocks.sync.pending = false; mocks.refresh.value = true;
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
});

it('does not activate an update while a save remains pending', async () => {
  mocks.flush.mockImplementationOnce(async () => { mocks.sync.pending = true; return false; });
  const wrapper = mount(PwaStatus);
  try {
    await wrapper.findAll('button')[0].trigger('click'); await flushPromises();
    expect(mocks.flush).toHaveBeenCalledOnce(); expect(mocks.update).not.toHaveBeenCalled();
    expect(wrapper.get('[role="alert"]').text()).toContain('Sincronize suas alterações');
  } finally { wrapper.unmount(); }
});

it('waits for a successful flush before activating the new worker', async () => {
  const wrapper = mount(PwaStatus);
  try {
    await wrapper.findAll('button')[0].trigger('click'); await flushPromises();
    expect(mocks.update).toHaveBeenCalledWith(true);
    expect(mocks.flush.mock.invocationCallOrder[0]).toBeLessThan(mocks.update.mock.invocationCallOrder[0]);
  } finally { wrapper.unmount(); }
});

it('shows a later update even if an earlier notice was dismissed', async () => {
  const wrapper = mount(PwaStatus);
  try {
    await wrapper.findAll('button')[1].trigger('click');
    expect(wrapper.find('aside').exists()).toBe(false);
    expect(mocks.refresh.value).toBe(false);
    mocks.refresh.value = true; await nextTick();
    expect(wrapper.text()).toContain('Uma nova versão está pronta');
  } finally { wrapper.unmount(); }
});
