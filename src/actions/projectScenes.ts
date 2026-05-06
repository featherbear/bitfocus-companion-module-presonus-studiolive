import type { CompanionActionDefinitions, DropdownChoice } from "@companion-module/base";
import type Instance from "../";
import { MessageCode } from "presonus-studiolive-api";
import {
	generateRecallFilterActionOptions,
	getRecallFilterOptionId,
	parseRecallFilterOverride,
	PROJECT_FILTER_DEFINITIONS,
	SCENE_FILTER_DEFINITIONS,
	type RecallFilterDefinition,
} from "../util/recallFilters";

export default function generateActions_projectScenes(this: Instance, project_scenes: DropdownChoice[]) {
	const key = "project_scene";
	const filterHandlingKey = "filter_handling";
	const restoreFiltersKey = "restore_previous_filters";
	const allFilters = [...PROJECT_FILTER_DEFINITIONS, ...SCENE_FILTER_DEFINITIONS];
	const showFilterOptionsExpression = `$(options:${filterHandlingKey}) == "override"`;
	const showRestoreFiltersExpression = `$(options:${filterHandlingKey}) == "override" && $(options:${key}) != ""`;

	const collectFilterOverrides = (filters: RecallFilterDefinition[], options): Array<[RecallFilterDefinition, boolean]> => {
		return filters.flatMap((filter) => {
			const override = parseRecallFilterOverride(options[getRecallFilterOptionId(filter)]);
			if (override === "keep") return [];
			return [[filter, override === "on"]];
		});
	};

	return {
		recallProjectOrScene: {
			name: "Recall Project / Scene",
			description: "Loads a project or project scene",
			options: [
				{
					label: "Preset",
					type: "dropdown",
					id: key,
					choices: project_scenes,
					default: "",
				},
				{
					label: "Filter handling",
					type: "dropdown",
					id: filterHandlingKey,
					choices: [
						{ id: "current", label: "Use current console filters" },
						{ id: "override", label: "Set filters" },
					],
					default: "current",
				},
				{
					label: "Restore previous filters after load",
					type: "dropdown",
					id: restoreFiltersKey,
					choices: [
						{ id: "no", label: "No" },
						{ id: "yes", label: "Yes" },
					],
					default: "no",
					isVisibleExpression: showRestoreFiltersExpression,
					isVisible: (options) => options[filterHandlingKey] === "override" && !!options[key],
				},
				...generateRecallFilterActionOptions(
					"Project Filters",
					PROJECT_FILTER_DEFINITIONS,
					showFilterOptionsExpression,
					filterHandlingKey,
				),
				...generateRecallFilterActionOptions(
					"Scene Filters",
					SCENE_FILTER_DEFINITIONS,
					showFilterOptionsExpression,
					filterHandlingKey,
				),
			],
			callback: async (action, context) => {
				const shouldOverrideFilters = action.options[filterHandlingKey] === "override";
				const projectFilterOverrides = shouldOverrideFilters
					? collectFilterOverrides(PROJECT_FILTER_DEFINITIONS, action.options)
					: [];
				const sceneFilterOverrides = shouldOverrideFilters
					? collectFilterOverrides(SCENE_FILTER_DEFINITIONS, action.options)
					: [];
				const allOverrides = [...projectFilterOverrides, ...sceneFilterOverrides];
				const shouldRestoreFilters = shouldOverrideFilters && action.options[restoreFiltersKey] === "yes";
				const previousFilters = shouldRestoreFilters ? this.getRecallFilterSnapshot(allFilters) : null;

				for (const [filter, enabled] of allOverrides) {
					this.setRecallFilterState(filter, enabled);
				}

				if (!action.options[key]) {
					if (!shouldOverrideFilters) {
						this.log("warn", "Recall Project / Scene did nothing: no preset selected and filter handling is set to use current console filters.");
					} else if (allOverrides.length === 0) {
						this.log("warn", "Recall Project / Scene did nothing: no preset selected and no filter overrides were selected.");
					} else {
						this.log("info", `Applied ${allOverrides.length} filter override(s) without recalling a project or scene.`);
					}
					return;
				}

				const [project, scene] = JSON.parse(<string>action.options[key]);
				if (!project) return;

				if (scene) {
					this.client.recallProjectScene(project, scene);
				} else {
					this.client.recallProject(project);
				}

				await new Promise<void>((resolve) => {
					this.client.once(MessageCode.ZLIB, () => {
						this.checkAllFeedbacks();
						resolve();
					});
				});

				if (shouldRestoreFilters && previousFilters) {
					this.restoreRecallFilterSnapshot(previousFilters);
				}
			},
		},
		recallPreviousScene: {
			name: "Recall Previous Scene",
			description: "Loads the previous scene within the current project",
			options: [],
			callback: async () => {
				if (!this.recallAdjacentScene(-1)) {
					this.log("warn", "Recall Previous Scene did nothing: there is no previous scene in the current project.");
					return;
				}

				await new Promise<void>((resolve) => {
					this.client.once(MessageCode.ZLIB, () => {
						this.checkAllFeedbacks();
						resolve();
					});
				});
			},
		},
		recallNextScene: {
			name: "Recall Next Scene",
			description: "Loads the next scene within the current project",
			options: [],
			callback: async () => {
				if (!this.recallAdjacentScene(1)) {
					this.log("warn", "Recall Next Scene did nothing: there is no next scene in the current project.");
					return;
				}

				await new Promise<void>((resolve) => {
					this.client.once(MessageCode.ZLIB, () => {
						this.checkAllFeedbacks();
						resolve();
					});
				});
			},
		},
	} satisfies CompanionActionDefinitions;
}
