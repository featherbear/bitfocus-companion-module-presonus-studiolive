import type { DropdownActionOptionChoice } from "./types/Action"

export function generateActions(channels: DropdownActionOptionChoice[]) {
	return {
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
}

export type ActionKeys = keyof ReturnType<typeof generateActions>
