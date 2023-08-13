import { CompanionFeedbackDefinition, CompanionFeedbackDefinitions, DropdownChoice, combineRgb } from '@companion-module/base';

import type { ChannelSelector } from 'presonus-studiolive-api';
import type Instance from './index';
import { extractChannelSelector, generateChannelSelectOption, generateMixSelectOption } from './util/channelUtils';

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

export default function generateFeedback(this: Instance, channels: DropdownChoice[], mixes: DropdownChoice[]) {
    const channelSelectOptions = generateChannelSelectOption(channels)
    const mixSelectOptions = generateMixSelectOption(mixes, "Mix Source")

    return {
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

        ChannelColour: {
            type: 'advanced',
            name: 'Channel colour',
            description: 'Assigned channel colour',
            options: [
                channelSelectOptions
            ],

            callback: withChannelSelector((feedback, context, channel) => {
                let colour: string = this.client.getColour(channel)
                if (!colour) return {};

                const [R, G, B, A] = Buffer.from(colour, 'hex')
                if (R + G + B == 0) return {};

                return {
                    bgcolor: combineRgb(R, G, B)
                }
            })
        }
    } satisfies CompanionFeedbackDefinitions
}