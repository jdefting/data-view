import React, { useCallback, useMemo, useRef } from "react";
import simplify from "simplify-js";
import { Container, Graphics } from "@inlet/react-pixi";
import * as PIXI from "pixi.js";
import { getRandomData } from "../fake-data";
import { max, min, chunk, mean } from "lodash-es";

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
  visualViewBounds?: [number, number]
): Point[] => {
  const [minVal, maxVal] = valueRange;
  const [viewStart, viewEnd] = viewBounds;
  const viewLength = viewEnd - viewStart;

  const rawPoints = values
    .map((value, i) => {
      const yPercent = (value - minVal) / (maxVal - minVal);
      return {
        y: (1 - yPercent) * channelHeight,
        x: viewStart + i * (viewLength / (values.length - 1)),
      };
    })
    .filter(({ x }) => {
      if (!visualViewBounds) {
        return true;
      }
      return visualViewBounds[0] <= x && x <= visualViewBounds[1];
    });

  // simplification should be relative to channelHeight and viewLength
  const simplificationAmount = 13; // (higher -> less simplification)
  const relativeTolerance =
    channelHeight * viewLength * simplificationAmount ** -5;

  // return simplify(rawPoints, relativeTolerance);
  return rawPoints;
};

interface DataLine {
  rawData: number[];
  color: number;
  valueRange: [number, number];
}

// used to get width relative to screen size, not necessary if we use native lines
// const getLineWidth = (
//   screenWidth: number,
//   worldViewBounds: [number, number]
// ) => {
//   const viewWidth = worldViewBounds[1] - worldViewBounds[0];
//   return 2 * (viewWidth / screenWidth);
// };

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
  debugMode: boolean;
}

export const DataChannel: React.FC<Props> = ({
  lineCount,
  height,
  worldWidth,
  worldViewBounds,
  y,
  onPointsRendered,
  worldBounds,
  debugMode,
  screenWidth,
}) => {
  const highResTimeout = useRef<NodeJS.Timeout>();
  const rawDataCache = useRef<number[][]>([]);

  const dataLines: DataLine[] = useMemo(() => {
    const lines = [];

    console.time(`calculate-views (${lineCount})`);
    for (let i = 0; i < lineCount; i++) {
      const rawData = rawDataCache.current[i] || getRandomData();
      rawDataCache.current[i] = rawData;
      const maxValue = max(rawData) || 0;
      const minValue = min(rawData) || 0;

      const dataLine = {
        rawData,
        color: colors[i % colors.length],
        valueRange: [minValue, maxValue] as [number, number],
      };

      lines.push(dataLine);
    }

    console.timeEnd(`calculate-views (${lineCount})`);

    return lines;
  }, [lineCount]);

  const buildGraphics = useCallback(
    ({
      g,
      dataLines,
      viewBounds,
      colorAdjust = 0x000,
      backgroundColor = 0x111111,
      xResolution = screenWidth,
    }: {
      g: PIXI.Graphics;
      dataLines: DataLine[];
      viewBounds: [number, number];
      xResolution?: number;
      colorAdjust?: number;
      backgroundColor?: number;
    }) => {
      const [viewStart, viewEnd] = viewBounds;
      const viewLength = viewEnd - viewStart;
      const startPercent = viewStart / worldWidth;
      const endPercent = viewEnd / worldWidth;

      g.clear();

      // background
      g.beginFill(backgroundColor, 1);
      g.drawRect(viewStart, 0, viewLength, height);
      g.endFill();

      let renderCount = 0;
      console.time("build-graphics");
      dataLines.forEach(({ rawData, color, valueRange }) => {
        const startIndex = startPercent * rawData.length;
        const endIndex = endPercent * rawData.length;
        const indexesPerPoint = Math.max(
          Math.ceil((endIndex - startIndex) / xResolution),
          1
        );

        // TODO: adjust startPercent, endPercent by hard aggregate indexes (should this be done before we draw the background?)
        const [viewStart2, viewEnd2] = [
          Math.max(
            Math.floor(viewBounds[0] / indexesPerPoint) * indexesPerPoint,
            worldBounds[0]
          ),
          Math.min(
            Math.ceil(viewBounds[1] / indexesPerPoint) * indexesPerPoint,
            worldBounds[1]
          ),
        ];

        const startPercent2 = viewStart2 / worldWidth;
        const endPercent2 = viewEnd2 / worldWidth;
        const startIndex2 = startPercent2 * rawData.length;
        const endIndex2 = endPercent2 * rawData.length;

        const rawDataInView = rawData.slice(startIndex2, endIndex2);
        const data: number[] = chunk(rawDataInView, indexesPerPoint).map(
          (values) => {
            return max(values) || 0;
          }
        );

        // question: can we filter the added points before sending them to `getRelativePoints`?
        // maybe if we KNEW the bounds being added (calculate instead of floor/ceil)
        //  x: viewStart + i * (viewLength / (values.length - 1)),
        //  inVisual = visualViewBounds[0] <= x && x <= visualViewBounds[1];

        // console.log("data length (before simplify)", data.length);

        const points = getRelativePoints(
          data,
          height,
          valueRange,
          [viewStart2, viewEnd2],
          viewBounds
        );

        renderCount += points.length;

        g.lineStyle({
          width: 1,
          color: color + colorAdjust,
          join: PIXI.LINE_JOIN.BEVEL,
          native: true,
        });
        g.moveTo(points[0].x, points[0].y);
        points.forEach(({ x, y }) => {
          g.lineTo(x, y);
        });
      });

      console.timeEnd("build-graphics");

      return renderCount;
    },
    [debugMode, height, screenWidth, worldBounds, worldWidth]
  );

  const drawLowResData = useCallback(
    (g: PIXI.Graphics) => {
      buildGraphics({
        g,
        dataLines,
        viewBounds: worldBounds,
        backgroundColor: debugMode ? 0x222222 : undefined,
        xResolution: screenWidth * 2,
      });
    },
    [buildGraphics, dataLines, debugMode, worldBounds]
  );

  const drawHighResData = useCallback(
    (g: PIXI.Graphics) => {
      clearTimeout(highResTimeout.current);

      let [viewStart, viewEnd] = worldViewBounds;
      const originalViewLength = viewEnd - viewStart;

      highResTimeout.current = setTimeout(() => {
        const bufferPercent = debugMode ? -0.1 : 0.2;

        const bufferAmount = bufferPercent * originalViewLength;
        viewStart = Math.max(viewStart - bufferAmount, worldBounds[0]);
        viewEnd = Math.min(viewEnd + bufferAmount, worldBounds[1]);

        const renderCount = buildGraphics({
          g,
          dataLines,
          viewBounds: [viewStart, viewEnd],
          colorAdjust: debugMode ? 0xaaaaaa : undefined,
        });
        onPointsRendered(renderCount);
      }, 100);
    },
    [worldViewBounds, debugMode, worldBounds, buildGraphics, dataLines]
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
    [worldWidth]
  );

  return (
    <Container y={y}>
      <Graphics x={0} draw={drawLowResData} interactiveChildren={false} />
      <Graphics x={0} draw={drawHighResData} interactiveChildren={false} />
      <Graphics draw={drawLine} y={height + 1} />
    </Container>
  );
};
