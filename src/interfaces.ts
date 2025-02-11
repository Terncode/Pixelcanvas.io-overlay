import { Mural } from "./lib/mural";

export interface RGB {
    r: number;
    g: number;
    b: number;
}

export interface MuralOld {
    name: string;
    pixels: number[][];
    x: number;
    y: number;
}

export interface MuralStatus {
    total: number;
    good: number;
    bad: number;
}

export interface LoadUnload {
    load: () => Promise<void> | void;
    unload: () => Promise<void> | void;
}

export interface MuralEx {
    mural: Mural;
    ref: HTMLCanvasElement;
    pixelCount: number;
}

export interface Point {
    x: number;
    y: number;
}

export interface Rect {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface ImportOutputMural {
    type: "mural", 
    data: Mural
}

export interface ImportOutputImage {
    type: "image", 
    data: HTMLImageElement;
}

export type ImportOutput = ImportOutputImage | ImportOutputMural;
