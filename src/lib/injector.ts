import { 
    EVENT_CROSS_WORLD_INJECTED,
    EVENT_CROSS_WORLD_PIXEL_PLACED,
    EVENT_CROSS_WORLD_URL_UPDATE,
    INJECT_SCRIPT_PIXEL_OBSERVER
} from "../constants";
import { BasicEventEmitter } from "./eventEmitter";
import { Store } from "./store";

interface Pixel {
    x: number;
    y: number;
    color: number;
}
export enum InjectEvents {
    PixelPlaced = 1,
    UrlChange
}


export class Injector {
    private eventEmitter = new BasicEventEmitter();
    
    constructor(private store: Store) {}

    inject() {
        const api = document.createElement("script");
        api.addEventListener("load", () => {
            document.body.removeChild(api);
        }, { once: true });
        api.addEventListener("error", error => {
            console.error(error);
        });
        return new Promise<void>((resolve, reject) => {
            const d = document as any;
            api.addEventListener("error", (error) => {
                reject(error.error);
            }, { once: true });
            d.addEventListener(EVENT_CROSS_WORLD_INJECTED, () => {
                resolve();
            }, { once: true});

            if (ENVIRONMENT === "browser-extension") {
                api.src = chrome.runtime.getURL("/assets/scripts/inject.js");
            } else {
                api.textContent = INJECT_SCRIPT_PIXEL_OBSERVER;
            }
            
            
            document.body.appendChild(api);
            d.addEventListener(EVENT_CROSS_WORLD_PIXEL_PLACED, (event: CustomEvent<Pixel>) => {
                    const body = event.detail;
                    if (typeof body === "object" && "x" in body && "y" in body && "color" in body
                        && typeof body.color === "number" && typeof body.x === "number" 
                        && typeof body.y === "number"
                    ) {
                    this.store.addPixelLog(body.x, body.y, body.color);
                    this.eventEmitter.emit(InjectEvents.PixelPlaced, body);
                }
            });
            d.addEventListener(EVENT_CROSS_WORLD_URL_UPDATE, (event: CustomEvent<string>) => {
                const body = event.detail;
                if (typeof body === "string") {
                    this.eventEmitter.emit(InjectEvents.UrlChange, body);
                }
            });
        });
    }
    on(event: InjectEvents.PixelPlaced, cb: (pixel: Pixel) => any): this;
    on(event: InjectEvents.UrlChange, cb: (url: string) => any): this;
    on(event: InjectEvents, cb: any) {
        this.eventEmitter.on(event, cb);
        return this;
    }
    off(event: InjectEvents.PixelPlaced, cb: (pixel: Pixel) => any): this;
    off(event: InjectEvents.UrlChange, cb: (url: string) => any): this;
    off(event: InjectEvents, cb: any) {
        this.eventEmitter.off(event, cb);
        return this;
    }

}