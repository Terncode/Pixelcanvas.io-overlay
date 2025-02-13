import { CHUNK_SIZE } from "../constants";
import { Listener, BasicEventEmitter } from "./eventEmitter";
import { InjectEvents, Injector } from "./injector";
import { waitForDraw } from "./utils";

export enum CordType {
  Div,
  Url  
}

export class Coordinates {
    private cords: HTMLDivElement;
    private emitter = new BasicEventEmitter();
    private observer: MutationObserver;
    private _x = 0;
    private _y = 0;
    private frame: number;

    private _ux = 0;
    private _uy = 0;
    private _uScale = 0;
    private down?: number[];
    //div: HTMLDivElement;
    constructor(injector: Injector) {
        injector.on(InjectEvents.UrlChange, url => {
            this.onUrlCordsUpdate(url);
        });
        this.onUrlCordsUpdate();

        window.addEventListener("touchstart", (event) => {
            if (event.target instanceof HTMLCanvasElement && event.touches.length === 1) {
                this.down = [event.touches[0].clientX, event.touches[0].clientY, this.ux, this.uy];
            }
        });
        window.addEventListener("touchmove", event => {
            if (this.down && event.touches.length === 1) {
                const mx = Math.round((this.down[0] - event.touches[0].clientX) / Math.pow(2, this._uScale));
                const my = Math.round((this.down[1] - event.touches[0].clientY) / Math.pow(2, this._uScale));
                const ux = this._ux;
                const uy = this._uy;
                this._ux = this.down[2] + mx,
                this._uy = this.down[3] + my;
                if (ux !== this._ux || uy !== this._uy) {
                    this.emitter.emit(CordType.Url, this._ux, this._uy, this._uScale);
                }
            }
        });
        window.addEventListener("touchend", () => {
            this.down = undefined;
        });
        window.addEventListener("mousedown", event => {
            if (event.target instanceof HTMLCanvasElement) {
                this.down = [event.x, event.y, this.ux, this.uy];
            }
        });
        window.addEventListener("mousemove", event => {
            if (this.down) {
                const mx = Math.round((this.down[0] - event.x) / Math.pow(2, this._uScale));
                const my = Math.round((this.down[1] - event.y) / Math.pow(2, this._uScale));
                const ux = this._ux;
                const uy = this._uy;
                this._ux = this.down[2] + mx,
                this._uy = this.down[3] + my;
                if (ux !== this._ux || uy !== this._uy) {
                    this.emitter.emit(CordType.Url, this._ux, this._uy, this._uScale);
                }
            }
        });
        window.addEventListener("mouseup", () => {
            this.down = undefined;
        });

        // window.addEventListener("wheel" , event => {
        //     const s = this._uScale;
        //     if (event.deltaY > 0) {
        //         this._uScale = s / 2;
        //     } else {
        //         this._uScale = s * 2;
        //     }
        // }, true);
    }

    on(event: CordType, listener: Listener<[number, number, number]>) {
        this.emitter.on(event, listener);
    }
    off(event: CordType, listener: Listener<[number, number, number]>) {
        this.emitter.off(event, listener);
    }

    async init() {
        while(!this.cords) {
            const cords = [...document.getElementsByTagName("div")].filter(e => e.textContent && e.textContent.match(/^\(\s*-?\d+\s*,\s*-?\d+\s*\)$/));
            for (const cord of cords) {
                if (cord.children.length === 0) {
                    this.cords = cord;
                    this.observer = new MutationObserver(() => {
                        this.updateDivCords();
                    });
                    this.observer.observe(cord, {
                        characterData: true,
                        subtree: true,
                    });
                    break;
                }
            }
            await waitForDraw();
        }
    }

    stop() {
        if (this.observer) {
            this.observer.disconnect();
        }
    }
 
    private get centerCanvas() {
        const hww = window.innerWidth / 2; 
        const hhw = window.innerHeight / 2;
        const canvasObject = [
            ...document.getElementsByTagName("canvas")]
            .filter(c => c.classList.contains("leaflet-tile"))
            .map(c => {
            const bounds = c.getBoundingClientRect();
            return {
                canvas: c,
                bounds: {
                    width: bounds.width,
                    height: bounds.height,
                    top: bounds.top,
                    bottom: bounds.bottom,
                    left: bounds.left,
                    right: bounds.right,
                },
            };
        }).find(r => hww > r.bounds.left && hww < r.bounds.right && hhw > r.bounds.top && hhw < r.bounds.bottom);

        if (canvasObject) {
            const ratio = canvasObject.canvas.width / CHUNK_SIZE;
            if (ratio === 2) { // scale -1
                const hw = canvasObject.bounds.left + canvasObject.bounds.width / 2;
                const hh = canvasObject.bounds.top + canvasObject.bounds.height / 2;
                const chunkW = CHUNK_SIZE / canvasObject.canvas.width;
                const chunkH = CHUNK_SIZE / canvasObject.canvas.height;
                canvasObject.bounds.width = chunkW;
                canvasObject.bounds.height = chunkH; 

                if (hww <= hw && hhw <= hh) {
                    // top left
                } else if (hww > hw && hhw < hh) {
                    // top right
                    canvasObject.bounds.top += chunkW;
                } else if (hww > hw && hhw > hh) {
                    // bottom left
                    canvasObject.bounds.left += chunkH;
                } else {
                    // bottom left right
                    canvasObject.bounds.left += chunkW;
                    canvasObject.bounds.top += chunkH;
                }  
                canvasObject.bounds.bottom = canvasObject.bounds.top + chunkW;
                canvasObject.bounds.right = canvasObject.bounds.left + chunkH;   
                return null;
            }
            canvasObject.bounds.width /= ratio;
            canvasObject.bounds.height /= ratio; 
            canvasObject.bounds.right = canvasObject.bounds.left + canvasObject.bounds.width;
            canvasObject.bounds.bottom = canvasObject.bounds.bottom + canvasObject.bounds.height;
        }

        return canvasObject;
    }
    get pixelSize() {
        return Math.pow(2, this.uScale);
    }
    screenToGrid(sx: number, sy: number) {
        const c = this.centerCanvas;
        if (!c) return null;
        const chunkX = Math.floor(this.ux / CHUNK_SIZE) * CHUNK_SIZE;
        const chunkY = Math.floor(this.uy / CHUNK_SIZE) * CHUNK_SIZE;
        const xx = ((sx - c.bounds.left) / this.pixelSize) + chunkX;
        const yy = ((sy - c.bounds.top) / this.pixelSize) + chunkY;
        return {x: xx, y: yy};
    }

    gridToScreen(gridX: number, gridY: number) {
        const c = this.centerCanvas;
        if (!c) return null;
        const chunkX = Math.floor(this.ux / CHUNK_SIZE) * CHUNK_SIZE;
        const chunkY = Math.floor(this.uy / CHUNK_SIZE) * CHUNK_SIZE;
        const screenX = (gridX - chunkX);
        const screenY = (gridY - chunkY);
    
        const x = c.bounds.left + (screenX * this.pixelSize);
        const y = c.bounds.top + (screenY * this.pixelSize);
        return { x, y };
    }

    updateURLcords(url?: string) {
        const pathNames = location.pathname.split("/").filter(e => e);
        const cordsRaw = url || pathNames[0];
        if (cordsRaw) {
            const cordsMatch = cordsRaw.match(/-?\d+/g);
            if (cordsMatch) {
                const cords = cordsMatch.map(n => parseInt(n));
                if (typeof cords[0] === "number" && typeof cords[1] === "number" && typeof cords[2] === "number") {
                    this._ux = cords[0];
                    this._uy = cords[1];
                    this._uScale = cords[2];
                    return cords;
                }
            }
        }
        return null;
    }

    private parse() {
        const arr = this.cords.textContent!.match(/-?\d+/g)!.map(n => parseInt(n));
        this._x = arr[0];
        this._y = arr[1];
    }

    updateDivCords() {
        const x = this._x;
        const y = this._y;
        this.parse();

        if (x !== this._x || y !== this._y) {
            this.emitter.emit(CordType.Div, this._x, this._y);
        }
    }
    onUrlCordsUpdate(url?: string) {
        const ux = this._ux;
        const uy = this._uy;
        const uScale = this._uScale;
        this.updateURLcords(url);
        this.down = undefined;
        if (ux !== this._ux || uy !== this._uy || uScale !== this._uScale) {
            this.emitter.emit(CordType.Url, this._ux, this._uy, this._uScale);
        }
    }

    get x() {
        return this._x;
    }
    get y() {
        return this._y;
    }

    get ux() {
        return this._ux;
    }
    get uy() {
        return this._uy;
    }
    get uScale() {
        return this._uScale;
    }
    get dragging() {
        return !!this.down;
    }
}