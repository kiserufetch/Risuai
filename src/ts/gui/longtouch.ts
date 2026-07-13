import { haptic } from './haptics'

/**
 * Long-press action supporting both mouse and touch input.
 *
 * Touch handling is skipped on text-entry elements (textarea/input), where a
 * native long-press means "place cursor / select text" and hijacking it would
 * break editing on mobile.
 */
export function longpress(node: HTMLElement, callback: (e: MouseEvent | TouchEvent) => void) {
	const TIME_MS = 500;
	const MOVE_TOLERANCE_PX = 12;
	let timeoutPtr: number;
	let touchStartX = 0;
	let touchStartY = 0;
	let touchFired = false;
	let touchPending = false;

	const isTextEntry = node.tagName === 'TEXTAREA' || node.tagName === 'INPUT';

	function handleMouseDown(e: MouseEvent) {
		window.addEventListener('mousemove', handleMoveBeforeLong);
		timeoutPtr = window.setTimeout(() => {
			window.removeEventListener('mousemove', handleMoveBeforeLong);
			callback(e);
		}, TIME_MS);
	}
	function handleMoveBeforeLong() {
		window.clearTimeout(timeoutPtr);
		window.removeEventListener('mousemove', handleMoveBeforeLong);
	}
	function handleMouseUp() {
		window.clearTimeout(timeoutPtr);
		window.removeEventListener('mousemove', handleMoveBeforeLong);
	}

	function handleTouchStart(e: TouchEvent) {
		const touch = e.touches[0];
		if (!touch) return;
		touchStartX = touch.clientX;
		touchStartY = touch.clientY;
		touchFired = false;
		touchPending = true;
		window.clearTimeout(timeoutPtr);
		timeoutPtr = window.setTimeout(() => {
			touchFired = true;
			haptic(12);
			callback(e);
		}, TIME_MS);
	}
	function handleTouchMove(e: TouchEvent) {
		const touch = e.touches[0];
		if (!touch) return;
		if (Math.abs(touch.clientX - touchStartX) > MOVE_TOLERANCE_PX ||
			Math.abs(touch.clientY - touchStartY) > MOVE_TOLERANCE_PX) {
			window.clearTimeout(timeoutPtr);
			touchPending = false;
		}
	}
	function handleTouchEnd(e: TouchEvent) {
		window.clearTimeout(timeoutPtr);
		touchPending = false;
		if (touchFired) {
			// Swallow the synthetic click that follows touchend, otherwise the
			// element's regular click handler would fire on top of the long-press.
			e.preventDefault();
			touchFired = false;
		}
	}
	function handleTouchCancel() {
		window.clearTimeout(timeoutPtr);
		touchPending = false;
		touchFired = false;
	}
	function handleContextMenu(e: Event) {
		// Android fires contextmenu on long-press; suppress it only while a touch
		// long-press is in flight so desktop right-click keeps working.
		if (touchPending || touchFired) {
			e.preventDefault();
		}
	}

	node.addEventListener('mousedown', handleMouseDown);
	node.addEventListener('mouseup', handleMouseUp);
	if (!isTextEntry) {
		node.addEventListener('touchstart', handleTouchStart, { passive: true });
		node.addEventListener('touchmove', handleTouchMove, { passive: true });
		node.addEventListener('touchend', handleTouchEnd, { passive: false });
		node.addEventListener('touchcancel', handleTouchCancel);
		node.addEventListener('contextmenu', handleContextMenu);
	}
	return {
		destroy: () => {
			// The node can unmount while a press is armed (e.g. the message list
			// remounts a row); a timer left running would fire against stale state.
			window.clearTimeout(timeoutPtr);
			window.removeEventListener('mousemove', handleMoveBeforeLong);
			node.removeEventListener('mousedown', handleMouseDown);
			node.removeEventListener('mouseup', handleMouseUp);
			if (!isTextEntry) {
				node.removeEventListener('touchstart', handleTouchStart);
				node.removeEventListener('touchmove', handleTouchMove);
				node.removeEventListener('touchend', handleTouchEnd);
				node.removeEventListener('touchcancel', handleTouchCancel);
				node.removeEventListener('contextmenu', handleContextMenu);
			}
		}
	};
}
