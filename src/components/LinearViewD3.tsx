import React, { useEffect, useState } from "react";
import fc, {
  extentLinear,
  annotationSvgGridline,
  seriesSvgCandlestick,
  seriesSvgMulti,
  chartCartesian,
  seriesWebglPoint,
  extentTime,
  randomFinancial,
  seriesWebglMulti,
  webglSeriesPoint,
  seriesWebglLine,
  webglSeriesLine,
  randomGeometricBrownianMotion,
} from "d3fc";
import { zoom, scaleLinear, select } from "d3";
const LINEAR_VIEW_ID = "linear-view-d3fc";

const initialData = randomGeometricBrownianMotion().steps(1e4)(1);

interface Props {
  width: number;
  height: number;
}

export const LinearViewD3: React.FC<Props> = ({ width, height }) => {
  const [data, setData] = useState(initialData);

  const extent = extentLinear();

  React.useEffect(() => {
    const xScale = scaleLinear()
      .domain([0, data.length - 1])
      .range([0, width]);
    const yScale = scaleLinear().domain(extent(data)).range([0, height]);
    const xScaleOriginal = xScale.copy();
    const yScaleOriginal = yScale.copy();

    const render = () => {
      select(`#${LINEAR_VIEW_ID}`).datum(data).call(chart);
    };

    const series = seriesWebglLine()
      .xScale(xScale)
      .yScale(yScale)
      .crossValue((_, i) => i)
      .mainValue((d) => d)
      .defined(() => true)
      .equals((previousData, currentData) => {
        return previousData.length === currentData;
      });
    // TODO: color red

    // create a d3fc-zoom that handles the mouse / touch interactions
    const zoomEvent = zoom().on("zoom", (e) => {
      xScale.domain(e.transform.rescaleX(xScaleOriginal).domain());
      yScale.domain(e.transform.rescaleY(yScaleOriginal).domain());
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
      id={LINEAR_VIEW_ID}
      style={{
        width,
        height,
      }}
    />
  );
};
