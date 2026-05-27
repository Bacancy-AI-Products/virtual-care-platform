import React from 'react';

/**
 * Pixel offset accounting for the fixed app header (66px) plus a little
 * breathing room. When scrolling to a ref, we subtract this so the element
 * isn't tucked under the header.
 */
const HEADER_OFFSET = 80;

/**
 * Smoothly scrolls the window to the top (or to a given ref offset) whenever
 * the `page` value changes, but never on the initial render.
 *
 * Use this in any list/grid/section with client-side pagination so users see
 * the start of the new page's content after clicking next / a page number,
 * instead of staying at the bottom where the pagination controls live.
 *
 * For sub-section pagination embedded in a longer page (e.g. the reviews
 * block on the doctor profile), pass a `ref` to that section's container so
 * we scroll there instead of the very top of the window.
 */
export function useScrollToTopOnPageChange(
    page: number,
    ref?: React.RefObject<HTMLElement | null>,
): void {
    const isFirstRun = React.useRef(true);

    React.useEffect(() => {
        if (isFirstRun.current) {
            isFirstRun.current = false;
            return;
        }
        if (typeof window === 'undefined') return;

        const node = ref?.current;
        if (node) {
            const target = node.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET;
            window.scrollTo({ top: Math.max(0, target), behavior: 'smooth' });
            return;
        }

        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [page, ref]);
}
