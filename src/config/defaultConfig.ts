import type { DashboardConfig } from './configTypes';

/** Minimal fallback configuration when no config files are available */
export const defaultConfig: DashboardConfig = {
  disableSetup: false,
  disableLdCfg: false,
  topBarCenterText: "Use 'Setup' to configure your Ham Radio Dashboard",
  layoutCols: 4,
  layoutRows: 3,
  menuItems: [],
  tiles: Array.from({ length: 12 }, (_, i) => ({
    titles: [`Tile ${i + 1}`],
    sources: ['https://picsum.photos/seed/picsum/200/300'],
    rotationInterval: 30000,
  })),
  rssFeeds: [
    ['https://www.amsat.org/feed/', 60],
    ['https://daily.hamweekly.com/atom.xml', 60],
  ],
  settingsSource: 'file',
};
