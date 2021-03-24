const { CHANNELS, CHANNELTYPES } = require('presonus-studiolive-api')

let entries = [
	{ id: '', label: '' },
	...Object.entries(CHANNELTYPES)
		.map(([tk, tv]) =>
			Object.entries(CHANNELS[tk])
				.filter(([_, v]) => Number.isInteger(v)) // Sucrase patch
				.map(([k, v]) => ({
					id: `${v},${tv}`,
					label: k.replace(/_/g, ' ')
				}))
		)
		.flat()
]

module.exports = {
	mute: {
		label: 'Mute Channel',
		options: [
			{
				label: 'Channel to mute',
				type: 'dropdown',
				id: 'channel',
				choices: entries
			}
		]
	},
	unmute: {
		label: 'Unmute Channel',
		options: [
			{
				label: 'Channel to unmute',
				type: 'dropdown',
				id: 'channel',
				choices: entries
			}
		]
	}
}
