// Minimal structured logger: one JSON line per event, easy to read in PM2 logs
// and to ship to a log service later. Never log passwords, tokens, card or medical data.
function write(level, message, fields) {
  if (process.env.NODE_ENV === 'test' && level !== 'error') return;
  const line = JSON.stringify({ time: new Date().toISOString(), level, message, ...fields });
  (level === 'error' ? console.error : console.log)(line);
}

export const logger = {
  info: (message, fields) => write('info', message, fields),
  warn: (message, fields) => write('warn', message, fields),
  error: (message, fields) => write('error', message, fields)
};
