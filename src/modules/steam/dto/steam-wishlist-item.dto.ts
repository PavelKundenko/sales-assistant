export class SteamWishlistItemDto {
  appId!: number;
  name!: string;
  description!: string;
  originalPrice?: number | null;
  finalPrice?: number | null;
  discountPercent?: number | null;
  headerImage!: string;
  storeUrl!: string;

  constructor(partial: Partial<SteamWishlistItemDto>) {
    Object.assign(this, partial);
  }
}
