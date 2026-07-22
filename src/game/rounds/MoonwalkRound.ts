import type { Game } from '../Game.ts'
import { MoveRound } from './MoveRound.ts'

/** 1:1 port of com.pirkadat.logic.MoonwalkRound. */
export class MoonwalkRound extends MoveRound {
	constructor(game: Game) {
		super(game)

		this.type = MoveRound.TYPE_MOONWALK
	}

	override getName(): string {
		return 'Moonwalking Round'
	}

	override getHelpSectionID(): string {
		return '#moonwalking_round'
	}
}
