import React from "react";
import styled from "styled-components";
import { MuralEx } from "../../interfaces";
import { Coordinates, CordType } from "../../lib/coordinates";
import { Palette } from "../../lib/palette";
import { MovableWindow } from "./movableWindow";
import { Storage } from "../../lib/storage";
import { MuralEditor } from "./muralEditor";

const Canvas = styled.canvas`
    position: fixed;
    z-index: 1;
    pointer-events: none;
`;

interface Props {
    muralExtended: Readonly<MuralEx>;
    muralModifier?: { x: number, y: number, name: string };
    onChange?: (name: string, x: number, y: number, confirm?: boolean) => void;
    cords: Coordinates;
    storage: Storage;
    palette: Palette;
    opacity: number;
}

interface State {
    name: string;
    x: number;
    y: number;
}

export class Overlay extends React.Component<Props, State> {
    private ref = React.createRef<HTMLCanvasElement>();

    constructor(props: Props) {
        super(props);
        this.state = {
            x: 0,
            y: 0,
            name: "",
        };
    }

    componentDidMount() {
        this.resize();

        this.ref.current!.style.top = this.ref.current!.style.left = `0px`;
        this.props.cords.on(CordType.Url, this.draw);
        this.props.cords.on(CordType.Div, this.updateIfMouseDown);
        window.addEventListener("mousemove", this.onMouseMove);
        window.addEventListener("touchmove", this.onTouchMove);
        window.addEventListener("resize", this.resize);
        if (this.props.muralModifier) {
            this.setState({
                name: this.props.muralModifier.name || "",
                x: this.props.muralModifier.x ?? 0,
                y: this.props.muralModifier.y ?? 0,
            });
        }
    }
    componentWillUnmount() {
        this.props.cords.off(CordType.Url, this.draw);
        this.props.cords.off(CordType.Div, this.updateIfMouseDown);
        window.removeEventListener("mousemove", this.onMouseMove);
        window.removeEventListener("touchmove", this.onTouchMove);
        window.removeEventListener("resize", this.resize);
    }
    updateIfMouseDown = () => {
        if (this.props.cords.dragging) {
            this.draw();
        }
    };
    onMouseMove = (event:  MouseEvent) => {
        if (event.buttons === 1) {
            this.draw();
        }
    };

    onTouchMove = (event: TouchEvent) => {
        if (event.touches.length) {
            this.draw();
        }
    };

    resize = () => {
        const canvas = this.ref.current!;
        if (canvas.height !== window.outerHeight || canvas.width !== window.outerWidth) {
            canvas.width = window.outerWidth;
            canvas.height = window.outerHeight;
            canvas.style.width = `${window.outerWidth}px`;
            canvas.style.height = `${window.outerHeight}px`;
            this.draw();
        }
    };

    componentDidUpdate(prevProps: Readonly<Props>, prevState: Readonly<State>) {
        if (prevProps.muralExtended !== this.props.muralExtended) {
            this.setState({
                x: 0, y: 0
            });
        }
        if (prevState.x !== this.state.x || prevState.y !== this.state.y) {
            this.draw();
        }
    }


    get pixels() {
        return this.props.muralExtended.mural.pixelBuffer;
    }

    get x() {
        return this.props.muralModifier ? this.state.x : this.props.muralExtended.mural.x;
    }

    get y() {
        return this.props.muralModifier ? this.state.y : this.props.muralExtended.mural.y;
    }

    get refImg() {
        return this.props.muralExtended.ref;
    }

    draw = () => {
        const canvas = this.ref.current!;
        const scale = Math.pow(2, this.props.cords.uScale);

        // TODO calculate cords differently to be less expensive
        // TODO also add cache
        // TODO also profile the thing
        const cords = this.props.cords.gridToScreen(this.x, this.y)!;
        if (!cords) {
            const ctx = canvas.getContext("2d")!;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            return;
        }
        const x = cords.x;
        const y = cords.y;

        const width = this.props.muralExtended.mural.w * scale;
        const height = this.props.muralExtended.mural.h * scale; 

        const ctx = canvas.getContext("2d")!;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(this.refImg, x, y, width, height);
        // if (true) {
        //     ctx.strokeStyle = "#000000";
        //     ctx.strokeText(`${x}px ${y}px`, 11, 11);
        //     ctx.strokeText(`${x}px ${y}px`, 9, 9);
        //     ctx.strokeText(`${x}px ${y}px`, 9, 11);
        //     ctx.strokeText(`${x}px ${y}px`, 11, 9);
        //     ctx.fillStyle = "#ffffff";
        //     ctx.fillText(`${x}px ${y}px`, 10, 10);
        // }
    };


    private get style(): React.CSSProperties {
        return { opacity: this.props.opacity / 100};
    }

    renderModifyWindow() {
        if (this.props.onChange) {
            const copy = {...this.state};
            return <MovableWindow storage={this.props.storage} 
                storageKey="overlay-set" title="Position editor">
                <MuralEditor 
                    name={this.state.name}
                    x={this.state.x}
                    y={this.state.y}
                    onX={x => this.setState({x})}
                    onY={y => this.setState({y})}
                    onName={name => this.setState({name})}
                    onCancel={() => {
                        this.setState(copy);
                        this.props.onChange!(copy.name, copy.x, copy.y, false);
                    }}
                    onConfirm={() => {
                        this.props.onChange!(this.state.name, this.state.x, this.state.y, true);

                    }}
                ></MuralEditor>
            </MovableWindow>;
        }
        return null;
    }

    render() {
        return <>
            <Canvas ref={this.ref} style={this.style} />
            {this.renderModifyWindow()}
        </>;
    }
}
