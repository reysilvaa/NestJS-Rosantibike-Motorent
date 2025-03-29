import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class ThrottlerBehindProxyGuard extends ThrottlerGuard {
  protected getTracker(req: Record<string, any>): Promise<string> {
    return Promise.resolve(req.ips.length > 0 ? req.ips[0] : req.ip); // menggunakan IP pertama jika di belakang proxy
  }
}

// Re-export ThrottlerGuard dari @nestjs/throttler
export { ThrottlerGuard } from '@nestjs/throttler';
