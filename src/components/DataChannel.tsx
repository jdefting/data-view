import React, { useCallback, useEffect, useMemo, useRef } from "react";
import simplify from "simplify-js";
import { Container, Graphics } from "@inlet/react-pixi";
import * as PIXI from "pixi.js";
import { getRandomData } from "../fake-data";
import { chunk, max, min } from "lodash-es";

const DEBUG_MODE = false;
const BACKGROUND_COLOR = 0x111111;

const colors = [
  0xaa4a44, 0xff7f50, 0x6495ed, 0x9fe2bf, 0xffbf00, 0xf25f5c, 0x50514f,
  0x70c1b3,
];

interface Point {
  x: number;
  y: number;
}

const getRelativePoints = (
  values: Point[],
  channelHeight: number,
  valueRange: [number, number],
  viewBounds: [number, number]
): Point[] => {
  const [minVal, maxVal] = valueRange;
  const [viewStart, viewEnd] = viewBounds;
  const viewLength = viewEnd - viewStart;

  // todo: make use of x... (it's the index across entire data)
  return values.map(({ x, y }, i) => {
    const yPercent = (y - minVal) / (maxVal - minVal);
    return {
      y: (1 - yPercent) * channelHeight,
      x: viewStart + i * (viewLength / values.length),
    };
  });
};

const getLineWidth = (
  screenWidth: number,
  worldViewBounds: [number, number]
) => {
  const viewWidth = worldViewBounds[1] - worldViewBounds[0];
  return 2 * (viewWidth / screenWidth);
};

interface Props {
  dataCount: number;
  lineCount: number;
  height: number;
  worldWidth: number;
  worldViewBounds: [number, number];
  // true screen pixels
  screenWidth: number;
  y: number;
  onPointsRendered: (count: number) => void;
  worldBounds: [number, number];
}

export const DataChannel: React.FC<Props> = ({
  lineCount,
  height,
  worldWidth,
  worldViewBounds,
  screenWidth,
  y,
  onPointsRendered,
  worldBounds,
}) => {
  const highResTimeout = useRef<NodeJS.Timeout>();
  const highResRef = useRef<PIXI.Graphics>(null);
  const lowResRef = useRef<PIXI.Graphics>(null);
  const lastViewWidth = useRef("");

  const dataLines: {
    pointsByView: { [percent: string]: Point[] };
    color: number;
    valueRange: [number, number];
  }[] = useMemo(() => {
    const lines = [];

    console.time("calculate-views");
    for (let i = 0; i < lineCount; i++) {
      const data = getRandomData();
      const maxValue = max(data) || 0;
      const minValue = min(data) || 0;

      const percentiles = [0, 0.2, 0.4, 0.6, 0.8, 1];

      const pointsByView: { [percent: string]: Point[] } = {};
      percentiles.forEach((percentile) => {
        const pointsPerPixel = Math.max(
          (data.length / worldWidth) * percentile,
          1
        );

        console.time("aggregate-points");
        const aggregatePoints = chunk(data, pointsPerPixel)
          .map((chunk) => max(chunk) || 0)
          .map((value, index) => ({
            x: index,
            y: value,
          }));
        console.timeEnd("aggregate-points");

        console.time("simplify-points");
        pointsByView[percentile.toFixed(2)] = simplify(aggregatePoints, 0.001);
        console.timeEnd("simplify-points");
      });

      lines.push({
        pointsByView,
        color: colors[i % colors.length],
        valueRange: [minValue, maxValue] as [number, number],
      });
    }

    console.timeEnd("calculate-views");

    return lines;
  }, [lineCount, worldWidth]);

  const getViewPercentile = (viewWidth: number): string => {
    const percentile = 0.2; // 20%
    const viewPercent = viewWidth / worldWidth;
    return (Math.round(viewPercent / percentile) * percentile).toFixed(2);
  };

  const drawLowResData = useCallback(
    (g: PIXI.Graphics) => {
      // draw data across the entire world
      g.clear();

      // background
      g.beginFill(DEBUG_MODE ? 0x222222 : BACKGROUND_COLOR);
      g.drawRect(0, 0, worldWidth, height);
      g.endFill();

      dataLines.forEach(({ pointsByView, color, valueRange }) => {
        const lowResData = pointsByView[getViewPercentile(worldWidth)];
        const points = getRelativePoints(
          lowResData,
          height,
          valueRange,
          worldBounds
        );

        g.lineStyle({
          width: getLineWidth(screenWidth, worldViewBounds),
          color,
          join: PIXI.LINE_JOIN.BEVEL,
          native: true,
        });
        g.moveTo(0, points[0].y);
        points.forEach(({ x, y }) => {
          g.lineTo(x, y);
        });
      });
      console.timeEnd("low-res-calc");
    },
    [worldWidth, height, dataLines]
  );

  const drawHighResData = useCallback(
    (g: PIXI.Graphics) => {
      clearTimeout(highResTimeout.current);

      let [viewStart, viewEnd] = worldViewBounds;
      const originalViewLength = viewEnd - viewStart;
      // if (originalViewLength.toFixed(4) !== lastViewWidth.current) {
      //   g.clear();
      //   lastViewWidth.current = originalViewLength.toFixed(4);
      // }

      highResTimeout.current = setTimeout(() => {
        const bufferPercent = DEBUG_MODE ? -0.1 : 0;

        const bufferAmount = bufferPercent * originalViewLength;
        viewStart = Math.max(viewStart - bufferAmount, worldBounds[0]);
        viewEnd = Math.min(viewEnd + bufferAmount, worldBounds[1]);
        const viewLength = viewEnd - viewStart;

        g.clear();

        // background
        g.beginFill(BACKGROUND_COLOR);
        g.drawRect(viewStart, 0, viewLength, height);
        g.endFill();

        let renderCount = 0;
        console.time("high-res-calc");
        dataLines.forEach(({ pointsByView, color, valueRange }) => {
          // only draw data in view
          const startPercent = viewStart / worldWidth;
          const endPercent = viewEnd / worldWidth;

          const allData = pointsByView[getViewPercentile(viewLength)];
          const startIndex = startPercent * allData.length;
          const endIndex = endPercent * allData.length;
          const highResData = allData.slice(startIndex, endIndex);

          const points = getRelativePoints(highResData, height, valueRange, [
            viewStart,
            viewEnd,
          ]);

          // console.log("high res points", points);

          g.lineStyle({
            width: getLineWidth(screenWidth, worldViewBounds),
            color: DEBUG_MODE ? color + 0xaaaaaa : color,
            join: PIXI.LINE_JOIN.BEVEL,
            native: true,
          });
          g.moveTo(viewStart, points[0].y);

          renderCount += points.length;

          points.forEach(({ x, y }) => {
            g.lineTo(x, y);
          });
        });
        console.timeEnd("high-res-calc");
        onPointsRendered(renderCount);
      }, 100);
    },
    [dataLines, screenWidth, worldWidth, height, worldViewBounds]
  );

  const drawLine = useCallback(
    (g: PIXI.Graphics) => {
      g.clear();
      g.lineStyle({
        width: 4,
        color: 0x333333,
        join: PIXI.LINE_JOIN.BEVEL,
      });
      g.moveTo(0, 0);
      g.lineTo(worldWidth, 0);
    },
    [worldWidth, height]
  );

  return (
    <Container y={y}>
      <Graphics
        x={0}
        ref={lowResRef}
        draw={drawLowResData}
        interactiveChildren={false}
      />
      <Graphics
        ref={highResRef}
        x={0}
        draw={drawHighResData}
        interactiveChildren={false}
      />
      <Graphics draw={drawLine} y={height + 1} />
    </Container>
  );
};
