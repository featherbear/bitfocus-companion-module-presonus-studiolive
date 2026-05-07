import type { CompanionPresetDefinitions, DropdownChoice } from "@companion-module/base";
import { combineRgb } from "@companion-module/base";
import type { GeneratedChannelActions } from "./actions/channels";
import type { FeedbackDefinitions } from "./feedbacks";
import type Instance from "./index";

export default function generatePreset(this: Instance, channels: DropdownChoice[], mixes: DropdownChoice[]) {
	const presets: CompanionPresetDefinitions & {
		[id: string]: {
			feedbacks: { feedbackId: keyof FeedbackDefinitions }[];
			steps: {
				down: { actionId: keyof GeneratedChannelActions }[];
				up: { actionId: keyof GeneratedChannelActions }[];
			}[];
		};
	} = {};

	const getChannelDisplayVariable = (channel: DropdownChoice): string => {
		if (!channel.id) return channel.label;

		try {
			const [type, channelNumber, mixType, mixNumber] = JSON.parse(String(channel.id));
			const suffix = mixType ? `${String(mixType).toLowerCase()}${Number(mixNumber)}` : "";
			return `$(self:console_${String(type).toLowerCase()}${Number(channelNumber)}${suffix}_display_name)`;
		} catch {
			return channel.label;
		}
	};

	for (const channel of channels.slice(1)) {
		const channelText = getChannelDisplayVariable(channel);

		presets["toggle_mute-" + channel.id] = {
			type: "button",
			category: "Mute / Unmute Channel",
			name: `Mute ${channel.label}`,
			feedbacks: [
				{
					feedbackId: "ChannelIconImage",
					options: {
						channel: channel.id,
					},
				},
				{
					feedbackId: "ChannelMute",
					options: {
						channel: channel.id,
						mix: "",
					},
					style: {
						color: combineRgb(0, 0, 0),
						bgcolor: combineRgb(255, 0, 0),
					},
				},
			],
			steps: [
				{
					down: [
						{
							actionId: "toggleMute",
							options: {
								channel: channel.id,
								mix: "",
							},
						},
					],
					up: [],
				},
			],
			style: {
				text: `Mute ${channelText}`,
				bgcolor: combineRgb(0, 0, 0),
				color: combineRgb(255, 255, 255),
				size: "18",
			},
		};

		presets["toggle_solo-" + channel.id] = {
			type: "button",
			category: "Solo / Unsolo Channel",
			name: `Solo ${channel.label}`,
			feedbacks: [
				{
					feedbackId: "ChannelIconImage",
					options: {
						channel: channel.id,
					},
				},
				{
					feedbackId: "ChannelSolo",
					options: {
						channel: channel.id,
						state: "on",
					},
					style: {
						color: combineRgb(0, 0, 0),
						bgcolor: combineRgb(255, 255, 0),
					},
				},
			],
			steps: [
				{
					down: [
						{
							actionId: "toggleSolo",
							options: {
								channel: channel.id,
							},
						},
					],
					up: [],
				},
			],
			style: {
				text: `Solo ${channelText}`,
				bgcolor: combineRgb(0, 0, 0),
				color: combineRgb(255, 255, 255),
				size: "18",
			},
		};
	}

	return presets;
}
