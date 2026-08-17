import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get()
  async getNotifications(
    @Query('limit') limit: number,
    @Query('offset') offset: number,
    @Req() req: any,
  ) {
    const { address } = req.user;

    this.notificationsService.markNotificationsAsRead(address);

    return this.notificationsService.getNotifications(
      address,
      Number(limit),
      Number(offset),
    );
  }
}
