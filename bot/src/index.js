import { BotServer } from './server.js';

/**
 * Main entry point for the Bot Service
 */
async function main() {
  console.log('╔═══════════════════════════════════════╗');
  console.log('║     MineBuddy Bot Service v1.3.1      ║');
  console.log('╚═══════════════════════════════════════╝');
  console.log('');

  const server = new BotServer();
  
  // Handle process termination
  process.on('SIGINT', () => {
    console.log('\n\n👋 Shutting down...');
    server.stop();
    process.exit(0);
  });

  const port = parseInt(process.env.BOT_SERVICE_PORT) || 3001;
  await server.start(port);
  
  console.log('');
  console.log('💡 Bot service is ready. Use the API to control the bot.');
  console.log('   POST /connect    - Connect to Minecraft server');
  console.log('   POST /action     - Execute an action');
  console.log('   GET  /observation - Get current game state');
  console.log('');
}

main().catch((error) => {
  const port = parseInt(process.env.BOT_SERVICE_PORT || '3001', 10);
  if (error?.code === 'EADDRINUSE') {
    console.error(
      `[Fatal] Bot service port ${port} is already in use. ` +
      'Please stop the old MineBuddy process or change bot_service_port.'
    );
  } else {
    console.error('[Fatal] Bot service failed to start:', error?.message || error);
  }

  if (error?.stack) {
    console.error(error.stack);
  }
  process.exit(1);
});
