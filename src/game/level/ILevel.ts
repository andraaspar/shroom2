import type { Terrain } from '../Terrain.ts'

/**
 * 1:1 port of com.pirkadat.logic.level.ILevel, minus the render-layer
 * bitmap APIs (background/distance/preview/water gradient), which arrive
 * with the render phase.
 */
export interface ILevel {
	getTerrain(): Terrain
	getRequiredAssetIDs(): number[]
	onDestroy(): void
	getIsLoadingPreview(): boolean
	onPreviewDownloaded(): void
}
