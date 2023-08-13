import type { CompanionActionDefinition, CompanionActionDefinitions, CompanionInputFieldDropdown, CompanionInputFieldNumber, DropdownChoice } from "@companion-module/base"
import { ChannelSelector } from "presonus-studiolive-api"
import { ValueSeparator } from "./Constants"
import { extractChannelSelector } from "./channelUtils"

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
