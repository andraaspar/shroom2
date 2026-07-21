export function jsonClone<T>(o: T): T {
	return o == null ? o : JSON.parse(JSON.stringify(o))
}
