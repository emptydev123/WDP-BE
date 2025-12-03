require('dotenv').config();
const mongoose = require('mongoose');
const ServiceCenter = require('../model/serviceCenter');

const MONGO_URI = process.env.DB_CONNECT || process.env.MONGO_URI;

// Tọa độ chính xác cho các trung tâm ở TP.HCM
const updates = [
  {
    name: 'EV B',
    lat: 10.8213,   // Lê Quang Định, Bình Thạnh
    lng: 106.6983,
    working_hours: {
      monday: { open: '08:00', close: '17:00' },
      tuesday: { open: '08:00', close: '17:00' },
      wednesday: { open: '08:00', close: '17:00' },
      thursday: { open: '08:00', close: '17:00' },
      friday: { open: '08:00', close: '17:00' },
      saturday: { open: '08:00', close: '12:00' },
      sunday: { open: null, close: null }
    }
  },
  {
    name: 'EV A',
    lat: 10.8450,   // Lý Thường Kiệt, Tân Bình (gần sân bay)
    lng: 106.6520,
    working_hours: {
      monday: { open: '08:00', close: '17:00' },
      tuesday: { open: '08:00', close: '17:00' },
      wednesday: { open: '08:00', close: '17:00' },
      thursday: { open: '08:00', close: '17:00' },
      friday: { open: '08:00', close: '17:00' },
      saturday: { open: '08:00', close: '12:00' },
      sunday: { open: null, close: null }
    }
  },
  {
    name: 'EV C',
    lat: 10.7891,   // Dương Quảng Hàm, Gò Vấp
    lng: 106.6830,
    working_hours: {
      monday: { open: '08:00', close: '17:00' },
      tuesday: { open: '08:00', close: '17:00' },
      wednesday: { open: '08:00', close: '17:00' },
      thursday: { open: '08:00', close: '17:00' },
      friday: { open: '08:00', close: '17:00' },
      saturday: { open: '08:00', close: '12:00' },
      sunday: { open: null, close: null }
    }
  }
];

async function run() {
  console.log('Connecting to:', MONGO_URI.includes('cluster') ? 'Cloud MongoDB' : 'Local MongoDB');
  await mongoose.connect(MONGO_URI);
  
  for (const item of updates) {
    const center = await ServiceCenter.findOne({ center_name: item.name });
    if (!center) {
      console.log(`❌ Not found: ${item.name}`);
      continue;
    }
    center.lat = item.lat;
    center.lng = item.lng;
    center.working_hours = item.working_hours;
    await center.save();
    console.log(`✓ Updated ${center.center_name} => (${item.lat}, ${item.lng}) + working_hours`);
  }
  
  // Verify
  const all = await ServiceCenter.find();
  console.log('\n=== Final Status ===');
  all.forEach(c => console.log(`${c.center_name}: lat=${c.lat}, lng=${c.lng}, active=${c.is_active}`));
  
  await mongoose.disconnect();
  console.log('\n✓ Done updating coordinates');
}

run().catch(err => { console.error(err); process.exit(1); });
