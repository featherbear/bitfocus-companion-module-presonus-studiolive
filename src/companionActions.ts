import type { DropdownActionOptionChoice } from "./types/Action"
import type CompanionModule from "./types/CompanionModule"

export default function generateActions(channels: DropdownActionOptionChoice[], mixes: DropdownActionOptionChoice[]): CompanionModule.CompanionActions {
	function generateChannelSelectOption(label: string): CompanionModule.CompanionInputFieldDropdown {
		return {
			label,
			type: 'dropdown',
			id: 'channel',
			choices: channels,
			default: ''
		}
	}

	function generateMixSelectOption(): CompanionModule.CompanionInputFieldDropdown {
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
