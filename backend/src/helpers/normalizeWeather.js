// src/helpers/normalizeWeather.js
function numOrNull(v) {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

exports.normalizeOpenMeteoDaily = (openMeteoRaw) => {
  const daily = openMeteoRaw && openMeteoRaw.daily;
  if (!daily || !Array.isArray(daily.time)) return [];

  const time = daily.time;
  const tmax = daily.temperature_2m_max || [];
  const tmin = daily.temperature_2m_min || [];
  const pprob = daily.precipitation_probability_max || [];
  const psum = daily.precipitation_sum || [];
  const wcode = daily.weathercode || [];

  return time.map((date, i) => ({
    date,
    source: "open-meteo",
    temperatureMaxC: numOrNull(tmax[i]),
    temperatureMinC: numOrNull(tmin[i]),
    precipitationProbabilityMaxPct: numOrNull(pprob[i]),
    precipitationSumMm: numOrNull(psum[i]),
    weatherCode: numOrNull(wcode[i]),
  }));
};

exports.normalizeBomDaily = (bomDailyRaw) => {
  const arr = bomDailyRaw && bomDailyRaw.data;
  if (!Array.isArray(arr)) return [];

  return arr.map((item) => ({
    date: item && item.date ? item.date : null,
    source: "bom",
    temperatureMaxC: numOrNull(item && item.temp_max),
    temperatureMinC: numOrNull(item && item.temp_min),
    rainChancePct: numOrNull(item && item.rain && item.rain.chance),
    icon: item && item.icon_descriptor ? item.icon_descriptor : null,
    shortText: item && item.short_text ? item.short_text : null,
    extendedText: item && item.extended_text ? item.extended_text : null,
    raw: item,
  }));
};

exports.normalizeBomThreeHourly = (bom3hRaw) => {
  const arr = bom3hRaw && bom3hRaw.data;
  if (!Array.isArray(arr)) return [];

  return arr.map((item) => ({
    dateTime: item && item.time ? item.time : null,
    source: "bom",
    raw: item,
  }));
};
