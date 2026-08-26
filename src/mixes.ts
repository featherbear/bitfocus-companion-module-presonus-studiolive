
import type { DropdownChoice } from '@companion-module/base';
import type { ChannelCount } from "@featherbear/presonus-studiolive-api";

export default function generateMixes(channels: ChannelCount): DropdownChoice[] {
    const mixes: DropdownChoice[] = [
        { id: '', label: 'Main' },
    ]

    for (let i = 0; i < channels['AUX']; i++) {
        // TODO: Get aux name from mixer state?
        mixes.push({ id: JSON.stringify(['AUX', i + 1]), label: `Aux ${i + 1}` },)
    }

    for (let i = 0; i < channels['FX']; i++) {
        // TODO: Get aux name from mixer state?
        mixes.push({ id: JSON.stringify(['FX', i + 1]), label: `FX ${String.fromCharCode(0x41 + i)}` },)
    }

    return mixes
}