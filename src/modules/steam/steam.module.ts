import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { SteamService } from './steam.service';
import { SteamGateway } from './steam.gateway';
import { SteamSalesAdapter } from './steam-sales.adapter';

@Module({
  imports: [HttpModule],
  providers: [SteamService, SteamGateway, SteamSalesAdapter],
  exports: [SteamService],
})
export class SteamModule {}
