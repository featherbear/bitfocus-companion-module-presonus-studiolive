import type Instance from './index'
import type { DropdownActionOption, DropdownActionOptionChoice } from "./types/Action";
import { parseChannelString } from 'presonus-studiolive-api/dist/lib/util/channelUtil'

// TODO: Put these in the main export

export default function generateFeedback(this: Instance, channels: DropdownActionOptionChoice[]) {
    return {
        'channel_mute': {
            type: 'boolean',
            label: 'Mute status',
            description: 'Mute status of a channel',
            style: {
                color: this.rgb(0, 0, 0),
                bgcolor: this.rgb(255, 0, 0)
            },
            options: [
                {
                    type: 'dropdown',
                    label: 'Source',
                    id: 'source',
                    choices: channels,
                    default: ''
                } as DropdownActionOption
            ],
            callback: (feedback) => {
                console.log(feedback);
                const [type, channel] = feedback.options.source.split(',')
                return !!this.client.getMute({
                    type,
                    channel
                })
            }
        },
        'channel_colour': {
            type: 'advanced',
            label: 'Channel colour',
            description: 'Assigned channel colour',
            options: [
                {
                    type: 'dropdown',
                    label: 'Source',
                    id: 'source',
                    choices: channels,
                    default: ''
                } as DropdownActionOption
            ],

            callback: (feedback) => {
                const [type, channel] = feedback.options.source.split(',')
                let colour: string = this.client.getColour({ type, channel })
                if (!colour) return {};

                const [R, G, B, A] = Buffer.from(colour, 'hex')
                if (R + G + B == 0) return {};

                return { bgcolor: this.rgb(R, G, B) }
            }

        }
    }
}