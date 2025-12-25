// src/routes/charts.routes.js
const express = require("express");
const chartsController = require("../controllers/charts.controller");

const router = express.Router();

router.get("/barchart", chartsController.getBarChart);
router.get("/piechart", chartsController.getPieChart);

module.exports = router;
