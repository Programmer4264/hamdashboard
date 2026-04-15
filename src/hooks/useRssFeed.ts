import { useState, useEffect, useCallback, useRef } from 'react';
import { getSortedProxies, proxyHealth } from '../utils/proxyHelpers';
import type { RssFeedItem } from '../config/configTypes';

export interface RssItem {
  title: string;
  link: string;
}

export interface FeedResult {
  feedTitle: string;
  lastUpdated: string;
  items: RssItem[];
  error?: string;
}

/**
 * Hook for fetching and managing RSS feeds with proxy fallback.
 */
export function useRssFeed(feeds: RssFeedItem[]): {
  feedResults: FeedResult[];
  loading: boolean;
} {
  const [feedResults, setFeedResults] = useState<FeedResult[]>([]);
  const [loading, setLoading] = useState(true);
  const intervalsRef = useRef<ReturnType<typeof setInterval>[]>([]);
  const activeFetchesRef = useRef<Map<string, Promise<void>>>(new Map());

  const fetchSingleFeed = useCallback(
    async (
      rssUrl: string,
      index: number,
      retryCount = 0,
      maxRetries = 1
    ) => {
      if (activeFetchesRef.current.has(rssUrl)) return;

      const sortedProxies = getSortedProxies(rssUrl);

      const fetchPromise = (async () => {
        try {
          const proxyPromises = sortedProxies.map(async (proxy) => {
            const proxyUrl = proxy.url(rssUrl);
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000);

            try {
              const response = await fetch(proxyUrl, {
                signal: controller.signal,
                cache: 'no-cache',
                headers: {
                  Accept:
                    'application/rss+xml, application/xml, text/xml, application/atom+xml',
                },
              });
              clearTimeout(timeoutId);

              if (!response.ok) throw new Error(`HTTP ${response.status}`);

              const data = await response.text();
              const trimmedData = data.trim();
              if (
                !trimmedData.startsWith('<?xml') &&
                !trimmedData.startsWith('<rss') &&
                !trimmedData.startsWith('<feed') &&
                !trimmedData.includes('<rss') &&
                !trimmedData.includes('<feed')
              ) {
                throw new Error('Response is not XML');
              }

              const parser = new DOMParser();
              const xmlDoc = parser.parseFromString(data, 'text/xml');

              const parserError = xmlDoc.querySelector('parsererror');
              if (parserError) throw new Error('XML parsing error');

              let itmTag = 'item';
              if (xmlDoc.querySelector('entry')) itmTag = 'entry';

              const feedTitle =
                xmlDoc.querySelector('channel > title, feed > title')
                  ?.textContent || 'Unknown Feed';
              const lastUpdated =
                xmlDoc.querySelector(
                  'channel > lastBuildDate, feed > updated'
                )?.textContent || 'Unknown Time';

              const items = xmlDoc.querySelectorAll(itmTag);
              if (items.length === 0) throw new Error('No items found in feed');

              proxyHealth[rssUrl][proxy.name].successes++;

              const rssItems: RssItem[] = Array.from(items).map((item) => {
                const title =
                  item.querySelector('title')?.textContent || 'No title';
                const linkElement = item.querySelector('link');
                let link = '';
                if (linkElement) {
                  link =
                    linkElement.getAttribute('href') ||
                    linkElement.textContent?.trim() ||
                    '';
                }
                return { title, link };
              });

              return { feedTitle, lastUpdated, items: rssItems };
            } catch (error) {
              clearTimeout(timeoutId);
              proxyHealth[rssUrl][proxy.name].failures++;
              throw error;
            }
          });

          const result = await Promise.any(proxyPromises);

          setFeedResults((prev) => {
            const next = [...prev];
            next[index] = result;
            return next;
          });
        } catch {
          if (retryCount < maxRetries) {
            const retryDelay = (retryCount + 1) * 3000;
            activeFetchesRef.current.delete(rssUrl);
            await new Promise((resolve) => setTimeout(resolve, retryDelay));
            return fetchSingleFeed(rssUrl, index, retryCount + 1, maxRetries);
          }

          const domain = rssUrl.split('/')[2];
          setFeedResults((prev) => {
            const next = [...prev];
            next[index] = {
              feedTitle: domain,
              lastUpdated: '',
              items: [],
              error: `${domain} unavailable`,
            };
            return next;
          });
        } finally {
          activeFetchesRef.current.delete(rssUrl);
        }
      })();

      activeFetchesRef.current.set(rssUrl, fetchPromise);
      await fetchPromise;
    },
    []
  );

  useEffect(() => {
    if (!feeds || feeds.length === 0) {
      setLoading(false);
      return;
    }

    setFeedResults(new Array(feeds.length).fill(null));
    setLoading(true);

    feeds.forEach(([rssUrl, interval], index) => {
      fetchSingleFeed(rssUrl, index).then(() => {
        setLoading(false);
      });

      if (interval && interval > 0) {
        const id = setInterval(() => {
          fetchSingleFeed(rssUrl, index);
        }, interval * 60 * 1000);
        intervalsRef.current.push(id);
      }
    });

    return () => {
      intervalsRef.current.forEach((id) => clearInterval(id));
      intervalsRef.current = [];
    };
  }, [feeds, fetchSingleFeed]);

  return { feedResults, loading };
}
