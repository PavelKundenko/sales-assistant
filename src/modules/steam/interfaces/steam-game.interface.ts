export interface SteamFeaturedResponse {
  featured_win?: Array<{
    id: number;
    name: string;
    discounted: boolean;
    discount_percent: number;
    original_price?: number;
    final_price: number;
    header_image: string;
  }>;
  large_capsules?: Array<{
    id: number;
    name: string;
    discounted: boolean;
    discount_percent: number;
    original_price?: number;
    final_price: number;
    header_image: string;
  }>;
}

export interface SteamFeaturedItem {
  id: number;
  type: number;
  name: string;
  discounted: boolean;
  discount_percent: number;
  original_price: number | null;
  final_price: number;
  currency: string;
  large_capsule_image: string;
  small_capsule_image: string;
  windows_available: boolean;
  mac_available: boolean;
  linux_available: boolean;
  streamingvideo_available: boolean;
  discount_expiration?: number;
  header_image: string;
  controller_support?: string;
}

export interface SteamFeaturedCategory {
  id: string;
  name: string;
  items: SteamFeaturedItem[];
}

export interface SteamFeaturedCategoriesResponse {
  specials?: SteamFeaturedCategory;
  coming_soon?: SteamFeaturedCategory;
  top_sellers?: SteamFeaturedCategory;
  new_releases?: SteamFeaturedCategory;
  status: number;
}
