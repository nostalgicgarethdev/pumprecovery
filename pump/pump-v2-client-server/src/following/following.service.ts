import { Injectable } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class FollowingService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly usersService: UsersService,
  ) {}

  async follow(following_id: string, user_id: string) {
    const followerUser = (await this.databaseService.getRawUser(user_id)) || {
      address: user_id,
      following: 0,
    };

    if (followerUser.following > 200) return;

    await this.databaseService.createFollow({
      following_id,
      user_id,
    });

    (async () => {
      const user = (await this.databaseService.getRawUser(following_id)) || {
        address: following_id,
        followers: 0,
      };

      await this.usersService.upsertUser({
        ...user,
        followers: user.followers + 1,
      });

      await this.usersService.upsertUser({
        ...followerUser,
        following: followerUser.following + 1,
      });
    })().catch((e) => console.error('failed to update follow state', e));
  }

  async unfollow(following_id: string, user_id: string) {
    await this.databaseService.deleteFollow(following_id, user_id);

    (async () => {
      const user = await this.databaseService.getRawUser(following_id);

      await this.usersService.upsertUser({
        ...user,
        followers: user.followers - 1,
      });

      const followerUser = await this.databaseService.getRawUser(user_id);

      await this.usersService.upsertUser({
        ...followerUser,
        following: followerUser.following - 1,
      });
    })().catch((e) => console.error('failed to update unfollow state', e));
  }

  async getFollow(following_id: string, user_id: string) {
    const follow = await this.databaseService.getFollow(following_id, user_id);
    return { follow };
  }

  async getFollowers(id: string) {
    return this.databaseService.getFollowers(id);
  }

  async getFollowing(id: string) {
    return this.databaseService.getFollowing(id);
  }
}
