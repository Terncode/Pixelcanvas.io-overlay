
import React from "react";
import { ImportOutput, MuralOld, RGB } from "../interfaces";
import { canvasToImageData, convertOldMuralToNewMural, createMuralExtended, getColorScore, getExtension,
    imageDataToPaletteIndices, imageToCanvas, loadImageSource, processNumberEvent,
    readAsArrayBuffer,
    readAsDataUrl, readAsString, resize, rgb } from "../lib/utils";
import styled from "styled-components";
import { Popup } from "./components/Popup";
import RgbQuant, { DitheringKernel, RGBQuantOptions } from "rgbquant";
import { Border, Btn, Input } from "./styles";
import { CanvasToCanvasJSX } from "./components/canvasToCanvasJSX";
import { Palette } from "../lib/palette";
import { FileInput } from "../lib/fileinput";
import { Store } from "../lib/store";
import { Coordinates } from "../lib/coordinates";
import { Mural } from "../lib/mural";
import JSZip from "jszip";

export const TEXT_FORMATS = ["muraljson", "json"];
export const BIN_FORMATS = ["pcm", "bin"];

// TODO: Add bundle
//export const BIN_BUNDLE_FORMATS = ["pcmb"];
export const ZIP_FORMATS = ["zip"];


enum RetrieveType {
    Uint8Array = 1,
    IndexedArray = 2,
}

const LOW_ALPHA = 25;

const Flex = styled.div`
    width: 100%;
    //max-width: fit-content;
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
`;

const Flex2 = styled.div`
    display: flex;
    flex-direction: column;
    flex-wrap: wrap;
    border: 1px solid white;
    cursor: pointer;
    margin: 2px;
    padding: 2px;
    text-align: center;
    align-items: center;
`;


type DitheringKernelEx = DitheringKernel | "Flat";
interface QuantResult {
    type: DitheringKernelEx;
    canvas: HTMLCanvasElement;
    indices: Int8Array;
}

type DitherSetting = DitheringKernel | "Flat" | "show-all";

const KERNELS: DitheringKernel[] = [
    "FloydSteinberg",
    "FalseFloydSteinberg",
    "Stucki",
    "Atkinson",
    "Jarvis",
    "Burkes",
    "Sierra",
    "TwoSierra",
    "SierraLite",
];

const ditherSettings: DitherSetting[] = [
    "Flat",
    ...KERNELS
];

export interface ImageToMuralOptions {
    height: number;
    width: number;
    noShrinking: boolean;
    quantizerSetting: DitherSetting;
}

export async function importArtWorks(
    store: Store, cords: Coordinates, palette: Palette
): Promise<Mural[]>  {
    const files = await importFiles();
    const output: Mural[] = [];
    for (const file of files) {
        if (file.type === "mural") {
            output.push(file.data);
        } else {
            const img = file.data;
            const pixels = await imageToMural(img, palette);
            const x = Math.floor(cords.ux - (img.width / 2));
            const y = Math.floor(cords.uy - (img.height / 2));
            const fakeMural = new Mural(img.alt, x, y, img.width, img.height, pixels);
            const muralExtended = createMuralExtended(fakeMural, palette.hex);
            const mural = await new Promise<Mural>((resolve, reject)=> {
                store.setOverlayModify({
                    mural: muralExtended,
                    muralModify: {
                        name: img.alt,
                        x,
                        y,
                    },
                    cb: (name, x, y, confirm) => {
                        if (confirm) {
                            const mural = new Mural(name, x,y,img.width, img.height, pixels);
                            resolve(mural);
                        } else {
                            reject(new Error("Canceled by user"));
                        }
                    }
                });
            });
            output.push(mural);
        }
    }
    return output;
}

export function getQuantizedObjFromUser(quantized: QuantResult[]) {
    return new Promise<QuantResult | null>(r => {
        Popup.custom(
            <div>
                <h4>Dither results</h4>
                <div>Pick a result that fits best in your situation</div>
                <Flex>
                    {quantized.map((q, i) => {
                        return (
                            <div key={i}>
                                <Flex2 style={{flexDirection :"column"}}
                                    onClick={() => {
                                        Popup.close();
                                        r(q);
                                    }}
                                >
                                    {ditheringKernelToName(q.type)}
                                    <Border>
                                        <CanvasToCanvasJSX canvas={q.canvas} />
                                    </Border>
                                </Flex2>
                            </div>
                        );
                    })}
                </Flex>
            </div>,
            [{ content: "Cancel", click: () => {} }],
        ).finally(() => r(null));
    });
}


async function imageToMural(image: HTMLImageElement, palette: Palette) {
    const settings = await getImageSettingFromUser(image);
    const quantized = await imageToQuantized(image, settings, palette);
    let selector: QuantResult | null | undefined;
    if (Array.isArray(quantized)) {
        selector = await getQuantizedObjFromUser(quantized);
    } else {
        selector = quantized;
    }
    if (!selector) {
        throw new Error("User did not pick anything");
    }

    const imageData = canvasToImageData(selector.canvas);
    flatQuantizeImageData(imageData, palette);
    return imageDataToPaletteIndices(imageData, palette.palette);
}



export async function getImageSettingFromUser(
    image: HTMLImageElement
): Promise<ImageToMuralOptions> {
    let width = image.width;
    let height = image.height;
    let useQuantizer: DitherSetting = "show-all";
    let noShrinking = false;
    let canceled = false;

    await new Promise<void>((resolve, reject) => {
        Popup.custom(
            <div>
                <h4>Image import</h4>
                <div>
                    <small>{image.alt}</small>
                </div>
                <div style={{ whiteSpace: "pre-wrap" }}>
                    You are importing image with size {image.width}x{image.height}.{"\n"}
                    Do you want to preform any image manipulations?
                </div>
            </div>,
            [
                {
                    click: () => {
                        noShrinking = false;
                        resolve();
                    },
                    content: "Resize",
                },
                {
                    click: () => {
                        noShrinking = true;
                        resolve();
                    },
                    content: "Import as it is",
                },
                {
                    click: () => {
                        canceled = true;
                        resolve();
                    },
                    content: "Cancel",
                },
            ],
        ).then(() => {
            reject(new Error("User input has been interrupted"));
        });
    });

    if (canceled) {
        throw new Error("Operation canceled by user");
    }

    if (!noShrinking) {
        await new Promise<void>((resolve, reject) => {
        
            Popup.custom(
                <div>
                    <h4>Image import</h4>
                    <div>
                        <small>{image.alt}</small>
                    </div>
                    <div>
                        <strong>
                            Original size: {image.width}x{image.height}
                        </strong>
                    </div>
                    <Input
                        type='number'
                        min={1}
                        onChange={ev => {processNumberEvent(ev, n => {width = n;});}}
                    />
                    x
                    <Input
                         type='number'
                         min={1}
                         onChange={ev => {processNumberEvent(ev, n => {height = n;});}}
                    />
                </div>,
                [
                    {
                        content: "Confirm",
                        click: () => {
                            resolve();
                        },
                    },
                    {
                        content: "Cancel",
                        click: () => {
                            canceled = true;
                            resolve();
                        },
                    },
                ],
            ).then(() => reject(new Error("User input has been interrupted")));
        });
    }
    if (canceled) {
        throw new Error("Operation canceled by user");
    }
    await new Promise<void>((resolve, reject) => {
        Popup.custom(
            <div>
                <h4>Dither Settings</h4>
                <div>Pickup dither algorithm</div>
                <Flex>
                    {ditherSettings.map((q, i) => {
                        return (
                            <Btn
                                key={i}
                                onClick={() => {
                                    useQuantizer = q;
                                    Popup.close();
                                    resolve();
                                }}
                            >
                                {ditheringKernelToName(q)}
                            </Btn>
                        );
                    })}
                </Flex>
            </div>,
            [
                {
                    content: "Show all",
                    click: () => {
                        useQuantizer = "show-all";
                        resolve();
                    },
                },
                {
                    content: "Cancel",
                    click: () => {
                        canceled = true;
                        resolve();
                    },
                },
            ],
        ).then(() => reject(new Error("User input has been interrupted")));
    });

    if (canceled) {
        throw new Error("Operation canceled by user");
    }
    return { height, width, noShrinking, quantizerSetting: useQuantizer };
}


export async function imageToQuantized(
    image: HTMLImageElement, options: ImageToMuralOptions, palette: Palette
) {
    if (!options.noShrinking) {
        image = await resize(image, options.width, options.height);
    }
    const canvas = imageToCanvas(image);
    if (options.quantizerSetting === "show-all") {
        return quantizeAll(canvas, palette);
    }
    return quantizeOne(canvas, options.quantizerSetting, palette);
}

function prepareQuant(canvas: HTMLCanvasElement, palette: Palette) {
    const data = new RgbQuant(createQuantOptions(palette)) as RgbQuant;
    data.sample(canvas);
    return data;
}

function createQuantOptions(palette: Palette): RGBQuantOptions {
    return {
        palette: palette.palette.map(c => [c.r, c.g, c.b]),
        minHueCols: 0,
        dithSerp: false,
    };
    
}


export function quantizeAll(canvas: HTMLCanvasElement, palette: Palette) {
    const images: QuantResult[] = [quantizeOne(canvas, "Flat", palette)];
    const quant = prepareQuant(canvas, palette);
    for (const kernel of KERNELS) {
        const image = quantizeImage(canvas, quant, kernel);
        const result = quantizeOne(image, "Flat", palette);
        result.type = kernel;
        images.push(result);
    }
    return images;
}


export function quantizeOne(
    canvas: HTMLCanvasElement, kernel: DitheringKernelEx, palette: Palette
): QuantResult {
    if (kernel === "Flat") {
        const imageData = canvasToImageData(canvas);
        flatQuantizeImageData(imageData, palette);
        const redrawn = imageDataToCanvas(imageData);
        const indices = imageDataToPaletteIndices(imageData, palette.palette);
        return {
            type: "Flat",
            canvas: redrawn,
            indices,
        };
    } else {
        const quant = prepareQuant(canvas, palette);
        const output = quantizeImage(canvas, quant, kernel);
        const flatOutput = quantizeOne(output, "Flat", palette);
        flatOutput.type = kernel;
        return flatOutput;
    }
}

export function ditheringKernelToName(kernel: string) {
    const arr = kernel.split("");

    let stringBuilder = "";
    for (let i = 0; i < arr.length; i++) {
        const char = arr[i];
        if (char) {
            if (i !== 0) {
                if (char === char.toUpperCase()) {
                    stringBuilder += " ";
                    stringBuilder += char.toLowerCase();
                } else {
                    stringBuilder += char;
                }
            } else {
                stringBuilder += char;
            }
        }
    }
    return stringBuilder;
}

function quantizeImage(
    canvas: HTMLCanvasElement, rgbQuant: RgbQuant, ditheringKernel: DitheringKernel
) {
    // create canvas;
    const drawCanvas = document.createElement("canvas");
    drawCanvas.width = canvas.width;
    drawCanvas.height = canvas.height;
    const drawCtx = drawCanvas.getContext("2d")!;

    const imageData = canvasToImageData(canvas);

    const data = rgbQuant.reduce(canvas, RetrieveType.Uint8Array, ditheringKernel)!;
    if (imageData.data.length !== data.length) {
        throw new Error("Got unexpected data from regQuant");
    }
    for (let i = 0; i < imageData.data.length; i += 4) {
        if (imageData.data[i + 3]! > LOW_ALPHA) {
            imageData.data[i + 0] = data[i + 0] ?? 0;
            imageData.data[i + 1] = data[i + 1] ?? 0;
            imageData.data[i + 2] = data[i + 2] ?? 0;
            imageData.data[i + 3] = 0xff;
        }
    }

    drawCtx.putImageData(imageData, 0, 0);
    return drawCanvas;
}

export function flatQuantizeImageData(imageData: ImageData, palette: Palette) {
    for (let i = 0; i < imageData.data.length; i += 4) {
        const r = imageData.data[i + 0] ?? 0;
        const g = imageData.data[i + 1] ?? 0;
        const b = imageData.data[i + 2] ?? 0;
        const a = imageData.data[i + 3] ?? 0;
        const obj = rgb(r, g, b);
        const index = findClosestIndexColor(obj, palette);
        const color = palette.palette[index];
        if (!color) throw new Error(`Unknown color index ${index}`);
        imageData.data[i + 0] = color.r;
        imageData.data[i + 1] = color.g;
        imageData.data[i + 2] = color.b;
        imageData.data[i + 3] = a;
    }
}

export function findClosestIndexColor(rgbO: RGB, palette: Palette) {
    const scores: number[] = [];

    for (const rgb of palette.palette) {
        const r = getColorScore(rgbO.r, rgb.r);
        const g = getColorScore(rgbO.g, rgb.g);
        const b = getColorScore(rgbO.b, rgb.b);
        scores.push(r + g + b);
    }
    const lowest = Math.min(...scores);
    const index = scores.indexOf(lowest);
    return index;
}

export function imageDataToCanvas(imageData: ImageData) {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    ctx.putImageData(imageData, 0, 0);
    return canvas;
}

async function importFiles(): Promise<ImportOutput[]> {
    const fileInput = new FileInput();
    const images = ["png", "jpg", "jpeg"];
    fileInput.setAcceptType([...images, ...TEXT_FORMATS, ...BIN_FORMATS, ...ZIP_FORMATS]);
    fileInput.allowMultiple(true);
    const files = await fileInput.show();
    const filteredFiles = [...files].filter(e => e);
    if (!filteredFiles.length) {
        throw new Error("Empty file");
    }
    const imagesFiles = filteredFiles
        .filter(e => images.some(r => e.name.toLowerCase().endsWith(r)));

    if (imagesFiles.length > 1) {
        throw new Error("Only one image files allowed to be imported at the time");
    }

    const zips = filteredFiles.filter(e => ZIP_FORMATS.some(z => e.name.toLocaleLowerCase().endsWith(z)));


    for (const zip of zips) {
        const index = filteredFiles.indexOf(zip);
        filteredFiles.splice(index, 1);

        const data = await JSZip.loadAsync(zip);
        for (const fileName of Object.keys(data.files)) {
            const file = fileName.split("/");
            const actualName = file[file.length - 1];
            if ([ ...TEXT_FORMATS, ...BIN_FORMATS].some(e => actualName.toLowerCase().endsWith(e))) {
                const blob = await data.files[fileName].async("blob"); // or "text", "arraybuffer"
                filteredFiles.push(new File([blob], fileName));
            }
        }
    }

    const output: ImportOutput[] = [];
    for (const file of filteredFiles) {
        const ex = getExtension(file.name);
        const etn = ex.ex.toLowerCase();
        const name = ex.text;
        if (TEXT_FORMATS.includes(etn)) {
            const content = await readAsString(file);
            const mural = JSON.parse(content) as MuralOld;
            if (!mural.name) {
                mural.name = await Popup
                    .prompt("Missing name for this mural. Please enter it manually", name) || "";
            }

            output.push({
                type: "mural",
                data: convertOldMuralToNewMural(mural),
            });
        } else if (BIN_FORMATS.includes(etn)) {
            const buffer = await readAsArrayBuffer(file);
            const mural = await Mural.from(new Uint8Array(buffer));
            output.push({
                type: "mural",
                data: mural,
            });
        } else {
            const readData = await readAsDataUrl(file);
            output.push({
                type: "image",
                data: await loadImageSource(`${ex.text}.${ex.ex}`, readData),
            });
        }
    }
    return output;
}