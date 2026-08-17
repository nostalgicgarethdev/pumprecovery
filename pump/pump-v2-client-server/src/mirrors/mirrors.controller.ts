import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { DatabaseService } from 'src/database/database.service';

/**
 * Self-registering mirror index (powers stacc.show).
 *
 * Mirrors run on arbitrary domains but all share this backend. The browser sets
 * the Origin header on every cross-origin request, so we record it: that's a
 * trustworthy "this mirror is live" signal that can't be spoofed by page JS.
 * The mirror also self-reports its configured top-level referrer.
 */
@Controller('mirrors')
export class MirrorsController {
  constructor(private readonly db: DatabaseService) {}

  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @Post('/ping')
  async ping(
    @Req() req: Request,
    @Body() body: { defaultReferrer?: string },
  ) {
    const origin = (req.headers?.origin as string) || '';
    await this.db.recordMirror(origin, body?.defaultReferrer ?? null);
    return { ok: true };
  }

  @Get('/')
  async list() {
    return this.db.getMirrors();
  }
}
