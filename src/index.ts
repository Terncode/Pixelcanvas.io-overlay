/// <reference path="patch.d.ts" />
import { Coordinates } from "./lib/coordinates";
import { Palette } from "./lib/palette";
import { createUI } from "./UI/ui";
import { waitForDraw } from "./lib/utils";
import { Storage } from "./lib/storage";
import { Store  } from "./lib/store";
import process from "process";
import { Injector } from "./lib/injector";

async function main() {
    globalThis.process = process;

    const palette = new Palette();
    while(!palette.init()) { await waitForDraw();}
    const storage = new Storage(ENVIRONMENT === "browser-extension");
    const store = new Store(storage, palette); 
    await store.load();
    const injector = new Injector(store);
    await injector.inject();
    const coordinates = new Coordinates();
    await coordinates.init();
    
    createUI(store,storage, coordinates, palette);

    console.log(
        "%cOverlay by 0xa663", 
        "color: red; font-size: 15px; font-weight: bold; text-shadow: 2px 2px 4px #000000;"
    );
    console.log(
        "%cTerncode's fork",
        `color: #4a94cc; font-size: 10px; font-weight: bold; text-shadow: 1px 1px 0px #000000, -1px 1px 0px #000000, 1px -1px 0px #000000, -1px -1px 0px #000000;`
    );
}

if (document.readyState === "complete") {
    main();
} else {
    window.addEventListener("load", main);
}