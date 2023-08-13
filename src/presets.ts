import { CompanionPresetDefinitions, DropdownChoice, combineRgb } from '@companion-module/base'
import generateActions from './actions'
import generateFeedback from './feedbacks'
import type Instance from './index'

export default function generatePreset(this: Instance, channels: DropdownChoice[], mixes: DropdownChoice[]) {
    let presets: CompanionPresetDefinitions & {
        [id: string]: {
            feedbacks: { feedbackId: keyof ReturnType<typeof generateFeedback> }[],
            steps: {
                down: { actionId: keyof ReturnType<typeof generateActions> }[]
                up: { actionId: keyof ReturnType<typeof generateActions> }[]
            }[]
        }
    } = {}

    channels.slice(1).forEach(channel => {
        presets['toggle_mute-' + channel.id] = {
            type: 'button',
            category: "Mute / Unmute Channel",
            name: "",
            feedbacks: [
                {
                    feedbackId: 'ChannelMute',
                    options: {
                        channel: channel.id,
                        mix: ''
                    },
                    style: {
                        color: combineRgb(0, 0, 0),
                        bgcolor: combineRgb(255, 0, 0)
                    }
                }
            ],
            steps: [
                {
                    down: [
                        {
                            actionId: 'toggleMute',
                            options: {
                                channel: channel.id,
                                mix: ''
                            }
                        }
                    ],
                    up: []
                }
            ],
            style: {
                text: channel.label,
                bgcolor: combineRgb(0, 0, 0),
                color: combineRgb(255, 255, 255),
                size: '18',
            },
        }
    })

    return presets
}