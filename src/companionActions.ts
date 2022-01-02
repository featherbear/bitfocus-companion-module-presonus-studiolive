import { Actions } from "./types/Action"

import channels from "./channels"

const companionActions = {
	mute: {
		label: 'Mute channel',
		options: [
			{
				label: 'Channel to mute',
				type: 'dropdown',
				id: 'channel',
				choices: channels,
				default: ''
			}
		]
	},
	unmute: {
		label: 'Unmute channel',
		options: [
			{
				label: 'Channel to unmute',
				type: 'dropdown',
				id: 'channel',
				choices: channels,
				default: ''
			}
		]
	},
	toggleMute: {
		label: 'Toggle channel mute',
		options: [
			{
				label: 'Channel to mute/unmute',
				type: 'dropdown',
				id: 'channel',
				choices: channels,
				default: ''
			}
		]
	}
}


export type ActionKeys = keyof typeof companionActions
export default companionActions as Actions
