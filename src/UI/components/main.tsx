import React from "react";
import { OverlayReturn, Store, StoreEvents } from "../../lib/store";
import { Storage } from "../../lib/storage";
import { Coordinates } from "../../lib/coordinates";
import { Palette } from "../../lib/palette";
import { Menu } from "./menu";
import { MovableWindow } from "./movableWindow";
import { Minimap } from "./minimap";
import { Overlay } from "./overlay";
import { debounce } from "lodash";
import  styled from "styled-components";
import { MuralEx } from "../../interfaces";
import { PieCharts } from "./pixelCharts";
import { TC_LOGO } from "../../assets";

const Img = styled.img`
  width: 25px;
  margin-right: 5px;
  display: inline;
  pointer-events: none;
  touch-action: none;
`;

interface StoreSettings {
    opacity: number;
    collapsed: boolean;
}

interface Props {
    store: Store;
    storage: Storage;
    cords: Coordinates;
    palette: Palette;
}

interface State extends StoreSettings{
    selected?: MuralEx;
    overlays: number[];
    showCharts: boolean;
    phantomOverlay: number;
    overlayModify?: OverlayReturn;
}

export class Main extends React.Component<Props, State> {
    private readonly STORAGE_KEY = "__OPACITY_SETTINGS";
    private destroyed = false;

    constructor(props: Props) {
        super(props);
        this.state = { 
            showCharts: false,
            overlays: [],
            phantomOverlay: -1,
            opacity: 50,
            collapsed: false,
        };
    }

    componentDidMount() {
        this.props.store.on(StoreEvents.Any, this.update);
        this.update();
        this.props.storage.getItem<StoreSettings>(this.STORAGE_KEY).then(data => {
            if (data !== null && !this.destroyed) {
                this.setState(data);
            }
        });
    }
    componentWillUnmount() {
        this.destroyed = true;
        this.actualSave({collapsed: this.state.collapsed, opacity: this.state.opacity});
    }
    actualSave(settings: StoreSettings) {
        return this.props.storage.setItem(this.STORAGE_KEY, settings);
    }

    save = debounce((opacity: number) => {
        this.actualSave({collapsed: this.state.collapsed, opacity});
    }, 1000);

    opacityChange = (opacity: number) => {
        this.setState({
            opacity
        });
        this.save(opacity);
    };

    update = () => {
        this.setState({
            selected: this.props.store.selected,
            overlays: this.props.store.overlays,
            overlayModify: this.props.store.overlayModify,
        });
    };

    renderMap() {
        if (this.state.selected) {
            return <MovableWindow title="Minimap" storage={this.props.storage} storageKey="minimap"> 
                <Minimap cords={this.props.cords} palette={this.props.palette} selected={this.state.selected} storage={this.props.storage} store={this.props.store} ></Minimap>
            </MovableWindow>;
        }
        return null;
    }
    title() {
        return <span title={"Terncode's fork"}>
        <Img src={TC_LOGO} alt="TC-Logo"/>
        <span>Overlay</span>
        </span>;
    }

    render() {
        return <>
        {this.state.showCharts ? 
        <MovableWindow title={"Pixel chart"} storage={this.props.storage} storageKey="charts">
            <PieCharts palette={this.props.palette} store={this.props.store}/>    
        </MovableWindow>
        : null}
            <MovableWindow title={this.title()} storage={this.props.storage} storageKey="main">
                <Menu 
                showChart={() => this.setState({showCharts: !this.state.showCharts})}
                onOpacityChange={this.opacityChange}
                cords={this.props.cords}
                store={this.props.store}
                storage={this.props.storage}
                palette={this.props.palette}
                opacity={this.state.opacity}
                collapsed={this.state.collapsed}
                onCollapsedChanged={collapsed => {
                    this.setState({collapsed});
                    this.actualSave({opacity: this.state.opacity, collapsed});
                }}    
            />
            </MovableWindow>
            {this.renderMap()}
            {this.state.overlays.map((o, i) => <Overlay 
                key={i} storage={this.props.storage} 
                opacity={this.state.opacity}
                cords={this.props.cords}
                palette={this.props.palette}
                muralExtended={this.props.store.murals[o]}
            /> )}
            {this.props.store.murals[this.state.phantomOverlay] ? <Overlay 
                storage={this.props.storage}
                opacity={50}
                cords={this.props.cords}
                palette={this.props.palette}
                muralExtended={this.props.store.murals[this.state.phantomOverlay]}
                /> : null }
            {this.state.overlayModify ? <Overlay 
                muralModifier={this.state.overlayModify.muralModify}
                opacity={this.state.opacity}
                storage={this.props.storage}
                cords={this.props.cords}
                palette={this.props.palette}
                muralExtended={this.props.store.overlayModify!.mural}
            onChange={(name, x, y, confirm) => {
                this.state.overlayModify!.cb(name, x, y, confirm);
            }} /> : null}
        </>;

    }

}