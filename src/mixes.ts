
import type { ChannelCount } from 'presonus-studiolive-api';
import { ValueSeparator } from './util/Constants';
import { DropdownChoice } from '@companion-module/base';

export default function generateMixes(channels: ChannelCount): DropdownChoice[] {
    let mixes: DropdownChoice[] = [
        { id: '', label: 'Main' },
    ]

    for (let i = 0; i < channels['AUX']; i++) {
        // TODO: Get aux name from mixer state?
        mixes.push({ id: ['AUX', i + 1].join(ValueSeparator), label: `Aux ${i + 1}` },)
    }

    for (let i = 0; i < channels['FX']; i++) {
        // TODO: Get aux name from mixer state?
        mixes.push({ id: ['FX', i + 1].join(ValueSeparator), label: `FX ${String.fromCharCode(0x41 + i)}` },)
    }

    return mixes
}