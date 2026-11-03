import { AppError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export function notFound(req, res) {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Not found.' } });
}

// Express 5 forwards errors from async handlers here automatically.
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    return res.status(err.status).json({
      error: { code: err.code, message: err.message, ...(err.details && { details: err.details }) }
    });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { code: 'INVALID_JSON', message: 'Invalid JSON body.' } });
  }
  if (err.code === 11000) {
    // e.g. keyValue { code: 'STC2001' } → details { code: ['Already in use'] } for the form field.
    const fields = Object.keys(err.keyValue ?? {});
    return res.status(409).json({
      error: {
        code: 'DUPLICATE',
        message: 'This record already exists.',
        ...(fields.length && {
          details: Object.fromEntries(fields.map((field) => [field, ['Already in use']]))
        })
      }
    });
  }
  // Malformed ids in the URL (e.g. /courses/not-an-id) are treated as "not found".
  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Not found.' } });
  }
  logger.error('unhandled error', {
    method: req.method,
    path: req.path,
    error: err.stack ?? String(err)
  });
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.' } });
}
