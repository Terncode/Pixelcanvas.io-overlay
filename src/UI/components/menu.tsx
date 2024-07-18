import { faCamera, faCaretDown, faCaretUp, faUpload } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React from "react";
import styled from "styled-components";
import { Btn, Flex } from "../styles";
import { Store } from "../../store";
import { MuralList } from "./muralList";
import { Coordinates, CordType } from "../../coordinates";
import { Palette } from "../../palette";
import { importArtWork } from "../importMural";
import { Popup } from "./Popup";
import { Storage } from "../../storage";
import { takeCanvasShot } from "../../canvashot";

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
    onOpacityChange: (n: number) => void;
    onCollapsedChanged: (b: boolean) => void;
}
interface State {
    takingCanvasShot: boolean;
    canvasShotAvailable: boolean;
}

export class Menu extends React.Component<Props, State> {

    constructor(props: Props) {
        super(props);
        this.state = {
            takingCanvasShot: false,
            canvasShotAvailable: true,
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
            const mural = await importArtWork(this.props.store, this.props.cords,  this.props.palette);
            if (mural) {
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
        return <Container>
            <Flex>
            <Btn onClick={this.screenshot} disabled={this.state.takingCanvasShot || !this.state.canvasShotAvailable} title="screenshot"><FontAwesomeIcon icon={ faCamera } /></Btn>
            <Btn onClick={this.import} title="Import"><FontAwesomeIcon icon={ faUpload } /></Btn>
                <InputRange type="range" min={0} max={100} value={this.props.opacity} onInput={this.inputElement} />
                <PercentageDiv>{this.props.opacity}%</PercentageDiv>
                <Btn onClick={() => this.props.onCollapsedChanged(!this.props.collapsed)}><FontAwesomeIcon icon={ this.props.collapsed ? faCaretDown : faCaretUp } /></Btn>
            </Flex>
            {this.props.collapsed ? null : <MuralList store={this.props.store} cords={this.props.cords}/> }
        </Container>;
    }

}