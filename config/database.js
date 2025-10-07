// Database configuration
module.exports = {
  // MySQL configuration - use environment variables with fallbacks
  host: process.env.DB_HOST || 'arstudio.atthost24.pl',
  user: process.env.DB_USER || '9518_piwgizyckob',
  password: process.env.DB_PASSWORD || 'Nz21n$VH!wxFB',
  database: process.env.DB_NAME || '9518_piwgizyckob',
  port: process.env.DB_PORT || 3306,
  
  // Connection options
  connectionLimit: 10,
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true,
  charset: 'utf8mb4'
};
