// src/services/weatherAggregate.service.js
const openMeteoService = require("./openMeteo.service");
const bomService = require("./bom.service");
const { DailyCache } = require("../utils/dailyCache");
const {
  normalizeOpenMeteoDaily,
  normalizeBomDaily,
  normalizeBomThreeHourly,
} = require("../helpers/normalizeWeather");

// In-memory cache that expires at next local midnight.
// Prevents repeating the same upstream requests throughout the day.
const cache = new DailyCache();

exports.getCombined = async ({ lat, lon, bomSearch, days }) => {
  const openKey = cache.makeKey({ provider: "open-meteo", lat, lon, days });
  const bomLocKey = cache.makeKey({ provider: "bom", op: "locations", q: bomSearch });

  const [openMeteoRaw, bomLocation] = await Promise.all([
    cache.getOrSet(openKey, () => openMeteoService.getForecast({ lat, lon, days })),
    cache.getOrSet(bomLocKey, () => bomService.searchLocation(bomSearch)),
  ]);

  const bomDailyKey = cache.makeKey({ provider: "bom", op: "daily", geohash: bomLocation.geohash });
  const bom3hKey = cache.makeKey({ provider: "bom", op: "3-hourly", geohash: bomLocation.geohash });

  const [bomDailyRaw, bomThreeHourly] = await Promise.all([
    cache.getOrSet(bomDailyKey, () => bomService.getDaily(bomLocation.geohash)),
    cache.getOrSet(bom3hKey, () => bomService.getThreeHourlyBestEffort(bomLocation.geohash)),
  ]);

  const combinedDaily = [
    ...normalizeOpenMeteoDaily(openMeteoRaw),
    ...normalizeBomDaily(bomDailyRaw),
  ];

  const combinedThreeHourly = [
    ...normalizeBomThreeHourly(bomThreeHourly.json),
  ];

  return {
    location: {
      latitude: lat,
      longitude: lon,
      bomSearch,
      bomGeohash: bomLocation.geohash,
      bomModifiedGeohash: bomThreeHourly.modifiedGeohash,
      bomName: bomLocation.name,
    },
    generatedAtUtc: new Date().toISOString(),
    sources: {
      openMeteo: { source: "open-meteo", raw: openMeteoRaw },
      bom: {
        source: "bom",
        location: { geohash: bomLocation.geohash, name: bomLocation.name },
        raw: {
          daily: bomDailyRaw,
          threeHourly: bomThreeHourly.json,
        },
      },
    },
    combined: {
      daily: combinedDaily,
      threeHourly: combinedThreeHourly,
    },
  };
};
