import { defineComponent } from '../c-mp/fun/defineComponent'
import { useEffect } from '../c-mp/fun/useEffect'

export const AppComp = defineComponent<{}>('AppComp', (props, $) => {
	
	let canvas: HTMLCanvasElement | null = null
	
	useEffect('draw effect', () => {
		if (!canvas) return
		
		const ctx = canvas.getContext('2d')
		if (!ctx) return
		
		ctx.fillStyle = 'black'
		ctx.fillRect(0, 0, canvas.width, canvas.height)
		
	})
	
	return (
		<canvas ref={it => canvas = it} class="ccc_canvas" />
	)
})
