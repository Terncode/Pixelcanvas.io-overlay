import { faCamera, faCaretDown, faCaretUp, faLocationCrosshairs, faPieChart, faUpload } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React from "react";
import styled from "styled-components";
import { Btn, Flex } from "../styles";
import { Store } from "../../lib/store";
import { MuralList } from "./muralList";
import { Coordinates, CordType } from "../../lib/coordinates";
import { Palette } from "../../lib/palette";
import { importArtWorks } from "../importMural";
import { Popup } from "./Popup";
import { Storage } from "../../lib/storage";
import { takeCanvasShot } from "../../lib/canvasShot";

const Container = styled.div`

`;


const PercentageDiv = styled.div`
    margin: 2px 4px;
`;

export const InputRange = styled.input`
    &[type="range"] {
        -webkit-appearance: none;
        appearance: none;
        background: transparent;
        cursor: pointer;
        width: 100%;
    }

    &[type="range"]:focus {
        outline: none;
    }

    &[type="range"]::-webkit-slider-runnable-track {
        background-color: rgba(10, 10, 10);
        border-radius: 0;
        height: 4px;
        border-radius: 12px;
    }

    &[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        margin-top: -12px;

        background-color: black;
        height: 25px;
        width: 15px;
        border-radius: 12px;
    }

    &[type="range"]::-moz-range-track {
        background-color: rgba(10, 10, 10);
        border-radius: 0.5rem;
        height: 0.5rem;
        border-radius: 12px;
    }

    &[type="range"]::-moz-range-thumb {
        border: none;
        border-radius: 0;
        background-color: rgba(10, 10, 10);
        height: 2rem;
        width: 1rem;
        border-radius: 12px;
    }

`;
interface Props {
    store: Store;
    cords: Coordinates;
    palette: Palette;
    storage: Storage;
    opacity: number;
    collapsed: boolean;
    showChart: () => void;
    onOpacityChange: (n: number) => void;
    onCollapsedChanged: (b: boolean) => void;
}
interface State {
    takingCanvasShot: boolean;
    canvasShotAvailable: boolean;
    locationPrecision: boolean;
}

export class Menu extends React.Component<Props, State> {

    constructor(props: Props) {
        super(props);
        this.state = {
            takingCanvasShot: false,
            canvasShotAvailable: true,
            locationPrecision: props.cords.highPrecision
        };
    }

    componentDidMount(): void {
        this.props.cords.on(CordType.Url, this.checkIsScreenShotAvailable);
    }
    componentWillUnmount(): void {
        this.props.cords.off(CordType.Url, this.checkIsScreenShotAvailable);
    }
    checkIsScreenShotAvailable = () => {
        this.setState({canvasShotAvailable: this.props.cords.uScale >= 0});
    };

    import = async () => {
        try {
            const murals = await importArtWorks(this.props.store, this.props.cords,  this.props.palette);
            for (const mural of murals) {
                this.props.store.add(mural);
            }
        } catch (error) {
            console.error(error);
            Popup.alert(error.name);
        }
    };
    inputElement = (event: React.FormEvent<HTMLInputElement>) => {
        const percentage = parseInt((event.target as HTMLInputElement).value);
        this.props.onOpacityChange(percentage);
    };
    togglePrecision = () => {
        const value = !this.state.locationPrecision;
        this.setState({ locationPrecision: value });
        this.props.cords.toggleHigherPrecision(value);
    };
    screenshot = async () => {
        if (this.props.cords.uScale < 0) {
            //Popup.alert("Cannot take screenshot at sc")
            //return;
        }
        this.setState({takingCanvasShot: true});
        await takeCanvasShot(this.props.cords);
        this.setState({takingCanvasShot: false});
    };
    render() {
        return<Container>
            <Flex>
            <Btn 
                onClick={this.screenshot}
                disabled={this.state.takingCanvasShot || !this.state.canvasShotAvailable} 
                title="Screenshot">
                <FontAwesomeIcon icon={ faCamera } />
            </Btn>
            <Btn 
                onClick={this.import}
                title="Import">
                    <FontAwesomeIcon icon={ faUpload } />
                </Btn>
            <Btn 
                onClick={() => this.props.showChart()}
                title="Pixels graph">
                    <FontAwesomeIcon icon={ faPieChart } />
            </Btn>
            <Btn
                title="Runtime coordinate calculator. Uses more resources"
                onClick={this.togglePrecision} 
                style={{
                    border: this.state.locationPrecision ? "" : "2px dotted black"
                }}>
                <FontAwesomeIcon icon={ faLocationCrosshairs } />
            </Btn>
                <InputRange type="range" min={0} max={100} value={this.props.opacity} onInput={this.inputElement} />
                <PercentageDiv>{this.props.opacity}%</PercentageDiv>
            <Btn 
                onClick={() => this.props.onCollapsedChanged(!this.props.collapsed)}>
                    <FontAwesomeIcon icon={ this.props.collapsed ? faCaretDown : faCaretUp } />
            </Btn>
            </Flex>
            {this.props.collapsed ? null : <MuralList store={this.props.store} palette={this.props.palette} cords={this.props.cords}/> }
        </Container>;
    }

}