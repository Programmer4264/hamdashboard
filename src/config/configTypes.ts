/**
 * Type definitions for HAM Dashboard configuration.
 * Supports both legacy config.js/config.json formats and the new structured format.
 */

/** A single menu item: [color, text, url, scale, side] */
export type LegacyMenuItem = [string, string, string, string?, string?];

/**
 * A single dashboard tile in legacy format:
 * [title, url1, url2, ...] where title can be string or string[]
 */
export type LegacyTileItem = [string | string[], ...string[]];

/**
 * A single dashboard tile in JSON format:
 * [title, urls | url, delay?] where urls can be string[] or string
 */
export type JsonTileItem = [string | string[], string[] | string, number?];

/** A single RSS feed: [url, refreshIntervalMinutes] */
export type RssFeedItem = [string, number];

/** Parsed menu item for use in components */
export interface MenuItem {
  color: string;
  text: string;
  url: string;
  scale: number;
  side: 'L' | 'R';
  type: 'core' | 'config' | 'user';
}

/** Parsed tile for use in components */
export interface TileConfig {
  titles: string[];
  sources: string[];
  rotationInterval: number;
}

/** The full dashboard configuration */
export interface DashboardConfig {
  disableSetup: boolean;
  disableLdCfg: boolean;
  topBarCenterText: string;
  layoutCols: number;
  layoutRows: number;
  menuItems: MenuItem[];
  tiles: TileConfig[];
  rssFeeds: RssFeedItem[];
  settingsSource: 'localStorage' | 'file';
}

/** Raw legacy JS config (as set by config.js on window) */
export interface LegacyJsConfig {
  disableSetup?: boolean;
  disableLdCfg?: boolean;
  topBarCenterText?: string;
  layout_cols?: number;
  layout_rows?: number;
  aURL?: LegacyMenuItem[];
  aIMG?: LegacyTileItem[];
  tileDelay?: number[];
  aRSS?: RssFeedItem[];
}

/** Raw JSON config format */
export interface JsonConfig {
  disableSetup?: boolean;
  disableLdCfg?: boolean;
  topBarCenterText?: string;
  layout_cols?: number;
  layout_rows?: number;
  aURL?: LegacyMenuItem[];
  aIMG?: JsonTileItem[];
  aImages?: JsonTileItem[];
  aRSS?: RssFeedItem[];
  settingsSource?: string;
}

/** Settings format stored in localStorage */
export interface StoredSettings extends JsonConfig {
  settingsSource?: string;
}
