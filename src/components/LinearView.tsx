import React, { useCallback, useRef, useState } from "react";
import { Stage, Graphics } from "@inlet/react-pixi";
import * as PIXI from "pixi.js";
import { Viewport as PixiViewport } from "pixi-viewport";
import { Viewport } from "./Viewport";
import { DataChannel } from "./DataChannel";

interface Props {
  channels: number[];
  pointsPerChannel: number;
  linesPerChannel: number;
  renderedPointCountRef: React.MutableRefObject<number>;
  heightPixel: number;
  widthPixel: number;
}

export const LinearView: React.FC<Props> = ({
  channels,
  pointsPerChannel,
  linesPerChannel,
  renderedPointCountRef,
  heightPixel,
  widthPixel,
}) => {
  const viewportRef = useRef<PixiViewport>(null);

  const [cursorX, setCursorX] = useState(0);
  const [cursorWidth, setCursorWidth] = useState(2);
  const [worldBounds, setWorldBounds] = useState<[number, number]>([
    0,
    widthPixel * 2,
  ]);
  const [worldStart, worldEnd] = worldBounds;
  const worldLength = worldEnd - worldStart;
  const [viewBounds, setViewBounds] = useState<[number, number]>([0, 50]);
  const viewMidPoint = (viewBounds[1] - viewBounds[0]) / 2 + viewBounds[0];

  const drawCursor = useCallback(
    (g: PIXI.Graphics) => {
      g.clear();
      g.lineStyle({
        width: cursorWidth,
        color: 0x000,
        join: PIXI.LINE_JOIN.BEVEL,
      });
      g.lineTo(0, heightPixel || 0);
    },
    [heightPixel, cursorWidth]
  );

  const onZoomedEnd = useCallback(
    ({ viewport }) => {
      if (!widthPixel) {
        return;
      }

      // fixing cursor position broken until we fix viewport breaking on resize
      setCursorX((viewport.screenWidthInWorldPixels / widthPixel) * cursorX);
      setCursorWidth(viewport.screenWidthInWorldPixels / widthPixel);
    },
    [widthPixel]
  );

  const onMovedEnd = useCallback((viewport) => {
    console.log("movedEnd", viewport);
    const { left, right } = viewport; // world pos
    renderedPointCountRef.current = 0;
    setViewBounds([left, right]);
  }, []);

  return (
    <>
      <div className="flex w-full justify-between">
        <div>{worldStart}</div>
        <div>
          {viewBounds[0].toFixed(4)} - {viewBounds[1].toFixed(4)}
        </div>
        <div>{worldEnd}</div>
      </div>
      <input
        className="w-full"
        type="range"
        min={worldStart}
        max={worldEnd}
        step={0.01}
        value={viewMidPoint}
        onChange={(e) => {
          const viewLength = viewBounds[1] - viewBounds[0];
          const targetMidpoint = parseFloat(e.currentTarget.value);

          const halfViewLength = 0.5 * viewLength;
          // TODO: maintain width while clamping

          setViewBounds([
            Math.max(targetMidpoint - halfViewLength, worldStart),
            Math.min(targetMidpoint + halfViewLength, worldEnd),
          ]);
        }}
      />
      <div
        onMouseMove={(e) => {
          if (!viewportRef.current) {
            return;
          }

          const { x } = e.currentTarget.getBoundingClientRect();
          const worldPosition = viewportRef.current.toWorld(e.clientX - x, 0);
          setCursorX(worldPosition.x);
        }}
      >
        <Stage
          height={heightPixel}
          width={widthPixel}
          options={{ backgroundColor: 0xcccccc }}
        >
          <Viewport
            screenWidth={widthPixel}
            screenHeight={heightPixel}
            worldHeight={heightPixel}
            worldWidth={worldLength}
            ref={viewportRef}
            onZoomedEnd={onZoomedEnd}
            onMovedEnd={onMovedEnd}
            viewBounds={viewBounds}
          >
            {channels.map((id, i) => {
              const channelHeight = heightPixel / channels.length;

              return (
                <DataChannel
                  key={id}
                  dataCount={pointsPerChannel}
                  lineCount={linesPerChannel}
                  height={channelHeight}
                  y={i * channelHeight}
                  worldWidth={worldLength}
                  screenWidth={widthPixel}
                  worldViewBounds={viewBounds}
                  onPointsRendered={(count) => {
                    renderedPointCountRef.current += count;
                  }}
                />
              );
            })}
            <Graphics x={cursorX} y={0} draw={drawCursor} />
          </Viewport>
        </Stage>
      </div>
    </>
  );
};
