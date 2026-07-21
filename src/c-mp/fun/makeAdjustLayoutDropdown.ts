export function makeAdjustLayoutDropdown(): (
	popover: HTMLElement,
	related: HTMLElement
) => void {
	let lastRect = {} as DOMRect
	let lastHeight = 0
	const scrollbarWidth =
		window.innerWidth - document.documentElement.getBoundingClientRect().width
	return (popover, related) => {
		const rect = related.getBoundingClientRect()
		const height = popover.scrollHeight
		if (
			rect.left !== lastRect.left ||
			rect.bottom !== lastRect.bottom ||
			rect.width !== lastRect.width ||
			height !== lastHeight
		) {
			popover.style.setProperty('--anchor-left-sybfg7', rect.left + 'px')
			popover.style.setProperty('--anchor-width-sybfgw', rect.width + 'px')
			popover.style.setProperty('--anchor-bottom-sybfhw', rect.bottom + 'px')
			popover.style.setProperty('--scroll-height-sybffx', height + 'px')
			popover.style.setProperty(
				'--scrollbar-width-sybfie',
				scrollbarWidth + 'px'
			)
			lastRect = rect
			lastHeight = height
		}
	}
}
