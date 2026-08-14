// Headless smoke test for the WorldWindow camera port.
// Run: npx tsx test/camera.smoke.ts
import { Camera } from '../src/render/Camera.ts'
import { UI_STATE } from '../src/game/events.ts'
import { CharacterAppearance } from '../src/game/CharacterAppearance.ts'
import { Team } from '../src/game/Team.ts'
import { TeamMember } from '../src/game/TeamMember.ts'
import { Terrain } from '../src/game/Terrain.ts'
import { World } from '../src/game/World.ts'
import { WorldObject } from '../src/game/WorldObject.ts'

const TERRAIN_W = 2000
const TERRAIN_H = 1000
const VIEWPORT_W = 1600
const VIEWPORT_H = 900

function assert(condition: boolean, message: string): void {
	if (!condition) {
		console.error(`FAIL: ${message}`)
		process.exit(1)
	}
	console.log(`ok: ${message}`)
}

function makeWorld(): World {
	const world = new World()
	world.terrain = new Terrain(TERRAIN_W, TERRAIN_H)
	return world
}

/** A camera ready for a game: fitted, resized, centered on terrain, following. */
function makeCamera(world: World): Camera {
	const camera = new Camera()
	camera.fitToViewport(VIEWPORT_W, VIEWPORT_H)
	camera.onStageResized(TERRAIN_W, TERRAIN_H)
	camera.x = camera.viewportWidth / 2 - (TERRAIN_W / 2) * camera.scale
	camera.y = camera.viewportHeight / 2 - (TERRAIN_H / 2) * camera.scale
	camera.targetScale = camera.minScale
	camera.waitToFollowAOI = 0
	camera.playerControlsScale = false
	return camera
}

function runUpdates(camera: Camera, world: World, count: number, state = UI_STATE.OVERVIEW): void {
	for (let i = 0; i < count; i++) camera.update(state, world)
}

// ---------------------------------------------------------------------------
// 1. Static world: AOI is the whole terrain, camera centers on it and clamps.
// ---------------------------------------------------------------------------
{
	const world = makeWorld()
	const camera = makeCamera(world)
	runUpdates(camera, world, 60)
	assert(
		Math.abs(camera.center.x - TERRAIN_W / 2) < 1e-6 &&
			Math.abs(camera.center.y - TERRAIN_H / 2) < 1e-6,
		'static world centers camera on the terrain middle',
	)
	assert(
		camera.center.x >= 0 &&
			camera.center.x <= TERRAIN_W &&
			camera.center.y >= 0 &&
			camera.center.y <= TERRAIN_H,
		'center stays within terrain bounds',
	)
	assert(Math.abs(camera.scale - camera.minScale) < 1e-6, 'targetScale settles at terrain-fit minScale')
}

// ---------------------------------------------------------------------------
// 2. Drag pans the world and clamps to the terrain.
// ---------------------------------------------------------------------------
{
	const world = makeWorld()
	const camera = makeCamera(world)
	runUpdates(camera, world, 10)
	camera.onMouseDown(100, 100)
	camera.pointerX = 1400
	camera.pointerY = 300
	camera.update(UI_STATE.OVERVIEW, world)
	assert(camera.isDragged, 'drag press starts a camera drag')
	assert(
		camera.center.x >= 0 &&
			camera.center.x <= TERRAIN_W &&
			camera.center.y >= 0 &&
			camera.center.y <= TERRAIN_H,
		'drag keeps the camera inside the terrain bounds',
	)
	camera.onMouseUp()
	assert(!camera.isDragged, 'release ends the camera drag')
	assert(camera.waitToFollowAOI === -1, 'OVERVIEW release stops following (waitToFollowAOI = -1)')
}

// ---------------------------------------------------------------------------
// 3. A moving object pulls the area of interest (and the camera) to it.
// ---------------------------------------------------------------------------
{
	const world = makeWorld()
	const moving = new WorldObject(world)
	moving.name = 'Moving thing'
	moving.location.x = 300
	moving.location.y = 250
	moving.velocity.x = 50 // velocity marks it interesting
	world.addWorldObject(moving)

	const camera = makeCamera(world)
	runUpdates(camera, world, 300)
	assert(
		Math.abs(camera.center.x - 300) < 40 && Math.abs(camera.center.y - 250) < 40,
		`camera eases onto the moving object (center=${camera.center.x.toFixed(1)},${camera.center.y.toFixed(1)})`,
	)
}

// ---------------------------------------------------------------------------
// 4. Two distant objects auto-fit the zoom (targetScale = fit * 0.8).
// ---------------------------------------------------------------------------
{
	const world = makeWorld()
	for (const [x, y] of [
		[200, 300],
		[1800, 700],
	]) {
		const o = new WorldObject(world)
		o.name = 'Action'
		o.location.x = x
		o.location.y = y
		o.velocity.x = 1
		world.addWorldObject(o)
	}

	const camera = makeCamera(world)
	// aoi x: 200..1800 (r=800), y: 300..700 (r=200)
	// targetScale = min(800/800, 450/200) * 0.8 = 0.8
	camera.update(UI_STATE.OVERVIEW, world)
	assert(Math.abs(camera.targetScale - 0.8) < 1e-6, 'auto-fit targetScale frames the AOI (*0.8)')
	assert(camera.targetScale >= camera.minScale && camera.targetScale <= 1, 'targetScale clamped to [minScale, 1]')
	camera.update(UI_STATE.OVERVIEW, world)
	assert(Math.abs(camera.scale - (0.64 + (0.8 - 0.64) / 16)) < 1e-6, 'scale eases toward targetScale at scaleSpeed 16')
}

// ---------------------------------------------------------------------------
// 5. Wheel zoom sets playerControlsScale and stops the auto-refit.
// ---------------------------------------------------------------------------
{
	const world = makeWorld()
	for (const [x, y] of [
		[200, 300],
		[1800, 700],
	]) {
		const o = new WorldObject(world)
		o.name = 'Action'
		o.location.x = x
		o.location.y = y
		o.velocity.x = 1
		world.addWorldObject(o)
	}

	const camera = makeCamera(world)
	runUpdates(camera, world, 10)
	assert(Math.abs(camera.targetScale - 0.8) < 1e-6, 'baseline: auto-fit targetScale is 0.8')
	const before = camera.targetScale
	camera.onMouseWheel(3)
	assert(Math.abs(camera.targetScale - before * 1.06) < 1e-9, 'wheel grows targetScale by 6% per notch')
	assert(camera.playerControlsScale, 'wheel sets playerControlsScale')
	runUpdates(camera, world, 60)
	assert(Math.abs(camera.targetScale - before * 1.06) < 1e-9, 'playerControlsScale prevents auto-refit while set')
	camera.followAOI()
	assert(!camera.playerControlsScale, 'followAOI clears playerControlsScale')
	runUpdates(camera, world, 60)
	assert(Math.abs(camera.targetScale - 0.8) < 1e-6, 'followAOI re-enables auto-fit')
	camera.onMouseWheel(-3)
	assert(
		Math.abs(camera.targetScale - 0.8 * 0.94) < 1e-9,
		'wheel out shrinks targetScale and re-locks auto-fit off',
	)
}

// ---------------------------------------------------------------------------
// 6. waitToFollowAOI timing.
// ---------------------------------------------------------------------------
{
	const world = makeWorld()
	const camera = makeCamera(world)
	runUpdates(camera, world, 10)
	assert(camera.waitToFollowAOI === 0, 'following active after start')
	camera.onMouseUp()
	assert(camera.waitToFollowAOI === -1, 'OVERVIEW release -> waitToFollowAOI = -1')
	camera.update(UI_STATE.OVERVIEW, world)
	assert(camera.waitToFollowAOI === -1, 'stays -1 while nothing pulls the camera back')

	camera.update(UI_STATE.FOCUS, world)
	assert(camera.waitToFollowAOI === 0, 'FOCUS state change re-arms following (-1 -> 0)')
	camera.onMouseUp()
	assert(camera.waitToFollowAOI === 25, 'FOCUS release -> waitToFollowAOI = 25')
	for (let i = 0; i < 25; i++) camera.update(UI_STATE.FOCUS, world)
	assert(camera.waitToFollowAOI === 0, 'waitToFollowAOI counts down to 0')
}

// ---------------------------------------------------------------------------
// 7. A selected member pulls the camera; out-of-view member re-triggers follow.
// notSafeToDragMember is set only on the frame the selection changes.
// ---------------------------------------------------------------------------
{
	const world = makeWorld()
	const camera = makeCamera(world)
	runUpdates(camera, world, 10)

	const team = new Team()
	team.characterAppearance = new CharacterAppearance(
		{
			characterID: 0,
			characterName: 'test',
			type: 0,
			animationAssetID: 1,
			colorAssetID: 2,
			inWaterSoundAssetID: 0,
			hitSoundAssetID: 0,
		},
		0xff99cc,
		0,
	)
	const member = new TeamMember(world, team)
	member.location.x = 100
	member.location.y = 100
	member.isWalking = true
	team.members = [member]
	team.selectMember(member)
	world.addWorldObject(member)

	// Selection-change frame: following & not dragging -> notSafe this frame only.
	camera.update(UI_STATE.OVERVIEW, world)
	assert(
		camera.notSafeToDragMember,
		'notSafeToDragMember set on the frame a member selection changes',
	)
	runUpdates(camera, world, 5, UI_STATE.OVERVIEW)
	assert(!camera.notSafeToDragMember, 'notSafeToDragMember resets on later frames')

	// Pan away so the member ends up fully off-screen, then disarm the follow.
	camera.x = camera.viewportWidth / 2 - TERRAIN_W * camera.scale
	camera.y = camera.viewportHeight / 2 - TERRAIN_H * camera.scale
	camera.onMouseUp() // OVERVIEW -> waitToFollowAOI = -1
	camera.update(UI_STATE.OVERVIEW, world)
	assert(camera.waitToFollowAOI === 0, 'selected member out of view re-triggers following')
	runUpdates(camera, world, 300, UI_STATE.OVERVIEW)
	assert(
		Math.abs(camera.center.x - 100) < 40 && Math.abs(camera.center.y - 100) < 40,
		`camera eases onto the selected member (center=${camera.center.x.toFixed(1)},${camera.center.y.toFixed(1)})`,
	)
	// Zero-size AOI zooms toward max 1, never clamps below minScale.
	assert(camera.scale >= camera.minScale, 'selected-member zoom respected minScale')
}

console.log('camera smoke test passed')