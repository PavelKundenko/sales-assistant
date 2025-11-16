export class SteamSaleDto {
  appId!: number;
  name!: string;
  originalPrice!: number;
  finalPrice!: number;
  discountPercent!: number;
  headerImage!: string;
  storeUrl!: string;

  constructor(partial: Partial<SteamSaleDto>) {
    Object.assign(this, partial);
  }
}
