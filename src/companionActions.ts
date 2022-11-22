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

	function generateTransitionPeriodOption(transitionDefaultMs: number): CompanionModule.CompanionInputFieldNumber {
		return {
			label: 'Transition time (ms)',
			type: 'number',
			id: 'transition',
			default: transitionDefaultMs,
			min: 0,
			max: 60 * 1000
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
		},
		mute_smooth: {
			label: 'Smooth mute channel',
			description: 'Slowly brings fader to -infinity before muting',
			options: [
				generateChannelSelectOption("Channel to mute"),
				generateMixSelectOption(),
				generateTransitionPeriodOption(200)
			]
		},
		unmute_smooth: {
			label: 'Smooth unmute channel',
			description: 'Sets fader to -infinity before unmuting and slowly restoring level',
			options: [
				generateChannelSelectOption("Channel to unmute"),
				generateMixSelectOption(),
				generateTransitionPeriodOption(200)
			]
		},
		toggleMute_smooth: {
			label: 'Smooth toggle channel mute',
			options: [
				generateChannelSelectOption("Channel to toggle"),
				generateMixSelectOption(),
				generateTransitionPeriodOption(200)
			]
		}
	}
}

export type ActionKeys = keyof ReturnType<typeof generateActions>
