export function escapeHtml(it: any) {
	return (it + '')
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll("'", '&#039;')
		.replaceAll('"', '&quot;')
}
