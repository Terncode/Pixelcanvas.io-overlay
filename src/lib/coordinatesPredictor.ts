import { CHUNK_SIZE } from "../constants";
import { Coordinates, CordType } from "./coordinates";

export class CoordinatePredictor {
    private frame?: number;
    tileRef?: HTMLCanvasElement;
    private lastX?: number;
    private lastY?: number;
    private lastScale?: number;
    private cords: number[];

    constructor(
        private coordinates: Coordinates,
        private predict: (x: number, y: number, scale: number) => void
    ) {
        coordinates.on(CordType.Url, (x, y, scale) => {
            if (this.cords) {
                this.cords[0] = x;
                this.cords[1] = y;
                this.cords[2] = scale;
            } else {
                this.cords = [x, y, scale];
            }
        });

    }

    private cordUpdate = (x: number, y: number, s: number) => {
        this.cords = [x, y, s];
    };
    syncCords() {
        const cords = this.coordinates;
        this.cordUpdate(cords.ux, cords.uy, cords.uScale);  
    }
    enable() {
        if (this.frame)
            return;

        this.syncCords();
        this.coordinates.on(CordType.Url, this.cordUpdate);
        this.frame = requestAnimationFrame(this.tick);
    }
    disable() {
        if (this.frame) {
            this.coordinates.off(CordType.Url, this.cordUpdate);
            cancelAnimationFrame(this.frame);
            this.frame = undefined;
        }
    }
    get enabled() {
        return !!this.frame;
    }
    tick = () => {
        if (!this.tileRef || !document.body.contains(this.tileRef)) {
            this.tileRef = [...document.getElementsByTagName("canvas")]
            .find(e => e.classList.contains("leaflet-tile"));
            
            if (this.tileRef) {
                const rect = this.tileRef?.getBoundingClientRect();
                if (rect) {
                    this.syncCords();
                    this.lastScale = this.getScale(rect.width);
                    this.lastX = rect?.left;
                    this.lastY = rect?.top;
                }
                this.nextFrame();
                return;
            }
        } else {
            const rect = this.tileRef?.getBoundingClientRect();
            if (rect) {
                if (this.lastX != null && this.lastY != null && this.lastScale != null) {
                    const scale = this.getScale(rect.width);
                    const x = rect?.left;
                    const y = rect?.top;
                    if (x !== this.lastX || y !== this.lastY || scale != this.lastScale) {
                        const mx = this.lastX - rect?.left;
                        const my = this.lastY - rect?.top;
                        //const ms = this.lastScale - this.lastScale;
                        // console.log(this.lastX - rect?.left, this.lastY - rect?.top, scale);
                        // console.log(x / this.lastScale);
                        // console.log(y / this.lastScale);
                        this.lastX = x;
                        this.lastY = y;
                        this.lastScale = scale;
                        this.cords[0] += (mx /  (rect.width / CHUNK_SIZE));
                        this.cords[1] += (my /  (rect.width / CHUNK_SIZE));
                        this.predict(this.cords[0], this.cords[1], this.cords[2]);
                        this.cords[2] = scale;
                    }
                }
            }
        }


       this.nextFrame();
    };

    private nextFrame() {
        if (this.frame) {
            this.frame = requestAnimationFrame(this.tick);
        }
    }

    private getScale(width: number) {
        const scale = width / CHUNK_SIZE;
        return Math.log(scale) / Math.log(2);
    }

    //   private get centerCanvas() {
    //     const hww = window.innerWidth / 2; 
    //     const hhw = window.innerHeight / 2;
    //     const canvasObject = [
    //         ...document.getElementsByTagName("canvas")]
    //         .filter(c => c.classList.contains("leaflet-tile"))
    //         .map(c => {
    //         const bounds = c.getBoundingClientRect();
    //         return {
    //             canvas: c,
    //             bounds: {
    //                 width: bounds.width,
    //                 height: bounds.height,
    //                 top: bounds.top,
    //                 bottom: bounds.bottom,
    //                 left: bounds.left,
    //                 right: bounds.right,
    //             },
    //         };
    //     }).find(r => hww > r.bounds.left && hww < r.bounds.right && hhw > r.bounds.top && hhw < r.bounds.bottom);

    //     if (canvasObject) {
    //         const ratio = canvasObject.canvas.width / CHUNK_SIZE;
    //         if (ratio === 2) { // scale -1
    //             const hw = canvasObject.bounds.left + canvasObject.bounds.width / 2;
    //             const hh = canvasObject.bounds.top + canvasObject.bounds.height / 2;
    //             const chunkW = CHUNK_SIZE / canvasObject.canvas.width;
    //             const chunkH = CHUNK_SIZE / canvasObject.canvas.height;
    //             canvasObject.bounds.width = chunkW;
    //             canvasObject.bounds.height = chunkH; 

    //             if (hww <= hw && hhw <= hh) {
    //                 // top left
    //             } else if (hww > hw && hhw < hh) {
    //                 // top right
    //                 canvasObject.bounds.top += chunkW;
    //             } else if (hww > hw && hhw > hh) {
    //                 // bottom left
    //                 canvasObject.bounds.left += chunkH;
    //             } else {
    //                 // bottom left right
    //                 canvasObject.bounds.left += chunkW;
    //                 canvasObject.bounds.top += chunkH;
    //             }  
    //             canvasObject.bounds.bottom = canvasObject.bounds.top + chunkW;
    //             canvasObject.bounds.right = canvasObject.bounds.left + chunkH;   
    //             return null;
    //         }
    //         canvasObject.bounds.width /= ratio;
    //         canvasObject.bounds.height /= ratio; 
    //         canvasObject.bounds.right = canvasObject.bounds.left + canvasObject.bounds.width;
    //         canvasObject.bounds.bottom = canvasObject.bounds.bottom + canvasObject.bounds.height;
    //     }

    //     return canvasObject;
    // }
}