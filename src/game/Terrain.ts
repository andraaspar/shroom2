/**
 * Terrain collision mask. Replaces flash.display.BitmapData in the logic layer.
 *
 * Stores one byte per pixel: 0 = empty, >= 128 = solid. This mirrors the
 * original BitmapData.hitTest(..., 128, ..., 128) alpha-threshold semantics.
 *
 * The render layer is responsible for turning this into pixels on screen;
 * the logic layer only ever reads/writes the mask.
 */
export class Terrain {
	readonly width: number
	readonly height: number
	/** Row-major, 1 byte per pixel. 0 = empty, 255 = solid. */
	readonly data: Uint8Array

	/**
	 * Set whenever the mask changes. The render layer checks and clears this
	 * to know when to re-upload terrain pixels (deformable terrain).
	 */
	isDirty = true

	constructor(width: number, height: number, data?: Uint8Array) {
		this.width = width
		this.height = height
		this.data = data ?? new Uint8Array(width * height)
	}

	isSolid(x: number, y: number): boolean {
		const xi = x | 0
		const yi = y | 0
		if (xi < 0 || yi < 0 || xi >= this.width || yi >= this.height) return false
		return this.data[yi * this.width + xi]! >= 128
	}

	set(x: number, y: number, solid: boolean): void {
		const xi = x | 0
		const yi = y | 0
		if (xi < 0 || yi < 0 || xi >= this.width || yi >= this.height) return
		this.data[yi * this.width + xi] = solid ? 255 : 0
		this.isDirty = true
	}

	/**
	 * 1:1 replacement for BitmapData.hitTest with threshold 128 on both sides.
	 * Tests whether any solid pixel of `hitMap` (a 2r×2r mask) placed at
	 * `topLeft` overlaps a solid terrain pixel.
	 */
	hitTestMap(hitMap: Uint8Array, mapSize: number, topLeftX: number, topLeftY: number): boolean {
		const ox = topLeftX | 0
		const oy = topLeftY | 0
		for (let my = 0; my < mapSize; my++) {
			const ty = oy + my
			if (ty < 0 || ty >= this.height) continue
			const rowBase = ty * this.width
			const mapRowBase = my * mapSize
			for (let mx = 0; mx < mapSize; mx++) {
				if (hitMap[mapRowBase + mx]! < 128) continue
				const tx = ox + mx
				if (tx < 0 || tx >= this.width) continue
				if (this.data[rowBase + tx]! >= 128) return true
			}
		}
		return false
	}

	clone(): Terrain {
		return new Terrain(this.width, this.height, new Uint8Array(this.data))
	}
}
