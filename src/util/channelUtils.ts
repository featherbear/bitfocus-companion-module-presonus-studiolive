import type { CompanionActionDefinition, CompanionActionDefinitions, CompanionInputFieldDropdown, CompanionInputFieldNumber, CompanionOptionValues, DropdownChoice } from "@companion-module/base"
import { ChannelSelector } from "presonus-studiolive-api"
import { ValueSeparator } from './Constants';
import type { ChannelTypes, ChannelCount } from 'presonus-studiolive-api';

export function generateChannelSelectOption(channels: DropdownChoice[], label: string = "Channel"): CompanionInputFieldDropdown {
    return {
        label,
        type: 'dropdown',
        id: 'channel',
        choices: channels,
        default: ''
    }
}


export function generateMixSelectOption(mixes: DropdownChoice[], label: string = "Mix target"): CompanionInputFieldDropdown {
    return {
        label,
        type: 'dropdown',
        id: 'mix',
        choices: mixes,
        default: ''
    }
}

export function extractChannelSelector(options: CompanionOptionValues) {
    const [type, channel] = (<string>options.channel).split(ValueSeparator)
    let selector: ChannelSelector = <any>{}

    if (!type || !channel) return

    selector.type = <any>type
    selector.channel = <any>channel

    if (!!options.mix) {
        const [type, channel] = (<string>options.mix).split(ValueSeparator);
        selector.mixType = <any>type;
        selector.mixNumber = <any>channel;
    }

    return selector
}

/**
 * Prettify the channel type labels  
 * - Remove "CH" (from MAIN CH, TALKBACK CH)
 * - 'Title Case' the names
 * - Stylise "FX Return", and "FX"
 */
function formatLabel(tokens: string[]) {
    let builder = []

    for (let tok of (tokens as ChannelTypes[])) {
        let res: string = tok

        switch (tok) {
            case 'LINE':
                res = "Channel"
                break;
            case 'FXRETURN':
                res = "FX Return"
                break;
            case "FX":
                res = "FX"
                break;
            default:
                res = res[0].toUpperCase() + res.toLowerCase().slice(1)
                break
        }

        builder.push(res)
    }

    return builder.join(" ")
}

export default function generateChannelSelectEntries(channels: ChannelCount): DropdownChoice[] {
    let entries = Object.entries(channels).map(([name, count]) => {
        let channels = []

        if (count == 1) {
            channels.push({
                id: [name, 1].join(ValueSeparator),
                label: formatLabel([name])
            })
            return channels
        }

        for (let i = 0; i < count; i++) {
            channels.push({
                id: [name, i + 1].join(ValueSeparator),
                label: formatLabel([name, (i + 1).toString()])
            })
        }
        return channels
    }).flat()

    return [
        { id: '', label: '' },
        ...entries
    ]
}