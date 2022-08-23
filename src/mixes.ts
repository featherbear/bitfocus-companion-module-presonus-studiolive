
import type { ChannelTypes, ChannelCount } from 'presonus-studiolive-api';
import type { DropdownActionOptionChoice } from './types/Action'

export function generateMixes(channels: ChannelCount): DropdownActionOptionChoice[] {
    let mixes: DropdownActionOptionChoice[] = [
        { id: '', label: 'Main' },
    ]

    for (let i = 0; i < channels['AUX']; i++) {
        // TODO: Get aux name from mixer state?
        mixes.push({ id: `AUX,${i + 1}`, label: `Aux ${i + 1}` },)
    }

    for (let i = 0; i < channels['FX']; i++) {
        // TODO: Get aux name from mixer state?
        mixes.push({ id: `FX,${i + 1}`, label: `FX ${String.fromCharCode(0x41 + i)}` },)
    }

    return mixes


}