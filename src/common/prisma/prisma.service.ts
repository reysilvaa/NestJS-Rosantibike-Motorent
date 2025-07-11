import type { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import type { Prisma as _Prisma } from '@prisma/client';
import { createWinstonLogger } from '../config/logger.config';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = createWinstonLogger('PrismaService');

  constructor() {
    super({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'stdout', level: 'info' },
        { emit: 'stdout', level: 'warn' },
        { emit: 'stdout', level: 'error' },
      ],
    });
  }

  async onModuleInit() {
    this.logger.log('Connecting to database...');
    await this.$connect();
    this.logger.log('Connected to database');

    (this as any).$on('query', (e: any) => {
      if (this.logger.debug) {
        this.logger.debug(`Query: ${e.query}`);
        this.logger.debug(`Params: ${e.params}`);
        this.logger.debug(`Duration: ${e.duration}ms`);
      }
    });
  }

  async onModuleDestroy() {
    this.logger.log('Disconnecting from database...');
    await this.$disconnect();
    this.logger.log('Disconnected from database');
  }

  $transaction = super.$transaction;

  get unitMotor() {
    return super.unitMotor;
  }

  get transaksiSewa() {
    return super.transaksiSewa;
  }

  get jenisMotor() {
    return super.jenisMotor;
  }

  get blogPost() {
    return super.blogPost;
  }

  get blogTag() {
    return super.blogTag;
  }

  get blogPostTag() {
    return super.blogPostTag;
  }

  get admin() {
    return super.admin;
  }
}
