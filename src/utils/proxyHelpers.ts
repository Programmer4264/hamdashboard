/**
 * CORS proxy helpers for fetching RSS feeds across origins.
 */

export interface CorsProxy {
  name: string;
  url: (feedUrl: string) => string;
}

export const corsProxies: CorsProxy[] = [
  {
    name: 'allorigins',
    url: (feedUrl: string) =>
      `https://api.allorigins.win/raw?url=${encodeURIComponent(feedUrl)}`,
  },
  {
    name: 'corsproxy',
    url: (feedUrl: string) =>
      `https://corsproxy.io/?url=${encodeURIComponent(feedUrl)}`,
  },
  {
    name: 'codetabs',
    url: (feedUrl: string) =>
      `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(feedUrl)}`,
  },
  {
    name: 'thingproxy',
    url: (feedUrl: string) =>
      `https://thingproxy.freeboard.io/fetch/${feedUrl}`,
  },
];

/** Track proxy success/failure rates per feed */
export const proxyHealth: Record<
  string,
  Record<string, { successes: number; failures: number }>
> = {};

/** Get sorted proxies by success rate for a given feed URL */
export function getSortedProxies(feedUrl: string): CorsProxy[] {
  if (!proxyHealth[feedUrl]) {
    proxyHealth[feedUrl] = {};
    corsProxies.forEach((proxy) => {
      proxyHealth[feedUrl][proxy.name] = { successes: 0, failures: 0 };
    });
  }

  return [...corsProxies].sort((a, b) => {
    const healthA = proxyHealth[feedUrl][a.name];
    const healthB = proxyHealth[feedUrl][b.name];
    const rateA =
      healthA.successes / (healthA.successes + healthA.failures + 1);
    const rateB =
      healthB.successes / (healthB.successes + healthB.failures + 1);
    return rateB - rateA;
  });
}
