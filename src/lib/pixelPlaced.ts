import { INJECT_SCRIPT_PIXEL_OBSERVER } from "../constants";
import { BasicEventEmitter } from "./eventEmitter";
import { Storage } from "./storage";


export class PixelPlaced  {
    private emitter = new BasicEventEmitter();
    private static instance: PixelPlaced;
    private readonly storageKey = "__pixelsPlaced";
    private constructor(private storage: Storage) {
        // The website is logging pixels as object onto pixelsPlaced onto console with .log. 
        // With extension we need to cross 2 worlds. Adding artificial api to document

        const api = document.createElement("script");
        api.addEventListener("load", () => {
            document.body.removeChild(api);
        }, { once: true });
        api.addEventListener("error", error => {
            console.error(error);
        });
        
        if (ENVIRONMENT === "browser-extension") {
            api.src = chrome.runtime.getURL("/assets/scripts/inject.js");
        } else {
            api.textContent = INJECT_SCRIPT_PIXEL_OBSERVER;
        }
    
        document.body.appendChild(api);
        (document as any).addEventListener("__pixelsPlaced", (event: CustomEvent<number>) => {
            if (typeof event.detail === "number") {
                this.storage.setItem(this.storageKey, event.detail);
                this.emitter.emit(0, event.detail);
            }
        });
    }

    static create(storage: Storage) {
        if (!this.instance) {
            this.instance = new PixelPlaced(storage);
        }
        return this.instance;
    }

    on(fn: (count: number) => void) {
        this.emitter.on(0, fn);
    }
    off(fn: (count: number) => void) {
        this.emitter.off(0, fn);
    }
    get count() {
        return this.storage.getItem(this.storageKey);
    }
}