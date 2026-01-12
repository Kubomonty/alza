'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type Options = {
  cardStepPx: number;
  itemCount: number;
  minTriggerFraction?: number; // default 0.35
  maxShiftPerRelease?: number; // default 8
  /** Called on release if a shift should occur, positive = move left, negative = move right */
  onShift: (shift: number) => void;
  /** Used to suppress click if user dragged */
  clickSuppressPx?: number; // default 8
};

export function usePointerDragCarousel({
  cardStepPx,
  clickSuppressPx = 8,
  itemCount,
  maxShiftPerRelease = 8,
  minTriggerFraction = 0.35,
  onShift,
}: Options) {
  const draggingRef = useRef(false);
  const pointerIdRef = useRef<number | null>(null);
  const startXRef = useRef(0);
  const lastXRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const didDragRef = useRef(false);

  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isSettling, setIsSettling] = useState(false);
  const captureElRef = useRef<HTMLElement | null>(null);
  const hasCaptureRef = useRef(false);

  /**
   * Schedules drag update on next animation frame
   *
   * @param {number} clientX Current pointer X position
   */
  const scheduleDragUpdate = useCallback(
    (clientX: number) => {
      lastXRef.current = clientX;
      if (rafRef.current != null) return;

      rafRef.current = window.requestAnimationFrame(() => {
        rafRef.current = null;
        const dx = lastXRef.current - startXRef.current;
        setDragX(dx);
        if (Math.abs(dx) >= clickSuppressPx) didDragRef.current = true;
      });
    },
    [clickSuppressPx],
  );

  /**
   * Ends the drag operation, computes shift if needed
   *
   * @param {number} clientX Current pointer X position
   */
  const endDrag = useCallback(
    (clientX: number) => {
      if (!draggingRef.current) return;

      draggingRef.current = false;
      if (hasCaptureRef.current && captureElRef.current && pointerIdRef.current != null) {
        try {
          captureElRef.current.releasePointerCapture(pointerIdRef.current);
        } catch {}
      }
      hasCaptureRef.current = false;
      captureElRef.current = null;

      pointerIdRef.current = null;
      const dx = clientX - startXRef.current;

      if (itemCount > 0 && cardStepPx > 0) {
        const raw = dx / cardStepPx;
        if (Math.abs(raw) >= minTriggerFraction) {
          let shift = Math.round(raw);
          if (shift === 0) shift = raw > 0 ? 1 : -1;
          if (shift > maxShiftPerRelease) shift = maxShiftPerRelease;
          if (shift < -maxShiftPerRelease) shift = -maxShiftPerRelease;
          onShift(shift);
        }
      }

      // prevent "jump back" visual flash
      setIsSettling(true);
      setIsDragging(false);
      setDragX(0);
      requestAnimationFrame(() => (didDragRef.current = false));
      requestAnimationFrame(() => setIsSettling(false));

      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    },
    [itemCount, cardStepPx, minTriggerFraction, maxShiftPerRelease, onShift],
  );

  /**
   * Pointer down handler
   *
   * @param {React.PointerEvent} e Pointer event
   */
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    draggingRef.current = true;
    pointerIdRef.current = e.pointerId;
    startXRef.current = e.clientX;
    lastXRef.current = e.clientX;
    didDragRef.current = false;

    setIsDragging(true);
    setDragX(0);

    captureElRef.current = e.currentTarget as HTMLElement;
    hasCaptureRef.current = false;
  }, []);

  /**
   * Pointer move handler
   *
   * @param {React.PointerEvent} e Pointer event
   */
  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!draggingRef.current) return;
      if (pointerIdRef.current !== e.pointerId) return;

      const dx = e.clientX - startXRef.current;

      // start drag only after threshold
      if (!didDragRef.current && Math.abs(dx) < clickSuppressPx) return;

      if (!hasCaptureRef.current) {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        hasCaptureRef.current = true;
      }

      scheduleDragUpdate(e.clientX);
    },
    [scheduleDragUpdate, clickSuppressPx],
  );

  /**
   * Pointer up handler
   *
   * @param {React.PointerEvent} e Pointer event
   */
  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (pointerIdRef.current !== e.pointerId) return;
      endDrag(e.clientX);
    },
    [endDrag],
  );

  /**
   * Pointer cancel handler
   *
   * @param {React.PointerEvent} e Pointer event
   */
  const onPointerCancel = useCallback(
    (e: React.PointerEvent) => {
      if (pointerIdRef.current !== e.pointerId) return;
      endDrag(e.clientX);
    },
    [endDrag],
  );

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  /**
   * @returns {boolean} Whether the click should be suppressed
   */
  const shouldSuppressClick = useCallback(() => didDragRef.current, []);

  const bind = {
    onPointerCancel,
    onPointerDown,
    onPointerMove,
    onPointerUp,
  };

  return { bind, dragX, isDragging, isSettling, shouldSuppressClick };
}
