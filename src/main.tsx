import React from "react";
import ReactDOM from "react-dom";
import App from "./App";
import "./index.css";

const rootNode = document.getElementById("root") as HTMLElement;
ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  rootNode
);
