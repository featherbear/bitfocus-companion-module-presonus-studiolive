
import type { CompanionActionDefinition, CompanionActionDefinitions, CompanionInputFieldColor, DropdownChoice } from "@companion-module/base"
import { combineRgb } from "@companion-module/base"
import { MessageCode, type ChannelSelector } from "presonus-studiolive-api"
import type Instance from ".."
import {
	generateHpfOption,
	generateLinearLevelOption,
	generateOnOffToggleOption,
	generatePanOption,
	generateSignedLevelDeltaOption,
	generateTransitionPeriodOption,
} from "../util/actionsUtils"
import {
	extractChannelSelector,
	filterChannelChoicesByTypes,
	generateChannelSelectOption,
	generateMixSelectOption,
	getChannelStatePath,
	supportsChannelColour,
	supportsChannelIcon,
} from "../util/channelUtils"
import { CHANNEL_ICON_CHOICES } from "../util/icons"
import { filterLineChannelChoices, generateInputRoutingOption, type InputRoutingMode } from "../util/inputRouting"

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

async function resolveNumericOption(
	context: Parameters<CompanionActionDefinition['callback']>[1],
	rawValue: unknown,
	useVariables: boolean,
): Promise<number | null> {
	if (rawValue === undefined || rawValue === null || rawValue === "") return null

	const resolved = useVariables ? await context.parseVariablesInString(String(rawValue)) : String(rawValue)
	const value = Number(resolved)
	return Number.isFinite(value) ? value : null
}

export type GeneratedChannelActions = ReturnType<typeof generateActions_channels>
export default function generateActions_channels(
	this: Instance,
	channels: DropdownChoice[],
	mixes: DropdownChoice[],
	channelPresets: DropdownChoice[] = [{ id: "", label: "" }],
) {
    const channelSelectOptions = generateChannelSelectOption(channels)
    const lineChannelSelectOptions = generateChannelSelectOption(filterLineChannelChoices(channels))
	const panChannelSelectOptions = generateChannelSelectOption(
		filterChannelChoicesByTypes(channels, ["LINE", "RETURN", "FXRETURN", "AUX", "MAIN"]),
	)
	const gateChannelSelectOptions = generateChannelSelectOption(
		filterChannelChoicesByTypes(channels, ["LINE"]),
	)
	const hpfChannelSelectOptions = generateChannelSelectOption(
		filterChannelChoicesByTypes(channels, ["LINE", "AUX"]),
	)
    const linkChannelSelectOptions = generateChannelSelectOption(
		filterChannelChoicesByTypes(channels, ["LINE", "RETURN", "FXRETURN", "AUX", "MAIN"]),
	)
	const eqCompChannelSelectOptions = generateChannelSelectOption(
		filterChannelChoicesByTypes(channels, ["LINE", "RETURN", "FXRETURN", "AUX", "MAIN"]),
	)
	const limiterChannelSelectOptions = generateChannelSelectOption(
		filterChannelChoicesByTypes(channels, ["LINE", "RETURN", "AUX", "MAIN"]),
	)
    const colourChannelSelectOptions = generateChannelSelectOption(
		channels.filter((channel) => {
			if (!channel.id) return true
			try {
				const [type] = JSON.parse(String(channel.id))
				return supportsChannelColour(type)
			} catch {
				return false
			}
		}),
	)
    const iconChannelSelectOptions = generateChannelSelectOption(
		channels.filter((channel) => {
			if (!channel.id) return true
			try {
				const [type] = JSON.parse(String(channel.id))
				return supportsChannelIcon(type)
			} catch {
				return false
			}
		}),
	)
    const mixSelectOptions = generateMixSelectOption(mixes, "Mix Target")
    const inputRoutingOptions = generateInputRoutingOption()
    const colourPickerOption: CompanionInputFieldColor = {
		label: "Color",
		type: "colorpicker",
		id: "color",
		default: combineRgb(255, 0, 0),
		returnType: "number",
	}
	const usePercentageOption = {
		type: "checkbox" as const,
		id: "use_percentage",
		label: "Use Percentage",
		default: false,
	}
	const useVariablesOption = {
		type: "checkbox" as const,
		id: "level_use_variables",
		label: "Use Variables for Level / Adjust (dB / %)",
		default: false,
	}
    const channelPresetOptions = {
		label: "Channel preset",
		type: "dropdown" as const,
		id: "channel_preset",
		choices: channelPresets,
		default: "",
	}

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
                const currentLevel = this.getChannelLevel(channel) ?? 0
                this.setChannelLevel(channel, 0, <number>action.options.transition).then(() => {
                    this.client.mute(channel)
                    return this.setChannelLevel(channel, currentLevel)
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
                const currentLevel = this.getChannelLevel(channel) ?? 0

                this.setChannelLevel(channel, 0, 0).then(() => {
                    this.client.unmute(channel)
                    return this.setChannelLevel(channel, currentLevel, <number>action.options.transition)
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
        },
		setInputRouting: {
            name: 'Set input routing mode',
            options: [
                lineChannelSelectOptions,
                inputRoutingOptions
            ],
			callback: withChannelSelector((action, context, channel) => {
                this.setInputRoutingMode(channel, <InputRoutingMode>action.options.inputsrc)
            }),
        },
		setGate: {
			name: "Set Gate",
			options: [
				gateChannelSelectOptions,
				generateOnOffToggleOption("state", "Gate", true, "toggle"),
			],
			callback: withChannelSelector((action, context, channel) => {
				const path = `${getChannelStatePath(channel)}.gate.on`
				if (action.options.state === "toggle") {
					const current = this.getBooleanState(path)
					if (current === null) return
					this.setBooleanState(path, !current)
					return
				}

				this.setBooleanState(path, action.options.state === "on")
			}),
		},
		setEq: {
			name: "Set EQ",
			options: [
				eqCompChannelSelectOptions,
				generateOnOffToggleOption("state", "EQ", true, "toggle"),
			],
			callback: withChannelSelector((action, context, channel) => {
				const path = `${getChannelStatePath(channel)}.eq.eqallon`
				if (action.options.state === "toggle") {
					const current = this.getBooleanState(path)
					if (current === null) return
					this.setBooleanState(path, !current)
					return
				}

				this.setBooleanState(path, action.options.state === "on")
			}),
		},
		setComp: {
			name: "Set Compressor",
			options: [
				eqCompChannelSelectOptions,
				generateOnOffToggleOption("state", "Compressor", true, "toggle"),
			],
			callback: withChannelSelector((action, context, channel) => {
				const path = `${getChannelStatePath(channel)}.comp.on`
				if (action.options.state === "toggle") {
					const current = this.getBooleanState(path)
					if (current === null) return
					this.setBooleanState(path, !current)
					return
				}

				this.setBooleanState(path, action.options.state === "on")
			}),
		},
		setLimiter: {
			name: "Set Limiter",
			options: [
				limiterChannelSelectOptions,
				generateOnOffToggleOption("state", "Limiter", true, "toggle"),
			],
			callback: withChannelSelector((action, context, channel) => {
				const path = `${getChannelStatePath(channel)}.limit.limiteron`
				if (action.options.state === "toggle") {
					const current = this.getBooleanState(path)
					if (current === null) return
					this.setBooleanState(path, !current)
					return
				}

				this.setBooleanState(path, action.options.state === "on")
			}),
		},
		setHpf: {
			name: "Set HPF",
			options: [
				hpfChannelSelectOptions,
				generateHpfOption(),
			],
			callback: withChannelSelector((action, context, channel) => {
				const normalized = this.encodeHpfFrequency(Number(action.options.hpf))
				const value = Buffer.allocUnsafe(4)
				value.writeFloatLE(normalized)
				;(this.client as any)._sendPacket(
					MessageCode.ParamValue,
					Buffer.concat([
						Buffer.from(`${getChannelStatePath(channel).replaceAll(".", "/")}/filter/hpf\x00\x00\x00`),
						value,
					]),
				)
			}),
		},
		setLevel: {
			name: "Set Level",
			options: [
				channelSelectOptions,
				mixSelectOptions,
				usePercentageOption,
				useVariablesOption,
				{
					...generateLinearLevelOption("level", "Level (%)", 72),
					isVisibleExpression: '$(options:use_percentage) == true && $(options:level_use_variables) != true',
				},
				{
					label: "Level (dB)",
					type: "number",
					id: "db_level",
					default: 0,
					min: -84,
					max: 10,
					range: true,
					isVisibleExpression: '$(options:use_percentage) != true && $(options:level_use_variables) != true',
				},
				{
					label: "Level / Adjust Variable",
					type: "textinput",
					id: "level_variables",
					default: "",
					useVariables: true,
					isVisibleExpression: '$(options:level_use_variables) == true',
				},
				generateTransitionPeriodOption(0),
			],
			callback: withChannelSelector(async (action, context, channel) => {
				const useVariables = action.options.level_use_variables === true
				const rawValue = useVariables
					? action.options.level_variables
					: action.options.use_percentage === true
						? action.options.level
						: action.options.db_level
				const resolved = await resolveNumericOption(context, rawValue, useVariables)
				if (resolved === null) return

				const targetLevel = action.options.use_percentage === true
					? Math.max(0, Math.min(100, resolved))
					: this.dbToLinearLevel(resolved)

				return this.setChannelLevel(channel, targetLevel, Number(action.options.transition))
			}),
		},
		adjustLevel: {
			name: "Adjust Level",
			options: [
				channelSelectOptions,
				mixSelectOptions,
				usePercentageOption,
				{
					...useVariablesOption,
					id: "delta_use_variables",
				},
				{
					...generateSignedLevelDeltaOption("delta", "Adjust (%)", 5),
					isVisibleExpression: '$(options:use_percentage) == true && $(options:delta_use_variables) != true',
				},
				{
					label: "Adjust (dB)",
					type: "number",
					id: "db_delta",
					default: 3,
					min: -94,
					max: 94,
					range: true,
					isVisibleExpression: '$(options:use_percentage) != true && $(options:delta_use_variables) != true',
				},
				{
					label: "Level / Adjust Variable",
					type: "textinput",
					id: "delta_variables",
					default: "",
					useVariables: true,
					isVisibleExpression: '$(options:delta_use_variables) == true',
				},
				generateTransitionPeriodOption(0),
			],
			callback: withChannelSelector(async (action, context, channel) => {
				const useVariables = action.options.delta_use_variables === true
				const rawValue = useVariables
					? action.options.delta_variables
					: action.options.use_percentage === true
						? action.options.delta
						: action.options.db_delta
				const resolved = await resolveNumericOption(context, rawValue, useVariables)
				if (resolved === null) return

				if (action.options.use_percentage === true) {
					const currentLevel = this.getChannelLevel(channel) ?? 0
					const targetLevel = Math.max(0, Math.min(100, currentLevel + resolved))
					return this.setChannelLevel(channel, targetLevel, Number(action.options.transition))
				}

				const currentDb = this.linearLevelToDb(this.getChannelLevel(channel)) ?? -84
				const targetDb = Math.max(-84, Math.min(10, currentDb + resolved))
				return this.setChannelLevel(channel, this.dbToLinearLevel(targetDb), Number(action.options.transition))
			}),
		},
		setSolo: {
			name: "Set Solo",
			options: [
				channelSelectOptions,
				generateOnOffToggleOption("state", "Solo"),
			],
			callback: withChannelSelector((action, context, channel) => {
				switch (action.options.state) {
					case "on":
						return this.client.setSolo(channel, true)
					case "off":
						return this.client.setSolo(channel, false)
					default:
						return this.client.toggleSolo(channel)
				}
			}),
		},
		toggleSolo: {
			name: "Toggle Solo",
			options: [
				channelSelectOptions,
			],
			callback: withChannelSelector((action, context, channel) => {
				return this.client.toggleSolo(channel)
			}),
		},
		setPan: {
			name: "Set Pan",
			options: [
				panChannelSelectOptions,
				mixSelectOptions,
				generatePanOption(),
			],
			callback: withChannelSelector((action, context, channel) => {
				this.client.setPan(channel, Math.max(0, Math.min(100, Number(action.options.pan))))
			}),
		},
		setLink: {
			name: "Set Stereo Link",
			options: [
				linkChannelSelectOptions,
				generateOnOffToggleOption("state", "Link", false, "on"),
			],
			callback: withChannelSelector((action, context, channel) => {
				this.client.setLink(channel, action.options.state === "on")
			}),
		},
		recallChannelPreset: {
			name: "Recall Channel Preset",
			options: [
				channelSelectOptions,
				channelPresetOptions,
			],
			callback: withChannelSelector((action, context, channel) => {
				if (!action.options.channel_preset) return
				this.client.recallChannelStrip(channel, String(action.options.channel_preset))
			}),
		},
		setMuteGroup: {
			name: "Set Mute Group",
			options: [
				{
					label: "Mute group",
					type: "dropdown",
					id: "group",
					default: "1",
					choices: Array.from({ length: 8 }, (_, index) => ({
						id: `${index + 1}`,
						label: `Mute Group ${index + 1}`,
					})),
				},
				generateOnOffToggleOption("state", "State"),
			],
			callback: async (action) => {
				const group = Number(action.options.group)
				if (!Number.isInteger(group) || group < 1 || group > 8) return
				this.setMuteGroupState(group, action.options.state as "on" | "off" | "toggle")
			},
		},
		setColour: {
			name: "Set Channel Color",
			options: [
				colourChannelSelectOptions,
				colourPickerOption,
			],
			callback: withChannelSelector((action, context, channel) => {
				const colorValue = action.options.color
				let hex = ""

				if (typeof colorValue === "number" && Number.isFinite(colorValue)) {
					hex = (colorValue >>> 0).toString(16).padStart(8, "0").slice(-6)
				} else if (typeof colorValue === "string") {
					const trimmed = colorValue.trim()
					if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) {
						hex = trimmed.slice(1)
					} else if (/^[0-9a-fA-F]{6}$/.test(trimmed)) {
						hex = trimmed
					}
				}

				if (!hex) {
					this.log("warn", `Set Channel Color did nothing: unsupported color value "${String(colorValue)}".`)
					return
				}

				this.client.setColour(channel, hex.toLowerCase())
			}),
		},
		setIcon: {
			name: "Set Channel Icon",
			description: "Set the icon displayed for a channel-like strip",
			options: [
				iconChannelSelectOptions,
				{
					label: "Icon",
					type: "dropdown",
					id: "icon",
					default: "",
					choices: CHANNEL_ICON_CHOICES,
				},
			],
			callback: withChannelSelector((action, context, channel) => {
				const icon = String(action.options.icon || "")
				this.setStringState(`${getChannelStatePath(channel)}.iconid`, icon)
			}),
		},
    } satisfies CompanionActionDefinitions

    return actions
}
