import { MessageCode, Client as StudioLiveAPI, type ChannelSelector } from "presonus-studiolive-api";
import generateMixes from "./mixes";

import { FunctionDebouncer } from "./util/FunctionDebouncer";

import type {
	CompanionInputFieldStaticText,
	CompanionVariableDefinition,
	SomeCompanionConfigField,
} from "@companion-module/base";
import { runEntrypoint, InstanceBase, InstanceStatus, Regex } from "@companion-module/base";

import DEFAULTS from "./defaults";
import type ConfigType from "./types/Config";

import generateActions_channels from "./actions/channels";
import generateActions_projectScenes from "./actions/projectScenes";

import generateFeedback from "./feedbacks";
import generatePreset from "./presets";
import generateChannelSelectEntries from "./util/channelUtils";
import {
	decodeInputRoutingMode,
	encodeInputRoutingMode,
	generateInputRoutingVariableDefinitions,
	getInputRoutingStateKey,
	type InputRoutingMode,
} from "./util/inputRouting";
import { customAlphabet } from "nanoid/non-secure";

const mid = customAlphabet("ABCDEFGH", 10);

class Instance extends InstanceBase<ConfigType> {
	client: StudioLiveAPI;
	consoleStateVariables: Array<CompanionVariableDefinition & { resolver: string; fallback: any }>;
	inputRoutingVariableDefinitions: CompanionVariableDefinition[];
	intervals: NodeJS.Timeout[];

	constructor(internal) {
		super(internal);
		this.inputRoutingVariableDefinitions = [];
		this.intervals = [];
	}

	checkFeedbacks(...feedbackTypes: (keyof ReturnType<typeof generateFeedback>)[]): void {
		super.checkFeedbacks(...feedbackTypes);
	}

	checkAllFeedbacks(): void {
		this.checkFeedbacks("ChannelMute");
		this.checkFeedbacks("ChannelSelect");
		this.checkFeedbacks("ChannelInputRouting");
		this.checkFeedbacks("ChannelColour");
	}

	#toFloat(value: number): Buffer {
		const buffer = Buffer.allocUnsafe(4);
		buffer.writeFloatLE(value);
		return buffer;
	}

	#getSelectedChannelName(): string {
		const lineCount = this.client?.channelCounts?.LINE ?? 0;
		if (lineCount <= 0) return "";

		for (let i = 1; i <= lineCount; i++) {
			const channelPrefix = `line.ch${i}`;
			if (!this.client.state.get(`${channelPrefix}.select`)) continue;

			return (
				this.client.state.get(`${channelPrefix}.username`) ||
				this.client.state.get(`${channelPrefix}.name`) ||
				this.client.state.get(`${channelPrefix}.chnum`) ||
				""
			);
		}

		return "";
	}

	#getInputRoutingMode(channel: ChannelSelector): InputRoutingMode | null {
		const stateKey = getInputRoutingStateKey(channel);
		if (!stateKey) return null;

		return decodeInputRoutingMode(this.client.state.get(stateKey));
	}

	setInputRoutingMode(channel: ChannelSelector, mode: InputRoutingMode): void {
		const stateKey = getInputRoutingStateKey(channel);
		if (!stateKey) return;

		const packetPath = stateKey.replaceAll(".", "/");
		(this.client as any)._sendPacket(
			MessageCode.ParamValue,
			Buffer.concat([Buffer.from(`${packetPath}\x00\x00\x00`), this.#toFloat(encodeInputRoutingMode(mode))]),
		);
	}

	#getConsoleVariableValues() {
		const values: Record<string, any> = {
			console_model: this.client.state.get("global.mixer_name"),
			console_version: this.client.state.get("global.mixer_version"),
			console_serial: this.client.state.get("global.mixer_serial"),
			console_sel_channel: this.#getSelectedChannelName(),
		};

		for (const variable of this.consoleStateVariables) {
			values[variable.variableId] = this.client.state.get(variable.resolver, variable.fallback);
		}

		const lineCount = this.client?.channelCounts?.LINE ?? 0;
		for (let i = 1; i <= lineCount; i++) {
			values[`console_ch${i}_inputsrc`] = this.#getInputRoutingMode({ type: "LINE", channel: i } as ChannelSelector) ?? "";
		}

		return values;
	}

	async destroy() {
		return this.#__disconnect();
	}

	async configUpdated(config: ConfigType) {
		return this.init(config, false);
	}

	/**
	 * Clear any existing intervals
	 */
	#__resetIntervals() {
		for (const id of this.intervals) {
			clearInterval(id);
		}
		this.intervals = [];
	}

	#__disconnect() {
		this.#__resetIntervals();
		this.client?.close?.();
	}

	async reconnect(config: ConfigType) {
		this.#__disconnect();

		if (!config.host || !config.port) {
			this.updateStatus(InstanceStatus.BadConfig, "Console address not set");
			return;
		}

		/**
		 * Create instance
		 */
		this.client = new StudioLiveAPI(
			{
				host: config.host,
				port: config.port,
			},
			{
				autoreconnect: true,
			},
		);

		/**
		 * Register listeners
		 */
		this.client.on(MessageCode.ParamValue, () => {
			this.checkFeedbacks("ChannelMute");
		});

		this.client.on(MessageCode.ParamChars, () => {
			this.checkFeedbacks("ChannelColour");
		});

		this.client.on(MessageCode.ZLIB, () => {
			this.checkFeedbacks("ChannelSelect");
			this.checkFeedbacks("ChannelInputRouting");
		});

		/**
		 * Connect
		 */
		this.updateStatus(InstanceStatus.Connecting);
		await this.client.connect({
			clientDescription: config.name, // Name of the client
			clientIdentifier: `bitfocus:${mid}`, // ID of the client
		});

		/**
		 * Update Companion with console states
		 */
		this.setVariableValues(this.#getConsoleVariableValues());

		const channels = generateChannelSelectEntries(this.client.channelCounts);
		const mixes = generateMixes(this.client.channelCounts);
		this.inputRoutingVariableDefinitions = generateInputRoutingVariableDefinitions(this.client.channelCounts.LINE ?? 0);
		this.setVariableDefinitions([
			...DEFAULTS.consoleStateVariables,
			...this.inputRoutingVariableDefinitions,
			...this.consoleStateVariables,
		]);

		const actions_channels = generateActions_channels.call(this, channels, mixes);
		this.setActionDefinitions({ ...actions_channels });

		this.setFeedbackDefinitions(generateFeedback.call(this, channels, mixes));
		this.setPresetDefinitions(generatePreset.call(this, channels, mixes));

		this.checkAllFeedbacks();

		this.intervals.push(
			setInterval(() => {
				this.setVariableValues(this.#getConsoleVariableValues());
			}, 1000),
		);

		/**
		 * Initialise scene debouncer
		 */
		{
			const SceneDebouncer = new FunctionDebouncer(200, true, async () => {
				const projects = await this.client.getProjects(true);
				const list: {
					projectName: string;
					projectTitle: string;
					sceneName?: string;
					sceneTitle?: string;
				}[] = projects.flatMap((project) => [
					{
						projectName: project.name,
						projectTitle: project.title,
					},
					...project.scenes.map((scene) => ({
						projectName: project.name,
						projectTitle: project.title,
						sceneName: scene.name,
						sceneTitle: scene.title,
					})),
				]);

				const actions_projectScenes = generateActions_projectScenes.call(this, [
					{ id: "", label: "" },
					...list.map((map) => ({
						id: JSON.stringify([map.projectName, map.sceneName].filter((v) => v)),
						label: [map.projectTitle, map.sceneTitle].filter((v) => v).join(" - "),
					})),
				]);

				this.setActionDefinitions({
					...actions_channels,
					...actions_projectScenes,
				});
			});

			SceneDebouncer.touchImmediate();
			this.client.on(MessageCode.JSON, (json) => {
				if (json.id === "RenamedPreset" || json.id === "StoredPreset") SceneDebouncer.touch();
			});
		}

		this.updateStatus(InstanceStatus.Ok);
	}

	async init(config: ConfigType, isFirstInit: boolean): Promise<void> {
		this.#__disconnect();

		if (isFirstInit) {
			this.setActionDefinitions(generateActions_channels.call(this, DEFAULTS.dummyChannels, DEFAULTS.dummyMixes));
			this.setFeedbackDefinitions(generateFeedback.call(this, DEFAULTS.dummyChannels, DEFAULTS.dummyMixes));
		}

		/**
		 * Console state variables
		 */
		{
			this.consoleStateVariables = [];
			this.inputRoutingVariableDefinitions = [];

			const consoleStateVariables = config.customVariables?.split(";");
			if (consoleStateVariables?.length > 0) {
				consoleStateVariables.map((s) => {
					const [key, value, fallback] = /^(.+?)=(.+?)(?:\|(.+?))?$/.exec(s)?.slice(1) ?? [];
					if (!key || !value) return;
					this.consoleStateVariables.push({
						variableId: key,
						name: "Custom: " + key,
						resolver: value,
						fallback,
					});
				});
			}

			this.setVariableDefinitions([
				...DEFAULTS.consoleStateVariables,
				...this.inputRoutingVariableDefinitions,
				...this.consoleStateVariables,
			]);
		}

		try {
			await this.reconnect(config);
		} catch (e) {
			this.updateStatus(InstanceStatus.UnknownError, e.message);
		}
	}

	getConfigFields(): SomeCompanionConfigField[] {
		const fields:
			| {
					[k in keyof ConfigType]: Omit<SomeCompanionConfigField, "id"> & { default?; regex? };
			  }
			| {
					[K: string]: Omit<CompanionInputFieldStaticText, "id">;
			  } = {
			info: {
				type: "static-text",
				label: "Information",
				value: "This module communicates to a PreSonus StudioLive III console",
			},
			host: {
				type: "textinput",
				label: "StudioLive Console IP",
				width: 6,
				default: "",
				regex: Regex.IP,
			},
			port: {
				type: "textinput",
				label: "StudioLive Console Port",
				width: 6,
				default: 53000,
				regex: Regex.PORT,
			},
			name: {
				type: "textinput",
				label: "Client name",
				width: 6,
				default: "Companion",
			},
			info2: {
				type: "static-text",
				label: "Custom Variables",
				value: "Semi-colon separated list of `variable=resolver|default` entries. `|default` is optional",
			},
			customVariables: {
				type: "textinput",
				label: "",
				default: "current_scene=presets.loaded_scene_title;current_project=presets.loaded_project_title",
				width: 12,
			},
		};

		return Object.entries(fields).map(([id, obj]) => ({ ...obj, id }));
	}
}

export default Instance;

runEntrypoint(Instance, []);
