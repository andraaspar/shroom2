import type { Team } from './Team.ts'

/**
 * 1:1 port of com.pirkadat.logic.CharacterAppearance.
 *
 * The original takes an XML node from asset_info.xml; the port takes plain
 * typed data since the asset pipeline is not ported yet.
 */
export class CharacterAppearance {
	characterID: number
	characterName: string
	type: number
	animationAssetID: number
	colorAssetID: number
	inWaterSoundAssetID: number
	hitSoundAssetID: number
	color: number
	colorNumber: number
	assignedTo: Team | null = null

	constructor(
		data: {
			characterID: number
			characterName: string
			type: number
			animationAssetID: number
			colorAssetID: number
			inWaterSoundAssetID: number
			hitSoundAssetID: number
		},
		color: number,
		colorNumber: number,
	) {
		this.characterID = data.characterID
		this.characterName = data.characterName
		this.type = data.type
		this.animationAssetID = data.animationAssetID
		this.colorAssetID = data.colorAssetID
		this.inWaterSoundAssetID = data.inWaterSoundAssetID
		this.hitSoundAssetID = data.hitSoundAssetID

		this.color = color
		this.colorNumber = colorNumber
	}

	equals(ca: CharacterAppearance): boolean {
		return ca.characterID === this.characterID && ca.color === this.color
	}
}
