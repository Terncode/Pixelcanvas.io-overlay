import React from "react";
import { PixelPlaced } from "../../lib/pixelPlaced";
import styled from "styled-components";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSquare } from "@fortawesome/free-solid-svg-icons";
import { formatNumber } from "../../lib/utils";

const CountBox = styled.div<{width: number}>`
    position: fixed;
    display: flex;
    z-index: 10;
    flex-direction: row;
    bottom: ${props => (props.width > 480 ? 107 : 187)}px;
    right: 16px;
    background-color: rgba(255, 255, 255, 0.75);
    border: 2px solid black;
    border-radius: 12px;
    margin: 5px auto;
    padding: 5px;
    height: 40px;
`;

const Count = styled.span`
    margin-left: 5px;
`;

const Icon = styled.span`
    margin: 2px 5px;
    width: 19px;
`;

interface Props {
    pixelCount: PixelPlaced;
}

interface State {
    count: number;
    width: number;
}

export class PixelCount extends React.Component<Props, State> {
   
    constructor(props:Props) {
        super(props);
        this.state = {
            count: 0,
            width: window.innerWidth,
        };
    }
    componentDidMount() {
       this.props.pixelCount.count.then(countMaybe => {
        if (typeof countMaybe === "number") {
            this.updateCount(countMaybe);
        }
       });
       this.props.pixelCount.on(this.updateCount);
       window.addEventListener("resize", this.onResize);
    }
    componentWillUnmount() {
        this.props.pixelCount.on(this.updateCount);
        window.removeEventListener("resize", this.onResize);
    }
    updateCount = (count: number) => {
        this.setState({count});
    };
    onResize = () => {
        this.setState({ width: window.innerWidth });
    };

    render() {
        if (!this.state.count) return null;

        return (
            <CountBox width={this.state.width}>
                <Count>{formatNumber(this.state.count)}</Count>
                <Icon><FontAwesomeIcon icon={ faSquare }></FontAwesomeIcon></Icon>
            </CountBox>
        ); 
}

}