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
		const xi = Math.floor(x)
		const yi = Math.floor(y)
		if (xi < 0 || yi < 0 || xi >= this.width || yi >= this.height) return false
		return this.data[yi * this.width + xi]! >= 128
	}

	set(x: number, y: number, solid: boolean): void {
		const xi = Math.floor(x)
		const yi = Math.floor(y)
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
		// Round the origin the same way subtractMap does, so the hole you punch
		// is the hole you collide against (Regression 13).
		const ox = Math.round(topLeftX)
		const oy = Math.round(topLeftY)
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

	/**
	 * 1:1 replacement for WorldObject.mergeWithAlphaChannel: punches a hole
	 * into the terrain using a 2r×2r mask placed at (topLeftX, topLeftY).
	 *
	 * The original copies the terrain alpha into a scratch red channel, then
	 * copyPixels the hole map on top with mergeAlpha=false (destination
	 * pixels fully replaced where the hole map is solid), then copies red
	 * back to alpha. Net effect: terrain becomes empty wherever the hole
	 * mask is solid (>= 128), unchanged elsewhere.
	 */
	subtractMap(map: Uint8Array, mapSize: number, topLeftX: number, topLeftY: number): void {
		const ox = Math.round(topLeftX)
		const oy = Math.round(topLeftY)
		for (let my = 0; my < mapSize; my++) {
			const ty = oy + my
			if (ty < 0 || ty >= this.height) continue
			const rowBase = ty * this.width
			const mapRowBase = my * mapSize
			for (let mx = 0; mx < mapSize; mx++) {
				if (map[mapRowBase + mx]! < 128) continue
				const tx = ox + mx
				if (tx < 0 || tx >= this.width) continue
				this.data[rowBase + tx] = 0
			}
		}
		this.isDirty = true
	}

	clone(): Terrain {
		return new Terrain(this.width, this.height, new Uint8Array(this.data))
	}
}
