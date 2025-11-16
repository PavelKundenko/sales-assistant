import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { SteamService } from './steam.service';
import { SteamGateway } from './steam.gateway';

@Module({
  imports: [HttpModule],
  providers: [SteamService, SteamGateway],
  exports: [SteamService],
})
export class SteamModule {}
