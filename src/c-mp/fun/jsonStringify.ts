export function jsonStringify(
	o: any,
	{ spaces, ordered }: { spaces?: string | number; ordered?: boolean } = {},
) {
	if (ordered) {
		const allKeys = new Set<string>()
		JSON.stringify(o, (key, value) => (allKeys.add(key), value))
		return JSON.stringify(o, Array.from(allKeys).sort() as string[], spaces)
	} else {
		return JSON.stringify(o, undefined, spaces)
	}
}
