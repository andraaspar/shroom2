export const PI = Math.PI
export const HALF_PI = Math.PI / 2
export const DOUBLE_PI = Math.PI * 2

/**
 * 1:1 port of flash.geom.Point (only the parts the game logic uses).
 * Mutable, like the original, to keep ported physics code identical in shape.
 */
export class Point {
	constructor(
		public x = 0,
		public y = 0,
	) {}

	get length(): number {
		return Math.sqrt(this.x * this.x + this.y * this.y)
	}

	clone(): Point {
		return new Point(this.x, this.y)
	}

	add(v: Point): Point {
		return new Point(this.x + v.x, this.y + v.y)
	}

	subtract(v: Point): Point {
		return new Point(this.x - v.x, this.y - v.y)
	}

	normalize(thickness = 1): void {
		if (this.x !== 0 || this.y !== 0) {
			const norm = thickness / Math.sqrt(this.x * this.x + this.y * this.y)
			this.x *= norm
			this.y *= norm
		}
	}

	/** Mutates this point in place, like flash.geom.Point.offset. */
	offset(dx: number, dy: number): void {
		this.x += dx
		this.y += dy
	}

	static distance(pt1: Point, pt2: Point): number {
		const dx = pt2.x - pt1.x
		const dy = pt2.y - pt1.y
		return Math.sqrt(dx * dx + dy * dy)
	}

	static polar(len: number, angle: number): Point {
		return new Point(len * Math.cos(angle), len * Math.sin(angle))
	}

	toString(): string {
		return `(x=${this.x}, y=${this.y})`
	}
}
