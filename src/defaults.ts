import { CompanionVariableDefinition } from '@companion-module/base'
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
]


const dummyChannels = generateChannelSelectEntries(<any>{})
const dummyMixes = generateMixes(<any>{})

const DEFAULTS = {
    consoleStateVariables,
    dummyChannels,
    dummyMixes
}

export default DEFAULTS