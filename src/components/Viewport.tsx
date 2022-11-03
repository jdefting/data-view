import React, { forwardRef } from "react";
import { Viewport as PixiViewport } from "pixi-viewport";
import * as PIXI from "pixi.js";
import { PixiComponent, useApp } from "@inlet/react-pixi";

export interface ViewportProps {
  screenWidth: number;
  screenHeight: number;
  worldWidth: number;
  worldHeight: number;
  viewBounds: [number, number];
  children?: React.ReactNode;
  onZoomedEnd?: (e: PixiViewport) => void;
  onMovedEnd?: (e: PixiViewport) => void;
}

export interface PixiComponentViewportProps extends ViewportProps {
  app: PIXI.Application;
}

const PixiComponentViewport = PixiComponent("Viewport", {
  create: ({
    screenWidth,
    screenHeight,
    worldHeight,
    worldWidth,
    app,
    onZoomedEnd = () => null,
    onMovedEnd = () => null,
    viewBounds,
  }: PixiComponentViewportProps) => {
    const viewport = new PixiViewport({
      screenWidth,
      screenHeight,
      worldWidth,
      worldHeight,
      ticker: app.ticker,
      interaction: app.renderer.plugins.interaction,
    });
    viewport
      .drag({ direction: "x" })
      .pinch({ axis: "x" })
      .wheel({ axis: "x" })
      .clamp({
        direction: "x",
      })
      .clampZoom({
        minScale: screenWidth / worldWidth,
      });
    viewport.on("zoomed", onZoomedEnd).on("moved-end", onMovedEnd);

    viewport.moveCenter(
      (viewBounds[1] - viewBounds[0]) / 2 + viewBounds[0],
      worldHeight / 2
    );

    // culling?
    // see https://codesandbox.io/s/inletreact-pixi-viewport-cull-3b5by?file=/src/PixiPage.tsx

    return viewport;
  },
  applyProps: (
    viewport,
    _oldProps,
    { screenWidth, screenHeight, worldWidth, worldHeight, viewBounds }
  ) => {
    // TODO: fix this up?
    viewport.resize(screenWidth, screenHeight, worldWidth, worldHeight);
    viewport.moveCenter(
      (viewBounds[1] - viewBounds[0]) / 2 + viewBounds[0],
      worldHeight / 2
    );
  },
});

export const Viewport = forwardRef<PixiViewport, ViewportProps>(
  (props, ref) => {
    return <PixiComponentViewport ref={ref} app={useApp()} {...props} />;
  }
);
