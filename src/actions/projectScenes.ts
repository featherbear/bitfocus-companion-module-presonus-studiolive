import type { CompanionActionDefinitions, DropdownChoice } from "@companion-module/base";
import type Instance from "../";
import { MessageCode } from "@featherbear/presonus-studiolive-api";

export default function generateActions_projectScenes(this: Instance, project_scenes: DropdownChoice[]) {
	const key = "project_scene";
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
			],
			callback: async (action, context) => {
				if (!action.options[key]) return;

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
			},
		},
	} satisfies CompanionActionDefinitions;
}
