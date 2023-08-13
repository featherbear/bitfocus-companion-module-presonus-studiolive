import { CompanionActionDefinitions, DropdownChoice } from "@companion-module/base";
import Instance from "..";
import { ValueSeparator } from "../util/Constants";

export default function generateActions_projectScenes(this: Instance, project_scenes: DropdownChoice[]) {
    const key = 'project_scene'
    return {
        recallProjectOrScene: {
            name: 'Recall Project / Scene',
            description: 'Loads a project or project scene',
            options: [
                {
                    label: 'Preset',
                    type: 'dropdown',
                    id: key,
                    choices: project_scenes,
                    default: ''
                }
            ],
            callback: (action, context) => {
                let [project, scene] = (<string>action.options[key]).split(ValueSeparator)
                if (!project) return

                if (scene) {
                    this.client.recallProjectScene(project, scene)
                } else {
                    this.client.recallProject(project)
                }
            }
        }
    } satisfies CompanionActionDefinitions
}