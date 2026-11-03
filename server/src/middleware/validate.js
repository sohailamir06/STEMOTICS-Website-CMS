import { z } from 'zod';
import { badRequest } from '../utils/errors.js';

// Validates req[source] with a Zod schema (usually from @stemotics/shared, so the browser apps
// run the same rules) and puts the parsed result on req.validated.
export function validate(schema, source = 'body') {
  return function validateRequest(req, res, next) {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      throw badRequest(
        'VALIDATION_ERROR',
        'Please check the highlighted fields.',
        z.flattenError(result.error).fieldErrors
      );
    }
    req.validated = result.data;
    next();
  };
}
