import { INJECT_SCRIPT_PIXEL_OBSERVER } from "../constants";
import { BasicEventEmitter } from "./eventEmitter";
import { Store } from "./store";

interface Pixel {
    x: number;
    y: number;
    color: number;
}

export class PixelPlaced {
    private static instance: PixelPlaced;
    private constructor(public readonly store: Store) {
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
        (document as any)
            .addEventListener("__pixelsPlaced", (event: CustomEvent<Pixel>) => {
                const body = event.detail;
                console.log(body);
                if (typeof body === "object" && "x" in body && "y" in body && "color" in body
                    && typeof body.color === "number" && typeof body.x === "number" 
                    && typeof body.y === "number"
                ) {
                const data = event.detail;
                this.store.addPixelLog(data.x, data.y, data.color);
            }
        });
    }

    static create(store: Store) {
        if (!this.instance) {
            this.instance = new PixelPlaced(store);
        }
        return this.instance;
    }
    getCount() {
        return this.store.getPixelCount();
    }
    
}