// Response shapes from the Solarman OpenAPI (only the fields this app reads).
// See docs/solarman-api/ for the full reference.

interface Envelope {
  success: boolean;
  code?: string | null;
  msg?: string | null;
  requestId?: string;
}

export interface SolarmanTokenResponse extends Envelope {
  access_token?: string;
  expires_in?: string | number;
}

export interface SolarmanStation {
  id: number;
  name: string;
  installedCapacity?: number | null;
  locationAddress?: string | null;
  locationLat?: number | null;
  locationLng?: number | null;
  regionTimezone?: string | null;
  startOperatingTime?: number | null;
}

export interface SolarmanStationListResponse extends Envelope {
  total?: number;
  stationList?: SolarmanStation[] | null;
}

export interface SolarmanBaseResponse extends Envelope, Partial<SolarmanStation> {
  region?: { timezone?: string | null } | null;
}

/** One row from /station/v1.0/history. Power fields are watts, energy fields are kWh. */
export interface SolarmanHistoryItem {
  dateTime?: number | null;
  year?: number | null;
  month?: number | null;
  day?: number | null;
  generationPower?: number | null;
  usePower?: number | null;
  batteryPower?: number | null;
  chargePower?: number | null;
  dischargePower?: number | null;
  purchasePower?: number | null;
  wirePower?: number | null;
  batterySoc?: number | null;
  generationValue?: number | null;
  useValue?: number | null;
  buyValue?: number | null;
  gridValue?: number | null;
  chargeValue?: number | null;
  dischargeValue?: number | null;
}

export interface SolarmanHistoryResponse extends Envelope {
  stationDataItems?: SolarmanHistoryItem[] | null;
}

export interface SolarmanDevice {
  deviceSn: string;
  deviceId?: number;
  deviceType: string;
  /** 0 offline, 1 online, 2 alarm */
  connectStatus?: number | null;
  collectionTime?: number | null;
}

export interface SolarmanDeviceListResponse extends Envelope {
  deviceListItems?: SolarmanDevice[] | null;
}

export interface SolarmanDataPoint {
  key: string;
  value: string;
  unit?: string | null;
  name: string;
}

export interface SolarmanCurrentDataResponse extends Envelope {
  deviceSn?: string;
  deviceType?: string;
  /** 1 online, 2 alarm, 3 offline */
  deviceState?: number | null;
  collectionTime?: number | null;
  dataList?: SolarmanDataPoint[] | null;
}

export interface SolarmanStationAlert {
  deviceSn?: string;
  deviceType?: string;
  ruleId?: number;
  showName?: string;
  addr?: string;
  code?: string;
  /** 0 notice, 1 warning, 2 fault */
  level?: number;
  alertTime?: number;
}

export interface SolarmanAlertResponse extends Envelope {
  total?: number;
  stationAlertItems?: SolarmanStationAlert[] | null;
}
