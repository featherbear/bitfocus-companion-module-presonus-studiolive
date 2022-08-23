import type { DropdownActionOption, DropdownActionOptionChoice } from "./types/Action"

export function generateActions(channels: DropdownActionOptionChoice[], mixes: DropdownActionOptionChoice[]) {
	function generateChannelSelectOption(label: string): DropdownActionOption {
		return {
			label,
			type: 'dropdown',
			id: 'channel',
			choices: channels,
			default: ''
		}
	}

	function generateMixSelectOption(): DropdownActionOption {
		return {
			label: 'Mix to affect',
			type: 'dropdown',
			id: 'mix',
			choices: mixes,
			default: ''
		}
	}

	return {
		mute: {
			label: 'Mute channel',
			options: [
				generateChannelSelectOption("Channel to mute"),
				generateMixSelectOption(),
			]
		},
		unmute: {
			label: 'Unmute channel',
			options: [
				generateChannelSelectOption("Channel to unmute"),
				generateMixSelectOption(),
			]
		},
		toggleMute: {
			label: 'Toggle channel mute',
			options: [
				generateChannelSelectOption("Channel to toggle"),
				generateMixSelectOption(),
			]
		}
	}
}

export type ActionKeys = keyof ReturnType<typeof generateActions>
