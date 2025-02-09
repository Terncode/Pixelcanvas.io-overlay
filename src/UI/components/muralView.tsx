import React from "react";
import { Store } from "../../lib/store";
import { Mural, MuralEx, MuralStatus } from "../../interfaces";
import styled from "styled-components";
import { A, Border, Btn, Flex, SELECTED_COLOR } from "../styles";
import { CanvasToCanvasJSX } from "./canvasToCanvasJSX";
import { formatNumber, getMuralHeight, getMuralWidth, getPixelStatusMural } from "../../lib/utils";
import { 
    IconDefinition, faDownload, faLayerGroup, faLocation, faPenToSquare, faRefresh, faTrash 
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Coordinates, CordType } from "../../lib/coordinates";
import { BIN_FORMATS } from "../importMural";
import saveAs from "file-saver";
import { Popup } from "./Popup";
import { Palette } from "../../lib/palette";
import { serializeMural } from "../serializer";

const Margin = styled.div`
    margin: 2px;
    margin-left: 6px;
`;

const H5 = styled.h5`
    font-weight: bolder;
    margin-right: 4px;
`;

const Line = styled.div`
    font-size: 10pt;
    display: flex;
    flex-direction: row;
`;
const Strong = styled.strong`
    margin-right: 2px;
`;

export const BtnSmall = styled.button`
    border: 1px solid white;
    font-size: 10pt;
    width: 22px;
    background-color: rgba(255, 255, 255, 0.75);
    color: rgb(10, 10, 10);
    border-radius: 12px;
    border: 2px solid black;


    margin: 1px;
    margin-left: 3px;
    display: flex;
    padding: 3px;
    outline: none !important;
    text-decoration: none;

    &:hover {
        background-color: rgba(158, 158, 158, 0.75);
    }
    &:visited {
        text-decoration: none;
    }
    &:disabled {
        color: gray;
        border-color: gray;
        cursor: not-allowed;
    }
    transition: background-color 250ms;
`;

interface Props {
    mural: MuralEx;
    selected: boolean;
    store: Store;
    palette: Palette;
    cords: Coordinates;
}

interface State {
    width: number;
    height: number;
    overlay: boolean;
    progress?: MuralStatus | (() => void /* loading */);
    link: string;
}


export class MuralView extends React.Component<Props, State> {
    private readonly MAX_SIZE = 100;
    constructor(props:Props) {
        super(props);
        this.state = {
            height: this.MAX_SIZE,
            width: this.MAX_SIZE,
            overlay: false,
            link: ""
        };
    }

    componentDidMount () {
        this.updateSize();
        this.props.cords.on(CordType.Url, this.onCordUpdate);
    }
    componentWillUnmount () {
        this.props.cords.off(CordType.Url, this.onCordUpdate); 
    }
    componentDidUpdate(prevProps: Readonly<Props> ) {
        if (this.props.mural.ref !== prevProps.mural.ref) {
            this.updateSize();
            if (typeof this.state.progress === "function") {
                typeof this.state.progress();
                this.setState({progress: undefined, link: this.link});
            }
        }
    }

    onCordUpdate = () => {
        this.setState({ link: this.link });
    };

    updateSize = () => {   
        const w = this.props.mural.ref.width;
        const h = this.props.mural.ref.height;

        let width = w;
        let height = h;
        if (w > h) {
            if (w > this.MAX_SIZE) {
                height = this.MAX_SIZE * (h / w);
                width = this.MAX_SIZE;
            }
        } else {
            if (h > this.MAX_SIZE) {
                width = this.MAX_SIZE * (w / h);
                height = this.MAX_SIZE;
            }
        }
        this.setState({
            height, width
        });
    };
    renderInfoLine(title: string, description: string | React.JSX.Element) {
        return <Line><H5>{title}:</H5><span>{description}</span></Line>;
    }

    btn(context: string, icon: IconDefinition, onClick: () => void, selected?: boolean) {
        return <Btn style={{ borderColor: selected ? SELECTED_COLOR : "" }}
            onClick={() => onClick()}>{context} <FontAwesomeIcon icon={icon} /> </Btn>;
    }
    get s() {
        return this.props.store;
    }

    onLoad = (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        const tr = event.target as HTMLElement;
        if ("tagName" in tr) {
            const ignore = ["button", "svg", "path"];
            if (!ignore.includes(tr.tagName.toLowerCase())) {
                this.s.select(this.props.selected ? undefined : this.props.mural );
            }
        }
    };
    onModify = async () => {
        const mural = this.props.mural;
        this.props.store.setOverlayModify({
            pixels: this.props.mural.pixels,
            cb: (name, x, y, confirm) => {
                if (confirm) {
                    mural.name = name; 
                    mural.x = x; 
                    mural.y = y;
                    this.props.store.updateMural(mural); 
                }
            },
            muralObj: {
                name: this.props.mural.name,
                x: this.props.mural.x,
                y: this.props.mural.y
            }
        });

        // let x: number | null = null;
        // let y: number | null = null;
        // await Popup.custom(<div>
        //     <h5>Enter new coordinates</h5>
        //     <div>
        //         <span>X:</span>
        //         <Input type="number" min={0} placeholder={"0"} onChange={ev => processNumberEvent(ev, n => {x = n})} />
        //     </div>
        //     <div>
        //         <span>Y:</span>
        //         <Input type="number" min={0} placeholder={"10000"} onChange={ev => processNumberEvent(ev, n => {y = n})} />
        //     </div>
        // </div>, [
        //     {
        //         content: "Confirm",
        //         click: () => {
        //             Popup.close();
        //         }
        //     },
        //     {
        //         content: "Close",
        //         click: () => {
        //             x = null;
        //             y = null;
        //             Popup.close();
        //         }
        //     }
        // ]);

        // if (typeof x === "number" && typeof y === "number") {
        //     this.props.mural.x = x;
        //     this.props.mural.y = y;
        //     this.props.store.updateMural(this.props.mural);
        // }
    };
    onExport = () => {
        const rawMural: Mural = {
            name: this.props.mural.name,
            x: this.props.mural.x,
            y: this.props.mural.y,
            pixels: this.props.mural.pixels,
        };
        const buffer = serializeMural(rawMural);
        const blob = new Blob([buffer], { type: "octet/stream" });

        const saveName = rawMural.name
            .replace(/ /, "_")
            .replace(/[^a-zA-Z0-9-_]/g, "");

        saveAs(blob, `${saveName}.${BIN_FORMATS[0]}`);
    };
    onDelete = async () => {
        if (await Popup.confirm(`Are you sure you want to remove "${this.props.mural.name}"`)) {
            this.s.remove(this.props.mural);
        }
    };
    onEnter = () => {
        this.props.store.addPhantomOverlay(this.props.mural);
    };
    onLeave = () => {
        this.props.store.removePhantomOverlay();
    };

    get link() {
        const weight = getMuralWidth(this.props.mural);
        const height = getMuralHeight(this.props.mural);
        const x = this.props.mural.x + Math.round(weight / 2);
        const y = this.props.mural.y + Math.round(height / 2);
        const o = origin === "null" ? `${location.href}` : `${origin}/`;
        return `${o}@${x},${y},${this.props.cords.uScale}`;
    }

    onGoto = () => {
        location.href = this.link;
    };

    onPreview = () => {
        if (this.props.store.hasOverlay(this.props.mural)) {
            this.props.store.removeOverlay(this.props.mural);
        } else {
            this.props.store.addOverlay(this.props.mural);
        }
    };

    updateProgress = async () => {
        let canceled = false;
        const cancelFn = () => {
            canceled = true;
        };
        this.setState({progress: cancelFn});
        const data = await getPixelStatusMural(this.props.mural, this.props.palette.palette);
        if (!canceled) {
            this.setState({progress: data});
        }
    };

    renderProgress() {
        if (typeof this.state.progress === "function") {
            return "Loading...";
        }
        const ref = <BtnSmall onClick={this.updateProgress}><FontAwesomeIcon icon={faRefresh} /></BtnSmall>;
        if (this.state.progress && this.state.progress.total !== 0) {
            const { total, bad, good } = this.state.progress;
            return <Flex><Strong>{Math.floor(good / total * 100)}%</Strong> {bad > 0 ? formatNumber(bad) : ""}{ref}</Flex>;
        } else {
            return ref;
        }
    }

    render() {
        return <Border onClick={this.onLoad} 
            style={{ 
                border: this.props.selected ? "3px solid black" : "3px dotted black", 
                cursor: "pointer" }}
            onMouseEnter={this.onEnter} onMouseLeave={this.onLeave}>
            <Flex>
                <CanvasToCanvasJSX canvas={this.props.mural.ref} height={this.state.height} width={this.state.width}/>
                <Margin style={{flex: "1"}}>
                    {this.renderInfoLine("Name", this.props.mural.name)}
                    {this.renderInfoLine("Pixel count", formatNumber(this.props.mural.pixelCount))}
                    {this.renderInfoLine("X", this.props.mural.x.toString() )}
                    {this.renderInfoLine("Y", this.props.mural.y.toString() )}
                    {this.renderInfoLine("Size", `${getMuralWidth(this.props.mural)}x${getMuralHeight(this.props.mural)}`)}
                    {this.renderInfoLine("Progress", this.renderProgress())}
                </Margin>
            </Flex>
            <Flex>
                {this.btn("Preview", faLayerGroup, this.onPreview, this.props.store.hasOverlay(this.props.mural))}
                {this.btn("Modify", faPenToSquare, this.onModify)}
                {this.btn("Export", faDownload, this.onExport)}
                {this.btn("Delete", faTrash, this.onDelete)}
                <A href={this.link}>Goto <FontAwesomeIcon icon={faLocation}/></A>
            </Flex>
        </Border>;
    }
}
