require('dotenv').config();
const mongoose = require('mongoose');
const axios = require('axios');
const ServiceCenter = require('../model/serviceCenter');

const MAPBOX_TOKEN = process.env.MAPBOX_TOKEN; // optional
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('MONGO_URI env missing');
  process.exit(1);
}

async function geocode(address) {
  if (!address) return null;
  if (MAPBOX_TOKEN) {
    try {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${MAPBOX_TOKEN}&limit=1`;
      const resp = await axios.get(url, { timeout: 8000 });
      const f = resp.data.features && resp.data.features[0];
      if (f && f.center) {
        return { lat: f.center[1], lng: f.center[0], provider: 'mapbox' };
      }
    } catch (e) {
      console.warn('Mapbox fail, will fallback:', e.message);
    }
  }
  // Fallback Nominatim (use politely)
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`;
    const resp = await axios.get(url, { timeout: 10000, headers: { 'User-Agent': 'wdp301-seed/1.0' } });
    const item = resp.data && resp.data[0];
    if (item) {
      return { lat: parseFloat(item.lat), lng: parseFloat(item.lon), provider: 'nominatim' };
    }
  } catch (e) {
    console.warn('Nominatim fail:', e.message);
  }
  return null;
}

async function run() {
  await mongoose.connect(MONGO_URI);
  const centers = await ServiceCenter.find({ $or: [{ lat: { $exists: false } }, { lng: { $exists: false } }, { lat: null }, { lng: null }] });
  console.log('Centers missing coordinates:', centers.length);
  for (const c of centers) {
    const geo = await geocode(c.address);
    if (!geo) {
      console.log('Skip (no geocode):', c.center_name);
      continue;
    }
    c.lat = geo.lat;
    c.lng = geo.lng;
    await c.save();
    console.log(`Updated ${c.center_name} => (${geo.lat}, ${geo.lng}) via ${geo.provider}`);
    // Basic throttling for free providers
    await new Promise(r => setTimeout(r, MAPBOX_TOKEN ? 150 : 600));
  }
  await mongoose.disconnect();
  console.log('Done seeding coordinates');
}

run().catch(err => { console.error(err); process.exit(1); });
