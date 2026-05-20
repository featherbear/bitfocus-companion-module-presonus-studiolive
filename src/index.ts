import { MessageCode, Client as StudioLiveAPI, type ChannelCount, type ChannelSelector } from "presonus-studiolive-api";
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
import generateChannelSelectEntries, {
	getChannelPacketPath,
	getChannelStatePath,
	supportsChannelColour,
	supportsChannelComp,
	supportsChannelEq,
	supportsChannelGate,
	supportsChannelHpf,
	supportsChannelLink,
	supportsChannelLimiter,
	supportsChannelPan,
} from "./util/channelUtils";
import {
	decodeInputRoutingMode,
	encodeInputRoutingMode,
	generateInputRoutingVariableDefinitions,
	getInputRoutingStateKey,
	type InputRoutingMode,
} from "./util/inputRouting";
import type { RecallFilterDefinition } from "./util/recallFilters";
import { customAlphabet } from "nanoid/non-secure";

const mid = customAlphabet("ABCDEFGH", 10);

class Instance extends InstanceBase<ConfigType> {
	client: StudioLiveAPI;
	consoleStateVariables: Array<CompanionVariableDefinition & { resolver: string; fallback: any }>;
	inputRoutingVariableDefinitions: CompanionVariableDefinition[];
	projectSceneCache: Array<{
		projectName: string;
		projectTitle: string;
		scenes: Array<{
			sceneName: string;
			sceneTitle: string;
		}>;
	}>;
	channelPresetCache: Array<{
		name: string;
		title: string;
	}>;
	intervals: NodeJS.Timeout[];
	levelTransitionTimers: Map<string, NodeJS.Timeout>;

	constructor(internal) {
		super(internal);
		this.inputRoutingVariableDefinitions = [];
		this.projectSceneCache = [];
		this.channelPresetCache = [];
		this.intervals = [];
		this.levelTransitionTimers = new Map();
	}

	checkFeedbacks(...feedbackTypes: (keyof ReturnType<typeof generateFeedback>)[]): void {
		super.checkFeedbacks(...feedbackTypes);
	}

	checkAllFeedbacks(): void {
		this.checkFeedbacks("CurrentProjectOrScene");
		this.checkFeedbacks("ProjectFilterStatus");
		this.checkFeedbacks("SceneFilterStatus");
		this.checkFeedbacks("ChannelMute");
		this.checkFeedbacks("ChannelSolo");
		this.checkFeedbacks("ChannelGate");
		this.checkFeedbacks("ChannelEq");
		this.checkFeedbacks("ChannelComp");
		this.checkFeedbacks("ChannelLimiter");
		this.checkFeedbacks("ChannelSelect");
		this.checkFeedbacks("ChannelInputRouting");
		this.checkFeedbacks("ChannelColour");
		this.checkFeedbacks("ChannelIconImage");
		this.checkFeedbacks("ChannelLink");
		this.checkFeedbacks("ChannelLevel");
		this.checkFeedbacks("ChannelPan");
		this.checkFeedbacks("MuteGroupState");
	}

	#toFloat(value: number): Buffer {
		const buffer = Buffer.allocUnsafe(4);
		buffer.writeFloatLE(value);
		return buffer;
	}

	#getBooleanState(path: string): boolean | null {
		const value = this.client.state.get(path);
		if (Buffer.isBuffer(value)) {
			return value.readFloatLE() >= 0.5;
		}
		if (typeof value === "number") {
			return value >= 0.5;
		}
		if (typeof value === "boolean") {
			return value;
		}
		return null;
	}

	getBooleanState(path: string): boolean | null {
		return this.#getBooleanState(path);
	}

	getNumericState(path: string): number | null {
		const value = this.client.state.get(path);
		if (Buffer.isBuffer(value)) {
			return value.readFloatLE();
		}
		if (typeof value === "number") {
			return value;
		}
		if (typeof value === "boolean") {
			return value ? 1 : 0;
		}
		return null;
	}

	normaliseLevelValue(value: number | null): number | null {
		if (value === null || Number.isNaN(value)) return null;
		return value <= 1 ? value * 100 : value;
	}

	dbToLinearLevel(db: number): number {
		const clamped = Math.max(-84, Math.min(10, db));
		if (clamped <= -84) return 0;
		if (clamped >= 10) return 100;

		return Math.max(
			0,
			Math.min(
				100,
				Math.trunc(72.5204177782 + 2.473473992 * clamped + 0.026567557 * clamped ** 2 + 0.0000880866 * clamped ** 3),
			),
		);
	}

	linearLevelToDb(level: number | null): number | null {
		if (level === null || Number.isNaN(level)) return null;
		const clamped = Math.max(0, Math.min(100, level));
		if (clamped <= 0) return -84;
		if (clamped >= 100) return 10;

		let bestDb = -84;
		let bestDiff = Infinity;

		for (let db = -84; db <= 10; db += 0.1) {
			const candidate = this.dbToLinearLevel(db);
			const diff = Math.abs(candidate - clamped);
			if (diff < bestDiff) {
				bestDiff = diff;
				bestDb = db;
			}
		}

		return Math.round(bestDb * 10) / 10;
	}

	encodeHpfFrequency(hz: number): number {
		if (hz <= 20) return 0;

		const minHz = 24;
		const maxHz = 1000;
		const clamped = Math.max(minHz, Math.min(maxHz, hz));
		return Math.log(clamped / minHz) / Math.log(maxHz / minHz);
	}

	decodeHpfFrequency(value: number | null): string {
		if (value === null || Number.isNaN(value) || value <= 0) return "Off";

		const minHz = 24;
		const maxHz = 1000;
		const normalized = Math.max(0, Math.min(1, value));
		const hz = minHz * Math.pow(maxHz / minHz, normalized);
		return `${Math.round(hz)}`;
	}

	setBooleanState(path: string, enabled: boolean): void {
		const packetPath = path.replaceAll(".", "/");
		(this.client as any)._sendPacket(
			MessageCode.ParamValue,
			Buffer.concat([Buffer.from(`${packetPath}\x00\x00\x00`), this.#toFloat(enabled ? 1 : 0)]),
		);
	}

	setStringState(path: string, value: string): void {
		const packetPath = path.replaceAll(".", "/");
		(this.client as any)._sendPacket(
			MessageCode.ParamString,
			Buffer.concat([Buffer.from(`${packetPath}\x00\x00\x00${value}`), Buffer.from([0x00])]),
		);
		this.client.state.set(path, value);
	}

	getAllChannelSelectors(): ChannelSelector[] {
		const channels = this.client?.channelCounts;
		if (!channels) return [];

		return Object.entries(channels).flatMap(([type, count]) => {
			const selectors: ChannelSelector[] = [];
			for (let channel = 1; channel <= count; channel++) {
				selectors.push({ type: type as ChannelSelector["type"], channel });
			}
			return selectors;
		});
	}

	getChannelVariableBase(selector: ChannelSelector): string {
		return `${selector.type.toLowerCase()}${selector.channel}`;
	}

	getChannelName(selector: ChannelSelector): string {
		const channelPath = getChannelStatePath(selector);
		return (
			this.client.state.get(`${channelPath}.username`) ||
			this.client.state.get(`${channelPath}.name`) ||
			this.client.state.get(`${channelPath}.chnum`) ||
			""
		);
	}

	getChannelLink(selector: ChannelSelector): boolean | null {
		if (!supportsChannelLink(selector.type as typeof selector.type)) return null;
		return this.#getBooleanState(`${getChannelStatePath(selector)}.link`);
	}

	getChannelLevel(selector: ChannelSelector): number | null {
		const directLevel = this.client.getLevel(selector);
		if (typeof directLevel === "number") return this.normaliseLevelValue(directLevel);
		if (Buffer.isBuffer(directLevel)) return this.normaliseLevelValue(directLevel.readFloatLE());

		const packetPath = getChannelPacketPath(selector);
		return this.normaliseLevelValue(
			this.getNumericState(packetPath) ?? this.getNumericState(packetPath.replaceAll("/", ".")),
		);
	}

	getChannelPan(selector: ChannelSelector): number | null {
		if (!supportsChannelPan(selector.type as typeof selector.type)) return null;
		const channelPath = getChannelStatePath(selector);
		const link = this.getChannelLink(selector);
		return this.getNumericState(`${channelPath}.${link ? "stereopan" : "pan"}`);
	}

	getChannelColourHex(selector: ChannelSelector): string {
		if (!supportsChannelColour(selector.type as typeof selector.type)) return "";

		const raw = this.client.getColour(selector);
		if (typeof raw === "string") return raw;
		if (raw === null || raw === undefined) return "";

		if (typeof raw === "object") {
			for (const symbol of Object.getOwnPropertySymbols(raw)) {
				const value = raw[symbol];
				if (typeof value === "string") return value;
				if (value === null || value === undefined) return "";
			}
		}

		return "";
	}

	getChannelGateState(selector: ChannelSelector): boolean | null {
		if (!supportsChannelGate(selector.type as typeof selector.type)) return null;
		return this.getBooleanState(`${getChannelStatePath(selector)}.gate.on`);
	}

	getChannelEqState(selector: ChannelSelector): boolean | null {
		if (!supportsChannelEq(selector.type as typeof selector.type)) return null;
		return this.getBooleanState(`${getChannelStatePath(selector)}.eq.eqallon`);
	}

	getChannelCompState(selector: ChannelSelector): boolean | null {
		if (!supportsChannelComp(selector.type as typeof selector.type)) return null;
		return this.getBooleanState(`${getChannelStatePath(selector)}.comp.on`);
	}

	getChannelLimiterState(selector: ChannelSelector): boolean | null {
		if (!supportsChannelLimiter(selector.type as typeof selector.type)) return null;
		return this.getBooleanState(`${getChannelStatePath(selector)}.limit.limiteron`);
	}

	getChannelHpfValue(selector: ChannelSelector): string {
		if (!supportsChannelHpf(selector.type as typeof selector.type)) return "";
		return this.decodeHpfFrequency(this.getNumericState(`${getChannelStatePath(selector)}.filter.hpf`));
	}

	setChannelLevel(selector: ChannelSelector, targetLevel: number, duration = 0): Promise<null> {
		const level = Math.max(0, Math.min(100, targetLevel));
		const packetPath = getChannelPacketPath(selector);
		const existingTimer = this.levelTransitionTimers.get(packetPath);
		if (existingTimer) {
			clearTimeout(existingTimer);
			this.levelTransitionTimers.delete(packetPath);
		}

		if (!duration) {
			return this.client.setChannelVolumeLinear(selector, level, 0);
		}

		const currentLevel = this.getChannelLevel(selector);
		if (currentLevel === null) {
			return this.client.setChannelVolumeLinear(selector, level, 0);
		}

		if (Math.abs(currentLevel - level) < 0.001) {
			return Promise.resolve(null);
		}

		const sendLevel = (nextLevel: number) => {
			(this.client as any)._sendPacket(
				MessageCode.ParamValue,
				Buffer.concat([Buffer.from(`${packetPath}\x00\x00\x00`), this.#toFloat(nextLevel / 100)]),
			);
			this.client.state.set(packetPath, nextLevel / 100);
		};

		const stepMs = 40;
		const steps = Math.max(1, Math.ceil(duration / stepMs));

		return new Promise((resolve) => {
			let step = 0;

			const tick = () => {
				step += 1;
				const progress = step / steps;
				const nextLevel = currentLevel + (level - currentLevel) * progress;
				sendLevel(step >= steps ? level : nextLevel);

				if (step >= steps) {
					this.levelTransitionTimers.delete(packetPath);
					resolve(null);
					return;
				}

				const timer = setTimeout(tick, stepMs);
				this.levelTransitionTimers.set(packetPath, timer);
			};

			tick();
		});
	}

	getMuteGroupLabel(group: number): string {
		return this.client.state.get(`mutegroup.mutegroup${group}username`) || `Mute Group ${group}`;
	}

	getMuteGroupState(group: number): boolean | null {
		return this.#getBooleanState(`mutegroup.mutegroup${group}`);
	}

	setMuteGroupState(group: number, mode: "on" | "off" | "toggle"): void {
		const current = this.getMuteGroupState(group);
		if (mode === "toggle") {
			if (current === null) return;
			this.setBooleanState(`mutegroup.mutegroup${group}`, !current);
			return;
		}

		this.setBooleanState(`mutegroup.mutegroup${group}`, mode === "on");
	}

	getRecallFilterState(filter: RecallFilterDefinition): boolean | null {
		return this.#getBooleanState(`${filter.group}.${filter.key}`);
	}

	setRecallFilterState(filter: RecallFilterDefinition, enabled: boolean): void {
		this.setBooleanState(`${filter.group}.${filter.key}`, enabled);
	}

	getRecallFilterSnapshot(filters: RecallFilterDefinition[]): Record<string, boolean> {
		return filters.reduce<Record<string, boolean>>((snapshot, filter) => {
			const current = this.getRecallFilterState(filter);
			if (current !== null) {
				snapshot[`${filter.group}.${filter.key}`] = current;
			}
			return snapshot;
		}, {});
	}

	restoreRecallFilterSnapshot(snapshot: Record<string, boolean>): void {
		for (const [path, value] of Object.entries(snapshot)) {
			this.setBooleanState(path, value);
		}
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

	#getAdjacentScene(direction: -1 | 1): { projectName: string; sceneName: string; sceneTitle: string } | null {
		const currentProject = this.client?.currentProject;
		const currentScene = this.client?.currentScene;
		if (!currentProject || !currentScene) return null;

		const project = this.projectSceneCache.find((project) => project.projectName === currentProject);
		if (!project) return null;

		const currentIndex = project.scenes.findIndex((scene) => scene.sceneName === currentScene);
		if (currentIndex < 0) return null;

		const adjacentScene = project.scenes[currentIndex + direction];
		if (!adjacentScene) return null;

		return {
			projectName: project.projectName,
			sceneName: adjacentScene.sceneName,
			sceneTitle: adjacentScene.sceneTitle,
		};
	}

	recallAdjacentScene(direction: -1 | 1): boolean {
		const adjacentScene = this.#getAdjacentScene(direction);
		if (!adjacentScene) return false;

		this.client.recallProjectScene(adjacentScene.projectName, adjacentScene.sceneName);
		return true;
	}

	buildConsoleVariableDefinitions(channelCounts: ChannelCount): CompanionVariableDefinition[] {
		const perChannelVariables = this.getAllChannelSelectors().flatMap((selector) => {
			const base = this.getChannelVariableBase(selector);
			const variables: CompanionVariableDefinition[] = [
				{ variableId: `console_${base}_name`, name: `${base} Name` },
				{ variableId: `console_${base}_display_name`, name: `${base} Display Name` },
				{ variableId: `console_${base}_mute`, name: `${base} Mute` },
				{ variableId: `console_${base}_solo`, name: `${base} Solo` },
				{ variableId: `console_${base}_level`, name: `${base} Level` },
			];

			if (supportsChannelGate(selector.type as typeof selector.type)) {
				variables.push({ variableId: `console_${base}_gate`, name: `${base} Gate` });
			}
			if (supportsChannelEq(selector.type as typeof selector.type)) {
				variables.push({ variableId: `console_${base}_eq`, name: `${base} EQ` });
			}
			if (supportsChannelComp(selector.type as typeof selector.type)) {
				variables.push({ variableId: `console_${base}_comp`, name: `${base} Compressor` });
			}
			if (supportsChannelLimiter(selector.type as typeof selector.type)) {
				variables.push({ variableId: `console_${base}_limiter`, name: `${base} Limiter` });
			}
			if (supportsChannelHpf(selector.type as typeof selector.type)) {
				variables.push({ variableId: `console_${base}_hpf`, name: `${base} HPF (Hz)` });
			}
			if (supportsChannelPan(selector.type as typeof selector.type)) {
				variables.push({ variableId: `console_${base}_pan`, name: `${base} Pan` });
			}
			if (supportsChannelLink(selector.type as typeof selector.type)) {
				variables.push({ variableId: `console_${base}_link`, name: `${base} Link` });
			}
			if (supportsChannelColour(selector.type as typeof selector.type)) {
				variables.push({ variableId: `console_${base}_color`, name: `${base} Color` });
			}

			return variables;
		});

		const lineSendVariables = Array.from({ length: channelCounts.LINE ?? 0 }, (_, index) => {
			const channel = index + 1;
			const variables: CompanionVariableDefinition[] = [];

			for (let aux = 1; aux <= (channelCounts.AUX ?? 0); aux++) {
				variables.push({
					variableId: `console_line${channel}_aux${aux}_mute`,
					name: `line${channel} to Aux ${aux} Mute`,
				});
			}

			for (let fx = 1; fx <= (channelCounts.FX ?? 0); fx++) {
				variables.push({
					variableId: `console_line${channel}_fx${fx}_mute`,
					name: `line${channel} to FX ${fx} Mute`,
				});
			}

			return variables;
		}).flat();

		const muteGroupVariables = Array.from({ length: 8 }, (_, index) => ({
			variableId: `console_mutegroup${index + 1}_state`,
			name: `Mute Group ${index + 1} State`,
		})).concat(
			Array.from({ length: 8 }, (_, index) => ({
				variableId: `console_mutegroup${index + 1}_label`,
				name: `Mute Group ${index + 1} Label`,
			})),
		);

		return [
			...DEFAULTS.consoleStateVariables,
			...this.inputRoutingVariableDefinitions,
			...perChannelVariables,
			...lineSendVariables,
			...muteGroupVariables,
			...this.consoleStateVariables,
		];
	}

	#getConsoleVariableValues() {
		const previousScene = this.#getAdjacentScene(-1);
		const nextScene = this.#getAdjacentScene(1);
		const values: Record<string, any> = {
			console_model: this.client.state.get("global.mixer_name"),
			console_version: this.client.state.get("global.mixer_version"),
			console_serial: this.client.state.get("global.mixer_serial"),
			console_sel_channel: this.#getSelectedChannelName(),
			console_current_project: this.client.state.get("presets.loaded_project_name", ""),
			console_current_project_title: this.client.state.get("presets.loaded_project_title", ""),
			console_current_scene: this.client.state.get("presets.loaded_scene_name", ""),
			console_current_scene_title: this.client.state.get("presets.loaded_scene_title", ""),
			console_prev_scene: previousScene?.sceneTitle || previousScene?.sceneName || "",
			console_next_scene: nextScene?.sceneTitle || nextScene?.sceneName || "",
			console_any_solo: this.#getBooleanState("mastersection.anysolo") ?? false,
		};

		for (const variable of this.consoleStateVariables) {
			values[variable.variableId] = this.client.state.get(variable.resolver, variable.fallback);
		}

		const lineCount = this.client?.channelCounts?.LINE ?? 0;
		for (let i = 1; i <= lineCount; i++) {
			values[`console_ch${i}_inputsrc`] = this.#getInputRoutingMode({ type: "LINE", channel: i } as ChannelSelector) ?? "";
		}

		for (const selector of this.getAllChannelSelectors()) {
			const base = this.getChannelVariableBase(selector);
			const channelName = this.getChannelName(selector);
			values[`console_${base}_name`] = channelName;
			values[`console_${base}_display_name`] = channelName || `${selector.type} ${selector.channel}`;
			values[`console_${base}_mute`] = this.client.getMute(selector) ?? "";
			values[`console_${base}_solo`] = this.client.getSolo(selector) ?? "";
			values[`console_${base}_level`] = this.getChannelLevel(selector) ?? "";
			if (supportsChannelGate(selector.type as typeof selector.type)) {
				values[`console_${base}_gate`] = this.getChannelGateState(selector) ?? "";
			}
			if (supportsChannelEq(selector.type as typeof selector.type)) {
				values[`console_${base}_eq`] = this.getChannelEqState(selector) ?? "";
			}
			if (supportsChannelComp(selector.type as typeof selector.type)) {
				values[`console_${base}_comp`] = this.getChannelCompState(selector) ?? "";
			}
			if (supportsChannelLimiter(selector.type as typeof selector.type)) {
				values[`console_${base}_limiter`] = this.getChannelLimiterState(selector) ?? "";
			}
			if (supportsChannelHpf(selector.type as typeof selector.type)) {
				values[`console_${base}_hpf`] = this.getChannelHpfValue(selector);
			}
			if (supportsChannelPan(selector.type as typeof selector.type)) {
				values[`console_${base}_pan`] = this.getChannelPan(selector) ?? "";
			}
			if (supportsChannelLink(selector.type as typeof selector.type)) {
				values[`console_${base}_link`] = this.getChannelLink(selector) ?? "";
			}
			if (supportsChannelColour(selector.type as typeof selector.type)) {
				values[`console_${base}_color`] = this.getChannelColourHex(selector);
			}
		}

		for (let line = 1; line <= lineCount; line++) {
			for (let aux = 1; aux <= (this.client?.channelCounts?.AUX ?? 0); aux++) {
				values[`console_line${line}_aux${aux}_mute`] =
					this.client.getMute({ type: "LINE", channel: line, mixType: "AUX", mixNumber: aux }) ?? "";
			}

			for (let fx = 1; fx <= (this.client?.channelCounts?.FX ?? 0); fx++) {
				values[`console_line${line}_fx${fx}_mute`] =
					this.client.getMute({ type: "LINE", channel: line, mixType: "FX", mixNumber: fx }) ?? "";
			}
		}

		for (let group = 1; group <= 8; group++) {
			values[`console_mutegroup${group}_state`] = this.getMuteGroupState(group) ?? "";
			values[`console_mutegroup${group}_label`] = this.getMuteGroupLabel(group);
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

		for (const timer of this.levelTransitionTimers.values()) {
			clearTimeout(timer);
		}
		this.levelTransitionTimers.clear();
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
			this.checkFeedbacks("ChannelSelect");
			this.checkFeedbacks("ChannelSolo");
			this.checkFeedbacks("ChannelGate");
			this.checkFeedbacks("ChannelEq");
			this.checkFeedbacks("ChannelComp");
			this.checkFeedbacks("ChannelLimiter");
			this.checkFeedbacks("ChannelLink");
			this.checkFeedbacks("ChannelLevel");
			this.checkFeedbacks("ChannelPan");
			this.checkFeedbacks("MuteGroupState");
			this.checkFeedbacks("ProjectFilterStatus");
			this.checkFeedbacks("SceneFilterStatus");
		});

		this.client.on(MessageCode.ParamChars, () => {
			this.checkFeedbacks("ChannelColour");
		});

		this.client.on(MessageCode.ParamString, () => {
			this.checkFeedbacks("ChannelIconImage");
		});

		this.client.on(MessageCode.ZLIB, () => {
			this.checkFeedbacks("ChannelSelect");
			this.checkFeedbacks("ChannelInputRouting");
			this.checkFeedbacks("MuteGroupState");
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
		this.setVariableDefinitions(this.buildConsoleVariableDefinitions(this.client.channelCounts));

		const actions_channels = generateActions_channels.call(this, channels, mixes);
		this.setActionDefinitions({ ...actions_channels });

		this.setFeedbackDefinitions(generateFeedback.call(this, channels, mixes));
		this.setPresetDefinitions(generatePreset.call(this, channels, mixes));

		this.checkAllFeedbacks();

		this.intervals.push(
			setInterval(() => {
				this.setVariableValues(this.#getConsoleVariableValues());
				this.checkFeedbacks("ChannelIconImage");
			}, 1000),
		);

		/**
		 * Initialise scene debouncer
		 */
		{
			const metadataDebouncer = new FunctionDebouncer(200, true, async () => {
				const projects = await this.client.getProjects(true);
				const channelPresets = await this.client.sendList("presets/channel");
				this.channelPresetCache = channelPresets.map((preset) => ({
					name: preset.name,
					title: preset.title,
				}));
				this.projectSceneCache = projects.map((project) => ({
					projectName: project.name,
					projectTitle: project.title,
					scenes: project.scenes.map((scene) => ({
						sceneName: scene.name,
						sceneTitle: scene.title,
					})),
				}));
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
				const projectSceneChoices = [
					{ id: "", label: "" },
					...list.map((map) => ({
						id: JSON.stringify([map.projectName, map.sceneName].filter((v) => v)),
						label: [map.projectTitle, map.sceneTitle].filter((v) => v).join(" - "),
					})),
				];
				const channelPresetChoices = [
					{ id: "", label: "" },
					...this.channelPresetCache.map((preset) => ({
						id: preset.name,
						label: preset.title || preset.name,
					})),
				];

				this.setActionDefinitions({
					...generateActions_channels.call(this, channels, mixes, channelPresetChoices),
					...actions_projectScenes,
				});
				this.setFeedbackDefinitions(generateFeedback.call(this, channels, mixes, projectSceneChoices));
			});

			metadataDebouncer.touchImmediate();
			this.client.on(MessageCode.JSON, (json) => {
				if (json.id === "RenamedPreset" || json.id === "StoredPreset") metadataDebouncer.touch();
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
