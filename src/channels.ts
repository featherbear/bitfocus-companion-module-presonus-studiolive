import { CHANNELS, CHANNELTYPES } from 'presonus-studiolive-api'
import { DropdownActionOptionChoice } from './types/Action'

/**
 * Prettify the channel type labels  
 * - Remove "CH" (from MAIN CH, TALKBACK CH)
 * - 'Title Case' the names
 * - Stylise "FX Return", and "FX"
 */
function formatLabel(s: string) {
    const tokens = s.split('_')
    let builder = []

    for (let tok of (tokens as (keyof typeof CHANNELTYPES)[])) {
        let res: string = tok

        if (res == 'CH') continue

        switch (tok) {
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

const channels: DropdownActionOptionChoice[] = [
    { id: '', label: '' },
    ...Object.entries(CHANNELTYPES)
        .map(([channelType]) =>
            Object.entries(CHANNELS[channelType])
                .filter(([_, v]) => Number.isInteger(v)) // Extract only string -> number values from the enum
                .map(([channelName, channelValue]) => ({
                    id: `${channelType},${channelValue}`,
                    label: formatLabel(channelName)
                }))
        )
        .flat()
]
export default channels