require('dotenv').config();
const mongoose = require('mongoose');

mongoose.set('debug', true);

// Bypass DNS SRV (mongodb+srv) completely by using direct nodes
const password = encodeURIComponent("pandispdS2567");
const directUri = `mongodb://admin:${password}@ac-kzzzruy-shard-00-00.77ymhvz.mongodb.net:27017,ac-kzzzruy-shard-00-01.77ymhvz.mongodb.net:27017,ac-kzzzruy-shard-00-02.77ymhvz.mongodb.net:27017/collegestudysystem?replicaSet=atlas-19yf8a-shard-0&ssl=true&authSource=admin&retryWrites=true&w=majority`;

console.log('Testing connection with direct replica set URI to bypass Windows DNS issues...');

mongoose.connect(directUri, {
  serverSelectionTimeoutMS: 5000,
  family: 4 // Force IPv4
})
.then(() => {
  console.log('\n\n✅✅ MongoDB successfully connected using Direct URI! ✅✅\n\n');
  process.exit(0);
})
.catch(err => {
  console.error('\n\n❌ Direct URI Connection Error Details:');
  console.error(err);
  process.exit(1);
});
