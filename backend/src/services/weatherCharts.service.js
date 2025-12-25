// src/services/weatherCharts.service.js
const weatherAggregateService = require("./weatherAggregate.service");

function numOrNull(v) {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function toYmd(dateStr) {
    if (!dateStr) return null;
    // Works for "YYYY-MM-DD" and ISO strings like "2025-12-24T13:00:00Z"
    return String(dateStr).slice(0, 10);
}

exports.getWeatherBarChart = async ({ lat, lon, bomSearch, days }) => {
    const combined = await weatherAggregateService.getCombined({ lat, lon, bomSearch, days });

    const open = combined.combined.daily.filter(d => d.source === "open-meteo");
    const bom = combined.combined.daily.filter(d => d.source === "bom");

    const byDate = new Map();

    for (const d of open) {
        const date = toYmd(d.date);
        if (!date) continue;
        byDate.set(date, { date, openMeteo: d.temperatureMaxC });
    }

    for (const d of bom) {
        const date = toYmd(d.date);
        if (!date) continue;
        if (!byDate.has(date)) byDate.set(date, { date });
        byDate.get(date).bom = d.temperatureMaxC;
    }

    const data = Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));

    return { title: `Daily Max Temperature (°C) • ${combined.location.bomName}`, data };

};

exports.getWeatherPieChart = async ({ lat, lon, bomSearch, days }) => {
  const combined = await weatherAggregateService.getCombined({ lat, lon, bomSearch, days });

  const open = (combined.combined.daily || []).filter((d) => d.source === "open-meteo");
  const bom  = (combined.combined.daily || []).filter((d) => d.source === "bom");

  const byDate = new Map();

  for (const d of open) {
    const date = toYmd(d.date);
    if (!date) continue;
    byDate.set(date, { date, openMeteo: numOrNull(d.temperatureMaxC) });
  }

  for (const d of bom) {
    const date = toYmd(d.date);
    if (!date) continue;
    if (!byDate.has(date)) byDate.set(date, { date });
    byDate.get(date).bom = numOrNull(d.temperatureMaxC);
  }

  const data = Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));

  return {
    title: `Temp Share by Day • ${combined.location.bomName}`,
    data, // [{ date, openMeteo, bom }]
    meta: { unit: "°C", sources: ["open-meteo", "bom"] },
  };
};

