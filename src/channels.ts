
import type { ChannelTypes, ChannelCount } from 'presonus-studiolive-api';
import type { DropdownActionOptionChoice } from './types/Action'
import { ValueSeparator } from './util/Constants';

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

export default function generateChannels(channels: ChannelCount): DropdownActionOptionChoice[] {
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