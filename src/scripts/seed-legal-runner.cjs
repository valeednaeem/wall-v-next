const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

// Now dynamically import the TypeScript seed
require('ts-node').register({ transpileOnly: true });
require('./seed-legal.ts');
