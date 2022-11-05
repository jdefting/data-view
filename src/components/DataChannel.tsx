import React, { useCallback, useEffect, useMemo, useRef } from "react";
import simplify from "simplify-js";
import { Container, Graphics } from "@inlet/react-pixi";
import * as PIXI from "pixi.js";
import { getRandomData } from "../fake-data";
import { chunk } from "lodash-es";

const DEBUG_MODE = false;
const BACKGROUND_COLOR = 0xaaaaaa;

const colors = [
  0xaa4a44, 0xff7f50, 0x6495ed, 0x9fe2bf, 0xffbf00, 0xf25f5c, 0x50514f,
  0x70c1b3,
];

export interface MockEvent {
  name: string;
  values: number[];
}

const aggregateData = (
  values: number[],
  viewWidth: number,
  channelHeight: number,
  min: number,
  max: number
): number[] => {
  const pointsPerPixel = Math.max(values.length / viewWidth, 1);
  const dataChunks = chunk(values, pointsPerPixel);
  return dataChunks.map((chunk) => {
    const value = Math.max(...chunk);
    const percent = value / max;

    return (1 - percent) * channelHeight;
  });
};

const getLineWidth = (
  worldWidth: number,
  worldViewBounds: [number, number]
) => {
  const viewWidth = Math.round(worldViewBounds[1] - worldViewBounds[0]);
  return 2 * (viewWidth / worldWidth);
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
  events?: MockEvent[];
}

export const DataChannel: React.FC<Props> = ({
  dataCount,
  lineCount,
  height,
  worldWidth,
  worldViewBounds,
  screenWidth,
  y,
  onPointsRendered,
  worldBounds,
  events,
}) => {
  const highResTimeout = useRef<number>(0);
  const highResRef = useRef<PIXI.Graphics>(null);
  const lowResRef = useRef<PIXI.Graphics>(null);

  const dataLines = useMemo(() => {
    const lines = [];

    for (let i = 0; i < lineCount; i++) {
      let data = getRandomData(dataCount);
      if (events && events[i]) {
        data = events[i].values;
      }

      lines.push({
        data,
        color: colors[i % colors.length],
        max: Math.max(...data),
        min: Math.min(...data),
      });
    }

    return lines;
  }, [dataCount, lineCount, events]);

  const drawLowResData = useCallback(
    (g: PIXI.Graphics) => {
      // draw data across the entire world
      g.clear();

      // background
      g.beginFill(DEBUG_MODE ? 0x888888 : BACKGROUND_COLOR);
      g.drawRect(0, 0, worldWidth, height);
      g.endFill();

      dataLines.forEach(({ data, color, min, max }) => {
        // data
        const lowResData = aggregateData(
          data,
          worldWidth * 2,
          height,
          min,
          max
        );
        const points = lowResData.map((y, i) => ({
          x: worldBounds[0] + i * (worldWidth / lowResData.length),
          y,
        }));
        const simplePoints = simplify(points, 5);

        g.lineStyle({
          width: getLineWidth(worldWidth, worldViewBounds),
          color,
          join: PIXI.LINE_JOIN.BEVEL,
          native: true,
        });
        g.moveTo(0, simplePoints[0].y);
        simplePoints.forEach(({ x, y }) => {
          g.lineTo(x, y);
        });
      });
    },
    [worldWidth, height, dataLines]
  );

  const drawHighResData = useCallback(
    (g: PIXI.Graphics) => {
      clearTimeout(highResTimeout.current);

      highResTimeout.current = setTimeout(() => {
        let [viewStart, viewEnd] = worldViewBounds;
        const bufferPercent = DEBUG_MODE ? -0.1 : 0;
        const originalViewLength = viewEnd - viewStart;
        const bufferAmount = bufferPercent * originalViewLength;
        viewStart = Math.max(viewStart - bufferAmount, worldBounds[0]);
        viewEnd = Math.min(viewEnd + bufferAmount, worldBounds[1]);
        const bufferRatio = (viewEnd - viewStart) / originalViewLength;
        const viewLength = viewEnd - viewStart;
        const viewLengthScreen = screenWidth * bufferRatio;

        g.clear();

        // background
        g.beginFill(BACKGROUND_COLOR);
        g.drawRect(viewStart, 0, viewLength, height);
        g.endFill();

        let renderCount = 0;
        dataLines.forEach(({ data, color, min, max }) => {
          // only draw data in view
          const startPercent = viewStart / worldWidth;
          const endPercent = viewEnd / worldWidth;
          const startIndex = startPercent * data.length;
          const endIndex = endPercent * data.length;
          const dataInView = data.slice(startIndex, endIndex);
          const highResData = aggregateData(
            dataInView,
            viewLengthScreen,
            height,
            min,
            max
          );

          // data
          g.lineStyle({
            width: getLineWidth(worldWidth, worldViewBounds),
            color: DEBUG_MODE ? color + 0xaaaaaa : color,
            join: PIXI.LINE_JOIN.BEVEL,
            native: true,
          });
          g.moveTo(viewStart, highResData[0]);

          const points = highResData.map((y, i) => ({
            x: viewStart + i * (viewLength / highResData.length),
            y,
          }));

          let simplePoints = simplify(points, 5);
          if (simplePoints.length < 100) {
            simplePoints = points;
          }
          renderCount += simplePoints.length;

          simplePoints.forEach(({ x, y }) => {
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

  // const lastScaleChange = useRef<number>(0);
  //
  // const lineWidth = getLineWidth(worldWidth, worldViewBounds);
  // useEffect(() => {
  //   if (!highResRef.current || !lowResRef.current) {
  //     return;
  //   }
  //   console.log("lineWidth:", lineWidth);
  //   const now = performance.now();
  //
  //   if (now - lastScaleChange.current < 500) {
  //     return;
  //   }
  //
  //   lastScaleChange.current = now;
  //
  //   highResRef.current.geometry.graphicsData.forEach((graphic) => {
  //     graphic.lineStyle.width = lineWidth;
  //   });
  //   highResRef.current.geometry.invalidate();
  //
  //   lowResRef.current.geometry.graphicsData.forEach((graphic) => {
  //     graphic.lineStyle.width = lineWidth;
  //   });
  //   lowResRef.current.geometry.invalidate();
  // }, [lineWidth]);

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
