import type { CompanionInputFieldDropdown, CompanionOptionValues, DropdownChoice } from "@companion-module/base";
import { parseChannelString, type ChannelCount, type ChannelSelector, type ChannelTypes } from "presonus-studiolive-api";

const LINK_CAPABLE_TYPES: ChannelTypes[] = ["LINE", "RETURN", "FXRETURN", "AUX", "MAIN"]
const PAN_CAPABLE_TYPES: ChannelTypes[] = ["LINE", "RETURN", "FXRETURN", "AUX", "MAIN"]
const COLOUR_CAPABLE_TYPES: ChannelTypes[] = ["LINE", "RETURN", "FXRETURN", "AUX", "MAIN"]
const ICON_CAPABLE_TYPES: ChannelTypes[] = ["LINE", "RETURN", "FXRETURN", "AUX", "MAIN", "DCA"]
const GATE_CAPABLE_TYPES: ChannelTypes[] = ["LINE"]
const EQ_CAPABLE_TYPES: ChannelTypes[] = ["LINE", "RETURN", "FXRETURN", "AUX", "MAIN"]
const COMP_CAPABLE_TYPES: ChannelTypes[] = ["LINE", "RETURN", "FXRETURN", "AUX", "MAIN"]
const LIMITER_CAPABLE_TYPES: ChannelTypes[] = ["LINE", "RETURN", "AUX", "MAIN"]
const HPF_CAPABLE_TYPES: ChannelTypes[] = ["LINE", "AUX"]

export function generateChannelSelectOption(channels: DropdownChoice[], label = "Channel"): CompanionInputFieldDropdown {
    return {
        label,
        type: 'dropdown',
        id: 'channel',
        choices: channels,
        default: ''
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

export function parseChannelChoice(choiceId: string): ChannelSelector | null {
	try {
		const [type, channel] = JSON.parse(choiceId)
		if (!type || !channel) return null
		return { type, channel }
	} catch {
		return null
	}
}

export function filterChannelChoicesByTypes(channels: DropdownChoice[], allowedTypes: ChannelTypes[]): DropdownChoice[] {
	return channels.filter((channel) => {
		if (!channel.id) return true
		const selector = parseChannelChoice(`${channel.id}`)
		return !!selector && allowedTypes.includes(selector.type as ChannelTypes)
	})
}

export function supportsChannelLink(type: ChannelTypes): boolean {
	return LINK_CAPABLE_TYPES.includes(type)
}

export function supportsChannelPan(type: ChannelTypes): boolean {
	return PAN_CAPABLE_TYPES.includes(type)
}

export function supportsChannelColour(type: ChannelTypes): boolean {
	return COLOUR_CAPABLE_TYPES.includes(type)
}

export function supportsChannelIcon(type: ChannelTypes): boolean {
	return ICON_CAPABLE_TYPES.includes(type)
}

export function supportsChannelGate(type: ChannelTypes): boolean {
	return GATE_CAPABLE_TYPES.includes(type)
}

export function supportsChannelEq(type: ChannelTypes): boolean {
	return EQ_CAPABLE_TYPES.includes(type)
}

export function supportsChannelComp(type: ChannelTypes): boolean {
	return COMP_CAPABLE_TYPES.includes(type)
}

export function supportsChannelLimiter(type: ChannelTypes): boolean {
	return LIMITER_CAPABLE_TYPES.includes(type)
}

export function supportsChannelHpf(type: ChannelTypes): boolean {
	return HPF_CAPABLE_TYPES.includes(type)
}

export function getChannelStatePath(channel: ChannelSelector): string {
	return parseChannelString(channel).replaceAll("/", ".")
}

export function getChannelPacketPath(channel: ChannelSelector): string {
	let targetString = parseChannelString(channel)

	if (channel.mixType) {
		switch (channel.mixType) {
			case "AUX":
				targetString += `/aux${channel.mixNumber}`
				break
			case "FX":
				targetString += `/FX${String.fromCharCode(0x40 + channel.mixNumber)}`
				break
			default:
				throw new Error("Unexpected mix type")
		}
	} else {
		targetString += "/volume"
	}

	return targetString
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
