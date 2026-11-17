import { beforeEach, describe, expect, it, vi } from 'vitest';

const store: { data: Record<string, unknown> } = { data: {} };

vi.mock('./bridge', () => ({
  desktop: {
    readSettings: vi.fn(async () => ({ ...store.data })),
    writeSettings: vi.fn(async (patch: Record<string, unknown>) => {
      store.data = { ...store.data, ...patch };
    }),
  },
}));

import { defaultDeviceSettings, loadDeviceSettings, resetDeviceSettings, saveDeviceSettings } from './deviceSettings';

beforeEach(() => {
  store.data = {};
});

describe('deviceSettings', () => {
  it('저장된 값이 없으면 기본값(employee_cache "0000", id_save_check false, 나머지 "")', async () => {
    const s = await loadDeviceSettings();
    expect(s).toEqual(defaultDeviceSettings);
    expect(s.employee_cache).toBe('0000');
    expect(s.id_save_check).toBe(false);
    expect(s.factory_code).toBe('');
  });

  it('저장한 값은 다시 읽힌다', async () => {
    await saveDeviceSettings({ employee_cache: '1234', id_save_check: true });
    const s = await loadDeviceSettings();
    expect(s.employee_cache).toBe('1234');
    expect(s.id_save_check).toBe(true);
  });

  it('타입이 틀린 값(id_save_check: "yes")은 기본값으로', async () => {
    store.data = { id_save_check: 'yes', employee_cache: 5 };
    const s = await loadDeviceSettings();
    expect(s.id_save_check).toBe(false);
    expect(s.employee_cache).toBe('0000');
  });

  it('모르는 키는 무시한다', async () => {
    store.data = { something: 'x' };
    const s = await loadDeviceSettings();
    expect(s).toEqual(defaultDeviceSettings);
  });

  it('reset은 해당 키를 기본값으로 쓴다', async () => {
    await saveDeviceSettings({ factory_code: '000001', employee_dept: '생산' });
    await resetDeviceSettings(['factory_code']);
    const s = await loadDeviceSettings();
    expect(s.factory_code).toBe('');
    expect(s.employee_dept).toBe('생산');
  });
});
