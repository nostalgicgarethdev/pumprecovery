import { Injectable, UnauthorizedException } from '@nestjs/common';
import { LoginDto } from './dto/login.dto';
import { sign } from 'tweetnacl';
import * as bs58 from 'bs58';
import { JwtService } from '@nestjs/jwt';
import { DatabaseService } from 'src/database/database.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly databaseService: DatabaseService,
  ) {}

  async login(login: LoginDto) {
    const { signature, timestamp, address, message: clientMessage } = login;

    // The backend no longer pins a site URL. We accept any message the wallet
    // signed as long as it has our known shape ("Sign in to <brand>: <ts>") and
    // ends with THIS timestamp — so each mirror can brand its own sign-in. The
    // message text grants no privilege; the signature is the proof of wallet
    // ownership. Neutral + legacy canonical messages are accepted as fallbacks.
    const candidates: string[] = [];
    if (
      typeof clientMessage === 'string' &&
      clientMessage.length <= 96 &&
      /^Sign in to .{1,64}: \d{10,16}$/.test(clientMessage) &&
      clientMessage.endsWith(`: ${timestamp}`)
    ) {
      candidates.push(clientMessage);
    }
    candidates.push(`Sign in to Pump ICO mirror: ${timestamp}`); // neutral default
    candidates.push(`Sign in to stacc.art: ${timestamp}`); // legacy (transitional)

    const sig = bs58.decode(signature);
    const addr = bs58.decode(address);
    const verified = candidates.some((m) =>
      sign.detached.verify(new TextEncoder().encode(m), sig, addr),
    );

    if (!verified) throw new UnauthorizedException('Invalid signature');

    return {
      access_token: this.jwtService.sign({ address }),
    };
  }

  async isAdmin(address: string) {
    return this.databaseService.isAdmin(address);
  }
}
