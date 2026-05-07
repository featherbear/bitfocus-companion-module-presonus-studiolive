import type { DropdownChoice } from "@companion-module/base";
import fs from "node:fs";
import path from "node:path";

export const CHANNEL_ICON_CHOICES: DropdownChoice[] = [
	{ id: "", label: "" },
	{ id: "brass/brasssection", label: "Brass Section" },
	{ id: "brass/cornet", label: "Cornet" },
	{ id: "brass/flugelhorn", label: "Flugelhorn" },
	{ id: "brass/frenchhorn", label: "French Horn" },
	{ id: "brass/trombone", label: "Trombone" },
	{ id: "brass/trumpet", label: "Trumpet" },
	{ id: "brass/tuba", label: "Tuba" },
	{ id: "drums/drumpad", label: "Drum Pad" },
	{ id: "drums/drumset", label: "Drum Set" },
	{ id: "drums/floortom", label: "Floor Tom" },
	{ id: "drums/hihat", label: "Hi Hat" },
	{ id: "drums/hightom", label: "High Tom" },
	{ id: "drums/kickin", label: "Kick In" },
	{ id: "drums/kickout", label: "Kick Out" },
	{ id: "drums/kick", label: "Kick" },
	{ id: "drums/midtom", label: "Mid Tom" },
	{ id: "drums/ohleft", label: "OH Left" },
	{ id: "drums/ohright", label: "OH Right" },
	{ id: "drums/oh", label: "OH" },
	{ id: "drums/racktom", label: "Rack Tom" },
	{ id: "drums/roommic", label: "Room Mic" },
	{ id: "drums/snarebottom", label: "Snare Bottom" },
	{ id: "drums/snaretop", label: "Snare Top" },
	{ id: "drums/snare", label: "Snare" },
	{ id: "guitars/acoustic2", label: "Acoustic 2" },
	{ id: "guitars/acoustic", label: "Acoustic" },
	{ id: "guitars/amp(combo)", label: "Amp (Combo)" },
	{ id: "guitars/amp(fullstack)", label: "Amp (Full Stack)" },
	{ id: "guitars/amp(halfstack)", label: "Amp (Half Stack)" },
	{ id: "guitars/amp(smallcombo)", label: "Amp (Small Combo)" },
	{ id: "guitars/banjo", label: "Banjo" },
	{ id: "guitars/bass", label: "Bass" },
	{ id: "guitars/dobro", label: "Dobro" },
	{ id: "guitars/electric2", label: "Electric 2" },
	{ id: "guitars/electric", label: "Electric" },
	{ id: "guitars/guitars", label: "Guitars" },
	{ id: "guitars/mandolin", label: "Mandolin" },
	{ id: "guitars/pedalsteel", label: "Pedal Steel" },
	{ id: "guitars/shamisen", label: "Shamisen" },
	{ id: "guitars/sitar", label: "Sitar" },
	{ id: "guitars/ukulele", label: "Ukulele" },
	{ id: "keyboards/accordion", label: "Accordion" },
	{ id: "keyboards/clavinet", label: "Clavinet" },
	{ id: "keyboards/harpsichord", label: "Harpsichord" },
	{ id: "keyboards/keyboardsbottomtier", label: "Keyboards Bottom Tier" },
	{ id: "keyboards/keyboardstoptier", label: "Keyboards Top Tier" },
	{ id: "keyboards/keyboards", label: "Keyboards" },
	{ id: "keyboards/keys", label: "Keys" },
	{ id: "keyboards/organ", label: "Organ" },
	{ id: "keyboards/piano", label: "Piano" },
	{ id: "keyboards/pipeorgan", label: "Pipe Organ" },
	{ id: "keyboards/synth", label: "Synth" },
	{ id: "keyboards/vibraphone", label: "Vibraphone" },
	{ id: "other/band", label: "Band" },
	{ id: "other/beard", label: "Beard" },
	{ id: "other/broadcast", label: "Broadcast" },
	{ id: "other/computer", label: "Computer" },
	{ id: "other/cryroom", label: "Cry Room" },
	{ id: "other/delayfill", label: "Delay Fill" },
	{ id: "other/dibox", label: "DI Box" },
	{ id: "other/externalfx", label: "External FX" },
	{ id: "other/firewire", label: "FireWire" },
	{ id: "other/fohmain", label: "FOH Main" },
	{ id: "other/fx", label: "FX" },
	{ id: "other/handclap", label: "Hand Clap" },
	{ id: "other/headphones", label: "Headphones" },
	{ id: "other/iem", label: "IEM" },
	{ id: "other/ipad", label: "iPad" },
	{ id: "other/ipod", label: "iPod" },
	{ id: "other/metronome", label: "Metronome" },
	{ id: "other/microphone", label: "Microphone" },
	{ id: "other/mix", label: "Mix" },
	{ id: "other/phone", label: "Phone" },
	{ id: "other/rock", label: "Rock" },
	{ id: "other/sidefillmonitor", label: "Side Fill Monitor" },
	{ id: "other/smiley", label: "Smiley" },
	{ id: "other/sub", label: "Sub" },
	{ id: "other/tablet", label: "Tablet" },
	{ id: "other/talkback", label: "Talkback" },
	{ id: "other/telephone", label: "Telephone" },
	{ id: "other/thumbup", label: "Thumb Up" },
	{ id: "other/turntable", label: "Turntable" },
	{ id: "other/video", label: "Video" },
	{ id: "other/wedgemonitor", label: "Wedge Monitor" },
	{ id: "other/wirelessmic", label: "Wireless Mic" },
	{ id: "percussion/bell", label: "Bell" },
	{ id: "percussion/bongos", label: "Bongos" },
	{ id: "percussion/chimes", label: "Chimes" },
	{ id: "percussion/congas", label: "Congas" },
	{ id: "percussion/cowbell", label: "Cow Bell" },
	{ id: "percussion/cymbal", label: "Cymbal" },
	{ id: "percussion/cymbals", label: "Cymbals" },
	{ id: "percussion/handpan", label: "Handpan" },
	{ id: "percussion/kalimba", label: "Kalimba" },
	{ id: "percussion/miscperc", label: "Misc Perc" },
	{ id: "percussion/orchestralbassdrum", label: "Orchestral Bass Drum" },
	{ id: "percussion/shakers", label: "Shakers" },
	{ id: "percussion/steeldrum", label: "Steel Drum" },
	{ id: "percussion/tambourine", label: "Tambourine" },
	{ id: "percussion/timbales", label: "Timbales" },
	{ id: "percussion/timpani", label: "Timpani" },
	{ id: "percussion/triangle", label: "Triangle" },
	{ id: "percussion/washboard", label: "Washboard" },
	{ id: "percussion/woodblock", label: "Woodblock" },
	{ id: "percussion/xylophone", label: "Xylophone" },
	{ id: "strings/cello", label: "Cello" },
	{ id: "strings/fiddle", label: "Fiddle" },
	{ id: "strings/harp", label: "Harp" },
	{ id: "strings/stringsection", label: "String Section" },
	{ id: "strings/uprightbass", label: "Upright Bass" },
	{ id: "strings/viola", label: "Viola" },
	{ id: "strings/violin", label: "Violin" },
	{ id: "vocals/backupvocals", label: "Backup Vocals" },
	{ id: "vocals/choirsingle", label: "Choir Single" },
	{ id: "vocals/choir", label: "Choir" },
	{ id: "vocals/crowdambient", label: "Crowd Ambient" },
	{ id: "vocals/leadvocals", label: "Lead Vocals" },
	{ id: "vocals/microphone", label: "Microphone" },
	{ id: "vocals/speech", label: "Speech" },
	{ id: "vocals/vocalque", label: "Vocal Que" },
	{ id: "vocals/vocalmic", label: "VocalMic" },
	{ id: "vocals/vocals", label: "Vocals" },
	{ id: "vocals/wirelessmic", label: "Wireless Mic" },
	{ id: "woodwinds/altosaxophone", label: "Alto Saxophone" },
	{ id: "woodwinds/baritonesaxophone", label: "Baritone Saxophone" },
	{ id: "woodwinds/bassclarinet", label: "Bass Clarinet" },
	{ id: "woodwinds/bassoon", label: "Bassoon" },
	{ id: "woodwinds/clarinet", label: "Clarinet" },
	{ id: "woodwinds/flute", label: "Flute" },
	{ id: "woodwinds/oboe", label: "Oboe" },
	{ id: "woodwinds/sax", label: "Sax" },
	{ id: "woodwinds/saxophone", label: "Saxophone" },
	{ id: "woodwinds/sopranosaxophone", label: "Soprano Saxophone" },
	{ id: "woodwinds/tenorsaxophone", label: "Tenor Saxophone" },
	{ id: "woodwinds/woodwinds", label: "Woodwinds" },
];

const CHANNEL_ICON_LABELS = new Map(
	CHANNEL_ICON_CHOICES.filter((choice) => choice.id && choice.label).map((choice) => [String(choice.id), String(choice.label)]),
);

const channelIconPng64Cache = new Map<string, string | null>();

function resolveChannelIconPath(label: string): string | undefined {
	const candidates = [
		path.resolve(__dirname, "companion/icons/studiolive", `${label}.png`),
		path.resolve(__dirname, "../companion/icons/studiolive", `${label}.png`),
		path.resolve(__dirname, "../../companion/icons/studiolive", `${label}.png`),
		path.resolve(process.cwd(), "companion/icons/studiolive", `${label}.png`),
	];

	return candidates.find((candidate) => fs.existsSync(candidate));
}

export function getChannelIconLabel(iconId: string): string | undefined {
	return CHANNEL_ICON_LABELS.get(iconId);
}

export function getChannelIconPng64(iconId: string): string | undefined {
	if (!iconId) return undefined;
	if (channelIconPng64Cache.has(iconId)) {
		return channelIconPng64Cache.get(iconId) ?? undefined;
	}

	const label = getChannelIconLabel(iconId);
	if (!label) {
		channelIconPng64Cache.set(iconId, null);
		return undefined;
	}

	const iconPath = resolveChannelIconPath(label);
	if (!iconPath) {
		channelIconPng64Cache.set(iconId, null);
		return undefined;
	}

	const png64 = `data:image/png;base64,${fs.readFileSync(iconPath).toString("base64")}`;
	channelIconPng64Cache.set(iconId, png64);
	return png64;
}
