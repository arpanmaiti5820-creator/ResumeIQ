const config = require('./config/env');
const connectDB = require('./config/db');

async function start() {
  config.validate();
  await connectDB();
  const app = require('./app');
  app.listen(config.port, () => {
    console.log(`[server] ResumeIQ running at ${config.appUrl}`);
  });
}

start().catch((err) => {
  console.error(`\n[startup] ${err.message}\n`);
  process.exit(1);
});
