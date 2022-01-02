import channels from "./channels";
import { DropdownActionOption } from "./types/Action";
import type Instance from './index'

// TODO: Put these in the main export
import { parseChannelString } from 'presonus-studiolive-api/dist/lib/util/channelUtil'
import { ACTIONS } from "presonus-studiolive-api/dist/lib/constants";

export default function generateFeedback(this: Instance) {
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
                const [type, channel] = feedback.options.source.split(',')
                const target = parseChannelString({ type, channel })
                return !!this.client.state.get(`${target}/${ACTIONS.MUTE}`)
            }
        }
    }
}