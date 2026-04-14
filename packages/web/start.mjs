process.env.PORT ??= '3400';
process.env.HOSTNAME ??= '0.0.0.0';

await import('./.next/standalone/packages/web/server.js');
