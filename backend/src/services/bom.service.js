// src/services/bom.service.js
const { fetchJson } = require("../helpers/http");

const BOM_BASE = "https://api.weather.bom.gov.au/v1";

exports.searchLocation = async (searchText) => {
  const url = new URL(`${BOM_BASE}/locations`);
  url.searchParams.set("search", searchText);

  const json = await fetchJson(url.toString(), { sourceName: "BoM locations" });

  const first = json && Array.isArray(json.data) ? json.data[0] : null;
  if (!first || !first.geohash) {
    const err = new Error(`No BoM location match for '${searchText}'`);
    err.statusCode = 404;
    throw err;
  }

  return {
    geohash: first.geohash,
    name: first.name || searchText,
  };
};

exports.getDaily = async (geohash) => {
  const url = `${BOM_BASE}/locations/${geohash}/forecasts/daily`;
  return fetchJson(url, { sourceName: "BoM daily" });
};

exports.getThreeHourlyBestEffort = async (geohash) => {
  // IMPORTANT: 3-hourly uses "modified geohash" (drop last char)
  const modifiedGeohash = geohash.slice(0, -1);
  const url = `${BOM_BASE}/locations/${modifiedGeohash}/forecasts/3-hourly`;

  try {
    return {
      modifiedGeohash,
      json: await fetchJson(url, { sourceName: "BoM 3-hourly", bestEffort: true }),
    };
  } catch (e) {
    // best-effort: return null instead of failing whole endpoint
    return { modifiedGeohash, json: null };
  }
};
