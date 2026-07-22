import { Point } from './Point.ts'

/**
 * 1:1 port of com.pirkadat.geom.Path.
 *
 * The original draws to flash.display.Graphics (moveTo/lineTo/curveTo, then
 * endFill). The port replaces drawTo with drawToMask, which rasterizes the
 * filled shape into a Uint8Array mask (255 = solid) using the same flattened
 * geometry: quadratic curves are subdivided, then the resulting polygon is
 * scanline-filled with even-odd winding, matching Flash's default fill rule
 * closely enough for terrain collision.
 */
export class Path {
	private points: Point[] = []
	private controlPoints: Point[] = []

	constructor(data: string, translate: string) {
		this.parse(data, translate)
	}

	parse(data: string, translate: string): void {
		const splitTrans = translate.split(',')
		const tx = Number(splitTrans[0])
		const ty = Number(splitTrans[1])

		const splitData = data.split(' ')
		for (let i = 0, n = splitData.length; i < n; i++) {
			const splitCoords = splitData[i]!.split(',')
			const p = new Point(Number(splitCoords[0]) + tx, Number(splitCoords[1]) + ty)

			this.points.push(p)
		}
	}

	clear(): void {
		this.points = []
		this.controlPoints = []
	}

	/**
	 * Flattens the path (curves subdivided) into a closed polygon, in the
	 * same order drawTo would emit the segments.
	 */
	flatten(segmentsPerCurve = 16): Point[] {
		const result: Point[] = []
		const n = this.points.length
		for (let i = 0; i <= n; i++) {
			const p = this.getPointAt(i)!
			let cp: Point | null = null
			if (i > 0) cp = this.getControlPointAt(i - 1)

			if (i === 0) {
				result.push(p.clone())
			} else if (cp) {
				const prev = result[result.length - 1]!
				for (let s = 1; s <= segmentsPerCurve; s++) {
					const t = s / segmentsPerCurve
					const mt = 1 - t
					// Quadratic bezier: B(t) = mt^2*P0 + 2*mt*t*CP + t^2*P1
					result.push(
						new Point(
							mt * mt * prev.x + 2 * mt * t * cp.x + t * t * p.x,
							mt * mt * prev.y + 2 * mt * t * cp.y + t * t * p.y,
						),
					)
				}
			} else {
				result.push(p.clone())
			}
		}
		return result
	}

	/**
	 * Rasterizes the filled path into `mask` (row-major, width*height),
	 * setting solid pixels to 255. Replaces drawTo(graphics) + BitmapData.draw
	 * for terrain generation.
	 */
	drawToMask(mask: Uint8Array, width: number, height: number): void {
		const polygon = this.flatten()
		if (polygon.length < 3) return

		// Scanline fill, even-odd rule (Flash default for overlapping paths
		// drawn as separate shapes is non-zero per shape, but each Path is
		// filled independently here, so even-odd within one closed polygon
		// matches a simple closed curve).
		let minY = Infinity
		let maxY = -Infinity
		for (const p of polygon) {
			if (p.y < minY) minY = p.y
			if (p.y > maxY) maxY = p.y
		}
		const yStart = Math.max(0, Math.floor(minY))
		const yEnd = Math.min(height - 1, Math.ceil(maxY))

		const intersections: number[] = []
		for (let y = yStart; y <= yEnd; y++) {
			const yc = y + 0.5
			intersections.length = 0
			for (let i = 0; i < polygon.length; i++) {
				const a = polygon[i]!
				const b = polygon[(i + 1) % polygon.length]!
				if (a.y <= yc === b.y <= yc) continue
				const t = (yc - a.y) / (b.y - a.y)
				intersections.push(a.x + t * (b.x - a.x))
			}
			intersections.sort((p, q) => p - q)
			const rowBase = y * width
			for (let k = 0; k + 1 < intersections.length; k += 2) {
				const x0 = Math.max(0, Math.ceil(intersections[k]! - 0.5))
				const x1 = Math.min(width - 1, Math.floor(intersections[k + 1]! - 0.5))
				for (let x = x0; x <= x1; x++) {
					mask[rowBase + x] = 255
				}
			}
		}
	}

	randomizePoints(): void {
		for (let i = 0, n = this.points.length; i < n; i++) {
			this.randomizePoint(i)
		}
	}

	private getFromVectorLooped(vec: Point[], index: number): Point | null {
		if (vec.length === 0) return null
		index %= vec.length
		if (index < 0) index = vec.length + (index % -vec.length)
		return vec[index]!
	}

	private getPointAt(index: number): Point | null {
		return this.getFromVectorLooped(this.points, index)
	}

	private getControlPointAt(index: number): Point | null {
		return this.getFromVectorLooped(this.controlPoints, index)
	}

	private randomizePoint(index: number): void {
		const p1 = this.getPointAt(index - 1)!
		const p2 = this.getPointAt(index)!
		const p3 = this.getPointAt(index + 1)!

		let distance = Math.min(Point.distance(p1, p2), Point.distance(p2, p3))
		distance *= 0.95
		distance *= Math.random()

		const direction = 2 * Math.PI * Math.random()

		const offset = Point.polar(distance, direction)
		p2.x += offset.x
		p2.y += offset.y
	}

	private insertPointAt(index: number): void {
		const p1 = this.getPointAt(index - 1)!
		const p3 = this.getPointAt(index)!

		const p2 = interpolate(p1, p3, 0.3 + Math.random() * 0.4)
		this.points.splice(index, 0, p2)
	}

	private insertControlPointAt(index: number, smoothRatio: number): void {
		const p1 = this.getPointAt(index)!
		const p2 = this.getPointAt(index + 1)!
		const distP = p2.subtract(p1)
		const dist = distP.length * 0.5
		const cp1 = this.getControlPointAt(index - 1)
		let cp2: Point
		if (cp1 && Math.random() < smoothRatio) {
			cp2 = p1.subtract(cp1)
		} else {
			cp2 = Point.polar(dist, Math.random() * Math.PI - Math.PI / 2 + Math.atan2(distP.y, distP.x))
		}
		cp2.normalize(1)
		cp2.x *= dist
		cp2.y *= dist
		cp2 = p1.add(cp2)
		this.controlPoints.splice(index, 0, cp2)
	}

	refinePath(maxSegmentLength: number): void {
		let reCheck = true
		while (reCheck) {
			reCheck = false
			for (let i = this.points.length - 1; i >= 0; i--) {
				const p1 = this.getPointAt(i - 1)!
				const p2 = this.getPointAt(i)!
				if (p2.subtract(p1).length > maxSegmentLength) {
					this.insertPointAt(i)
					reCheck = true
				}
			}
		}
	}

	createControlPoints(smoothRatio: number): void {
		for (let i = 0, n = this.points.length; i < n; i++) {
			this.insertControlPointAt(i, smoothRatio)
		}
	}
}

/** flash.geom.Point.interpolate: closer to pt2 as ratio approaches 0. */
function interpolate(pt1: Point, pt2: Point, f: number): Point {
	return new Point(pt2.x + (pt1.x - pt2.x) * f, pt2.y + (pt1.y - pt2.y) * f)
}
