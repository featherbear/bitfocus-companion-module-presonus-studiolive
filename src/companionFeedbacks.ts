import type Instance from './index'
import type { DropdownActionOptionChoice } from "./types/Action";
import type { ChannelSelector } from 'presonus-studiolive-api';
import CompanionModule from './types/CompanionModule';

export default function generateFeedback(this: Instance, channels: DropdownActionOptionChoice[], mixes: DropdownActionOptionChoice[]): CompanionModule.CompanionFeedbacks {
    function generateChannelSourceOption(): CompanionModule.CompanionInputFieldDropdown {
        return {
            label: "Source",
            type: 'dropdown',
            id: 'channel',
            choices: channels,
            default: ''
        }
    }
    function generateMixSourceOption(): CompanionModule.CompanionInputFieldDropdown {
        return {
            label: "Mix source",
            type: 'dropdown',
            id: 'mix',
            choices: mixes,
            default: ''
        }
    }

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
                generateChannelSourceOption(),
                generateMixSourceOption()
            ],
            callback: (feedback) => {
                const [type, channel] = <any>(<string>feedback.options.channel).split(',')
                let selector: ChannelSelector = {
                    type,
                    channel
                }
                if (feedback.options.mix) {
                    const [type, channel] = <any>(<string>feedback.options.mix).split(',');
                    (<ChannelSelector>selector).mixType = type;
                    (<ChannelSelector>selector).mixNumber = channel;
                }

                return !!this.client.getMute(selector)
            }
        },
        'channel_colour': {
            type: 'advanced',
            label: 'Channel colour',
            description: 'Assigned channel colour',
            options: [
                generateChannelSourceOption()
            ],

            callback: (feedback) => {
                const [type, channel] = <any>(<string>feedback.options.channel).split(',')
                let colour: string = this.client.getColour({ type, channel })
                if (!colour) return {};

                const [R, G, B, A] = Buffer.from(colour, 'hex')
                if (R + G + B == 0) return {};

                return { bgcolor: this.rgb(R, G, B) }
            }
        }
    }
}