import { Platform } from '../../users/entities/user-preferences.entity';

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
  platforms!: Platform[];
  expiryDate!: Date | null;

  constructor(partial: Partial<SteamWishlistItemDto>) {
    Object.assign(this, partial);
    this.platforms = partial.platforms ?? [];
    this.expiryDate = partial.expiryDate ? new Date(partial.expiryDate) : null;
  }
}
