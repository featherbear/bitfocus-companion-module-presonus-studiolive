import type { CompanionFeedbackDefinition, CompanionFeedbackDefinitions, DropdownChoice } from '@companion-module/base';
import { combineRgb } from '@companion-module/base';

import { parseChannelString, type ChannelSelector } from 'presonus-studiolive-api';
import type Instance from './index';
import { extractChannelSelector, generateChannelSelectOption, generateMixSelectOption } from './util/channelUtils';
import {
    decodeInputRoutingMode,
    filterLineChannelChoices,
    generateInputRoutingOption,
    getInputRoutingStateKey,
} from './util/inputRouting';
import {
    PROJECT_FILTER_DEFINITIONS,
    SCENE_FILTER_DEFINITIONS,
    generateRecallFilterChoices,
    generateRecallFilterStateChoices,
} from './util/recallFilters';

const withChannelSelector = function <T>(fn: (
    action: Parameters<CompanionFeedbackDefinition['callback']>[0],
    context: Parameters<CompanionFeedbackDefinition['callback']>[1],
    channel: ChannelSelector
) => T) {
    return ((feedback, context) => {
        const selector = extractChannelSelector(feedback.options)
        if (!selector) return

        return fn(feedback, context, selector)
    }) satisfies CompanionFeedbackDefinition['callback']

}

export type FeedbackDefinitions = ReturnType<typeof generateFeedback>
export default function generateFeedback(
    this: Instance,
    channels: DropdownChoice[],
    mixes: DropdownChoice[],
    projectScenes: DropdownChoice[] = [{ id: '', label: '' }],
) {
    const channelSelectOptions = generateChannelSelectOption(channels)
    const lineChannelSelectOptions = generateChannelSelectOption(filterLineChannelChoices(channels))
    const mixSelectOptions = generateMixSelectOption(mixes, "Mix Source")
    const inputRoutingOptions = generateInputRoutingOption()
    const projectSceneOptions = {
        label: 'Preset',
        type: 'dropdown' as const,
        id: 'project_scene',
        choices: projectScenes,
        default: '',
    }
    const projectFilterOptions = {
        label: 'Project filter',
        type: 'dropdown' as const,
        id: 'filter_key',
        choices: generateRecallFilterChoices(PROJECT_FILTER_DEFINITIONS),
        default: PROJECT_FILTER_DEFINITIONS[0]?.key ?? '',
    }
    const sceneFilterOptions = {
        label: 'Scene filter',
        type: 'dropdown' as const,
        id: 'filter_key',
        choices: generateRecallFilterChoices(SCENE_FILTER_DEFINITIONS),
        default: SCENE_FILTER_DEFINITIONS[0]?.key ?? '',
    }
    const filterStateOptions = {
        label: 'State',
        type: 'dropdown' as const,
        id: 'filter_state',
        choices: generateRecallFilterStateChoices(),
        default: 'on',
    }

    return {
        CurrentProjectOrScene: {
            type: 'boolean',
            name: 'Current project / scene',
            description: 'Whether the selected project or scene is currently loaded',
            defaultStyle: {
                color: combineRgb(0, 0, 0),
                bgcolor: combineRgb(255, 196, 0),
            },
            options: [
                projectSceneOptions
            ],
            callback: (feedback) => {
                if (!feedback.options.project_scene) return false

                const [project, scene] = JSON.parse(<string>feedback.options.project_scene)
                if (!project) return false

                const currentProject = this.client.currentProject
                const currentScene = this.client.currentScene

                if (scene) {
                    return currentProject === project && currentScene === scene
                }

                return currentProject === project
            }
        },

        ProjectFilterStatus: {
            type: 'boolean',
            name: 'Project filter status',
            description: 'Whether a project filter is currently on or off',
            defaultStyle: {
                color: combineRgb(0, 0, 0),
                bgcolor: combineRgb(0, 180, 120),
            },
            options: [
                projectFilterOptions,
                filterStateOptions
            ],
            callback: (feedback) => {
                const filter = PROJECT_FILTER_DEFINITIONS.find((filter) => filter.key === feedback.options.filter_key)
                if (!filter) return false

                const state = this.getRecallFilterState(filter)
                if (state === null) return false

                return state === (feedback.options.filter_state === 'on')
            }
        },

        SceneFilterStatus: {
            type: 'boolean',
            name: 'Scene filter status',
            description: 'Whether a scene filter is currently on or off',
            defaultStyle: {
                color: combineRgb(0, 0, 0),
                bgcolor: combineRgb(0, 180, 120),
            },
            options: [
                sceneFilterOptions,
                filterStateOptions
            ],
            callback: (feedback) => {
                const filter = SCENE_FILTER_DEFINITIONS.find((filter) => filter.key === feedback.options.filter_key)
                if (!filter) return false

                const state = this.getRecallFilterState(filter)
                if (state === null) return false

                return state === (feedback.options.filter_state === 'on')
            }
        },

        ChannelMute: {
            type: 'boolean',
            name: 'Mute status',
            description: 'Mute status of a channel',
            defaultStyle: {
                color: combineRgb(0, 0, 0),
                bgcolor: combineRgb(255, 0, 0),
            },
            options: [
                channelSelectOptions,
                mixSelectOptions
            ],
            callback: withChannelSelector((feedback, context, channel) => {
                return !!this.client.getMute(channel)

            })
        },

        ChannelSelect: {
            type: 'boolean',
            name: 'Select status',
            description: 'Select status of a channel',
            defaultStyle: {
                color: combineRgb(0, 0, 0),
                bgcolor: combineRgb(0, 255, 0),
            },
            options: [
                channelSelectOptions
            ],
            callback: withChannelSelector((feedback, context, channel) => {
                const channelPath = parseChannelString(channel).replaceAll('/', '.')
                return !!this.client.state.get(`${channelPath}.select`)
            })
        },

        ChannelInputRouting: {
            type: 'boolean',
            name: 'Input routing status',
            description: 'Input routing status of a line channel',
            defaultStyle: {
                color: combineRgb(0, 0, 0),
                bgcolor: combineRgb(0, 160, 255),
            },
            options: [
                lineChannelSelectOptions,
                inputRoutingOptions
            ],
            callback: withChannelSelector((feedback, context, channel) => {
                const stateKey = getInputRoutingStateKey(channel)
                if (!stateKey) return false

                return decodeInputRoutingMode(this.client.state.get(stateKey)) === feedback.options.inputsrc
            })
        },

        ChannelColour: {
            type: 'advanced',
            name: 'Channel colour',
            description: 'Assigned channel colour',
            options: [
                channelSelectOptions
            ],

            callback: withChannelSelector((feedback, context, channel) => {
                const colour: string = this.client.getColour(channel)
                if (!colour) return {};

                const [R, G, B] = Buffer.from(colour, 'hex')
                
                // Black, set to empty
                // perhaps we should set to black though?
                if (R + G + B === 0) return {};

                return {
                    bgcolor: combineRgb(R, G, B)
                }
            })
        }
    } satisfies CompanionFeedbackDefinitions
}
