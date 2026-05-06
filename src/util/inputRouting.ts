import type {
	CompanionInputFieldDropdown,
	CompanionVariableDefinition,
	DropdownChoice,
} from "@companion-module/base";
import { parseChannelString, type ChannelSelector } from "presonus-studiolive-api";

export const INPUT_ROUTING_CHOICES: DropdownChoice[] = [
	{ id: "analog", label: "Analog" },
	{ id: "network", label: "Network" },
	{ id: "usb", label: "USB" },
	{ id: "sdcard", label: "SD Card" },
];

const INPUT_ROUTING_VALUES = {
	analog: 0,
	network: 1 / 3,
	usb: 2 / 3,
	sdcard: 1,
} as const;

export type InputRoutingMode = keyof typeof INPUT_ROUTING_VALUES;

export function generateInputRoutingOption(
	label = "Input routing",
	id = "inputsrc",
): CompanionInputFieldDropdown {
	return {
		label,
		type: "dropdown",
		id,
		choices: INPUT_ROUTING_CHOICES,
		default: "analog",
	};
}

export function encodeInputRoutingMode(mode: InputRoutingMode): number {
	return INPUT_ROUTING_VALUES[mode];
}

export function decodeInputRoutingMode(value: unknown): InputRoutingMode | null {
	const numeric = Buffer.isBuffer(value) ? value.readFloatLE() : value;
	if (typeof numeric !== "number" || Number.isNaN(numeric)) return null;

	const modes = Object.entries(INPUT_ROUTING_VALUES) as [InputRoutingMode, number][];
	let bestMode: InputRoutingMode | null = null;
	let bestDiff = Infinity;

	for (const [mode, modeValue] of modes) {
		const diff = Math.abs(numeric - modeValue);
		if (diff < bestDiff) {
			bestMode = mode;
			bestDiff = diff;
		}
	}

	return bestMode;
}

export function getInputRoutingStateKey(channel: ChannelSelector): string | null {
	if (channel.mixType || channel.type !== "LINE") return null;
	return `${parseChannelString(channel).replaceAll("/", ".")}.inputsrc`;
}

export function filterLineChannelChoices(channels: DropdownChoice[]): DropdownChoice[] {
	return channels.filter((channel) => {
		if (!channel.id) return true;

		try {
			const [type] = JSON.parse(channel.id);
			return type === "LINE";
		} catch {
			return false;
		}
	});
}

export function generateInputRoutingVariableDefinitions(lineCount: number): CompanionVariableDefinition[] {
	return Array.from({ length: lineCount }, (_, idx) => ({
		variableId: `console_ch${idx + 1}_inputsrc`,
		name: `Channel ${idx + 1} Input Routing`,
	}));
}
