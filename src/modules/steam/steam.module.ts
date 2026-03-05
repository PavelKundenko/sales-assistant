import * as https from 'https';
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { SteamService } from './steam.service';
import { SteamGateway } from './steam.gateway';
import { SteamSalesAdapter } from './steam-sales.adapter';

@Module({
  imports: [
    HttpModule.register({
      timeout: 10_000,
      httpsAgent: new https.Agent({
        maxSockets: 10,
        maxFreeSockets: 5,
        keepAlive: true,
      }),
    }),
  ],
  providers: [SteamService, SteamGateway, SteamSalesAdapter],
  exports: [SteamService],
})
export class SteamModule {}
