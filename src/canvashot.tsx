import saveAs from "file-saver";
import { createCanvas, CHUNK_SIZE, fetchTile } from "./utils";
import { Coordinates } from "./coordinates";
import { Rect } from "./interfaces";
import { Popup } from "./UI/components/Popup";
import React from "react";

export function getSelectionArea() {
    return new Promise<Rect>(resolve => {
        const curtain = document.createElement("div");
        const selectionSquare = document.createElement("div");
        const cs = curtain.style;
        cs.position = "fixed";
        cs.zIndex = "100000";
        cs.left = cs.top = "0";
        cs.width = `${window.innerWidth}px`;
        cs.height = `${window.innerHeight}px`;
        document.body.appendChild(curtain);
        cs.backgroundColor = "rgba(0, 0, 0, 0.50)";

        const sss = selectionSquare.style;
        sss.position = "fixed";
        sss.zIndex = "100001";
        sss.width = `5px`;
        sss.height = `5px`;
        sss.border = "2px solid white";

        let moving: { x: number, y: number, xOff: number, yOff: number } | undefined = undefined;
    
        const setMoving = (clientX: number, clientY: number, offsetX: number, offsetY: number) => {
            moving = {
                x: clientX,
                y: clientY,
                xOff: offsetX,
                yOff: offsetY,
            };
        };   
    
        const onMouseDown = (event: MouseEvent) => {
            setMoving(event.clientX, event.clientY, event.offsetX, event.offsetY);
        };
        const onTouchStart = (event: TouchEvent) => {
            const lastTouch = event.touches[event.touches.length - 1];
            const div = event.target as HTMLDivElement;
            const { x, y, width, height} = div.getBoundingClientRect();
            const offsetX = (lastTouch.clientX - x) / width * div.offsetWidth;
            const offsetY = (lastTouch.clientY - y) / height * div.offsetHeight;
            setMoving(lastTouch.clientX, lastTouch.clientY, offsetX, offsetY);
        };
    
        const getRect = (x: number, y: number): Rect => {
            if (!moving) 
                return {x, y, width:0, height: 0 };
            const minX = Math.min(x, moving.x);
            const maxX = Math.max(x, moving.x);
            const minY = Math.min(y, moving.y);
            const maxY = Math.max(y, moving.y);
            const width = maxX - minX;
            const height = maxY - minY;
            return {
                x: Math.floor(minX), 
                y: Math.floor(minY), 
                width: Math.ceil(width),
                height: Math.ceil(height)
            };
        };

        const move = (x: number, y: number) => {
            if (!moving) return;
            if (!document.body.contains(selectionSquare)) {
                document.body.appendChild(selectionSquare);
            }
            const rect = getRect(x, y);
            const s = selectionSquare.style;
            s.width = `${rect.width}px`;
            s.height = `${rect.height}px`;
            s.left = `${rect.x}px`;
            s.top = `${rect.y}px`;
        };
    
        const onMouseMove = (event: MouseEvent) => {
            if (!moving) return;
            if (!(event instanceof MouseEvent)) {
                return;
            }
            const { clientX, clientY } = event;
            move(clientX, clientY);
        };
    
        const onTouchMove = (event: TouchEvent) => {
            if (!moving) return;
            if (!(event instanceof TouchEvent) || !event.isTrusted){
                return;
            }
            const touch = event.touches[0];
            sss.borderWidth = "6px";
            if (touch) {
                const { clientX, clientY } = touch;
                move(clientX, clientY);
            }
        };
        const eventEnd = (x: number, y: number) => {
            if (moving) {
                const rect = getRect(x, y);
                moving = undefined;
   
                window.removeEventListener("mousedown", onMouseUp);
                window.removeEventListener("touchend", onTouchEnd);
                window.removeEventListener("mousedown", onMouseDown);
                window.removeEventListener("touchstart", onTouchStart);
                window.removeEventListener("mouseup", onMouseMove);
                window.removeEventListener("touchmove", onTouchMove);
                document.body.removeChild(curtain);
                if (document.body.contains(selectionSquare)) {
                    document.body.removeChild(selectionSquare);
                }
                resolve(rect);
            }
        };
    

        const onTouchEnd = (event: TouchEvent) => {
            const touch = event.touches[0] || event.changedTouches[0];
            if (touch) {
                const { clientX, clientY } = touch;
                eventEnd(clientX, clientY);
            }
        };

        const onMouseUp = (event: MouseEvent) => {
            eventEnd(event.clientX, event.clientY);
        };
    
        window.addEventListener("mouseup", onMouseUp);
        window.addEventListener("touchend", onTouchEnd);
        window.addEventListener("mousedown", onMouseDown);
        window.addEventListener("touchstart", onTouchStart);
        window.addEventListener("mousemove", onMouseMove);
        window.addEventListener("touchmove", onTouchMove);

    });
}

export async function takeCanvasShot(coordinates: Coordinates) {
    const rect = await getSelectionArea();
    const s = coordinates.uScale;
    const cords = coordinates.screenToGrid(rect.x, rect.y);
    const cordsEnd = coordinates.screenToGrid(rect.x + rect.width, rect.height + rect.y);
    if (!cords || !cordsEnd) {
        return; // unavailable
    }
    const canvas = createCanvas();
    canvas.width = rect.width / Math.pow(2, s);
    canvas.height = rect.height / Math.pow(2, s);
    const ctx = canvas.getContext("2d")!;
    const offX = Math.floor((cords.x % (CHUNK_SIZE)));
    const offY = Math.floor((cords.y % (CHUNK_SIZE)));
    const awaiters: Promise<void>[] = [];
    for (let x = 0; x < rect.width + CHUNK_SIZE; x += CHUNK_SIZE) {
        for (let y = 0; y < rect.height + CHUNK_SIZE; y += CHUNK_SIZE) {
            const promise = new Promise<void>((resolve, reject) => {
                fetchTile(cords.x + x, cords.y + y).then(image => {
                    const offXX = cords.x > 0 ? -offX : (-(CHUNK_SIZE + (offX)) % CHUNK_SIZE);
                    const offYY = cords.y > 0 ? -offY : (-(CHUNK_SIZE + (offY)) % CHUNK_SIZE);
                    ctx.drawImage(image, x + offXX, y + offYY);
                    resolve();
                }).catch(reject);

            });
            awaiters.push(promise);
        }
    }
    try {
        await Promise.all(awaiters);
        const url = canvas.toDataURL();
        Popup.custom(<img style={{border: "1px solid black"}} src={url} />, [{
            content: "Download",
            click: () => {
                canvas.toBlob(blob => {
                    const xCenter=  Math.floor(cords.x + rect.width / 2);
                    const yCenter =  Math.floor(cords.x + rect.height / 2);
                    if (blob) {
                        saveAs(blob, `${xCenter}:${yCenter}:${new Date().toLocaleDateString()}.png`);
                    }
                });
            }
        }, {
            content: "Cancel",
            click: () => {}
        }
        ]);
    } catch(error) {
        Popup.alert("Something went wrong while trying to capture screenshot");
    }
}