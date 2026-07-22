import type { Game } from '../Game.ts'
import { ShootRound } from './ShootRound.ts'

/** 1:1 port of com.pirkadat.logic.DawnRound. */
export class DawnRound extends ShootRound {
	constructor(game: Game) {
		super(game)

		this.type = ShootRound.TYPE_DAWN
	}

	override getName(): string {
		return 'Dawn Round'
	}

	override getHelpSectionID(): string {
		return '#dawn_round'
	}
}
