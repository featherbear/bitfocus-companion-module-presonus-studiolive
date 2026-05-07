import type { CompanionInputFieldDropdown, CompanionInputFieldNumber, DropdownChoice } from "@companion-module/base"

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

export function generateLinearLevelOption(
	id = "level",
	label = "Level",
	defaultValue = 72,
): CompanionInputFieldNumber {
	return {
		label,
		type: "number",
		id,
		default: defaultValue,
		min: 0,
		max: 100,
		range: true,
	}
}

export function generateSignedLevelDeltaOption(
	id = "delta",
	label = "Level delta",
	defaultValue = 5,
): CompanionInputFieldNumber {
	return {
		label,
		type: "number",
		id,
		default: defaultValue,
		min: -100,
		max: 100,
		range: true,
	}
}

export function generatePanOption(id = "pan", label = "Pan / Width", defaultValue = 50): CompanionInputFieldNumber {
	return {
		label,
		type: "number",
		id,
		default: defaultValue,
		min: 0,
		max: 100,
		range: true,
	}
}

export function generateComparatorOption(
	id = "comparator",
	label = "Comparator",
): CompanionInputFieldDropdown {
	return {
		label,
		type: "dropdown",
		id,
		default: "eq",
		choices: [
			{ id: "eq", label: "Equal to" },
			{ id: "gt", label: "Greater than" },
			{ id: "lt", label: "Less than" },
		],
	}
}

export function generateOnOffToggleOption(
	id = "state",
	label = "State",
	includeToggle = true,
	defaultValue: "on" | "off" | "toggle" = includeToggle ? "toggle" : "on",
): CompanionInputFieldDropdown {
	const choices: DropdownChoice[] = [
		{ id: "on", label: "On" },
		{ id: "off", label: "Off" },
	];

	if (includeToggle) {
		choices.push({ id: "toggle", label: "Toggle" });
	}

	return {
		label,
		type: "dropdown",
		id,
		default: defaultValue,
		choices,
	}
}

export function compareNumber(actual: number | null, expected: number, comparator: unknown): boolean {
	if (actual === null || Number.isNaN(actual)) return false;

	switch (comparator) {
		case "gt":
			return actual > expected;
		case "lt":
			return actual < expected;
		default:
			return Math.abs(actual - expected) < 0.001;
	}
}
