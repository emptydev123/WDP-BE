require('dotenv').config();
const axios = require('axios');
const mongoose = require('mongoose');
const ServiceCenter = require('../model/serviceCenter');

const MAPBOX_TOKEN = process.env.MAPBOX_TOKEN;
// Use cloud DB connection
const MONGO_URI = process.env.DB_CONNECT || process.env.MONGO_URI;

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
      console.warn('Mapbox fail:', e.message);
    }
  }
  // Fallback Nominatim
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
  console.log('Connecting to:', MONGO_URI.includes('cluster') ? 'Cloud MongoDB' : 'Local MongoDB');
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
    console.log(`✓ Updated ${c.center_name} => (${geo.lat}, ${geo.lng}) via ${geo.provider}`);
    await new Promise(r => setTimeout(r, MAPBOX_TOKEN ? 150 : 600));
  }
  
  // Verify
  const all = await ServiceCenter.find();
  console.log('\n=== Final Status ===');
  all.forEach(c => console.log(`${c.center_name}: lat=${c.lat}, lng=${c.lng}, active=${c.is_active}`));
  
  await mongoose.disconnect();
  console.log('\n✓ Done seeding coordinates to cloud DB');
}

run().catch(err => { console.error(err); process.exit(1); });
