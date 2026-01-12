'use client';

import { useMemo, useRef, useState } from 'react';

import { Product } from '../../../domain';
import { useCarouselMetrics } from '../hooks/useCarouselMetrics';
import { usePointerDragCarousel } from '../hooks/usePointerDragCarousel';
import { HeroCarouselProductCard } from './HeroCarouselProductCard';

type HeroCarouselProps = { products: Product[] };

/**
 * Remainder function for modulo operation that handles negative numbers correctly.
 *
 * @param {number} n Dividend
 * @param {number} m Divisor
 * @returns {number}
 */
function customMod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

/**
 * Rotates an array by a given number of positions.
 *
 * @param {T[]} arr Array to rotate
 * @param {number} shift Number of positions to rotate
 * @returns {T[]} Rotated array
 */
function rotate<T>(arr: T[], shift: number): T[] {
  const len = arr.length;
  if (len === 0) return arr;
  const shiftMod = customMod(shift, len);
  if (shiftMod === 0) return arr;
  return [...arr.slice(len - shiftMod), ...arr.slice(0, len - shiftMod)];
}

export function HeroCarousel({ products }: HeroCarouselProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const [offset, setOffset] = useState(0);

  // measure metrics (step, capacity)
  const { capacity, cardStepPx } = useCarouselMetrics(containerRef, [products]);

  const loopEnabled = products.length > capacity && products.length > 0;

  // build base list depending on loop mode
  const base = useMemo(() => {
    const list = loopEnabled ? [...products, ...products, ...products] : products;

    return list.map((prod, i) => ({
      ...prod,
      carouselId: loopEnabled ? `${prod.id}-dup-${i}` : `${prod.id}`,
    }));
  }, [products, loopEnabled]);

  const effectiveOffset = loopEnabled && base.length ? customMod(offset, base.length) : 0;
  const productsArray = useMemo(() => rotate(base, effectiveOffset), [base, effectiveOffset]);

  // buttons: move by whole page (capacity)
  const pageShift = Math.max(1, capacity || 1);

  const moveLeft = () => {
    if (!loopEnabled || !base.length) return;
    setOffset((offs) => customMod(offs + pageShift, base.length));
  };

  const moveRight = () => {
    if (!loopEnabled || !base.length) return;
    setOffset((offs) => customMod(offs - pageShift, base.length));
  };

  const { bind, dragX, isDragging, isSettling, shouldSuppressClick } = usePointerDragCarousel({
    cardStepPx,
    clickSuppressPx: 8,
    itemCount: base.length,
    maxShiftPerRelease: 8,
    minTriggerFraction: 0.35,
    onShift: (shift) => setOffset((offs) => customMod(offs + shift, base.length)),
  });

  return (
    <div aria-label="Karusel produktů" className="relative" role="region">
      {loopEnabled && (
        <>
          <button
            aria-label="Předchozí produkty"
            className="absolute left-0 top-1/2 z-20 h-14 w-6 -translate-y-1/2 rounded-r-md bg-sky-300 text-white hover:bg-sky-500 shadow-md"
            onClick={moveLeft}
            type="button"
          >
            ‹
          </button>
          <button
            aria-label="Následující produkty"
            className="absolute right-0 top-1/2 z-20 h-14 w-6 -translate-y-1/2 rounded-l-md bg-sky-300 text-white hover:bg-sky-500 shadow-md"
            onClick={moveRight}
            type="button"
          >
            ›
          </button>
        </>
      )}

      <div className="flex items-center justify-center overflow-x-hidden" ref={containerRef}>
        <div
          className="flex items-center justify-center"
          role="list"
          {...bind}
          style={{
            cursor: loopEnabled ? (isDragging ? 'grabbing' : 'grab') : 'default',
            touchAction: loopEnabled ? 'pan-y' : 'auto',
            transform: `translate3d(${loopEnabled ? dragX : 0}px, 0, 0)`,
            transition: isDragging || isSettling ? 'none' : 'transform 180ms ease-out',
            userSelect: 'none',
          }}
        >
          {productsArray.map((product) => (
            <div
              className="flex mx-1"
              data-product-id={product.carouselId}
              key={product.carouselId}
              role="listitem"
            >
              <HeroCarouselProductCard
                onClick={(e) => {
                  if (shouldSuppressClick()) e.preventDefault();
                }}
                product={product}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
