import { ChannelSelector, Client as StudioLiveAPI, MessageCode } from 'presonus-studiolive-api'
import { generateRecallProjectSceneEntry } from './util/actionsUtils'
// import generateFeedbacks from './companionFeedbacks.ts.off'
// import generatePresets from './companionPresets.ts.off'
import generateMixes from './mixes'
import { CompanionVariableDefinition } from '@companion-module/base'
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