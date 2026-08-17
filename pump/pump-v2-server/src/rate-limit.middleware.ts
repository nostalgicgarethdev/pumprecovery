import { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';

export function rateLimitMiddleware() {
  return rateLimit({
    windowMs: 60_000, // 60 seconds
    max: 500, // Limit each IP to 200 requests per minute
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    handler: (req: Request, res: Response) => {
      res.status(429).json({
        statusCode: 429,
        message: 'Too many requests, please try again later.',
      });
    },
  });
}
