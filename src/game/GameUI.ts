/**
 * Interface capturing every Gui.* / Console.* touchpoint used by Game and
 * the rounds, so game logic stays headless-testable. The real c-mp
 * implementation arrives with the UI phase; noopGameUI allows running a
 * full match without any DOM.
 */
export interface GameUI {
	showStartWindow(): void
	removeAllWindows(): void
	showWorldWindow(): void
	showTeamWindow(): void
	removeTeamWindow(): void
	showBounceWindow(): void
	removeBounceWindow(): void
	showTeamQueueWindow(): void
	/** Returns a handle for progress updates; removeProgressWindow closes it. */
	showProgressWindow(labels: string[]): ProgressHandle
	removeProgressWindow(handle: ProgressHandle): void
	prompt(text: string): void
	/** Replaces Console.say. */
	log(...args: unknown[]): void
}

export interface ProgressHandle {
	setProgress(index: number, value: number): void
}

export const noopProgressHandle: ProgressHandle = {
	setProgress: () => {},
}

export const noopGameUI: GameUI = {
	showStartWindow: () => {},
	removeAllWindows: () => {},
	showWorldWindow: () => {},
	showTeamWindow: () => {},
	removeTeamWindow: () => {},
	showBounceWindow: () => {},
	removeBounceWindow: () => {},
	showTeamQueueWindow: () => {},
	showProgressWindow: () => noopProgressHandle,
	removeProgressWindow: () => {},
	prompt: () => {},
	log: () => {},
}
