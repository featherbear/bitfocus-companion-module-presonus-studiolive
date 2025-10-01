
import type { CompanionActionDefinition, CompanionActionDefinitions, DropdownChoice } from "@companion-module/base"
import type { ChannelSelector } from "presonus-studiolive-api"
import type Instance from ".."
import { generateTransitionPeriodOption } from "../util/actionsUtils"
import { extractChannelSelector, generateChannelSelectOption, generateMixSelectOption } from "../util/channelUtils"

const withChannelSelector = function (fn: (
    action: Parameters<CompanionActionDefinition['callback']>[0],
    context: Parameters<CompanionActionDefinition['callback']>[1],
    channel: ChannelSelector
) => Promise<void> | void) {
    return ((action, context) => {

        const selector = extractChannelSelector(action.options)
        if (!selector) return

        return fn(action, context, selector)
    }) satisfies CompanionActionDefinition['callback']
}

export type GeneratedChannelActions = ReturnType<typeof generateActions_channels>
export default function generateActions_channels(this: Instance, channels: DropdownChoice[], mixes: DropdownChoice[]) {
    const channelSelectOptions = generateChannelSelectOption(channels)
    const mixSelectOptions = generateMixSelectOption(mixes, "Mix Target")

    const actions = {
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
                this.client.unmute(channel)
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
                const currentLevel = this.client.getLevel(channel)
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
                const currentLevel = this.client.getLevel(channel)

                this.client.setChannelVolumeLinear(channel, 0, 0).then(() => {
                    this.client.unmute(channel)
                    this.client.setChannelVolumeLinear(channel, currentLevel, <number>action.options.transition)
                })
            }),
        },
        toggleMute_smooth: {
            name: 'Smooth toggle channel mute',
            description: 'Brings fader to/from -∞ before/after muting/unmuting',
            options: [
                channelSelectOptions,
                mixSelectOptions,
                generateTransitionPeriodOption(200)
            ], callback: withChannelSelector((action, context, channel) => {
                const fn = this.client.getMute(channel) ? actions.unmute_smooth : actions.mute_smooth
                fn.callback(action, context)
            }),
        }
    } satisfies CompanionActionDefinitions

    return actions
}
