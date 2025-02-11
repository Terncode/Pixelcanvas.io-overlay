import { BasicEventEmitter, Listener } from "./eventEmitter";
import { LoadUnload, MuralEx, MuralOld } from "../interfaces";
import { Palette } from "./palette";
import { Storage } from "./storage";
import localforage from "localforage";
import { 
    convertOldMuralToNewMural, createMuralExtended,
    pushUnique, removeItem
} from "./utils";
import { Mural } from "./mural";

export enum StoreEvents {
    MuralAdd = 1,
    MuralRemoved,
    MuralUpdated,
    MuralSelect,
    MuralOverlay,
    MuralPhantomOverlay,
    Any,
}

export interface OverlayReturn {
    mural: MuralEx;
    muralObj?: Partial<Mural>;
    cb: (name: string, x: number, y: number, confirm?: boolean) => void; 
}

export class Store implements LoadUnload {
    private readonly STORAGE_KEY_MURAL = "_murals";
    private readonly STORAGE_KEY_SELECTED = "_mural";
    private _murals: MuralEx[] = [];
    private _selected?: MuralEx;
    private emitter = new BasicEventEmitter();
    private _overlayIndices: number[] = [];
    private _phantomOverlay = -1;
    private _overlayModify?: OverlayReturn;
    private db = localforage.createInstance({
        name: "pixel-canvas-overlay"
      });
    
    constructor(private storage: Storage, private palette: Palette) {}

    async load() {
        console.log("loaded");
        this._murals  = [];
        const rawMurals = await this.db.getItem<Uint8Array[]>(this.STORAGE_KEY_MURAL) || [];
        
        const murals = await Promise.all(rawMurals.map(e => Mural.from(e)));
        // backwards compatibility
        const oldMurals = await this.storage.getItem<MuralOld[]>(this.STORAGE_KEY_MURAL);
        if (oldMurals) {
            for (const old of oldMurals) {
                const mural = convertOldMuralToNewMural(old);
                murals.push(mural);
            }
            const muralBuffer = await Promise.all(murals.map(e => e.getBuffer()));
            this.storage.removeItem(this.STORAGE_KEY_MURAL);
            this.db.setItem(this.STORAGE_KEY_MURAL, muralBuffer);
        }

        //const murals = await this.storage.getItem<Uint8Array[]>(this.STORAGE_KEY_MURAL);

        for (const mural of murals) {
            this._murals.push(createMuralExtended(mural, this.palette.hex));
        }


        const index = await this.storage.getItem<number>(this.STORAGE_KEY_SELECTED) ?? -1;
        if (index != null) {
            this.select(this._murals[index]);
            this.storage.removeItem(this.STORAGE_KEY_SELECTED);
            await this.db.setItem(this.STORAGE_KEY_SELECTED, index);
        } else {
            const index = await this.db.getItem<number>(this.STORAGE_KEY_SELECTED);
            if (index != null) {
                this.select(this._murals[index]);
            }
        }
    }
    updateMural(_mural: Mural) {
        this.save();
        this.emit(StoreEvents.MuralUpdated);
    }
    unload() {
        this.save();
    }
    add(mural: Mural) {
        const m = createMuralExtended(mural, this.palette.hex);
        this._murals.push(m);
        this.emit(StoreEvents.Any);
        this.save();
    }

    remove(mural: MuralEx) {
        this._overlayIndices = [];
        this._overlayModify = undefined;
        this._phantomOverlay = -1; 
        if (this._selected && this._selected === mural) {
            this._selected = undefined;
        }
        removeItem(this._murals, mural);
        this.emit(StoreEvents.MuralRemoved);
        this.save();
    }
    addOverlay(mural: MuralEx) {
        const index = this._murals.indexOf(mural);
        if (index !== -1) {
            pushUnique(this._overlayIndices, index);
            if (this._phantomOverlay === index) {
                this._phantomOverlay = -1;
            }
        }
        this.emit(StoreEvents.MuralOverlay);
        this.save();
    }
    removeOverlay(mural: MuralEx) {
        const index = this._murals.indexOf(mural);
        if (index !== -1) {
            removeItem(this._overlayIndices, index);
        }
        this.emit(StoreEvents.MuralOverlay);
        this.save();
    }
    setOverlayModify(overlay: OverlayReturn) { // WTF?
        this._overlayModify = overlay;
        const cb = overlay.cb;
        overlay.cb = (name, x, y, done) => {
            cb(name, x, y, done);
            this._overlayModify = undefined;
            this.emit(StoreEvents.MuralOverlay);
        };
        this.emit(StoreEvents.MuralOverlay);
    }
    hasOverlay(mural: MuralEx) {
        const index = this._murals.indexOf(mural);
        return this._overlayIndices.includes(index);
    }

    select(mural: MuralEx | undefined) {
        this._selected = mural;
        this.emit(StoreEvents.MuralSelect);
        this.save();
    }

    async save() {
        const muralBuffer = await Promise.all(this._murals.map(e => e.mural.getBuffer()));
        this.db.setItem(this.STORAGE_KEY_MURAL, muralBuffer);
        const selected = this._selected ? this._murals.indexOf(this._selected) : -1;
        await this.db.setItem(this.STORAGE_KEY_SELECTED, selected);
    }
    addPhantomOverlay(mural: MuralEx) {
        const index = this._murals.indexOf(mural);
        if (index !== this._phantomOverlay && !this._overlayIndices.includes(index)) {
            this._phantomOverlay = index;
            this.emit(StoreEvents.MuralPhantomOverlay);
        }
    }
    removePhantomOverlay() {
        if (this._phantomOverlay !== -1) {
            this._phantomOverlay = -1;
            this.emit(StoreEvents.MuralPhantomOverlay);
        }
    }
    get murals() {
        return this._murals;
    }
    get overlays() {
        return this._overlayIndices;
    }
    get phantomOverlay() {
        return this._phantomOverlay;
    }
    get overlayModify() {
        return this._overlayModify;
    }
    get selected() {
        return this._selected;
    }
    on(event: StoreEvents, listener: Listener<[Store]>) {
        this.emitter.on(event, listener);
    }
    off(event: StoreEvents, listener: Listener<[Store]>) {
        this.emitter.off(event, listener);
    }
    private emit(event: StoreEvents) {
        this.emitter.emit(event, this);
        this.emitter.emit(StoreEvents.Any, this);
    }
}