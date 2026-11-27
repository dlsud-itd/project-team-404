/**
 * FLIP ("first, last, invert, play") for a list whose items change order. Call it before the
 * change to record where each item is, then call the returned `play` once the new order has
 * rendered: every item that moved glides from its old place to its new one.
 *
 * Items are matched by their `data-flip-key` attribute. Respects prefers-reduced-motion.
 */
export function captureFlip(
  container: HTMLElement | null | undefined,
  durationMs = 220,
): () => void {
  if (!container || typeof window === 'undefined' || !('animate' in HTMLElement.prototype)) {
    return () => undefined;
  }
  const reduced =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) return () => undefined;

  const before = new Map<string, DOMRect>();
  for (const item of container.querySelectorAll<HTMLElement>('[data-flip-key]')) {
    before.set(item.dataset['flipKey']!, item.getBoundingClientRect());
  }

  return () => {
    for (const item of container.querySelectorAll<HTMLElement>('[data-flip-key]')) {
      const first = before.get(item.dataset['flipKey']!);
      if (!first) continue;
      const last = item.getBoundingClientRect();
      const dx = first.left - last.left;
      const dy = first.top - last.top;
      if (!dx && !dy) continue;
      item.animate(
        [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'translate(0, 0)' }],
        { duration: durationMs, easing: 'cubic-bezier(0.2, 0, 0, 1)' },
      );
    }
  };
}
