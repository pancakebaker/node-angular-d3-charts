const { requireNumber, requireStringMin, requireIntInRange } = require("../helpers/validate");
const weatherChartsService = require("../services/weatherCharts.service");

// Default demo location (Sydney) if frontend doesn't pass query params yet
const DEFAULTS = {
  lat: -33.8688,
  lon: 151.2093,
  bomSearch: "Sydney",
  days: 7,
};

// /api/barchart?lat=...&lon=...&bomSearch=...&days=...
exports.getBarChart = async (req, res) => {
  try {
    const lat = req.query.lat !== undefined ? requireNumber(req.query.lat, "lat") : DEFAULTS.lat;
    const lon = req.query.lon !== undefined ? requireNumber(req.query.lon, "lon") : DEFAULTS.lon;
    const bomSearch = req.query.bomSearch !== undefined
      ? requireStringMin(req.query.bomSearch, "bomSearch", 3)
      : DEFAULTS.bomSearch;
    const days = req.query.days !== undefined
      ? requireIntInRange(req.query.days, "days", 1, 16)
      : DEFAULTS.days;

    const payload = await weatherChartsService.getWeatherBarChart({ lat, lon, bomSearch, days });
    return res.json(payload);
  } catch (err) {
    const status = err.statusCode && Number.isInteger(err.statusCode) ? err.statusCode : 500;
    return res.status(status).json({
      message: status === 500 ? "Failed to build bar chart data" : err.message,
      error: status === 500 ? String(err.message ?? err) : undefined,
    });
  }
};

// /api/piechart?lat=...&lon=...&bomSearch=...&days=...
exports.getPieChart = async (req, res) => {
  try {
    const lat = req.query.lat !== undefined ? requireNumber(req.query.lat, "lat") : DEFAULTS.lat;
    const lon = req.query.lon !== undefined ? requireNumber(req.query.lon, "lon") : DEFAULTS.lon;
    const bomSearch = req.query.bomSearch !== undefined
      ? requireStringMin(req.query.bomSearch, "bomSearch", 3)
      : DEFAULTS.bomSearch;
    const days = req.query.days !== undefined
      ? requireIntInRange(req.query.days, "days", 1, 16)
      : DEFAULTS.days;

    const payload = await weatherChartsService.getWeatherPieChart({ lat, lon, bomSearch, days });
    return res.json(payload);
  } catch (err) {
    const status = err.statusCode && Number.isInteger(err.statusCode) ? err.statusCode : 500;
    return res.status(status).json({
      message: status === 500 ? "Failed to build pie chart data" : err.message,
      error: status === 500 ? String(err.message ?? err) : undefined,
    });
  }
};
