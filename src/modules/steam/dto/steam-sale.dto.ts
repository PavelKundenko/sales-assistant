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

  constructor(partial: Partial<SteamSaleDto>) {
    Object.assign(this, partial);
  }
}
