/**
 * Minimal port of com.pirkadat.logic.level.gen.LevelStyle.
 *
 * The original reads terrain texture / distance image IDs from asset XML.
 * Assets are not ported yet, so this carries only the data the logic layer
 * needs (asset IDs) plus one hardcoded default instance for headless play.
 */
export class LevelStyle {
	constructor(
		public terrainTextureID: number,
		public distanceImageID: number,
	) {}

	getRequiredAssetIDs(): number[] {
		return [this.terrainTextureID, this.distanceImageID]
	}

	unloadAssets(): void {
		// Asset pipeline not ported yet.
	}
}

/** Hardcoded default style (asset IDs match the original's first style). */
export const defaultLevelStyle = new LevelStyle(30, 40)
