import type { CompanionActionDefinition, CompanionActionDefinitions, CompanionInputFieldDropdown, CompanionInputFieldNumber, DropdownChoice } from "@companion-module/base"
import { ChannelSelector } from "presonus-studiolive-api"
import { ValueSeparator } from "./Constants"

export function generateRecallProjectSceneEntry(choices: DropdownChoice[]): CompanionActionDefinitions {
	return {
		recallProjectOrScene: {
			name: 'Recall Project / Scene',
			options: [
				{
					label: 'Preset',
					type: 'dropdown',
					id: 'project_scene',
					choices,
					default: ''
				}
			],
			callback(event) {
			}
		}
	}
}

export const withChannelSelector = function (fn: (
	action: Parameters<CompanionActionDefinition['callback']>[0],
	context: Parameters<CompanionActionDefinition['callback']>[1],
	channel: ChannelSelector
) => Promise<void> | void) {
	return <CompanionActionDefinition['callback']>((action, context)  => {
		const [type, channel] = (<string>action.options.channel).split(ValueSeparator)
		let selector: ChannelSelector = <any>{}

		if (!type || !channel) return

		selector.type = <any>type
		selector.channel = <any>channel

		if (!!action.options.mix) {
			const [type, channel] = (<string>action.options.mix).split(ValueSeparator);
			selector.mixType = <any>type;
			selector.mixNumber = <any>channel;
		}

		return fn(action, context, selector)
	}) 
}

export function generateChannelSelectOption(channels: DropdownChoice[]): CompanionInputFieldDropdown {
	return {
		label: 'Channel',
		type: 'dropdown',
		id: 'channel',
		choices: channels,
		default: ''
	}
}

export function generateMixSelectOption(mixes: DropdownChoice[]): CompanionInputFieldDropdown {
	return {
		label: 'Mix Target',
		type: 'dropdown',
		id: 'mix',
		choices: mixes,
		default: ''
	}
}

export function generateTransitionPeriodOption(transitionDefaultMs: number): CompanionInputFieldNumber {
	return {
		label: 'Transition time (ms)',
		type: 'number',
		id: 'transition',
		default: transitionDefaultMs,
		min: 0,
		max: 60 * 1000
	}
}