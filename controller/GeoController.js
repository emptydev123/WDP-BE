const axios = require('axios');

// Geocode using Mapbox if MAPBOX_TOKEN present; else fallback to Nominatim
async function geocodeAddress(req, res) {
  try {
    const { address } = req.query;
    if (!address || !address.trim()) {
      return res.status(400).json({ success: false, message: 'address is required' });
    }
    const mapboxToken = process.env.MAPBOX_TOKEN;
    let result = null;
    if (mapboxToken) {
      try {
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${mapboxToken}&limit=1`;
        const resp = await axios.get(url, { timeout: 8000 });
        const feature = resp.data.features && resp.data.features[0];
        if (feature && feature.center) {
          result = { lat: feature.center[1], lng: feature.center[0], provider: 'mapbox', raw: feature };
        }
      } catch (e) {
        console.warn('[GeoController] Mapbox geocode failed, will fallback:', e.message);
      }
    }
    if (!result) {
      // Fallback to Nominatim (rate limited; use politely)
      const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`;
      const resp2 = await axios.get(nominatimUrl, { timeout: 10000, headers: { 'User-Agent': 'wdp301-geocoder/1.0' } });
      const item = resp2.data && resp2.data[0];
      if (item) {
        result = { lat: parseFloat(item.lat), lng: parseFloat(item.lon), provider: 'nominatim', raw: item };
      }
    }
    if (!result) {
      return res.status(404).json({ success: false, message: 'No geocoding result found' });
    }
    return res.status(200).json({ success: true, message: 'Geocode success', data: result });
  } catch (err) {
    console.error('[GeoController] geocodeAddress error', err);
    return res.status(500).json({ success: false, message: 'Server error geocoding', error: err.message });
  }
}

module.exports = { geocodeAddress };
