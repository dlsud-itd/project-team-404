import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';

type RequestPart = 'body' | 'params' | 'query';

export function validateRequest<T>(
  schema: ZodType<T>,
  requestPart: RequestPart,
  message: string
): RequestHandler {
  return (req, res, next) => {
    const input =
      requestPart === 'params'
        ? (Object.values(req.params)[0] ?? '')
        : req[requestPart];
    const result = schema.safeParse(input);
    if (!result.success) {
      res.status(400).json({
        error: message,
        details: result.error.issues.map(({ path, message: detail }) => ({
          field: path.join('.'),
          message: detail,
        })),
      });
      return;
    }
    res.locals.validated = result.data;
    next();
  };
}
