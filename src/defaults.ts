import type { CompanionVariableDefinition } from '@companion-module/base'
import generateMixes from './mixes'
import generateChannelSelectEntries from './util/channelUtils'

const consoleStateVariables: Array<CompanionVariableDefinition> = [
    {
        variableId: 'console_model',
        name: "Console Model",
    },
    {
        variableId: 'console_version',
        name: "Console Version",
    },
    {
        variableId: 'console_serial',
        name: "Console Serial",
    },
    {
        variableId: 'console_sel_channel',
        name: "Console Selected Channel",
    },
    {
        variableId: 'console_current_project',
        name: "Current Project",
    },
    {
        variableId: 'console_current_project_title',
        name: "Current Project Title",
    },
    {
        variableId: 'console_current_scene',
        name: "Current Scene",
    },
    {
        variableId: 'console_current_scene_title',
        name: "Current Scene Title",
    },
    {
        variableId: 'console_prev_scene',
        name: "Previous Scene",
    },
    {
        variableId: 'console_next_scene',
        name: "Next Scene",
    },
    {
        variableId: 'console_any_solo',
        name: "Any Solo Active",
    },
]


const dummyChannels = generateChannelSelectEntries(<any>{})
const dummyMixes = generateMixes(<any>{})

const DEFAULTS = {
    consoleStateVariables,
    dummyChannels,
    dummyMixes
}

export default DEFAULTS
