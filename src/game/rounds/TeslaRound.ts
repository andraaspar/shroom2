import type { Game } from '../Game.ts'
import { ShootRound } from './ShootRound.ts'

/** 1:1 port of com.pirkadat.logic.TeslaRound. */
export class TeslaRound extends ShootRound {
	constructor(game: Game) {
		super(game)

		this.type = ShootRound.TYPE_TESLA
		this.allowsBounceChanges = false
	}

	override getName(): string {
		return 'Tesla Round'
	}

	override getHelpSectionID(): string {
		return '#tesla_round'
	}
}
