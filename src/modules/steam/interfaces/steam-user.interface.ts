export interface SteamResolveVanityUrlResponse {
  response: {
    steamid?: string;
    success: number;
    message?: string;
  };
}

export interface SteamPlayerResponse {
  steamid: string;
  communityvisibilitystate: number;
  profilestate?: number;
  personaname: string;
  profileurl: string;
  avatar: string;
  avatarmedium: string;
  avatarfull: string;
  avatarhash: string;
  personastate: number;
  lastlogoff?: number;
  commentpermission?: number;
  realname?: string;
  primaryclanid?: string;
  timecreated?: number;
  gameid?: string;
  gameserverip?: string;
  gameextrainfo?: string;
  cityid?: number;
  loccountrycode?: string;
  locstatecode?: string;
}

export interface SteamPlayerSummariesResponse {
  response: {
    players: SteamPlayerResponse[];
  };
}

export interface SteamWishlistItem {
  appid: number;
  priority?: number;
  date_added?: number;
}

export interface SteamWishlistResponse {
  response: {
    items?: SteamWishlistItem[];
    total_count?: number;
  };
}
