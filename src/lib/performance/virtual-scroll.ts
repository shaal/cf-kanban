/**
 * TASK-094: Virtual Scrolling Module
 *
 * Provides virtual scrolling for ticket lists and memory browser,
 * intersection observer integration, and memory optimization.
 */

// Type definitions
interface VirtualListOptions {
	itemCount: number;
	itemHeight: number | ((index: number) => number);
	containerHeight: number;
	overscan?: number;
}

interface VisibleRange {
	start: number;
	end: number;
}

interface VirtualScrollHookOptions extends VirtualListOptions {
	onVisibleRangeChange?: (range: VisibleRange) => void;
	scrollDebounce?: number;
}

interface LazyLoaderOptions {
	rootMargin?: string;
	threshold?: number;
	onIntersect?: (element: Element) => void;
}

interface VirtualListConfig {
	itemHeight: number | ((index: number) => number);
	overscan: number;
	scrollDebounce: number;
}

// Scroll position storage
const scrollPositions = new Map<string, number>();

/**
 * Configuration for ticket list virtual scrolling
 */
export const TICKET_LIST_CONFIG: VirtualListConfig = {
	itemHeight: 120, // Height of a kanban card
	overscan: 3,
	scrollDebounce: 16 // ~60fps
};

/**
 * Configuration for memory browser virtual scrolling
 */
export const MEMORY_BROWSER_CONFIG: VirtualListConfig = {
	itemHeight: 80, // Height of a memory entry
	overscan: 5,
	scrollDebounce: 16
};

/**
 * Create a virtual list manager
 *
 * @param options - Virtual list configuration
 * @returns Virtual list API
 */
export function createVirtualList(options: VirtualListOptions) {
	const { itemCount, itemHeight, containerHeight, overscan = 2 } = options;

	let currentScrollPosition = 0;

	// Calculate height for a specific item
	const getHeight = (index: number): number => {
		return typeof itemHeight === 'function' ? itemHeight(index) : itemHeight;
	};

	// Calculate cumulative offset for an item
	const getItemOffset = (index: number): number => {
		if (typeof itemHeight === 'number') {
			return index * itemHeight;
		}

		let offset = 0;
		for (let i = 0; i < index; i++) {
			offset += itemHeight(i);
		}
		return offset;
	};

	// Calculate total content height
	const getTotalHeight = (): number => {
		if (typeof itemHeight === 'number') {
			return itemCount * itemHeight;
		}

		let total = 0;
		for (let i = 0; i < itemCount; i++) {
			total += itemHeight(i);
		}
		return total;
	};

	// Get visible range based on scroll position
	const getVisibleRange = (scrollTop?: number): VisibleRange => {
		const scroll = scrollTop ?? currentScrollPosition;

		let start = 0;
		let accumulatedHeight = 0;

		// Find start index
		if (typeof itemHeight === 'number') {
			start = Math.floor(scroll / itemHeight);
		} else {
			while (accumulatedHeight < scroll && start < itemCount) {
				accumulatedHeight += getHeight(start);
				start++;
			}
			start = Math.max(0, start - 1);
		}

		// Calculate visible items count
		const visibleItems = typeof itemHeight === 'number'
			? Math.ceil(containerHeight / itemHeight)
			: (() => {
					let count = 0;
					let height = 0;
					let idx = start;
					while (height < containerHeight && idx < itemCount) {
						height += getHeight(idx);
						count++;
						idx++;
					}
					return count;
				})();

		// Apply overscan
		const startWithOverscan = Math.max(0, start - overscan);
		const endWithOverscan = Math.min(itemCount, start + visibleItems + overscan);

		return {
			start: startWithOverscan,
			end: endWithOverscan
		};
	};

	// Update scroll position
	const scrollTo = (position: number): void => {
		currentScrollPosition = Math.max(0, position);
	};

	return {
		getVisibleRange,
		getItemOffset,
		getTotalHeight,
		scrollTo,
		getHeight
	};
}

/**
 * Virtual scroll hook for reactive scroll handling
 *
 * @param options - Hook options
 * @returns Scroll handlers and utilities
 */
export function useVirtualScroll(options: VirtualScrollHookOptions) {
	const {
		itemCount,
		itemHeight,
		containerHeight,
		overscan,
		onVisibleRangeChange,
		scrollDebounce = 16
	} = options;

	const virtualList = createVirtualList({
		itemCount,
		itemHeight,
		containerHeight,
		overscan
	});

	let debounceTimer: ReturnType<typeof setTimeout> | null = null;
	let lastRange: VisibleRange | null = null;

	const handleScroll = (scrollTop: number): void => {
		virtualList.scrollTo(scrollTop);

		if (debounceTimer) {
			clearTimeout(debounceTimer);
		}

		if (scrollDebounce === 0) {
			const range = virtualList.getVisibleRange();
			if (onVisibleRangeChange && hasRangeChanged(range)) {
				lastRange = range;
				onVisibleRangeChange(range);
			}
			return;
		}

		debounceTimer = setTimeout(() => {
			const range = virtualList.getVisibleRange();
			if (onVisibleRangeChange && hasRangeChanged(range)) {
				lastRange = range;
				onVisibleRangeChange(range);
			}
		}, scrollDebounce);
	};

	const hasRangeChanged = (range: VisibleRange): boolean => {
		if (!lastRange) return true;
		return range.start !== lastRange.start || range.end !== lastRange.end;
	};

	return {
		handleScroll,
		virtualList
	};
}

/**
 * Create a lazy loader using Intersection Observer
 *
 * @param options - Lazy loader options
 * @returns Lazy loader API
 */
export function createLazyLoader(options: LazyLoaderOptions = {}) {
	const { rootMargin = '100px', threshold = 0.1, onIntersect } = options;

	const callback = (entries: IntersectionObserverEntry[]): void => {
		for (const entry of entries) {
			if (entry.isIntersecting && onIntersect) {
				onIntersect(entry.target);
			}
		}
	};

	const observer = new IntersectionObserver(callback, {
		rootMargin,
		threshold
	});

	return {
		observe: (element: Element): void => {
			observer.observe(element);
		},
		unobserve: (element: Element): void => {
			observer.unobserve(element);
		},
		disconnect: (): void => {
			observer.disconnect();
		}
	};
}

/**
 * Create a DOM element recycle pool for memory optimization
 *
 * @param maxSize - Maximum pool size
 * @returns Recycle pool API
 */
export function createRecyclePool<T>(maxSize: number) {
	const pool: T[] = [];

	return {
		acquire: (): T | null => {
			return pool.pop() ?? null;
		},
		release: (element: T): void => {
			if (pool.length < maxSize) {
				pool.push(element);
			}
		},
		size: (): number => pool.length,
		clear: (): void => {
			pool.length = 0;
		}
	};
}

/**
 * Save scroll position for restoration
 *
 * @param key - Unique key for the scroll container
 * @param position - Current scroll position
 */
export function saveScrollPosition(key: string, position: number): void {
	scrollPositions.set(key, position);
}

/**
 * Get saved scroll position
 *
 * @param key - Unique key for the scroll container
 * @returns Saved scroll position or 0
 */
export function getScrollPosition(key: string): number {
	return scrollPositions.get(key) ?? 0;
}

/**
 * Clear all saved scroll positions
 */
export function clearScrollPositions(): void {
	scrollPositions.clear();
}

/**
 * Create a windowed list renderer
 *
 * @param containerElement - The scrollable container
 * @param options - Virtual list options
 * @returns Renderer API
 */
export function createWindowedRenderer<T>(
	containerElement: HTMLElement,
	options: VirtualListOptions & {
		renderItem: (item: T, index: number) => HTMLElement;
		items: T[];
	}
) {
	const { renderItem, items, ...listOptions } = options;

	const virtualList = createVirtualList({
		...listOptions,
		itemCount: items.length
	});

	const contentWrapper = document.createElement('div');
	contentWrapper.style.height = `${virtualList.getTotalHeight()}px`;
	contentWrapper.style.position = 'relative';
	containerElement.appendChild(contentWrapper);

	const renderedElements = new Map<number, HTMLElement>();

	const render = (): void => {
		const range = virtualList.getVisibleRange();

		// Remove elements outside visible range
		for (const [index, element] of renderedElements) {
			if (index < range.start || index >= range.end) {
				element.remove();
				renderedElements.delete(index);
			}
		}

		// Add elements in visible range
		for (let i = range.start; i < range.end; i++) {
			if (!renderedElements.has(i) && items[i]) {
				const element = renderItem(items[i], i);
				element.style.position = 'absolute';
				element.style.top = `${virtualList.getItemOffset(i)}px`;
				element.style.width = '100%';
				contentWrapper.appendChild(element);
				renderedElements.set(i, element);
			}
		}
	};

	const handleScroll = (): void => {
		virtualList.scrollTo(containerElement.scrollTop);
		render();
	};

	containerElement.addEventListener('scroll', handleScroll, { passive: true });

	// Initial render
	render();

	return {
		render,
		destroy: (): void => {
			containerElement.removeEventListener('scroll', handleScroll);
			contentWrapper.remove();
			renderedElements.clear();
		},
		updateItems: (newItems: T[]): void => {
			// Update and re-render
			items.length = 0;
			items.push(...newItems);
			render();
		}
	};
}

/**
 * Scroll to a specific item index
 *
 * @param containerElement - The scrollable container
 * @param index - Item index to scroll to
 * @param itemHeight - Height of items
 * @param behavior - Scroll behavior
 */
export function scrollToIndex(
	containerElement: HTMLElement,
	index: number,
	itemHeight: number | ((i: number) => number),
	behavior: ScrollBehavior = 'smooth'
): void {
	let offset = 0;

	if (typeof itemHeight === 'number') {
		offset = index * itemHeight;
	} else {
		for (let i = 0; i < index; i++) {
			offset += itemHeight(i);
		}
	}

	containerElement.scrollTo({
		top: offset,
		behavior
	});
}

/**
 * Check if an element is in the viewport
 *
 * @param element - Element to check
 * @param margin - Additional margin around viewport
 * @returns Whether element is visible
 */
export function isInViewport(element: HTMLElement, margin = 0): boolean {
	const rect = element.getBoundingClientRect();
	return (
		rect.top < window.innerHeight + margin &&
		rect.bottom > -margin &&
		rect.left < window.innerWidth + margin &&
		rect.right > -margin
	);
}
