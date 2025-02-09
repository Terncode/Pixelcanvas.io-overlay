import { Mural } from "../interfaces";
import { waitForDraw } from "../lib/utils";

const MAGIC_REPEATING = 200;
const TRANSPARENT = 201;

const VERSION = 1;

export function compressRepeatingArray(index: number, buffer: number[] /* 0xFF */) {
    const a = buffer[index];
    const b = buffer[index + 1];
    const c = buffer[index + 2];
    const pixelIndex = a === -1 ? TRANSPARENT : a;
    if (a === b && b === c) {
        let i = 0;
        for (; i < Math.min(buffer.length - index, 0xFF); i++) {
            if (a !== buffer[index + i]) {
               break;
            }   
        }
        return [MAGIC_REPEATING, i - 1, pixelIndex];
    }
    return [pixelIndex];
}

export function decompressRepeatingArray(buffer: ArrayLike<number>) {
    const output: number[] = [];
    const addValue = (value: number) => {
        output.push(value === TRANSPARENT ? -1 : value);
    };
    
    for (let i = 0; i < buffer.length; i++) {
        const item = buffer[i];
        if (item === MAGIC_REPEATING) {
            const length = buffer[++i];
            const value = buffer[++i];
            for (let j = 0; j < length; j++) {
                addValue(value);
            }
        } else {
            addValue(item);
        }
    }
    return output;
}

export async function serializeMural(mural: Mural) {
    const encoder = new TextEncoder();
    const nameBinary = encoder.encode(mural.name);
    await waitForDraw();
    const array: number[] = [];
    for (let i = 0; i < mural.pixels.length; i++) {
        for (let j = 0; j < mural.pixels[i].length; j++) {
            array.push(mural.pixels[i][j]);
        }
    }
    const pixelEncodeBuffer: number[] = [];
    for (let i = 0; i < array.length; i++) {
        const rtn = compressRepeatingArray(i, array);
        if (rtn.length === 1) {
            pixelEncodeBuffer.push(rtn[0]);
        } else {
            pixelEncodeBuffer.push(rtn[0], rtn[1], rtn[2]);
            i += rtn[1] - 1;
        }
    }

    const pixelBuffer = new Uint8Array(pixelEncodeBuffer);
    const firstHalf = 1 + 4 + 4 + 1 + 2 + nameBinary.byteLength;
    const buffer = new ArrayBuffer(firstHalf + pixelBuffer.byteLength);
    const view = new DataView(buffer);
    view.setUint8(0, VERSION);
    view.setInt32(1, mural.x, true);
    view.setInt32(5, mural.y, true);
    view.setUint16(9, mural.pixels[0].length, true);
    view.setUint8(11, nameBinary.length);
    new Uint8Array(buffer).set(nameBinary, 12);
    new Uint8Array(buffer).set(pixelBuffer, firstHalf);
 
    return buffer;
}

export async function deserializeMural(buffer: ArrayBuffer): Promise<Mural> {
    const view = new DataView(buffer);
    const version = view.getUint8(0);
    if (version !== VERSION) {
        throw new Error("Unknown version");
    }
    const x = view.getInt32(1, true);
    const y = view.getInt32(5, true);
    const width = view.getUint16(9, true);
    const nameLength = view.getUint8(11);

    const nameBytes = new Uint8Array(buffer, 12, nameLength);
    const decoder = new TextDecoder();
    const name = decoder.decode(nameBytes);
    const pixelBuffer = new Uint8Array(buffer, 12 + nameLength);
    await waitForDraw();
    const pixelArray: number[] = decompressRepeatingArray(pixelBuffer);

    const pixels: number[][] = [];

    leg:
    for (;;) {
        await waitForDraw();
        if (!pixelArray.length) {
            break;
        }
        const ref: number[] = [];
        pixels.push(ref);
        for (let j = 0; j < width; j++) {
            const item = pixelArray.shift();    
            if (item != undefined) { 
                ref.push(item);
            } else {
                break leg;
            }
        }
    }

    return {
        name,
        x,
        y,
        pixels
    } as Mural;
}
