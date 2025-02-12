import React from "react";
import { Palette } from "../../lib/palette";
import { Store, StoreEvents } from "../../lib/store";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import styled from "styled-components";
import { formatNumber } from "../../lib/utils";

const ColorBlock = styled.div`
    width: 20px;
    height: 20px;
    margin-right: 5px;
    border: 1px solid black;
    border-radius: 12px;
`;

const ColorLine = styled.div`
    padding: 4px;
    display: flex;
    flex-direction: row;
    font-size: 15px;
`;
const FlexList = styled.div`
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    height: 100%;
`;
interface PixelData {
    color: string;
    value: number;
}

interface State {
    total: number;
    groupData?: PixelData[];
}

interface Props {
    store: Store;
    palette: Palette;
}

export class PieCharts extends React.Component<Props, State> {

    constructor(props: Props) {
        super(props);
        this.state = {
            total: 0,
        };
    }

    componentDidMount () {
        this.refresh();
        this.props.store.on(StoreEvents.PixelLog, this.refresh);
    }
    componentWillUnmount() {
        this.props.store.off(StoreEvents.PixelLog, this.refresh);
    }
    private refresh = async () => {
        const colors: string[] = [];
        const groupData: PixelData[] = [];
        let total = 0;
        for (let i = 0; i < this.props.palette.hex.length; i++) {
            const hex = this.props.palette.hex[i];
            colors.push(hex);
            const logs = await this.props.store.fetchPixelsLogByColor(i);
            if (logs.length) {
                total += logs.length;
                groupData.push({
                    color: hex,
                    value: logs.length
                });
            }
        }
        groupData.sort((a,b) => a.value > b.value ? -1 : 1);
        this.setState(({
            groupData,
            total
        }));
    };
    render(): React.ReactNode
    {
        if (!this.state.groupData ) {
            return <div>Loading</div>;
        }

        if (!this.state.groupData.length) {
            return <div>No data! Please a pixel to see pixel chart</div>;
        }
        const style:React.CSSProperties = {
            width: Math.min(250, window.innerWidth - 20),
            height: Math.min(250, window.innerHeight - 20)
        };

        return  <div>
            <h5>Total pixels: {formatNumber(this.state.total)}</h5>
            <div style={style}>
         <ResponsiveContainer width="100%" height="100%">
        <PieChart width={400} height={400}>
          <Pie
            data={this.state.groupData}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {this.state.groupData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`}
                fill={entry.color}
                />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>

      </div>
      <div>
        <FlexList style={{ width: Math.min(250, window.innerWidth - 20)}}>
            {this.state.groupData.map((e, i) => {
                return <ColorLine key={i}>
                        <ColorBlock style={{ 
                            backgroundColor: e.color
                        }}></ColorBlock>{formatNumber(e.value)}</ColorLine>;
            })}

        </FlexList>
      </div>
      </div>;
    }
}