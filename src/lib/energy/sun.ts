// Sunrise / sunset from latitude & longitude (NOAA's simplified solar equations).
// Accurate to a few minutes, which is plenty for "is it daytime?" and the sky arc.

const rad = Math.PI / 180;

export interface SunTimes {
  sunrise: Date;
  sunset: Date;
}

export function sunTimes(date: Date, lat: number, lng: number): SunTimes {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  const dayOfYear = Math.floor((date.getTime() - start) / 86_400_000);
  const gamma = ((2 * Math.PI) / 365) * (dayOfYear - 1);

  const eqTime =
    229.18 * (0.000075 + 0.001868 * Math.cos(gamma) - 0.032077 * Math.sin(gamma) - 0.014615 * Math.cos(2 * gamma) - 0.040849 * Math.sin(2 * gamma));
  const decl =
    0.006918 -
    0.399912 * Math.cos(gamma) +
    0.070257 * Math.sin(gamma) -
    0.006758 * Math.cos(2 * gamma) +
    0.000907 * Math.sin(2 * gamma) -
    0.002697 * Math.cos(3 * gamma) +
    0.00148 * Math.sin(3 * gamma);

  const cosHa = Math.cos(90.833 * rad) / (Math.cos(lat * rad) * Math.cos(decl)) - Math.tan(lat * rad) * Math.tan(decl);
  const ha = Math.acos(Math.min(1, Math.max(-1, cosHa))) / rad;

  const midnight = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const sunriseMin = 720 - 4 * (lng + ha) - eqTime;
  const sunsetMin = 720 - 4 * (lng - ha) - eqTime;
  return { sunrise: new Date(midnight + sunriseMin * 60_000), sunset: new Date(midnight + sunsetMin * 60_000) };
}

/** 0 at sunrise, 1 at sunset; < 0 before sunrise, > 1 after sunset. */
export function dayProgress(now: Date, times: SunTimes): number {
  return (now.getTime() - times.sunrise.getTime()) / (times.sunset.getTime() - times.sunrise.getTime());
}
