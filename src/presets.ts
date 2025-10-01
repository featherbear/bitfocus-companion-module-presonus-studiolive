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

	for (const channel of channels.slice(1)) {
		presets["toggle_mute-" + channel.id] = {
			type: "button",
			category: "Mute / Unmute Channel",
			name: "",
			feedbacks: [
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
				text: channel.label,
				bgcolor: combineRgb(0, 0, 0),
				color: combineRgb(255, 255, 255),
				size: "18",
			},
		};
	}

	return presets;
}
