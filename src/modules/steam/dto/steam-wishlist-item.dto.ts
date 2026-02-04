export class SteamWishlistItemDto {
  appId!: number;
  name!: string;
  description!: string;
  originalPrice?: number | null;
  finalPrice?: number | null;
  discountPercent?: number | null;
  headerImage!: string;
  storeUrl!: string;
  macAvailable!: boolean;
  windowsAvailable!: boolean;
  linuxAvailable!: boolean;

  constructor(partial: Partial<SteamWishlistItemDto>) {
    Object.assign(this, partial);
  }
}
