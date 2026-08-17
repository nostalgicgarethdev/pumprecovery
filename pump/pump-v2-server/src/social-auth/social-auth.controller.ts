import { Controller, Get, Query, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { UsersService } from 'src/users/users.service';
import { URLSearchParams } from 'url';
import { JwtService } from '@nestjs/jwt';

@Controller('social-auth')
export class SocialAuthController {
  csrfTokens: Record<string, string> = {};

  constructor(
    private configService: ConfigService,
    private userService: UsersService,
    private jwtService: JwtService,
  ) {}

  @Get('/initiate')
  @ApiBearerAuth('JWT')
  async initiate(@Query('username') id: string) {
    try {
      const csrfToken = Math.random().toString(36).substring(6);

      this.csrfTokens[csrfToken] = id;

      // delete the token after one hour
      setTimeout(
        () => {
          console.log(this.csrfTokens[csrfToken]);
          delete this.csrfTokens[csrfToken];
        },
        1000 * 60 * 60,
      );

      return { csrfToken };
    } catch (e) {
      console.error('error', e);
      throw Error(e);
    }
  }

  @Get('/twitter')
  async twitterAuth(
    @Query('code') code: string,
    @Query('state') csrfToken: string,
    @Res() res: Response,
  ) {
    try {
      console.log('TWITTER', code, csrfToken);

      const params = new URLSearchParams();
      params.append('code', code);
      params.append('grant_type', 'authorization_code');
      params.append('client_id', this.configService.get('twitterClientId'));
      params.append(
        'redirect_uri',
        this.configService.get('twitterRedirectUri'),
      );
      params.append('code_verifier', 'challenge');

      // Twitter OAuth token endpoint
      const url = 'https://api.twitter.com/2/oauth2/token';

      const { access_token } = await fetch(url, {
        method: 'POST',
        body: params,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(
            `${this.configService.get(
              'twitterClientId',
            )}:${this.configService.get('twitterClientSecret')}`,
          ).toString('base64')}`,
        },
      }).then((r) => r.json());

      // Twitter API URL for fetching user information
      const { data: user } = await fetch(
        'https://api.twitter.com/2/users/me?user.fields=profile_image_url',
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${access_token}`,
          },
        },
      ).then((r) => r.json());

      try {
        const doesUserExist = await this.userService.create({
          twitter_username: user.username,
          pfp: user.profile_image_url,
        });
      } catch (e) {
        console.error(e);
      }

      // create a jwt and send as a cookie to the client
      const jwtPayload = { username: user.username };
      const token = this.jwtService.sign(jwtPayload, {
        secret: this.configService.get('jwtSecret'),
        expiresIn: this.configService.get('jwtExpiresIn'),
      });

      res.cookie('token', token, {
        httpOnly: true,
        secure: Boolean(this.configService.get('prod')),
      });

      res.redirect(
        `${this.configService.get('frontendDomain')}/board?username=${
          user.username
        }`,
      );
    } catch (e) {
      console.error(e);
      console.log('ERROR', e);

      res.redirect(`${this.configService.get('frontendDomain')}/board`);
    }
  }
}
