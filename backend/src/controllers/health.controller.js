// src/controllers/health.controller.js
exports.health = (req, res) => {
  res.json({ ok: true, service: "backend", time: new Date().toISOString() });
};
