import type { CompanionInputFieldStaticText, DropdownChoice, SomeCompanionActionInputField } from "@companion-module/base";

export type RecallFilterGroup = "projectfilters" | "advancedscenefilters";

export type RecallFilterDefinition = {
	group: RecallFilterGroup;
	key: string;
	label: string;
};

export type RecallFilterOverride = "keep" | "on" | "off";

const FILTER_OVERRIDE_CHOICES: DropdownChoice[] = [
	{ id: "keep", label: "Keep current" },
	{ id: "on", label: "On" },
	{ id: "off", label: "Off" },
];

export const PROJECT_FILTER_DEFINITIONS: RecallFilterDefinition[] = [
	{ group: "projectfilters", key: "fltr_input_source", label: "Input Source" },
	{ group: "projectfilters", key: "fltr_flexmixmode", label: "Flex Mode" },
	{ group: "projectfilters", key: "fltr_flexmixprepostmode", label: "Flex Pre/Post" },
	{ group: "projectfilters", key: "fltr_fxmixpreposmode", label: "FX Pre/Post" },
	{ group: "projectfilters", key: "fltr_talkbackassigns", label: "Talkback Assigns" },
	{ group: "projectfilters", key: "fltr_geq", label: "GEQ" },
	{ group: "projectfilters", key: "fltr_solosettings", label: "Solo" },
	{ group: "projectfilters", key: "fltr_avbstreamrouting", label: "AVB Routing" },
	{ group: "projectfilters", key: "fltr_inputpatching", label: "Input Routing" },
	{ group: "projectfilters", key: "fltr_outputpatching", label: "Output Routing" },
	{ group: "projectfilters", key: "fltr_avbpatching", label: "AVB Patching" },
	{ group: "projectfilters", key: "fltr_sdpatching", label: "SD Routing" },
	{ group: "projectfilters", key: "fltr_usbpatching", label: "USB Routing" },
	{ group: "projectfilters", key: "fltr_user_functions", label: "User Functions" },
	{ group: "projectfilters", key: "fltr_generalsettings", label: "General" },
];

export const SCENE_FILTER_DEFINITIONS: RecallFilterDefinition[] = [
	{ group: "advancedscenefilters", key: "fltr_channel_info", label: "Channel Info" },
	{ group: "advancedscenefilters", key: "fltr_preamp", label: "Preamp" },
	{ group: "advancedscenefilters", key: "fltr_channelstrip", label: "Channelstrip" },
	{ group: "advancedscenefilters", key: "fltr_input_fatch", label: "Input Fat Channel" },
	{ group: "advancedscenefilters", key: "fltr_output_fatch", label: "Output Fat Channel" },
	{ group: "advancedscenefilters", key: "fltr_channel_delay", label: "Channel Delay" },
	{ group: "advancedscenefilters", key: "fltr_mutes", label: "Mutes" },
	{ group: "advancedscenefilters", key: "fltr_main_mix_level", label: "Mix Levels" },
	{ group: "advancedscenefilters", key: "fltr_main_mix_assigns", label: "Mix Assignments" },
	{ group: "advancedscenefilters", key: "fltr_subgroup_assigns", label: "Subgroup Assignments" },
	{ group: "advancedscenefilters", key: "fltr_aux_matrix_mixes", label: "Aux/Matrix Mixes" },
	{ group: "advancedscenefilters", key: "fltr_fx_mixes", label: "FX Mixes" },
	{ group: "advancedscenefilters", key: "fltr_fx_type", label: "FX Type/Settings" },
	{ group: "advancedscenefilters", key: "fltr_dca_groups", label: "DCA Groups" },
	{ group: "advancedscenefilters", key: "fltr_mute_groups", label: "Mute Groups" },
];

export function getRecallFilterStatePath(filter: RecallFilterDefinition): string {
	return `${filter.group}.${filter.key}`;
}

export function getRecallFilterOptionId(filter: RecallFilterDefinition): string {
	return `${filter.group}__${filter.key}`;
}

export function generateRecallFilterActionOptions(
	title: string,
	filters: RecallFilterDefinition[],
	visibleExpression?: string,
	visibleKey?: string,
): SomeCompanionActionInputField[] {
	const heading: CompanionInputFieldStaticText = {
		type: "static-text",
		id: `${title.toLowerCase().replaceAll(/\s+/g, "_")}_heading`,
		label: title,
		value: `Override ${title.toLowerCase()} for this recall, or leave each one at Keep current.`,
		isVisibleExpression: visibleExpression,
		isVisible: visibleKey ? (options) => options[visibleKey] === "override" : undefined,
	};

	return [
		heading,
		...filters.map((filter) => ({
			type: "dropdown" as const,
			id: getRecallFilterOptionId(filter),
			label: filter.label,
			choices: FILTER_OVERRIDE_CHOICES,
			default: "keep",
			isVisibleExpression: visibleExpression,
			isVisible: visibleKey ? (options) => options[visibleKey] === "override" : undefined,
		})),
	];
}

export function parseRecallFilterOverride(value: unknown): RecallFilterOverride {
	if (value === "on" || value === "off" || value === "keep") return value;
	return "keep";
}

export function generateRecallFilterChoices(filters: RecallFilterDefinition[]): DropdownChoice[] {
	return filters.map((filter) => ({
		id: filter.key,
		label: filter.label,
	}));
}

export function generateRecallFilterStateChoices(): DropdownChoice[] {
	return [
		{ id: "on", label: "On" },
		{ id: "off", label: "Off" },
	];
}
