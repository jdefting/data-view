import React, { useCallback, useMemo, useRef } from "react";
import simplify from "simplify-js";
import { Container, Graphics } from "@inlet/react-pixi";
import * as PIXI from "pixi.js";
import { getRandomData } from "../fake-data";
import { max, min } from "lodash-es";

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
  values: number[],
  // screen pixels
  channelHeight: number,
  valueRange: [number, number],
  // world units
  viewBounds: [number, number],
  shouldSimplify = true
): Point[] => {
  const [minVal, maxVal] = valueRange;
  const [viewStart, viewEnd] = viewBounds;
  const viewLength = viewEnd - viewStart;

  const rawPoints = values.map((value, i) => {
    const yPercent = (value - minVal) / (maxVal - minVal);
    return {
      y: (1 - yPercent) * channelHeight,
      x: viewStart + i * (viewLength / values.length),
    };
  });

  // simplification should be relative to channelHeight and viewLength
  const simplificationAmount = 13; // (higher -> less simplification)
  const relativeTolerance =
    channelHeight * viewLength * simplificationAmount ** -5;

  return shouldSimplify ? simplify(rawPoints, relativeTolerance) : rawPoints;
};

const getLineWidth = (
  screenWidth: number,
  worldViewBounds: [number, number]
) => {
  const viewWidth = worldViewBounds[1] - worldViewBounds[0];
  return 2 * (viewWidth / screenWidth);
};

type DataViews = { [percent: string]: number[] };

interface DataLine {
  valuesByView: DataViews;
  color: number;
  valueRange: [number, number];
}

const dataLineCaches: DataLine[] = [];

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
    valuesByView: DataViews;
    color: number;
    valueRange: [number, number];
  }[] = useMemo(() => {
    const lines = [];

    console.time(`calculate-views (${lineCount})`);
    for (let i = 0; i < lineCount; i++) {
      if (dataLineCaches[i]) {
        lines.push(dataLineCaches[i]);
        continue;
      }

      const data = getRandomData();
      const maxValue = max(data) || 0;
      const minValue = min(data) || 0;

      const percentiles = [0, 0.2, 0.4, 0.6, 0.8, 1];

      const valuesByView: { [percent: string]: number[] } = {};
      percentiles.forEach((percentile) => {
        const pointsPerPixel = Math.max(
          (data.length / worldWidth) * percentile,
          1
        );

        // unfortunately, this by hand method is much faster than using lodash chunk()
        let curMax = 0;
        let lastSlice = 0;
        valuesByView[percentile.toFixed(2)] = data.reduce(
          (aggregates, value, index) => {
            curMax = Math.max(value, curMax);

            if (
              index - lastSlice >= pointsPerPixel ||
              index === data.length - 1
            ) {
              aggregates.push(curMax);
              lastSlice = index;
              curMax = 0;
            }
            return aggregates;
          },
          [] as number[]
        );
      });

      const dataLine = {
        valuesByView,
        color: colors[i % colors.length],
        valueRange: [minValue, maxValue] as [number, number],
      };

      dataLineCaches[i] = dataLine;
      lines.push(dataLine);
    }

    console.timeEnd(`calculate-views (${lineCount})`);

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

      dataLines.forEach(({ valuesByView, color, valueRange }) => {
        const lowResData = valuesByView[getViewPercentile(worldWidth)];
        const points = getRelativePoints(
          lowResData,
          height,
          valueRange,
          worldBounds,
          false
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
        const bufferPercent = DEBUG_MODE ? -0.1 : 0.2;

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
        dataLines.forEach(({ valuesByView, color, valueRange }) => {
          // only draw data in view
          const startPercent = viewStart / worldWidth;
          const endPercent = viewEnd / worldWidth;

          const allData = valuesByView[getViewPercentile(viewLength)];
          const startIndex = startPercent * allData.length;
          const endIndex = endPercent * allData.length;
          const highResData = allData.slice(startIndex, endIndex);

          const points = getRelativePoints(highResData, height, valueRange, [
            viewStart,
            viewEnd,
          ]);

          renderCount += points.length;

          g.lineStyle({
            width: getLineWidth(screenWidth, worldViewBounds),
            color: DEBUG_MODE ? color + 0xaaaaaa : color,
            join: PIXI.LINE_JOIN.BEVEL,
            native: true,
          });
          g.moveTo(viewStart, points[0].y);

          points.forEach(({ x, y }) => {
            g.lineTo(x, y);
          });
        });
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
