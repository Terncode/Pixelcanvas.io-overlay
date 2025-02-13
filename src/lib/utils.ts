import { clone, isInteger } from "lodash";
import { MuralEx, MuralOld, MuralStatus, RGB } from "../interfaces";
import { fetchCombineTiledImage } from "./canvasShot";
import { Mural } from "./mural";
import { CHUNK_SIZE } from "../constants";

export function pushUnique<T>(items: T[], item: T) {
    const index = items.indexOf(item);
    if (index === -1) {
        items.push(item);
        return true;
    }
    return false;
}

export function removeItem<T>(items: T[], item: T) {
    const index = items.indexOf(item);
    if (index !== -1) {
        items.splice(index, 1);
        return true;
    }
    return false;
}

export function rgb(r: number, g: number, b: number): RGB {
    return { r, g, b };
}

export function findClosestIndexColor(rgbO: RGB, palette: RGB[]) {
    const scores: number[] = [];

    for (const rgb of palette) {
        const r = getColorScore(rgbO.r, rgb.r);
        const g = getColorScore(rgbO.g, rgb.g);
        const b = getColorScore(rgbO.b, rgb.b);
        scores.push(r + g + b);
    }
    const lowest = Math.min(...scores);
    const index = scores.indexOf(lowest);
    return index;
}

export function getColorScore(v0: number, v2: number) {
    return v0 > v2 ? v0 - v2 : v2 - v0;
}

export function componentToHex(c: number, fix = 2) {
    return c.toString(16).padStart(fix, "0");
}

export function rgbToHex(r: number, g: number, b: number) {
    return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}

export function waitForDraw() {
    return new Promise(r => requestAnimationFrame(r));
}

export function getExtension(string: string) {
    const index = string.lastIndexOf(".");
    if (index === -1) {
        return { text: string, ex: "" };
    } else {
        return { text: string.slice(0, index), ex: string.slice(index + 1) };
    }
}

export function readAsString(blob: Blob) {
    return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.addEventListener("load", () => {
            resolve(reader.result as string);
        });
        reader.addEventListener("error", err => {
            reject(err);
        });
        reader.readAsText(blob);
    });
}

export function readAsDataUrl(blob: Blob) {
    return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.addEventListener("load", () => {
            resolve(reader.result as string);
        });
        reader.addEventListener("error", err => {
            reject(err);
        });
        reader.readAsDataURL(blob);
    });
}

export function readAsArrayBuffer(blob: Blob) {
    return new Promise<ArrayBuffer >((resolve, reject) => {
        const reader = new FileReader();
        reader.addEventListener("load", () => {
            resolve(reader.result as ArrayBuffer );
        });
        reader.addEventListener("error", err => {
            reject(err);
        });
        reader.readAsArrayBuffer(blob);
    });
}


export function loadImageSource(name: string, data: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.alt = name;
        image.addEventListener("load", () => resolve(image));
        image.addEventListener("error", err => {
            reject(err);
        });
        if (data.startsWith("data:image") || data.startsWith("blob")) {
            image.src = data;
        } else {
            image.src = `data:image/${getExtension(name)};base64,${data}`;
        }
    });
}

export function get2DArrHeight(arr2D: number[][]) {
    return arr2D.length;
}

export function get2DArrWidth(arr2D: number[][]) {
    return (arr2D[0] && arr2D[0].length) || 0;
}

export function getMuralHeight(mural: MuralOld) {
    return get2DArrHeight(mural.pixels);
}

export function getMuralWidth(mural: MuralOld) {
    return get2DArrWidth(mural.pixels);
}

export function resize(image: HTMLImageElement, width: number, height: number) {
    const canvas = createCanvas();
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(image, 0, 0, width, height);
    return canvasToImage(canvas, image.alt);
}

export function canvasToImage(canvas: HTMLCanvasElement, alt?: string) {
    return new Promise<HTMLImageElement>((resolve, reject) => {
        const img = canvas.toDataURL(`image/png`);
        const newImage = new Image();

        newImage.addEventListener("load", () => resolve(newImage));
        newImage.addEventListener("error", err => reject(err));
        if (alt) {
            newImage.alt = alt;
        }
        newImage.src = img;
    });
}

export function validateMural(mural: MuralOld) {
    if (typeof mural === "object") {
        const muralClone = clone(mural);
        if (Array.isArray(muralClone)) {
            throw new Error("Should not be an array");
        } else {
            if (typeof muralClone.x !== "number") throw new Error("x is not a number");
            if (typeof muralClone.y !== "number") throw new Error("y is not a number");
            if (!isInteger(muralClone.x)) throw new Error("x is not an integer");
            if (!isInteger(muralClone.y)) throw new Error("y is not an integer");
            if (typeof muralClone.name !== "string") throw new Error("Missing name");
            if (muralClone.name.length <= 1) throw new Error("Name to short");
            if (muralClone.name.length >= 64) throw new Error("Name to long");
            if (typeof muralClone.pixels !== "object") throw new Error("Pixels are not an object");
            if (!Array.isArray(muralClone.pixels)) throw new Error("Pixels are not an array");
            let size = 0;
            for (let i = 0; i < muralClone.pixels.length; i++) {
                const obj = muralClone.pixels[i];
                if (typeof obj !== "object") throw new Error(`Pixels[${i}] are not an object`);
                if (!Array.isArray(obj)) throw new Error(`Pixels[${i}] are not an array`);
                if (i === 0) {
                    size = obj.length;
                } else if (obj.length !== size) {
                    throw new Error(`Pixels[${i}] incorrect size`);
                }
            }
            for (let y = 0; y < muralClone.pixels.length; y++) {
                const yArray = muralClone.pixels[y];
                if (yArray == null) {
                    throw new Error(`mural.pixels[${y}] is null`);
                }
                for (let x = 0; x < yArray.length; x++) {
                    if (typeof yArray[x] !== "number")
                            throw new Error(`pixels[${y}][${x}] is not a number`);
                    if (!isInteger(yArray[x]))
                            throw new Error(`pixels[${y}][${x}] is not am integer`);
                    const colorId = yArray[x];
                    if (colorId == null) throw new Error("colorId is null");
                }
            }
            if (Object.keys(muralClone).length !== 4) {
                throw new Error(`Found more object keys than it should have`);
            }

            const height = getMuralHeight(muralClone);
            const width = getMuralWidth(muralClone);
            if (height < 2) throw new Error("Height to small");
            if (width < 2) throw new Error("Width to small");
            if (height > 2000) throw new Error("Height to big");
            if (width > 2000) throw new Error("Width to big");
        }
    } else {
        throw new Error("Not an object");
    }
}

export function canvasToImageData(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d")!;
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

export function flatQuantizeImageData(imageData: ImageData, palette: RGB[]) {
    const indexColor = createClosestIndexColor(palette);
    for (let i = 0; i < imageData.data.length; i += 4) {
        const r = imageData.data[i + 0] ?? 0;
        const g = imageData.data[i + 1] ?? 0;
        const b = imageData.data[i + 2] ?? 0;
        const a = imageData.data[i + 3] ?? 0;
        const index = indexColor(r, g, b);
        const color = palette[index];
        if (!color) throw new Error(`Unknown color index ${index}`);
        imageData.data[i + 0] = color.r;
        imageData.data[i + 1] = color.g;
        imageData.data[i + 2] = color.b;
        imageData.data[i + 3] = a;
    }
}

export async function getPixelStatusMural(mural: Mural, palette: RGB[]): Promise<MuralStatus> {
    const width = mural.w;
    const height = mural.h;
    const tile = await fetchCombineTiledImage(mural.x, mural.y, width, height);
    const imageData = tile.getContext("2d")?.getImageData(0, 0, width, height);
    const buffer = mural.pixelBuffer;
    let total = 0;
    let bad = 0;
    let good = 0;
    if (imageData) {
        for (let i = 0, j = 0; i < imageData.data.length; i += 4, j++) {
            if (buffer[j] >= 0) {
                const r = imageData.data[i + 0];
                const g = imageData.data[i + 1];
                const b = imageData.data[i + 2];

                const obj = rgb(r, g, b);
                total++;
                if (findClosestIndexColor(obj, palette) === buffer[j]) {
                    good++;
                } else {
                    bad++;
                }
            
            }
        }
    }
    return { total, good, bad };
}

export function imageDataToPaletteIndices(imageData: ImageData, palette: RGB[]) {
    const { height, width } = imageData;
    let k = 0;
    const indexColor = createClosestIndexColor(palette);
    const pixels = new Int8Array(height * width);
    for (let i = 0; i < imageData.data.length; i += 4) {
        const r = imageData.data[i + 0] ?? 0;
        const g = imageData.data[i + 1] ?? 0;
        const b = imageData.data[i + 2] ?? 0;
        const a = imageData.data[i + 3] ?? 0xff;
        if (a < 25) {
            pixels[k++] = -1;
        } else {
            const index = indexColor(r, g, b);
            pixels[k++] = index;
        }
    }
    return pixels;
}

export function findClosestFormArray(rgbO: RGB, palette: RGB[]) {
    const scores: number[] = new Array(palette.length).fill(0);

    for (let i = 0; i < palette.length; i++) {
        const r = getColorScore(rgbO.r, palette[i].r);
        const g = getColorScore(rgbO.g, palette[i].g);
        const b = getColorScore(rgbO.b, palette[i].b);
        scores[i] = (r + g + b);
    }
    const lowest = Math.min(...scores);
    const index = scores.indexOf(lowest);
    return index;
}

export function imageToCanvas(image: HTMLImageElement) {
    const canvas = createCanvas();
    const ctx = canvas.getContext("2d")!;
    canvas.width = image.width;
    canvas.height = image.height;
    ctx.drawImage(image, 0, 0);
    return canvas;
}

export function drawPixelsOntoCanvas(
    canvas: HTMLCanvasElement, mural: Mural, palette: string[], pixelSize = 1
) {    
    const ctx = canvas.getContext("2d")!;
    if (!ctx) return 0;
    if (!(canvas instanceof OffscreenCanvas)){
        canvas.width = mural.w;
        canvas.height = mural.h;
        canvas.style.width = `${mural.w}px`;
        canvas.style.height = `${mural.h}px`;
    }
    let pixels = 0;
    for (let x = 0; x < mural.w; x ++) {
        for (let y = 0; y < mural.h; y++) {
            const index = mural.getPixel(x, y);
            if (index != null && index > -1) {
                pixels++;
                const aColor = palette[index]!;
                if (!aColor) {
                    throw new Error(`Unknown color at ${index}`);
                }
                ctx.fillStyle = aColor;
                ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
            }
        }
    }
    return pixels;
}

export function createCanvas() {
    const canvas = document.createElement("canvas");
    canvas.setAttribute("overlay", "true");
    return canvas;
}

export function lengthOfXY(dx: number, dy: number): number {
	return Math.sqrt(dx * dx + dy * dy);
}

export function distance(ax: number, ay: number, bx: number, by: number): number {
	return lengthOfXY(ax - bx, ay - by);
}

export function toChunkX(x: number) {
    return Math.floor(x / CHUNK_SIZE) * CHUNK_SIZE;
}

export function toChunkY(y: number) {
    return Math.floor(y / CHUNK_SIZE) * CHUNK_SIZE;
}

export function canvasFromMural(mural: Mural, palette: string[]) {
    const canvas = document.createElement("canvas");
    canvas.width = mural.w;
    canvas.height = mural.h;
    const pixels = drawPixelsOntoCanvas(canvas, mural, palette);
    return { canvas, pixels };
}


export function createMuralExtended(mural: Mural, palette: string[]): MuralEx {
    const { canvas, pixels } = canvasFromMural(mural, palette);
    return {
        mural,
        pixelCount: pixels,
        ref: canvas
    };
}

export function createClosestIndexColor(palette: RGB[]) {
    const scores = new Uint16Array(palette.length);
    let lowest = Number.MAX_SAFE_INTEGER;
    return (r: number, g: number, b: number) => {
        lowest = Number.MAX_SAFE_INTEGER;
        for (let i = 0; i < palette.length; i++) {
            const rgb = palette[i];
            const rr = getColorScore(r, rgb.r);
            const gg = getColorScore(g, rgb.g);
            const bb = getColorScore(b, rgb.b);
            const value = rr + gg + bb;
            lowest = lowest < value ? lowest : value;
            scores[i] = value;        
        }
        return scores.indexOf(lowest);
    };
}

let numberFormatter: Intl.NumberFormat;
try {
    const userLocale = navigator.language || (navigator as any).userLanguage;
    numberFormatter = new Intl.NumberFormat(userLocale);
} catch (_) { 
    // continue regardless of error
}

export function formatNumber(number: number) {
  return numberFormatter ? numberFormatter.format(number) : number.toString();
}

export function processNumberEvent(
    ev: React.ChangeEvent<HTMLInputElement>, cb: (n: number) => void
) {
    ev.preventDefault();
    ev.stopPropagation();
    if(ev.target.value === "") {
        cb(0);
    } else if (ev.target.value === "-") {
        cb(-1);
    } else {
        cb(parseInt(ev.target.value, 10));
    }
}

export async function fetchTile(x: number, y: number) {
    const url = `/tile/${toChunkX(x)}/${toChunkX(y)}.png`;
    const result = await fetch(url);
    const blob = await result.blob();
    const src = URL.createObjectURL(blob);
    const image = new Image();
    image.src = src;
    return new Promise<HTMLImageElement>((resolve, reject) => {
        image.addEventListener("load", () => {
            URL.revokeObjectURL(src);
            resolve(image);
        });
        image.addEventListener("error", () => {
            URL.revokeObjectURL(src);
            reject(new Error("Unable to load image"));
        });
    });
}

export function isOldMural(mural: MuralOld | Mural): mural is MuralOld {
    return "pixels" in mural;
}

export function convertOldMuralToNewMural(mural: MuralOld) {
    const height = mural.pixels.length;
    const width = mural.pixels[0].length;
    const predictedSize = mural.pixels.length * mural.pixels[0].length;
    const array = new Int8Array(predictedSize);
    let k = 0;
    for (let i = 0; i < mural.pixels.length; i++) {
        for (let j = 0; j < mural.pixels[i].length; j++) {
            array[k++] = mural.pixels[i][j];
        }
    }
    return new Mural(mural.name, mural.x, mural.y, width, height, array);
}

