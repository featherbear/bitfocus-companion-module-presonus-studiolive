import type { CompanionActionDefinition, CompanionActionDefinitions, CompanionInputFieldDropdown, CompanionInputFieldNumber, CompanionOptionValues, DropdownChoice } from "@companion-module/base"
import { ChannelSelector } from "presonus-studiolive-api"
import { ValueSeparator } from "./Constants"


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