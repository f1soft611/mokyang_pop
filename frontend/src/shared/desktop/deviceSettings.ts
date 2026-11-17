import { desktop } from './bridge';

/** 원본 Properties.Settings 와 같은 키 이름 (PC 단위 저장) */
export type DeviceSettings = {
  id_save_check: boolean;
  employee_cache: string;
  factory_code: string;
  employee_dept: string;
  device_work_code: string;
  device_work_name: string;
  device_workcenter_code: string;
  device_workcenter_name: string;
  device_equip_code: string;
  device_equip_name: string;
  device_worker_code: string;
  device_worker_name: string;
};

export const defaultDeviceSettings: DeviceSettings = {
  id_save_check: false,
  employee_cache: '0000', // 원본 Settings 기본값
  factory_code: '',
  employee_dept: '',
  device_work_code: '',
  device_work_name: '',
  device_workcenter_code: '',
  device_workcenter_name: '',
  device_equip_code: '',
  device_equip_name: '',
  device_worker_code: '',
  device_worker_name: '',
};

const KEYS = Object.keys(defaultDeviceSettings) as (keyof DeviceSettings)[];

/** 없는 키·타입이 틀린 키는 기본값 */
export async function loadDeviceSettings(): Promise<DeviceSettings> {
  let raw: Record<string, unknown> = {};
  try {
    raw = (await desktop.readSettings()) ?? {};
  } catch {
    raw = {};
  }
  const result = { ...defaultDeviceSettings } as Record<keyof DeviceSettings, unknown>;
  for (const key of KEYS) {
    if (typeof raw[key] === typeof defaultDeviceSettings[key]) {
      result[key] = raw[key];
    }
  }
  return result as DeviceSettings;
}

export async function saveDeviceSettings(patch: Partial<DeviceSettings>): Promise<void> {
  await desktop.writeSettings(patch);
}

/** 원본 cache.Reset: 해당 키를 기본값으로 */
export async function resetDeviceSettings(keys: (keyof DeviceSettings)[]): Promise<void> {
  const patch: Partial<Record<keyof DeviceSettings, unknown>> = {};
  for (const key of keys) patch[key] = defaultDeviceSettings[key];
  await desktop.writeSettings(patch);
}
