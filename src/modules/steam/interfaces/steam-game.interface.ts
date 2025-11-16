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
