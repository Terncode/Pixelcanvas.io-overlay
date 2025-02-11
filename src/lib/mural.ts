import zlib from "zlib";
import { Buffer } from "buffer";

export class Mural {
    private static readonly ENCODE_VERSION = 1;
    constructor(
        private _name: string,
        private _x: number,
        private _y: number,
        private _w: number,
        private _h: number,
        private _b: Int8Array
    ) {
        this.validate();
    }

    getBuffer() {
        this.validate();
        const encoder = new TextEncoder();
        const nameBinary = encoder.encode(this._name);
        const pixelBuffer = this._b;
        const firstHalf = 1 + 4 + 4 + 1 + 2 + 2 + 1 + nameBinary.byteLength;
        const buffer = new ArrayBuffer(firstHalf + pixelBuffer.byteLength);
        const view = new DataView(buffer);
        view.setUint8(0, Mural.ENCODE_VERSION);
        view.setInt32(1, this._x);
        view.setInt32(5, this._y);
        view.setUint16(9, this._h);
        view.setUint16(11, this._w);
        view.setUint8(13, nameBinary.length);
        new Uint8Array(buffer).set(nameBinary, 15);
        new Uint8Array(buffer)
            .set(new Uint8Array(this._b.buffer, this._b.byteOffset, this._b.byteLength), firstHalf);
        return new Promise<Uint8Array>((resolve, reject) => {
            zlib.deflate(Buffer.from(buffer), (error, result) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(result);
                }
            });
        });
    }
    static async from(raw: Uint8Array) {
        const buffer = await new Promise<Buffer>((resolve, reject) => {
            zlib.inflate(raw, (error, result) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(result);
                }
            });
        });
        const view = new DataView(buffer.buffer);
        const version = view.getUint8(0);
        if (version !== Mural.ENCODE_VERSION) {
            throw new Error("Unknown version");
        }
        const x = view.getInt32(1);
        const y = view.getInt32(5);
        const height = view.getUint16(9);
        const width = view.getUint16(11);
        const nameLength = view.getUint8(13);
        const nameBytes = buffer.subarray(15, 15 + nameLength);
        const decoder = new TextDecoder();
        const name = decoder.decode(nameBytes);
        const pixelBuffer = new Int8Array(
            buffer.buffer, 
            buffer.byteOffset + 15 + nameLength,
            buffer.byteLength - (15 + nameLength)
        );

        return new Mural(name, x, y, width, height, pixelBuffer);
    }
    private validate2() {
        try {
            this.validate();
            return true;
        } catch (_) {
            return false;
        }
    }

    private validate() {
        if (this._w * this._h > 0x7FFFFFFF) {
            throw new Error("Size too big");
        }
        if (this._w > 0xFFFF) {
            throw new Error("Width to big");
        }
        if (this._h > 0xFFFF) {
            throw new Error("Height to big");
        }
        if (Math.abs(this._x) > 0x7FFFFFFF) {
            throw new Error("X to big");
        }
        if (Math.abs(this._y) > 0x7FFFFFFF) {
            throw new Error("X to big");
        }
    }
    getPixel(x: number, y: number) {
        return this._b[this.getIndex(x, y)];
    }
    setPixel(x: number, y: number, value: number) {
        this._b[this.getIndex(x, y)]  = value;
    }
    private getIndex(x: number, y: number) {
        return (y * this._w) + x;
    }
    private fixBuffer() {
        const size = this._w * this._h;
        if (this._b.length !== size){
            const copy = this._b;
            this._b = new Int8Array(size);
            this._b.set(copy.subarray(0, size)); 
        }
    }

    get name() {
        return this._name;
    }
    set name(value: string) {
        const copy = this._name;
        this._name = value;
        if (!this.validate2()) {
            this._name = copy;
        }
    }
    get x() {
        return this._x;
    }
    set x(value: number) {
        const copy = this._x;
        this._x = value;
        if (!this.validate2()) {
            this._x = copy;
        }
    }
    get y() {
        return this._y;
    }
    set y(value: number) {
        const copy = this._y;
        this._y = value;
        if (!this.validate2()) {
            this._y = copy;
        }
    }
    get w() {
        return this._w;
    }
    set w(value: number) {
        const copy = this._w;
        this._w = value;
        if (!this.validate2()) {
            this.fixBuffer();
        } else {
            this._w = copy;
        }
    }
    get h() {
        return this._h;
    }
    set h(value: number) {
        const copy = this._h;
        this._h = value;
        if (!this.validate2()) {
            this.fixBuffer();
        } else {
            this._h = copy;
        }

    }

    get pixelBuffer() {
        return this._b;
    }
}