import "server-only";
import { env } from "@/lib/env";
import type {
  SolarmanAlertResponse,
  SolarmanBaseResponse,
  SolarmanCurrentDataResponse,
  SolarmanDeviceListResponse,
  SolarmanHistoryResponse,
  SolarmanStationListResponse,
  SolarmanTokenResponse,
} from "./types";

export class SolarmanError extends Error {
  constructor(
    message: string,
    readonly code?: string | null,
  ) {
    super(message);
    this.name = "SolarmanError";
  }
}

// Tokens last 60 days; keep one per server process and only log in again when it is close to expiry.
let token: { value: string; expiresAt: number } | undefined;
let tokenPromise: Promise<string> | undefined;

async function getToken(): Promise<string> {
  if (token && Date.now() < token.expiresAt - 60 * 60 * 1000) return token.value;
  // Concurrent callers share one login request.
  tokenPromise ??= login().finally(() => {
    tokenPromise = undefined;
  });
  return tokenPromise;
}

async function login(): Promise<string> {
  const e = env();
  const body: Record<string, unknown> = {
    appSecret: e.SOLARMAN_APP_SECRET,
    email: e.SOLARMAN_EMAIL,
    password: e.SOLARMAN_PASSWORD_SHA256,
  };
  if (e.SOLARMAN_ORG_ID) body.orgId = Number(e.SOLARMAN_ORG_ID);

  const res = await fetch(`${e.SOLARMAN_BASE_URL}/account/v1.0/token?appId=${e.SOLARMAN_APP_ID}&language=en`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const json = (await res.json()) as SolarmanTokenResponse;
  if (!json.success || !json.access_token) {
    throw new SolarmanError(`Solarman login failed: ${json.msg ?? res.status}`, json.code);
  }
  token = { value: json.access_token, expiresAt: Date.now() + Number(json.expires_in ?? 0) * 1000 };
  return token.value;
}

async function call<T extends { success: boolean; code?: string | null; msg?: string | null }>(
  path: string,
  body: Record<string, unknown>,
  retried = false,
): Promise<T> {
  const e = env();
  const res = await fetch(`${e.SOLARMAN_BASE_URL}${path}?language=en`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `bearer ${await getToken()}` },
    body: JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  const json = (await res.json()) as T;
  if (!json.success) {
    // Token rejected (expired or revoked): log in once more and retry.
    if (!retried && (json.code === "2101019" || json.code === "2101017")) {
      token = undefined;
      return call<T>(path, body, true);
    }
    throw new SolarmanError(`Solarman ${path} failed: ${json.msg ?? res.status}`, json.code);
  }
  return json;
}

export const solarman = {
  stationList: () => call<SolarmanStationListResponse>("/station/v1.0/list", { page: 1, size: 100 }),

  stationBase: (stationId: number) => call<SolarmanBaseResponse>("/station/v1.0/base", { stationId }),

  /** Five-minute readings for one local day ("YYYY-MM-DD"). */
  stationFrames: (stationId: number, dateKey: string) =>
    call<SolarmanHistoryResponse>("/station/v1.0/history", {
      stationId,
      timeType: 1,
      startTime: dateKey,
      endTime: dateKey,
    }),

  /** Daily totals, at most 30 days per request. */
  stationDaily: (stationId: number, startKey: string, endKey: string) =>
    call<SolarmanHistoryResponse>("/station/v1.0/history", {
      stationId,
      timeType: 2,
      startTime: startKey,
      endTime: endKey,
    }),

  /** Monthly totals ("YYYY-MM"), at most 12 months per request. */
  stationMonthly: (stationId: number, startMonth: string, endMonth: string) =>
    call<SolarmanHistoryResponse>("/station/v1.0/history", {
      stationId,
      timeType: 3,
      startTime: startMonth,
      endTime: endMonth,
    }),

  stationDevices: (stationId: number) => call<SolarmanDeviceListResponse>("/station/v1.0/device", { stationId, page: 1, size: 100 }),

  stationAlerts: (stationId: number, startKey: string, endKey: string) =>
    call<SolarmanAlertResponse>("/station/v1.0/alert", {
      stationId,
      startTime: startKey,
      endTime: endKey,
      page: 1,
      size: 50,
    }),

  deviceCurrent: (deviceSn: string) => call<SolarmanCurrentDataResponse>("/device/v1.0/currentData", { deviceSn }),
};
