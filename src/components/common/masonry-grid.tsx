'use client';

/**
 * True shortest-column masonry with variable item widths (Pinterest-style).
 *
 * Item heights are measured via ResizeObserver, then every card is placed at
 * an absolute position: the next card fills the currently shortest column.
 * Items listed in `adaptiveSpanKeys` may span two adjacent columns when a
 * clean pair position exists (the pair with the smallest max height), and
 * fall back to the single shortest column when spanning would create a
 * large vertical gap. The container height is the tallest final column.
 *
 * Layout re-computes after: images load, viewport resize, promotion carousel
 * changes, and any item height change (all picked up by ResizeObserver).
 */
import * as React from 'react';
import { cn } from '@/lib/utils';

export interface MasonryGridProps {
  children: React.ReactNode;
  className?: string;
  /** px gap between every item (default 24) */
  gap?: number;
  /** Keys of children allowed to span 2 columns when a clean pair position exists */
  adaptiveSpanKeys?: string[];
}

const COLUMN_BREAKPOINTS = [
  { minWidth: 1024, cols: 3 },
  { minWidth: 640, cols: 2 },
  { minWidth: 0, cols: 1 },
];

const columnCountFor = (w: number) =>
  [...COLUMN_BREAKPOINTS].sort((a, b) => b.minWidth - a.minWidth).find((bp) => w >= bp.minWidth)
    ?.cols ?? 1;

/** Extra vertical gap (px) tolerated before preferring a single column over a 2-col span. */
const SPAN_GAP_TOLERANCE = 80;

interface MasonryItem {
  key: string;
  node: React.ReactNode;
  adaptive: boolean;
}

interface PlacedItem {
  key: string;
  left: number;
  top: number;
  width: number;
}

export function MasonryGrid({ children, className, gap = 24, adaptiveSpanKeys = [] }: MasonryGridProps) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const wrapperRefs = React.useRef<Map<string, HTMLDivElement>>(new Map());
  const heightsRef = React.useRef<Record<string, number>>({});
  const containerWRef = React.useRef(0);
  const colCountRef = React.useRef(3);
  const [containerW, setContainerW] = React.useState(0);
  const [colCount, setColCount] = React.useState(3);
  const [heights, setHeights] = React.useState<Record<string, number>>({});

  const items = React.useMemo<MasonryItem[]>(
    () =>
      React.Children.toArray(children).map((node, i) => {
        const key = React.isValidElement(node) && node.key != null ? String(node.key) : `masonry-${i}`;
        return { key, node, adaptive: adaptiveSpanKeys.includes(key) };
      }),
    [children, adaptiveSpanKeys]
  );

  // Measure container width + every item height; ResizeObserver re-fires on
  // image loads, carousel slides, content changes and viewport resizes.
  React.useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let raf = 0;

    const remeasure = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const w = el.getBoundingClientRect().width;
        if (Math.abs(w - containerWRef.current) > 0.5) {
          containerWRef.current = w;
          setContainerW(w);
        }
        const cc = columnCountFor(w);
        if (cc !== colCountRef.current) {
          colCountRef.current = cc;
          setColCount(cc);
        }

        let changed = false;
        const next: Record<string, number> = {};
        wrapperRefs.current.forEach((wrapper, key) => {
          next[key] = wrapper.getBoundingClientRect().height;
          if (Math.abs(next[key] - (heightsRef.current[key] ?? 0)) > 0.5) changed = true;
        });
        if (changed) {
          heightsRef.current = next;
          setHeights(next);
        }
      });
    };

    remeasure();
    const ro = new ResizeObserver(remeasure);
    ro.observe(el);
    // Also observe every item wrapper — async content (ads, images, fonts)
    // grows a wrapper without resizing the fixed-height container, which a
    // container-only observer misses (a late-loading ad card would overlap
    // the cards placed below it). Any wrapper growth re-triggers the layout.
    wrapperRefs.current.forEach((wrapper) => ro.observe(wrapper));
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [items]);

  // Greedy shortest-column packing; adaptive items try a 2-col span first.
  const layout = React.useMemo(() => {
    const cols = Math.max(1, colCount);
    const colWidth = containerW > 0 ? (containerW - gap * (cols - 1)) / cols : 0;
    const colHeights = new Array<number>(cols).fill(0);
    const placed: PlacedItem[] = [];
    const measured = items.some((it) => (heights[it.key] ?? 0) > 0);

    items.forEach((it, i) => {
      const h = heights[it.key] ?? 0;
      let col: number;
      let span = 1;
      let top: number;

      if (measured && it.adaptive && cols >= 3) {
        // Best adjacent pair = the one whose taller column is shortest
        let best: { pair: [number, number]; y: number } | null = null;
        for (let p = 0; p + 1 < cols; p++) {
          const y = Math.max(colHeights[p], colHeights[p + 1]);
          if (!best || y < best.y) best = { pair: [p, p + 1], y };
        }
        const shortest = colHeights.indexOf(Math.min(...colHeights));
        const singleY = colHeights[shortest];
        if (best && best.y - singleY <= SPAN_GAP_TOLERANCE) {
          col = best.pair[0];
          span = 2;
          top = best.y;
          colHeights[best.pair[0]] = top + h + gap;
          colHeights[best.pair[1]] = top + h + gap;
        } else {
          col = shortest;
          top = singleY;
          colHeights[shortest] = top + h + gap;
        }
      } else {
        // First paint (unmeasured): spread round-robin; later: shortest column
        col = measured ? colHeights.indexOf(Math.min(...colHeights)) : i % cols;
        top = colHeights[col];
        colHeights[col] = top + h + gap;
      }

      placed.push({
        key: it.key,
        left: col * (colWidth + gap),
        top,
        width: span === 2 ? colWidth * 2 + gap : colWidth,
      });
    });

    const height = measured && colWidth > 0 ? Math.max(0, Math.max(...colHeights) - gap) : 0;
    return { placed, height };
  }, [items, heights, colCount, containerW, gap]);

  return (
    <div
      ref={containerRef}
      className={cn('relative w-full', className)}
      style={{ height: layout.height }}
    >
      {layout.placed.map((p) => (
        <div
          key={p.key}
          ref={(el) => {
            if (el) wrapperRefs.current.set(p.key, el);
            else wrapperRefs.current.delete(p.key);
          }}
          className="absolute"
          style={{ left: p.left, top: p.top, width: p.width }}
        >
          {items.find((it) => it.key === p.key)?.node}
        </div>
      ))}
    </div>
  );
}
