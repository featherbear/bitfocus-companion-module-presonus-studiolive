import type { CompanionFeedbackDefinition, CompanionFeedbackDefinitions, DropdownChoice } from '@companion-module/base';
import { combineRgb } from '@companion-module/base';

import { parseChannelString, type ChannelSelector } from '@featherbear/presonus-studiolive-api';
import type Instance from './index';
import { compareNumber, generateComparatorOption, generateLinearLevelOption, generateOnOffToggleOption, generatePanOption } from './util/actionsUtils';
import {
    extractChannelSelector,
    filterChannelChoicesByTypes,
    generateChannelSelectOption,
    generateMixSelectOption,
    supportsChannelColour,
    supportsChannelIcon,
} from './util/channelUtils';
import { getChannelIconPng64 } from './util/icons';
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
    const panChannelSelectOptions = generateChannelSelectOption(
        filterChannelChoicesByTypes(channels, ["LINE", "RETURN", "FXRETURN", "AUX", "MAIN"])
    )
    const gateChannelSelectOptions = generateChannelSelectOption(
        filterChannelChoicesByTypes(channels, ["LINE"])
    )
    const eqCompChannelSelectOptions = generateChannelSelectOption(
        filterChannelChoicesByTypes(channels, ["LINE", "RETURN", "FXRETURN", "AUX", "MAIN"])
    )
    const limiterChannelSelectOptions = generateChannelSelectOption(
        filterChannelChoicesByTypes(channels, ["LINE", "RETURN", "AUX", "MAIN"])
    )
    const linkChannelSelectOptions = generateChannelSelectOption(
        filterChannelChoicesByTypes(channels, ["LINE", "RETURN", "FXRETURN", "AUX", "MAIN"])
    )
    const colourChannelSelectOptions = generateChannelSelectOption(
        channels.filter((channel) => {
            if (!channel.id) return true
            try {
                const [type] = JSON.parse(String(channel.id))
                return supportsChannelColour(type)
            } catch {
                return false
            }
        })
    )
    const iconChannelSelectOptions = generateChannelSelectOption(
        channels.filter((channel) => {
            if (!channel.id) return true
            try {
                const [type] = JSON.parse(String(channel.id))
                return supportsChannelIcon(type)
            } catch {
                return false
            }
        })
    )
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

        ChannelSolo: {
            type: 'boolean',
            name: 'Solo status',
            description: 'Solo status of a channel',
            defaultStyle: {
                color: combineRgb(0, 0, 0),
                bgcolor: combineRgb(255, 255, 0),
            },
            options: [
                channelSelectOptions,
                generateOnOffToggleOption('state', 'Solo state', false, 'on'),
            ],
            callback: withChannelSelector((feedback, context, channel) => {
                const solo = this.client.getSolo(channel)
                if (solo === null) return false
                return solo === (feedback.options.state === 'on')
            })
        },

        ChannelGate: {
            type: 'boolean',
            name: 'Gate status',
            description: 'Gate on/off state of a channel',
            defaultStyle: {
                color: combineRgb(0, 0, 0),
                bgcolor: combineRgb(180, 220, 255),
            },
            options: [
                gateChannelSelectOptions,
                generateOnOffToggleOption('state', 'Gate state', false, 'on'),
            ],
            callback: withChannelSelector((feedback, context, channel) => {
                const state = this.getBooleanState(`${parseChannelString(channel).replaceAll('/', '.')}.gate.on`)
                if (state === null) return false
                return state === (feedback.options.state === 'on')
            })
        },

        ChannelEq: {
            type: 'boolean',
            name: 'EQ status',
            description: 'EQ on/off state of a channel',
            defaultStyle: {
                color: combineRgb(0, 0, 0),
                bgcolor: combineRgb(255, 220, 120),
            },
            options: [
                eqCompChannelSelectOptions,
                generateOnOffToggleOption('state', 'EQ state', false, 'on'),
            ],
            callback: withChannelSelector((feedback, context, channel) => {
                const state = this.getBooleanState(`${parseChannelString(channel).replaceAll('/', '.')}.eq.eqallon`)
                if (state === null) return false
                return state === (feedback.options.state === 'on')
            })
        },

        ChannelComp: {
            type: 'boolean',
            name: 'Compressor status',
            description: 'Compressor on/off state of a channel',
            defaultStyle: {
                color: combineRgb(0, 0, 0),
                bgcolor: combineRgb(200, 255, 160),
            },
            options: [
                eqCompChannelSelectOptions,
                generateOnOffToggleOption('state', 'Compressor state', false, 'on'),
            ],
            callback: withChannelSelector((feedback, context, channel) => {
                const state = this.getBooleanState(`${parseChannelString(channel).replaceAll('/', '.')}.comp.on`)
                if (state === null) return false
                return state === (feedback.options.state === 'on')
            })
        },

        ChannelLimiter: {
            type: 'boolean',
            name: 'Limiter status',
            description: 'Limiter on/off state of a channel',
            defaultStyle: {
                color: combineRgb(0, 0, 0),
                bgcolor: combineRgb(255, 180, 180),
            },
            options: [
                limiterChannelSelectOptions,
                generateOnOffToggleOption('state', 'Limiter state', false, 'on'),
            ],
            callback: withChannelSelector((feedback, context, channel) => {
                const state = this.getBooleanState(`${parseChannelString(channel).replaceAll('/', '.')}.limit.limiteron`)
                if (state === null) return false
                return state === (feedback.options.state === 'on')
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
                colourChannelSelectOptions
            ],

            callback: withChannelSelector((feedback, context, channel) => {
                const colour = this.getChannelColourHex(channel)
                if (!colour) return {};

                const [R, G, B] = Buffer.from(colour, 'hex')
                
                // Black, set to empty
                // perhaps we should set to black though?
                if (R + G + B === 0) return {};

                return {
                    bgcolor: combineRgb(R, G, B)
                }
            })
        },

        ChannelIconImage: {
            type: 'advanced',
            name: 'Channel icon image',
            description: 'Live-synced channel icon PNG from the current console icon selection',
            options: [
                iconChannelSelectOptions,
            ],
            callback: withChannelSelector(async (feedback, context, channel) => {
                const iconId = String(this.client.state.get(`${parseChannelString(channel).replaceAll('/', '.')}.iconid`) || '')
                const png64 = await getChannelIconPng64(iconId, this.getChannelColourHex(channel))
                if (!png64) return {}

                return {
                    png64,
                    pngalignment: 'center:center',
                }
            })
        },

        ChannelLink: {
            type: 'boolean',
            name: 'Link status',
            description: 'Stereo link status of a channel',
            defaultStyle: {
                color: combineRgb(0, 0, 0),
                bgcolor: combineRgb(0, 200, 255),
            },
            options: [
                linkChannelSelectOptions,
                generateOnOffToggleOption('state', 'Link state', false, 'on'),
            ],
            callback: withChannelSelector((feedback, context, channel) => {
                const link = this.getChannelLink(channel)
                if (link === null) return false
                return link === (feedback.options.state === 'on')
            })
        },

        ChannelLevel: {
            type: 'boolean',
            name: 'Level compare',
            description: 'Compare channel level to a value',
            defaultStyle: {
                color: combineRgb(0, 0, 0),
                bgcolor: combineRgb(0, 220, 120),
            },
            options: [
                channelSelectOptions,
                mixSelectOptions,
                generateComparatorOption(),
                generateLinearLevelOption(),
            ],
            callback: withChannelSelector((feedback, context, channel) => {
                return compareNumber(this.getChannelLevel(channel), Number(feedback.options.level), feedback.options.comparator)
            })
        },

        ChannelPan: {
            type: 'boolean',
            name: 'Pan compare',
            description: 'Compare channel pan or width to a value',
            defaultStyle: {
                color: combineRgb(0, 0, 0),
                bgcolor: combineRgb(255, 140, 0),
            },
            options: [
                panChannelSelectOptions,
                mixSelectOptions,
                generateComparatorOption(),
                generatePanOption(),
            ],
            callback: withChannelSelector((feedback, context, channel) => {
                return compareNumber(this.getChannelPan(channel), Number(feedback.options.pan), feedback.options.comparator)
            })
        },

        MuteGroupState: {
            type: 'boolean',
            name: 'Mute group state',
            description: 'Whether a mute group is currently on or off',
            defaultStyle: {
                color: combineRgb(0, 0, 0),
                bgcolor: combineRgb(255, 0, 120),
            },
            options: [
                {
                    label: 'Mute group',
                    type: 'dropdown',
                    id: 'group',
                    default: '1',
                    choices: Array.from({ length: 8 }, (_, index) => ({
                        id: `${index + 1}`,
                        label: `Mute Group ${index + 1}`,
                    })),
                },
                generateOnOffToggleOption('state', 'State', false, 'on'),
            ],
            callback: (feedback) => {
                const state = this.getMuteGroupState(Number(feedback.options.group))
                if (state === null) return false
                return state === (feedback.options.state === 'on')
            }
        }
    } satisfies CompanionFeedbackDefinitions
}
