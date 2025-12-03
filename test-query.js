require('dotenv').config();
const mongoose = require('mongoose');
const ServiceCenter = require('./model/serviceCenter');

async function test() {
  await mongoose.connect(process.env.MONGO_URI);
  
  const query = {
    is_active: true,
    lat: { $exists: true, $ne: null, $gte: 8.9, $lte: 12.6 },
    lng: { $exists: true, $ne: null, $gte: 104.8, $lte: 108.5 }
  };
  
  console.log('Testing query:', JSON.stringify(query, null, 2));
  const result = await ServiceCenter.find(query);
  console.log('Found:', result.length, 'centers');
  result.forEach(c => console.log('-', c.center_name, '| lat:', c.lat, '| lng:', c.lng, '| active:', c.is_active));
  
  await mongoose.disconnect();
}

test().catch(e => console.error(e));
