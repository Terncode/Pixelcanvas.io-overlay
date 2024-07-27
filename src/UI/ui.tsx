import { Palette } from "../lib/palette";
import { Store } from "../lib/store";
import React from "react";
import { Coordinates } from "../lib/coordinates";
import { Storage } from "../lib/storage";
import { Main } from "./components/main";
import { createRoot } from "react-dom/client";
import { PixelPlaced } from "../lib/pixelPlaced";
import { PixelCount } from "./components/pixelCount";

export function createUI(store: Store, storage: Storage, cords: Coordinates, palette: Palette, pixels: PixelPlaced) {
    const unmounts = [
        appendWindow(<PixelCount pixelCount={pixels} />),
        appendWindow(<Main cords={cords} store={store} storage={storage} palette={palette}/>),
    ]; 
    return () => {
        return unmounts.map(e => e());
    };
}

function appendWindow(children: React.ReactNode) {
    const rootElement = document.createElement("div")!;
    createRoot(rootElement).render(children);
    document.body.appendChild(rootElement);
    return () => {
        rootElement.parentElement?.removeChild(rootElement);
    };
}
