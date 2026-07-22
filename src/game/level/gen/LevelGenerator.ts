import { Path } from '../../geom/Path.ts'
import { Point } from '../../geom/Point.ts'
import { Terrain } from '../../Terrain.ts'
import type { ILevelTemplate } from './ILevelTemplate.ts'
import type { LevelStyle } from './LevelStyle.ts'

/**
 * 1:1 port of com.pirkadat.logic.level.gen.LevelGenerator.
 *
 * The original rasterizes the paths with Flash vector drawing into a
 * BitmapData; the port rasterizes directly into a Terrain mask via
 * Path.drawToMask. Background/distance/preview bitmaps are render-layer
 * concerns and are not ported.
 *
 * Grass effect: the original draws the shape 12 extra times, each 1px
 * higher, with a brightness color transform (which changes RGB, not alpha).
 * Each draw is fully opaque, so the collision mask is the filled shape
 * extended 12px upward along the silhouette. getTerrain reproduces exactly
 * that alpha result.
 */
export class LevelGenerator {
	private template: ILevelTemplate
	private paths: Path[] = []

	constructor(template: ILevelTemplate) {
		this.template = template
		this.generate()
	}

	private generate(): void {
		const dataVec = this.template.getData()
		const translate = this.template.getTranslate()
		const maxSegmentLength = 200 + Math.random() * 200
		const smoothRatio = Math.random() < 0.5 ? 0 : 1

		for (const data of dataVec) {
			const path = new Path(data, translate)
			path.refinePath(maxSegmentLength)
			path.randomizePoints()
			path.createControlPoints(smoothRatio)
			this.paths.push(path)
		}
	}

	getTerrain(_levelStyle: LevelStyle): Terrain {
		const dimensions: Point = this.template.getDimensions()
		const width = Math.round(dimensions.x)
		const height = Math.round(dimensions.y)
		const mask = new Uint8Array(width * height)

		for (const path of this.paths) {
			path.drawToMask(mask, width, height)
		}

		// 12px grass: extend the silhouette upward (see class docstring).
		// Reads come from the un-extended base mask so the extension stays
		// exactly GRASS_THICKNESS px tall.
		const GRASS_THICKNESS = 12
		const base = new Uint8Array(mask)
		for (let y = 0; y < height; y++) {
			const rowBase = y * width
			for (let x = 0; x < width; x++) {
				if (base[rowBase + x]! >= 128) continue
				// Solid if any of the GRASS_THICKNESS rows below is solid.
				for (let d = 1; d <= GRASS_THICKNESS && y + d < height; d++) {
					if (base[rowBase + d * width + x]! >= 128) {
						mask[rowBase + x] = 255
						break
					}
				}
			}
		}

		return new Terrain(width, height, mask)
	}
}
