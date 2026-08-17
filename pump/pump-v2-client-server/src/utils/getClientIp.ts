import { Request } from 'express';

export const getClientIp = (req: Request): string => {
  const forwardedFor = req.headers['x-forwarded-for'];
  let ip: string | undefined;

  if (typeof forwardedFor === 'string') {
    ip = forwardedFor.split(',')[0]; // Take the first IP if it's a comma-separated string
  } else if (Array.isArray(forwardedFor)) {
    ip = forwardedFor[0]; // Take the first element if it's an array
  } else {
    ip = req.socket.remoteAddress; // Fallback to the direct connection
  }

  // Remove IPv6 prefix if present (e.g., "::ffff:192.168.0.1" becomes "192.168.0.1")
  return ip ? ip.replace(/^.*:/, '') : '';
};
