import React from "react";
import { MuralEx } from "../../interfaces";
import { Store, StoreEvents } from "../../lib/store";
import { MuralView } from "./muralView";
import styled from "styled-components";
import { Coordinates } from "../../lib/coordinates";
import { Palette } from "../../lib/palette";

const ScrollContainer = styled.div`
    overflow: auto;
    max-height: 250pt;
    min-width: 200pt;
    border-radius: 12px;
    &::-webkit-scrollbar {
        width: 7px;
        height: 7px;
    }
    &::-webkit-scrollbar-corner {
        background: transparent;
    }
    &::-webkit-scrollbar-track {
        background: transparent;
        border: 1px solid black;
        border-radius: 12px;
    }
    &::-webkit-scrollbar-thumb {
        background-color: rgb(10, 10, 10);
        border-radius: 12px;
        border: 2px solid transparent;
    }
`;

interface Props {
    store: Store;
    cords: Coordinates;
    palette: Palette;
}

interface State {
    murals: MuralEx[];
    selected?: MuralEx;
}

export class MuralList extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            murals: [],
        };
    }
    componentDidMount () {
        this.props.store.on(StoreEvents.Any, this.update);
        this.update();
    }
    componentWillUnmount (){
        this.props.store.off(StoreEvents.Any, this.update);
    }
    update = () => {
        this.setState({
            murals: this.props.store.murals,
            selected: this.props.store.selected,
        });
    };
    render() {
        return <ScrollContainer> {this.state.murals.map((m,i) => {
            return <MuralView 
            key={i}
            muralExtended={m} cords={this.props.cords}
            palette={this.props.palette} 
            store={this.props.store}
            selected={m && m === this.state.selected} />;
        })}</ScrollContainer>;
    }
}
