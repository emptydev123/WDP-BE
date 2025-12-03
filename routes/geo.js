const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const { geocodeAddress } = require('../controller/GeoController');

// GET /api/geo/geocode?address=...
// Returns { lat, lng } using Mapbox (if token) else Nominatim
router.get('/geocode', auth.authMiddleWare, auth.requireRole('admin','staff','customer','technician'), geocodeAddress);

module.exports = router;
