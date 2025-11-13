// Script to clear old cache keys after avatar field update
// Run this once after deploying the avatar feature

const redis = require('redis');

async function clearOldUserCache() {
  const client = redis.createClient({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
  });

  await client.connect();

  try {
    console.log('🔍 Scanning for old user cache keys...');
    
    // Get all keys matching the old pattern
    const oldKeys = await client.keys('users:*');
    
    // Filter out the new v2 keys
    const keysToDelete = oldKeys.filter(key => 
      key.startsWith('users:') && 
      !key.startsWith('users:v2:') &&
      !key.startsWith('users:all')
    );
    
    console.log(`📦 Found ${keysToDelete.length} old cache keys to delete`);
    
    if (keysToDelete.length > 0) {
      // Delete old keys
      await Promise.all(keysToDelete.map(key => client.del(key)));
      console.log('✅ Successfully cleared old cache keys');
    } else {
      console.log('✅ No old cache keys found');
    }
    
    // Also clear users:all to force refresh
    await client.del('users:all');
    console.log('✅ Cleared users:all cache');
    
  } catch (error) {
    console.error('❌ Error clearing cache:', error);
  } finally {
    await client.quit();
    console.log('👋 Cache cleanup completed');
  }
}

// Run if called directly
if (require.main === module) {
  clearOldUserCache()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = clearOldUserCache;
