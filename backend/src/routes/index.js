// src/routes/index.js
const express = require("express");

const healthController = require("../controllers/health.controller");
const chartsRoutes = require("./charts.routes");
const weatherRoutes = require("./weather.routes");

const router = express.Router();

router.get("/health", healthController.health);

router.use(chartsRoutes);
router.use(weatherRoutes);

module.exports = router;
