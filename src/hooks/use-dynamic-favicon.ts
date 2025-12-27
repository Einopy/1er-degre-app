import { useEffect } from 'react';
import { useActiveClient } from './use-active-client';

export function useDynamicFavicon() {
  const { activeClient, loading } = useActiveClient();

  useEffect(() => {
    if (loading || !activeClient?.favicon_url) {
      return;
    }

    let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");

    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }

    link.href = activeClient.favicon_url;

    console.log('[useDynamicFavicon] Favicon updated to:', activeClient.favicon_url);

    return () => {
      if (link && !activeClient?.favicon_url) {
        link.href = '/vite.svg';
      }
    };
  }, [activeClient, loading]);

  return { activeClient, loading };
}
