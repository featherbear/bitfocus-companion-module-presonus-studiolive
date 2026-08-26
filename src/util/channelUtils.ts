import type { CompanionInputFieldDropdown, CompanionInputFieldNumber, CompanionOptionValues, DropdownChoice } from "@companion-module/base";
import type { ChannelCount, ChannelSelector, ChannelTypes } from "@featherbear/presonus-studiolive-api";

export function generateChannelSelectOption(channels: DropdownChoice[], label = "Channel"): CompanionInputFieldDropdown {
    return {
        label,
        type: 'dropdown',
        id: 'channel',
        choices: channels,
        default: ''
    }
}


export function generateLogarithmicVolumeSelectOption(label = "Volume", defaultVolume = 0): CompanionInputFieldNumber {
    return {
        label: label,
        type: 'number',
        id: 'volume',
        min: -84,
        max: 10,
        default: defaultVolume
    }
}


export function generateMixSelectOption(mixes: DropdownChoice[], label = "Mix target"): CompanionInputFieldDropdown {
    return {
        label,
        type: 'dropdown',
        id: 'mix',
        choices: mixes,
        default: ''
    }
}

export function extractChannelSelector(options: CompanionOptionValues) {
    if (!options.channel) return
    
    // TODO: this could be a ChannelSelector deserialisation
    const [type, channel] = JSON.parse(<string>options.channel)
    const selector: ChannelSelector = <any>{}

    if (!type || !channel) return

    selector.type = <any>type
    selector.channel = <any>channel

    if (options.mix) {
        const [type, channel] = JSON.parse(<string>options.mix);
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
    const builder = []

    for (const tok of (tokens as ChannelTypes[])) {
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
    const entries = Object.entries(channels).flatMap(([name, count]) => {
        const channels = []

        if (count === 1) {
            channels.push({
                id: JSON.stringify([name, 1]),
                label: formatLabel([name])
            })
            return channels
        }

        for (let i = 0; i < count; i++) {
            channels.push({
                id: JSON.stringify([name, i + 1]),
                label: formatLabel([name, (i + 1).toString()])
            })
        }
        return channels
    })

    return [
        { id: '', label: '' },
        ...entries
    ]
}