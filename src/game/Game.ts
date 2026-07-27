import { CharacterAppearance } from './CharacterAppearance.ts'
import { MessageBus, UI_STATE, type ToUI } from './events.ts'
import type { FrameCommands } from './FrameCommands.ts'
import type { GameUI, ProgressHandle } from './GameUI.ts'
import { Gravity } from './Gravity.ts'
import type { ILevel } from './level/ILevel.ts'
import { GeneratedLevel } from './level/GeneratedLevel.ts'
import { DawnBall } from './DawnBall.ts'
import { Doughnut } from './Doughnut.ts'
import { ShootingStar } from './ShootingStar.ts'
import { TeslaBall } from './TeslaBall.ts'
import { Team } from './Team.ts'
import { TeamMember, type ShotCtor } from './TeamMember.ts'
import { World } from './World.ts'
import type { WorldObject } from './WorldObject.ts'
import { DawnRound } from './rounds/DawnRound.ts'
import { DoubleMoveRound } from './rounds/DoubleMoveRound.ts'
import { DoughnutRound } from './rounds/DoughnutRound.ts'
import { GameRound, type RoundCtor } from './rounds/GameRound.ts'
import { MoonwalkRound } from './rounds/MoonwalkRound.ts'
import { MoveRound } from './rounds/MoveRound.ts'
import { ShootRound } from './rounds/ShootRound.ts'
import { ShunpoRound } from './rounds/ShunpoRound.ts'
import { TeslaRound } from './rounds/TeslaRound.ts'

/** Data describing one character definition (replaces asset_info XML nodes). */
export interface CharacterDefinition {
	characterID: number
	characterName: string
	type: number
	animationAssetID: number
	colorAssetID: number
	inWaterSoundAssetID: number
	hitSoundAssetID: number
}

/** Default character used for headless play until the asset pipeline lands. */
export const defaultCharacterDefinitions: CharacterDefinition[] = [
	{
		characterID: 0,
		characterName: 'Shroom',
		type: 0,
		animationAssetID: 1,
		colorAssetID: 2,
		inWaterSoundAssetID: 12,
		hitSoundAssetID: 14,
	},
]

/**
 * 1:1 port of com.pirkadat.logic.Game.
 *
 * Differences from the original, all mechanical:
 * - Program.mbToP reads -> the per-frame FrameCommands bag (game.commands)
 * - Program.mbToUI writes -> the injected toUI message bus
 * - Gui / Console calls -> the injected GameUI interface
 * - Class references -> constructor functions (RoundCtor / ShotCtor)
 * - roundWeights Dictionary keyed by Class -> Map<RoundCtor, number>
 * - Asset downloads -> skipped (asset pipeline not ported); LOADING waits
 *   only for the object-placement generator
 * - FakeThread object placement -> a Generator stepped once per execute()
 */
export class Game {
	static STATE_CREATED = 0
	static STATE_SETUP = 1
	static STATE_LOADING = 2
	static STATE_SETTLE = 3
	static STATE_ROUNDS = 4
	static STATE_OVER = 5

	state = Game.STATE_CREATED

	progressWindow: ProgressHandle | null = null

	world: World
	teams: Team[]
	bulletTypes: ShotCtor[] = [ShootingStar, Doughnut, TeslaBall, DawnBall]

	teamCounter = 0

	membersPerTeam = 1

	editedTeam: Team | null = null

	teamQueue: Team[] = []

	colourPool: number[] = [
		0xff0000, 0xff7f00, 0xffff00, 0x40ff00, 0x008000, 0x80ffff, 0x007fff, 0x0030be, 0x7f00ff, 0xff007f,
		0xff99cc, 0xffffff, 0x666666,
	]
	characterAppearances: CharacterAppearance[]
	availableCharacterAppearances: CharacterAppearance[]
	availableCharacterAppearancesCount: number

	gongSoundAssetID = 11
	cheerSoundAssetID = 13
	shunpoPopAssetID = 16
	shunpoPopVisualAssetID = 52

	level: ILevel

	moveRoundClasses: RoundCtor[] = [MoveRound, MoonwalkRound, DoubleMoveRound, ShunpoRound]
	shootRoundClasses: RoundCtor[] = [ShootRound, DoughnutRound, TeslaRound, DawnRound]
	roundWeights: Map<RoundCtor, number>
	moveRoundsPool: RoundCtor[] = []
	shootRoundsPool: RoundCtor[] = []
	roundFillSwitch = false
	rounds: GameRound[] = []
	currentRound: GameRound | null = null

	/** Per-frame command bag, refreshed by Program before each execute(). */
	commands!: FrameCommands

	readonly toUI: MessageBus<ToUI>
	readonly ui: GameUI

	/** Steps the incremental object placement during STATE_LOADING. */
	private placementGenerator: Generator<void> | null = null

	constructor(
		toUI: MessageBus<ToUI>,
		ui: GameUI,
		oldGame: Game | null = null,
		characterDefinitions: CharacterDefinition[] = defaultCharacterDefinitions,
	) {
		this.toUI = toUI
		this.ui = ui

		this.world = new World()
		this.teams = []

		this.level = new GeneratedLevel()

		this.characterAppearances = this.getAllPossibleCharacterAppearances(characterDefinitions)
		this.availableCharacterAppearances = this.filterCharacterAppearances(this.characterAppearances)
		this.availableCharacterAppearancesCount = this.availableCharacterAppearances.length

		// TeamMember selection events flow through this bus.
		TeamMember.toUI = toUI

		if (oldGame) {
			// Rounds

			this.roundWeights = oldGame.roundWeights

			// Teams

			for (const oldTeam of oldGame.teams) {
				this.addTeam(oldTeam.spawnNew(this.availableCharacterAppearances))
			}
			this.membersPerTeam = oldGame.membersPerTeam
		} else {
			// Rounds

			this.roundWeights = new Map()

			this.roundWeights.set(MoveRound, 5)
			this.roundWeights.set(MoonwalkRound, 2)
			this.roundWeights.set(DoubleMoveRound, 2)
			this.roundWeights.set(ShunpoRound, 1)

			this.roundWeights.set(ShootRound, 1)
			this.roundWeights.set(DoughnutRound, 1)
			this.roundWeights.set(TeslaRound, 1)
			this.roundWeights.set(DawnRound, 1)

			// Teams

			this.addTeam()
			this.editedTeam!.controller = Team.CONTROLLER_AI
			this.addTeam()
			this.addTeam()
			this.addTeam()
			this.addTeam()
			this.editedTeam!.controller = Team.CONTROLLER_HUMAN
		}
	}

	getRequiredAssetIDs(): number[] {
		let result: number[] = [this.gongSoundAssetID, this.cheerSoundAssetID, this.shunpoPopAssetID, this.shunpoPopVisualAssetID]

		result = result.concat(this.level.getRequiredAssetIDs())

		for (const bullet of this.bulletTypes) {
			const wo: WorldObject = new bullet()
			result = result.concat(wo.getAssetIDs() ?? [])
		}

		for (const team of this.teams) {
			for (const wo of team.members) {
				result = result.concat(wo.getAssetIDs() ?? [])
			}
		}

		return result
	}

	protected setState(value: number): void {
		this.state = value

		switch (this.state) {
			case Game.STATE_SETUP:
				this.ui.log('Game setup started...')
				this.ui.showStartWindow()
				break
			case Game.STATE_LOADING:
				this.ui.log('Game loading...')
				this.ui.removeAllWindows()
				this.matchTeamMemberCount()
				this.fillRoundPools()
				this.progressWindow = this.ui.showProgressWindow(['Loading assets', 'Placing objects'])
				break
			case Game.STATE_SETTLE:
				this.ui.log('Members placed, settling...')
				this.ui.showWorldWindow()
				this.toUI.push({ type: 'newState', state: UI_STATE.OVERVIEW })
				this.toUI.push({ type: 'newMessageBox', text: "Take a look around, and press DONE when you're ready!", time: -1 })
				this.toUI.push({ type: 'newDoneButtonText', text: 'DONE' })
				break
			case Game.STATE_ROUNDS:
				this.ui.log('Starting rounds.')
				this.fillRounds()
				this.currentRound = this.rounds.shift()!
				this.fillRounds()
				this.ui.showTeamQueueWindow()
				break
			case Game.STATE_OVER:
				this.ui.log('Game over!')
				this.toUI.push({ type: 'newState', state: UI_STATE.OVERVIEW })
				this.toUI.push({ type: 'newMessageBox', text: 'Game over!', time: -1 })
				this.toUI.push({ type: 'newDoneButtonText', text: 'MAIN MENU' })
				for (const team of this.teams) {
					if (team.checkIfAlive()) {
						this.ui.log('And the winner is:', team.name)
						this.toUI.push({ type: 'newMessageBox', text: team.name + ' wins!', time: -1 })
						this.toUI.push({
							type: 'playSound',
							request: { assetId: this.cheerSoundAssetID, location: null, delay: 0, volume: 1 },
						})
						this.toUI.push({ type: 'winner', team })
					}
				}
				break
		}
	}

	getHelpSection(_section: string): void {
		// navigateToURL is a UI concern; not ported.
	}

	execute(): void {
		const mbToP = this.commands

		switch (this.state) {
			case Game.STATE_CREATED:
				this.setState(Game.STATE_SETUP)
			// falls through
			case Game.STATE_SETUP:
				let setupChanged = false
				if (mbToP.helpRequested) this.getHelpSection('#custom_games')
				if (mbToP.addTeamRequested) { this.addTeam(); setupChanged = true }
				if (!isNaN(mbToP.newEditTeamID)) { this.editTeamByID(mbToP.newEditTeamID); setupChanged = true }
				if (mbToP.newEditTeamName != null) { this.editedTeam!.name = mbToP.newEditTeamName; setupChanged = true }
				if (mbToP.newTeamAppearance) { this.setTeamAppearance(mbToP.newTeamAppearance); setupChanged = true }
				if (!isNaN(mbToP.newTeamController)) { this.editedTeam!.controller = mbToP.newTeamController; setupChanged = true }
				if (!isNaN(mbToP.newTeamAILevel)) { this.editedTeam!.aiLevel = mbToP.newTeamAILevel; setupChanged = true }
				if (mbToP.removeTeamRequested) { this.removeEditedTeam(); setupChanged = true }
				if (mbToP.membersPerTeam) {
					this.membersPerTeam = Math.max(1, Math.min(99, mbToP.membersPerTeam))
					this.toUI.push({ type: 'membersPerTeam', value: this.membersPerTeam })
					setupChanged = true
				}
				if (!isNaN(mbToP.editTeamAppearanceId)) {
					this.editTeamByID(mbToP.editTeamAppearanceId)
					const ca = this.characterAppearances[mbToP.editTeamAppearanceIndex]
					if (ca) this.setTeamAppearance(ca)
					setupChanged = true
				}
				if (mbToP.newSelectedLevel) {
					this.toUI.push({ type: 'newLevel' })
					setupChanged = true
				} else if (mbToP.newRandomLevelRequested) {
					if (this.level) this.level.onDestroy()
					this.level = new GeneratedLevel()
					this.toUI.push({ type: 'newLevel' })
					setupChanged = true
				}
				if (mbToP.weightModifyRound) { this.setRoundWeight(mbToP.weightModifyRound, mbToP.newRoundWeight); setupChanged = true }
				if (mbToP.allAssetsDownloaded && this.level.getIsLoadingPreview()) {
					this.level.onPreviewDownloaded()
				}

				if (setupChanged) this.toUI.push({ type: 'setupStateChanged' })

				if (mbToP.gameStartRequested) {
					this.setState(Game.STATE_LOADING)
				} else {
					break
				}
			// falls through
			case Game.STATE_LOADING:
				// Asset downloads are not ported; placement starts immediately.
				if (!this.placementGenerator) {
					this.ui.log('Game assets loaded!')
					this.start()
				}
				if (this.placementGenerator) {
					const result = this.placementGenerator.next()
					if (result.done) {
						this.placementGenerator = null
						if (this.progressWindow) {
							this.ui.removeProgressWindow(this.progressWindow)
							this.progressWindow = null
						}
						this.setState(Game.STATE_SETTLE)
					}
				}
				break
			case Game.STATE_SETTLE:
				if (mbToP.helpRequested) this.getHelpSection('#navigating_the_game_window')
				if (this.checkIfDrawn()) {
					this.ui.log('Placing phase: game drawn.')
					this.setState(Game.STATE_OVER)
					return
				}
				if (mbToP.endTurnRequested) {
					if (this.world.checkIfSleeping()) {
						if (this.checkIfOver()) {
							this.ui.log('Placing phase: game won.')
							this.setState(Game.STATE_OVER)
						} else {
							this.setState(Game.STATE_ROUNDS)
						}
					}
				}

				this.world.execute()
				break
			case Game.STATE_ROUNDS:
				if (mbToP.helpRequested) this.getHelpSection(this.currentRound!.getHelpSectionID())
				this.currentRound!.execute()

				this.world.execute()

				if (this.currentRound!.state === GameRound.STATE_GAME_OVER) {
					this.setState(Game.STATE_OVER)
					break
				} else if (this.currentRound!.state === GameRound.STATE_ENDED) {
					this.currentRound = this.rounds.shift()!
					this.fillRounds()
				}
				break
			case Game.STATE_OVER:
				if (mbToP.helpRequested) this.getHelpSection('')
				if (mbToP.endTurnRequested) {
					mbToP.gameDestroyRequested = true
				}

				this.world.execute()
				break
		}
	}

	protected start(): void {
		this.world.forces.push(new Gravity())
		this.world.terrain = this.level.getTerrain()

		const objectsToPlace: WorldObject[] = []

		for (const team of this.teams) {
			for (const member of team.members) {
				this.world.addWorldObject(member)
				objectsToPlace.push(member)
			}
		}

		this.placementGenerator = this.placeObjects(objectsToPlace)
	}

	/**
	 * 1:1 port of the original FakeThread placement closure, as a generator
	 * stepped once per execute() during STATE_LOADING.
	 */
	private *placeObjects(objectsToPlace: WorldObject[]): Generator<void> {
		const objectsToPlaceCount = objectsToPlace.length
		const terrain = this.world.terrain!

		const xDistance = terrain.width / objectsToPlace.length
		let currentX = xDistance / 2

		while (objectsToPlace.length) {
			if (objectsToPlaceCount) {
				this.progressWindow?.setProgress(1, 1 - objectsToPlace.length / objectsToPlaceCount)
				this.toUI.push({ type: 'objectPlacement', total: objectsToPlaceCount, remaining: objectsToPlace.length })
			}
			const object = objectsToPlace.splice(Math.floor(Math.random() * objectsToPlace.length), 1)[0]!
			const randomX = currentX - xDistance / 2 + Math.random() * xDistance
			const usableFloors = object.findUsableFloors(randomX, -object.radius, terrain.height, false)

			if (!usableFloors.length || (usableFloors[0] === 0 && usableFloors[1] === 0)) {
				objectsToPlace.push(object)
			} else {
				object.location.x = randomX
				object.location.y = usableFloors[Math.floor(Math.random() * usableFloors.length)]!
			}

			currentX += xDistance
			if (currentX > terrain.width) currentX = xDistance / 2

			yield
		}
	}

	checkIfOver(): boolean {
		let teamsAlive = 0
		for (const team of this.teams) {
			if (team.checkIfAlive()) teamsAlive++
		}
		this.ui.log('Teams alive:', teamsAlive)
		return teamsAlive <= 1
	}

	checkIfDrawn(): boolean {
		for (const team of this.teams) {
			if (team.checkIfAlive()) return false
		}
		return true
	}

	addTeam(exisingTeam: Team | null = null): void {
		if (!this.availableCharacterAppearancesCount) {
			this.ui.prompt('Cannot create another team. No more appearances available.')
			return
		}
		this.availableCharacterAppearancesCount--

		let newTeam: Team
		if (exisingTeam) newTeam = exisingTeam
		else newTeam = new Team()
		const id = this.teams.push(newTeam) - 1

		if (!newTeam.characterAppearance) {
			let appearanceID = Math.floor(Math.random() * this.availableCharacterAppearances.length)
			let appearance: CharacterAppearance
			while (true) {
				appearance = this.availableCharacterAppearances[appearanceID]!
				if (appearance.assignedTo == null) break
				appearanceID--
				if (appearanceID < 0) appearanceID = this.availableCharacterAppearances.length - 1
			}
			newTeam.characterAppearance = appearance!
			appearance!.assignedTo = newTeam
		}
		if (!exisingTeam) {
			newTeam.name = 'Player ' + ++this.teamCounter
			if (this.editedTeam) {
				newTeam.controller = this.editedTeam.controller
				newTeam.aiLevel = this.editedTeam.aiLevel
			}
		}

		this.editTeamByID(id)
	}

	editTeamByID(id: number): void {
		if (id >= this.teams.length || id < 0) {
			this.editedTeam = null
		} else {
			this.editedTeam = this.teams[id]!
		}
	}

	protected matchTeamMemberCount(): void {
		for (const team of this.teams) {
			while (team.members.length < this.membersPerTeam) {
				const newTeamMember = new TeamMember(this.world, team)
				team.members.push(newTeamMember)
			}
		}
	}

	protected removeEditedTeam(): void {
		if (!this.editedTeam) return
		if (this.teams.length <= 2) return

		const id = this.teams.indexOf(this.editedTeam)
		const removedTeam = this.teams.splice(id, 1)[0]!
		removedTeam.characterAppearance!.assignedTo = null
		this.availableCharacterAppearancesCount++

		this.editTeamByID(Math.max(0, id - 1))
	}

	destroy(): void {
		this.level.onDestroy()
	}

	protected fillRounds(): void {
		while (this.rounds.length < 3) {
			let rc: RoundCtor
			if ((this.roundFillSwitch = !this.roundFillSwitch) && this.moveRoundsPool.length > 0)
				rc = this.moveRoundsPool[Math.floor(Math.random() * this.moveRoundsPool.length)]!
			else rc = this.shootRoundsPool[Math.floor(Math.random() * this.shootRoundsPool.length)]!
			this.rounds.push(new rc(this))
		}

		this.toUI.push({ type: 'gameRoundsUpdated', rounds: (this.currentRound ? [this.currentRound] : []).concat(this.rounds) })
	}

	spawnNew(): Game {
		return new Game(this.toUI, this.ui, this)
	}

	protected getAllPossibleCharacterAppearances(characterDefinitions: CharacterDefinition[]): CharacterAppearance[] {
		const result: CharacterAppearance[] = []
		for (const def of characterDefinitions) {
			for (let i = 0; i < this.colourPool.length; i++) {
				result.push(new CharacterAppearance(def, this.colourPool[i]!, i))
			}
		}
		return result
	}

	protected filterCharacterAppearances(input: CharacterAppearance[]): CharacterAppearance[] {
		const result: CharacterAppearance[] = []
		for (const ca of input) {
			if (ca.type === 0) result.push(ca)
		}
		return result
	}

	protected setTeamAppearance(ca: CharacterAppearance): void {
		this.editedTeam!.setCharacterAppearance(ca)
	}

	protected fillRoundPools(): void {
		for (const c of this.moveRoundClasses) {
			for (let i = 0, n = this.roundWeights.get(c) ?? 0; i < n; i++) {
				this.moveRoundsPool.push(c)
			}
		}
		for (const c of this.shootRoundClasses) {
			for (let i = 0, n = this.roundWeights.get(c) ?? 0; i < n; i++) {
				this.shootRoundsPool.push(c)
			}
		}
	}

	setRoundWeight(roundClass: RoundCtor, newWeight: number): void {
		if (newWeight === 0 && this.shootRoundClasses.indexOf(roundClass) > -1) {
			let thisIsTheLastOne = true
			for (const c of this.shootRoundClasses) {
				if (c !== roundClass && (this.roundWeights.get(c) ?? 0) > 0) {
					thisIsTheLastOne = false
					break
				}
			}
			if (thisIsTheLastOne) {
				this.ui.prompt('A game must have at least one kind of shooting round. You cannot remove the last one.')
				return
			}
		}

		this.roundWeights.set(roundClass, Math.max(0, Math.min(10, newWeight)))
		this.toUI.push({ type: 'roundWeightsUpdated' })
	}

	/** Resolves a round class name (from the UI bus) to its constructor. */
	resolveRoundCtor(name: string): RoundCtor | null {
		for (const c of this.moveRoundClasses.concat(this.shootRoundClasses)) {
			if (c.name === name) return c
		}
		return null
	}
}
