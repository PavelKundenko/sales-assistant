import { Platform } from '../../users/entities/user-preferences.entity';

export class SteamSaleDto {
  appId!: number;
  name!: string;
  originalPrice!: number;
  finalPrice!: number;
  discountPercent!: number;
  headerImage!: string;
  storeUrl!: string;
  macAvailable!: boolean;
  windowsAvailable!: boolean;
  linuxAvailable!: boolean;
  platforms!: Platform[];

  constructor(partial: Partial<SteamSaleDto>) {
    Object.assign(this, partial);
    this.platforms = partial.platforms ?? [];
  }
}
