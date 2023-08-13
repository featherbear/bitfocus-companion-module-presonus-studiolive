
import type { CompanionActionDefinition, CompanionActionDefinitions, CompanionInputFieldDropdown, CompanionInputFieldNumber, DropdownChoice } from "@companion-module/base"
import { ChannelSelector } from "presonus-studiolive-api"
import { generateChannelSelectOption, generateMixSelectOption, generateTransitionPeriodOption, withChannelSelector } from "./util/actionsUtils"
import type Instance from "."

export default function generateActions(this: Instance, channels: DropdownChoice[], mixes: DropdownChoice[]): CompanionActionDefinitions {
    const channelSelectOptions = generateChannelSelectOption(channels)
    const mixSelectOptions = generateMixSelectOption(mixes)

    const map = {
        mute: {
            name: 'Mute channel',
            options: [
                channelSelectOptions,
                mixSelectOptions
            ],
            callback: withChannelSelector((action, context, channel) => {
                this.client.mute(channel)
            }),
        },
        unmute: {
            name: 'Unmute channel',
            options: [
                channelSelectOptions,
                mixSelectOptions
            ],
            callback: withChannelSelector((action, context, channel) => {
                console.log('unmute', action, context, channel);
                console.log(this);
                console.log(this.client);
                console.log(this.client.unmute);
                this.client.unmute(channel)
                console.log('a');

            }),
        },
        toggleMute: {
            name: 'Toggle channel mute',
            options: [
                channelSelectOptions,
                mixSelectOptions
            ], callback: withChannelSelector((action, context, channel) => {
                this.client.toggleMute(channel)

            })
        },
        mute_smooth: {
            name: 'Smooth mute channel',
            description: 'Slowly brings fader to -∞ before muting',
            options: [
                channelSelectOptions,
                mixSelectOptions,
                generateTransitionPeriodOption(200)
            ], callback: withChannelSelector((action, context, channel) => {
                let currentLevel = this.client.getLevel(channel)
                this.client.setChannelVolumeLinear(channel, 0, <number>action.options.transition).then(() => {
                    this.client.mute(channel)
                    this.client.setChannelVolumeLinear(channel, currentLevel)
                })
            }),
        },
        unmute_smooth: {
            name: 'Smooth unmute channel',
            description: 'Sets fader to -∞, then unmutes and slowly restores level',
            options: [
                channelSelectOptions,
                mixSelectOptions,
                generateTransitionPeriodOption(200)
            ], callback: withChannelSelector((action, context, channel) => {
                let currentLevel = this.client.getLevel(channel)

                this.client.setChannelVolumeLinear(channel, 0, 0).then(() => {
                    this.client.unmute(channel)
                    this.client.setChannelVolumeLinear(channel, currentLevel, <number>action.options.transition)
                })
            }),
        },
        toggleMute_smooth: {
            name: 'Smooth toggle channel mute',
            options: [
                channelSelectOptions,
                mixSelectOptions,
                generateTransitionPeriodOption(200)
            ], callback: withChannelSelector((action, context, channel) => {
                const fn = this.client.getMute(channel) ? map.unmute_smooth : map.mute_smooth
                fn.callback(action, context)
            }),
        },
        // ...generateRecallProjectSceneEntry([])
    }

    return map
}
