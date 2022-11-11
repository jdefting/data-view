import React, { useCallback, useRef, useState } from "react";
import { Stage, Graphics } from "@inlet/react-pixi";
import * as PIXI from "pixi.js";
import { Viewport as PixiViewport } from "pixi-viewport";
import { Viewport } from "./Viewport";
import { DataChannel, GraphMode } from "./DataChannel";

interface Props {
  channels: number[];
  pointsPerChannel: number;
  linesPerChannel: number;
  renderedPointCountRef: React.MutableRefObject<number>;
  heightPixel: number;
  widthPixel: number;
  debugMode: boolean;
  worldBounds: [number, number];
  viewBounds: [number, number];
  cursorX: number;
  onCursorChange: (val: number) => void;
  onViewBoundsChange: (bounds: [number, number]) => void;
  simplifyLevel: number;
  graphMode: GraphMode;
  aggregateData: boolean;
}

export const LinearView: React.FC<Props> = ({
  channels,
  pointsPerChannel,
  linesPerChannel,
  renderedPointCountRef,
  heightPixel,
  widthPixel,
  debugMode,
  worldBounds,
  viewBounds,
  onCursorChange,
  onViewBoundsChange,
  cursorX,
  simplifyLevel,
  graphMode,
  aggregateData,
}) => {
  const viewportRef = useRef<PixiViewport>(null);
  const [cursorWidth, setCursorWidth] = useState(2);
  const worldLength = worldBounds[1] - worldBounds[0];

  const drawCursor = useCallback(
    (g: PIXI.Graphics) => {
      g.clear();
      g.lineStyle({
        width: cursorWidth,
        color: 0xffffff,
        join: PIXI.LINE_JOIN.BEVEL,
        native: true,
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

      // todo: fix cursor position when zooming back out and hitting view bound
      setCursorWidth(viewport.screenWidthInWorldPixels / widthPixel);
    },
    [widthPixel]
  );

  const onMoved = useCallback((viewport) => {
    const { left, right } = viewport; // world pos
    onViewBoundsChange([left, right]);
  }, []);

  return (
    <>
      <div
        onMouseMove={(e) => {
          if (!viewportRef.current) {
            return;
          }

          const { x } = e.currentTarget.getBoundingClientRect();
          const worldPosition = viewportRef.current.toWorld(e.clientX - x, 0);
          onCursorChange(worldPosition.x);
        }}
      >
        <Stage
          height={heightPixel}
          width={widthPixel}
          options={{
            backgroundColor: 0xcccccc,
            antialias: true,
            resolution: window.devicePixelRatio || 1,
            autoDensity: true,
          }}
        >
          <Viewport
            screenWidth={widthPixel}
            screenHeight={heightPixel}
            worldHeight={heightPixel}
            worldWidth={worldLength}
            ref={viewportRef}
            onZoomedEnd={onZoomedEnd}
            onMoved={onMoved}
            viewBounds={viewBounds}
            onMovedEnd={() => (renderedPointCountRef.current = 0)}
          >
            {channels.map((id, i) => {
              const channelHeight = heightPixel / channels.length;

              return (
                <DataChannel
                  key={id}
                  aggregateData={aggregateData}
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
                  worldBounds={worldBounds}
                  debugMode={debugMode}
                  simplifyLevel={simplifyLevel}
                  graphMode={graphMode}
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
