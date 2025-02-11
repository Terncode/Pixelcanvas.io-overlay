import { Coordinates, CordType } from "../../lib/coordinates";
import React from "react";
import { Btn, SELECTED_COLOR } from "../styles";
import {
    faCrosshairs, faMagnifyingGlassMinus, faMagnifyingGlassPlus
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import styled from "styled-components";
import { createCanvas, drawPixelsOntoCanvas } from "../../lib/utils";
import { Palette } from "../../lib/palette";
import { clamp} from "lodash";
import { Store } from "../../lib/store";
import { Storage } from "../../lib/storage";
import { MuralEx } from "../../interfaces";

const Flex = styled.div`
    display: flex;
    flex-direction: row;
`;

const ColorBox = styled.div`
    width: 25px;
    height: 25px;
    margin: 2px;
    border: 2px solid black;
    border-radius: 12px;
    text-align: center;
    font-weight: bolder;
`;

const Scale = styled.span`
    width: 25px;
    text-align: center;
    margin: auto;
`;

const Canvas = styled.canvas`
    border-radius: 12px;
    border: 2px solid black;
`;

interface Props {
    selected: MuralEx;
    cords: Coordinates;
    store: Store;
    storage: Storage;
    palette: Palette;
}

interface Stats {
    size: number;
    color: number;
    colorAssistant: boolean;
}

interface StorageSettings {
    colorAssistant: boolean;
    size: number;
}

export class Minimap extends React.Component<Props, Stats> {
    private ref = React.createRef<HTMLCanvasElement>();
    private cache = document.createElement("canvas");
    private transparentGrid = ["#c5c5c540", "#8d8d8d40"];
    private highlighColor = "#00000040";
    private lastColor = -1;
    private storageKey  = "_minimap_settings";
    private destroyed = false;

    constructor(props:Props) {
        super(props);
        this.state = {
            size: 16,
            color: -1,
            colorAssistant: false,
        };
    }

    componentDidUpdate ( prevProps: Readonly<Props>, prevState: Readonly<Stats>): void {
        if (prevProps.selected.ref !== this.props.selected.ref) {
            this.draw();
        } else if (prevState.size !== this.state.size) {
            this.draw();
        } 
    }

    private click(colorIndex: number) {
        if (colorIndex >= 0 && colorIndex < this.props.palette.palette.length) {
            if (!this.props.palette.buttons[colorIndex].classList.contains("outline-2")) {
                if (this.state.colorAssistant) {
                    this.props.palette.buttons[colorIndex].click();
                }
            }
        }
    }
  

    componentDidMount () {
        this.props.cords.on(CordType.Div, this.update);
        this.props.cords.on(CordType.Div, this.onCords);
        this.props.storage.getItem<StorageSettings>(this.storageKey).then(settings => {
            if (settings && !this.destroyed) {
                this.setState({
                    colorAssistant: settings.colorAssistant,
                    size: settings.size
                });
            }
        });
        this.draw();
    }

    componentWillUnmount () {
        this.destroyed = true;
        this.props.cords.off(CordType.Div, this.update);
        this.props.cords.off(CordType.Div, this.onCords);
    }

    saveSettings() {
        this.props.storage.setItem(this.storageKey, {
            colorAssistant: this.state.colorAssistant,
            size: this.state.size
        });
    }

    onCords = (x: number, y: number) => {
        const store = this.props.store;
        if (
            store.selected && store.selected.mural.x < x && store.selected.mural.y < y &&
            store.selected.mural.w + store.selected.mural.x > x &&
            store.selected.mural.h + store.selected.mural.y > y) {
            const xx = x - store.selected.mural.x; 
            const yy = y - store.selected.mural.y;
            const colorIndex = store.selected.mural.getPixel(xx, yy);
            if (this.lastColor !== colorIndex) {
                this.lastColor = colorIndex;
                this.click(colorIndex);
            }
        }
    };

    drawGrid(ctx: CanvasRenderingContext2D, gridSize: number, width: number, height: number) {
        for (let y = 0; y < height; y += gridSize) {
            for (let x = 0; x < width; x += gridSize) {
                const isEvenRow = Math.floor(y / gridSize) % 2 === 0;
                const isEvenColumn = Math.floor(x / gridSize) % 2 === 0;
                const isEvenCell = (isEvenRow && isEvenColumn) || (!isEvenRow && !isEvenColumn);
    
                ctx.fillStyle = isEvenCell ? this.transparentGrid[0] : this.transparentGrid[1];
                ctx.fillRect(x, y, gridSize, gridSize);
            }
        }
    }

    update = () => {
        const m = this.props.selected.mural;
        const xx = this.props.cords.x - m.x; 
        const yy = this.props.cords.y - m.y;
        this.setState({
            color: m.getPixel(xx, yy) || -1,
        });
        this.draw();
    };
    draw = () => {
        const canvas = this.ref.current!;
        const ctx = canvas.getContext("2d")!;
        const w = this.cache.width = canvas.width = 200;
        const h = this.cache.height = canvas.height = 200;
        const hh = w / 2;
        const hw = h / 2;
        ctx.clearRect(0, 0, w, h);
        const s = this.state.size;
        this.drawGrid(ctx, s * 4, w, h);

        const pixelSize = (1 * s) / 2;
        const dx = ((this.props.selected.mural.x - this.props.cords.x) * s) + Math.ceil(hh - pixelSize);
        const dy = ((this.props.selected.mural.y - this.props.cords.y) * s) + Math.ceil(hw - pixelSize);
        const extended = this.props.selected;

        const cacheCanvas = this.cache;
        const cacheCtx = cacheCanvas.getContext("2d")!;
        cacheCtx.imageSmoothingEnabled = false;
        cacheCtx.drawImage(extended.ref, dx, dy, extended.mural.w * s, extended.mural.h * s);
        
        ctx.drawImage(cacheCanvas, 0, 0);
        if (s != 1) {
            ctx.fillStyle = this.highlighColor;
            const halfHO = (h / 2);
            const halfWO = (h / 2);
            ctx.fillRect(0, 0, w, halfHO - pixelSize);
            ctx.fillRect(0, halfHO + pixelSize, w, halfHO - pixelSize);
            ctx.fillRect(0, halfHO - pixelSize, halfWO - pixelSize, pixelSize * 2);
            ctx.fillRect(halfWO + pixelSize, halfHO - pixelSize, halfWO - pixelSize, pixelSize * 2);
        }
    };

    up = () => {
        this.setState({
            size: this.clamp(this.state.size * 2)
        });
    };

    down = () => {
        this.setState({
            size: this.clamp(this.state.size / 2)
        });
    };
    setSize(size: number) {
        this.setState({size});
    }

    clamp(size: number) {
        return clamp(size, 1, 64);
    }

    renderColor() {
        if (this.state.color !== -1) {
            return <ColorBox style={{backgroundColor: this.props.palette.hex[this.state.color]}}></ColorBox>;
        } else {
            return <ColorBox> / </ColorBox>;
        }
    }
    toggleColorAssistant = () => {
        this.setState({
            colorAssistant: !this.state.colorAssistant,
        });
    };

    render() {
        return <div>
            <Flex>
                <Btn
                     onClick={this.up}><FontAwesomeIcon icon={ faMagnifyingGlassPlus } /></Btn>
                <Scale>{this.state.size}</Scale>
                <Btn onClick={this.down}><FontAwesomeIcon icon={ faMagnifyingGlassMinus } /></Btn>
                <span style={{flex: 1}}>
                <Btn 
                    title="Color assistant"
                    style={{ borderColor: this.state.colorAssistant ? SELECTED_COLOR : ""} }
                    onClick={() => this.toggleColorAssistant()}>Assist<FontAwesomeIcon 
                    icon={faCrosshairs} /> </Btn>
                </span>
                {this.renderColor()}
            </Flex>
            <Canvas ref={this.ref} />
        </div>;
    }

}