import React, { useState, useEffect, useMemo } from "react";
import {
  extentLinear,
  chartCartesian,
  seriesWebglLine,
  webglStrokeColor,
  randomGeometricBrownianMotion,
} from "d3fc";
import { zoom, scaleLinear, select } from "d3";
import simplify from "simplify-js";
const LINEAR_VIEW_ID = "linear-view-d3fc";

const initialData: number[] = randomGeometricBrownianMotion().steps(1e6)(1);

interface Props {
  width: number;
  height: number;
}

export const LinearViewD3: React.FC<Props> = ({ width, height }) => {
  const [rawData, setRawData] = useState(
    initialData.map((value, i) => ({
      x: i,
      y: value,
    }))
  );

  const data = useMemo(() => {
    return simplify(rawData, 0.001);
  }, [rawData]);

  useEffect(() => {
    const yExtent = extentLinear().accessors([(d) => d.y]);

    console.log(`raw points: ${rawData.length}, simplified: ${data.length}`);

    const xScale = scaleLinear()
      .domain([0, data.length - 1])
      .range([0, width]);
    const yScale = scaleLinear().domain(yExtent(data)).range([0, height]);
    const xScaleOriginal = xScale.copy();
    const yScaleOriginal = yScale.copy();

    const render = () => {
      select(`#${LINEAR_VIEW_ID}`).datum(data).call(chart);
    };

    const series = seriesWebglLine()
      .xScale(xScale)
      .yScale(yScale)
      .crossValue((d) => d.x)
      .mainValue((d) => d.y)
      .decorate((ctx) => {
        webglStrokeColor([1, 0, 0, 1])(ctx);
      })
      .defined(() => true)
      .equals((previousData, currentData) => {
        return previousData.length === currentData;
      });

    // create a d3fc-zoom that handles the mouse / touch interactions
    const zoomEvent = zoom().on("zoom", (e) => {
      xScale.domain(e.transform.rescaleX(xScaleOriginal).domain());
      render();
    });

    const chart = chartCartesian(xScale, yScale)
      .webglPlotArea(series)
      .decorate((sel) => {
        // add the zoom interaction on the enter selection
        // use selectAll to avoid interfering with the existing data joins
        sel
          .enter()
          .selectAll(".plot-area")
          .on("measure.range", (e) => {
            xScaleOriginal.range([0, e.detail.width]);
            yScaleOriginal.range([e.detail.height, 0]);
          })
          .call(zoomEvent);
      });

    render();
  }, [data]);

  return (
    <div
      style={{
        width,
        height,
      }}
    >
      <div id={LINEAR_VIEW_ID} className="w-full h-full" />
    </div>
  );
};
