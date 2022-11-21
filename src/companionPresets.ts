import type Instance from './index'
import type { DropdownActionOptionChoice } from "./types/Action";
import type CompanionModule from './types/CompanionModule';
import type { ChannelSelectorOption } from './types/OptionSets'

export default function generatePreset(this: Instance, channels: DropdownActionOptionChoice[], mixes: DropdownActionOptionChoice[]) {
    let presets: CompanionModule.CompanionPreset[] = []

    channels.slice(1).forEach(channel => presets.push({
        label: "Mute / Unmute Channel",
        category: "Channel Strip",
        bank: {
            text: channel.label,
            bgcolor: this.rgb(0, 0, 0),
            color: this.rgb(255, 255, 255),
            size: '18',
            style: 'text'
        },
        feedbacks: [
            {
                type: 'channel_mute',
                options: <ChannelSelectorOption>{
                    channel: channel.id,
                    mix: ''
                },
            }
        ],
        actions: [
            {
                action: "toggleMute",
                options: <ChannelSelectorOption>{
                    channel: channel.id,
                    mix: ''
                }
            }
        ]
    }))

    return presets
}