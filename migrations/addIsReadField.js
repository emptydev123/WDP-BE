// Migration script to add is_read field to existing reminders
const mongoose = require('mongoose');
require('dotenv').config();

const MaintenanceReminders = require('../model/maintenanceReminders');
const dbConnect = require('../DB/db');

async function migrateIsReadField() {
  try {
    console.log('🔄 Connecting to database...');
    await dbConnect();
    
    console.log('🔄 Updating all reminders to add is_read field...');
      const result = await MaintenanceReminders.updateMany(
        {}, // Update tất cả documents
        { $set: { is_read: false } }
      );
    
    console.log(`✅ Migration completed! Updated ${result.modifiedCount} reminders.`);
    console.log(`📊 Matched ${result.matchedCount} documents.`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrateIsReadField();
