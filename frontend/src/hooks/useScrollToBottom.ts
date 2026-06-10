import { useEffect, useRef } from 'react';

/**
 * Auto-scrolls a container to the bottom whenever `deps` change.
 */
export function useScrollToBottom<T extends HTMLElement>(deps: unknown[]) {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.scrollTo({
        top: ref.current.scrollHeight,
        behavior: 'smooth',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return ref;
}
