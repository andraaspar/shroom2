let index = 1n
let tagName = 'c-mp'
while (customElements.get(tagName)) {
	tagName = `c-mp-${++index}`
}

export function getCmpTagName() {
	return tagName
}

export function getCmpIndex() {
	return index
}
