// src/routes/weather.routes.js
const express = require("express");
const weatherController = require("../controllers/weather.controller");

const router = express.Router();

router.get("/weather/combined", weatherController.getCombinedWeather);

module.exports = router;
