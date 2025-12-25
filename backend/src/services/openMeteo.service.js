// src/services/openMeteo.service.js
const { fetchJson } = require("../helpers/http");

exports.getForecast = async ({ lat, lon, days }) => {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lon));
  url.searchParams.set("timezone", "auto");
  url.searchParams.set("forecast_days", String(days));
  url.searchParams.set(
    "daily",
    [
      "temperature_2m_max",
      "temperature_2m_min",
      "precipitation_sum",
      "precipitation_probability_max",
      "weathercode",
    ].join(",")
  );

  return fetchJson(url.toString(), { sourceName: "Open-Meteo" });
};
