import type { CompanionInputFieldNumber } from "@companion-module/base"

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
