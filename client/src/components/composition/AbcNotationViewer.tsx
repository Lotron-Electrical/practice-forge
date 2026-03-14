import { useRef, useEffect, useState } from 'react';

interface Props {
  abc: string;
  className?: string;
}

/**
 * Renders ABC notation as sheet music using abcjs (loaded from CDN).
 * Falls back to showing raw ABC text if abcjs isn't available.
 */
export function AbcNotationViewer({ abc, className = '' }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  // Load abcjs from CDN if not already loaded
  useEffect(() => {
    if ((window as any).ABCJS) {
      setLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/abcjs@6.4.4/dist/abcjs-basic-min.js';
    script.onload = () => setLoaded(true);
    script.onerror = () => setError(true);
    document.head.appendChild(script);

    return () => {
      // Don't remove — keep cached for other instances
    };
  }, []);

  // Render ABC when loaded
  useEffect(() => {
    if (!loaded || !containerRef.current || !abc) return;

    try {
      const ABCJS = (window as any).ABCJS;
      if (ABCJS?.renderAbc) {
        ABCJS.renderAbc(containerRef.current, abc, {
          responsive: 'resize',
          paddingtop: 10,
          paddingbottom: 10,
        });
      }
    } catch {
      setError(true);
    }
  }, [loaded, abc]);

  if (error || !abc) {
    // Fallback: show raw ABC
    return (
      <pre className={`text-xs font-mono p-3 rounded-pf bg-[var(--pf-bg-hover)] text-[var(--pf-text-secondary)] overflow-x-auto ${className}`}>
        {abc || 'No notation data'}
      </pre>
    );
  }

  return (
    <div className={className}>
      <div ref={containerRef} className="abc-render" />
      {!loaded && (
        <div className="text-xs text-[var(--pf-text-secondary)] text-center py-4">
          Loading notation renderer...
        </div>
      )}
    </div>
  );
}
