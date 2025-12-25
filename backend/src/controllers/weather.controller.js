// src/controllers/weather.controller.js
const { requireNumber, requireStringMin, requireIntInRange } = require("../helpers/validate");
const weatherAggregateService = require("../services/weatherAggregate.service");

exports.getCombinedWeather = async (req, res) => {
  try {
    const lat = requireNumber(req.query.lat, "lat");
    const lon = requireNumber(req.query.lon, "lon");
    const bomSearch = requireStringMin(req.query.bomSearch, "bomSearch", 3);
    const days = requireIntInRange(req.query.days ?? 7, "days", 1, 16);

    const result = await weatherAggregateService.getCombined({ lat, lon, bomSearch, days });
    return res.json(result);
  } catch (err) {
    const status = err.statusCode && Number.isInteger(err.statusCode) ? err.statusCode : 500;
    return res.status(status).json({
      message: status === 500 ? "Failed to fetch weather data" : err.message,
      error: status === 500 ? String(err.message ?? err) : undefined,
    });
  }
};
