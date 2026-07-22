import type { Terrain } from '../Terrain.ts'
import { LevelGenerator } from './gen/LevelGenerator.ts'
import { defaultLevelStyle, type LevelStyle } from './gen/LevelStyle.ts'
import type { ILevelTemplate } from './gen/ILevelTemplate.ts'
import { Template01 } from './gen/Template01.ts'
import { Template02 } from './gen/Template02.ts'
import { Template03 } from './gen/Template03.ts'
import { Template04 } from './gen/Template04.ts'
import { Template05 } from './gen/Template05.ts'
import { Template06 } from './gen/Template06.ts'
import { Template07 } from './gen/Template07.ts'
import { Template08 } from './gen/Template08.ts'
import { Template09 } from './gen/Template09.ts'
import { Template10 } from './gen/Template10.ts'
import { Template11 } from './gen/Template11.ts'
import type { ILevel } from './ILevel.ts'

/**
 * 1:1 port of com.pirkadat.logic.level.GeneratedLevel, minus the
 * bitmap/preview/background APIs (render phase) and the asset-driven level
 * styles (asset phase). A single default level style is used for now.
 */
export class GeneratedLevel implements ILevel {
	static templates: ILevelTemplate[] = [
		new Template01(),
		new Template02(),
		new Template03(),
		new Template04(),
		new Template05(),
		new Template06(),
		new Template07(),
		new Template08(),
		new Template09(),
		new Template10(),
		new Template11(),
	]

	private levelStyle: LevelStyle
	private generatedTerrain: Terrain | null = null
	private generator: LevelGenerator

	constructor() {
		const randomTemplateID = Math.floor(GeneratedLevel.templates.length * Math.random())
		this.generator = new LevelGenerator(GeneratedLevel.templates[randomTemplateID]!)

		this.levelStyle = defaultLevelStyle
	}

	getRequiredAssetIDs(): number[] {
		return this.levelStyle.getRequiredAssetIDs()
	}

	getTerrain(): Terrain {
		if (!this.generatedTerrain) this.generatedTerrain = this.generator.getTerrain(this.levelStyle)
		return this.generatedTerrain
	}

	onDestroy(): void {
		this.levelStyle.unloadAssets()
	}

	getIsLoadingPreview(): boolean {
		return false
	}

	onPreviewDownloaded(): void {}
}
