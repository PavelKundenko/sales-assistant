import { Platform } from '../../../shared/enums/platform.enum';

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
  expiryDate!: Date | null;

  constructor(partial: Partial<SteamSaleDto>) {
    Object.assign(this, partial);
    this.platforms = partial.platforms ?? [];
    this.expiryDate = partial.expiryDate ? new Date(partial.expiryDate) : null;
  }
}
