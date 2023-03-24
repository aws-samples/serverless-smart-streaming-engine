import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import reportWebVitals from "./reportWebVitals";
import { Amplify } from "aws-amplify";
import cdk from "./cdk-exports.json";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Streaming from "./components/Streaming/Streaming";
import Vod from "./components/Vod/Vod";
import Celebrities from "./components/Celebrities/Celebrities";

Amplify.configure({
  API: {
    endpoints: [
      {
        name: "GetVideoList",
        endpoint: cdk.EventReplayEngine.APIGatewayURLforAmplify,
      },
    ],
  },
});

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <Streaming /> },
      { path: "celebs", element: <Celebrities /> },
      { path: "shorts", element: <Vod /> },
      { path: "shorts/:keyword", element: <Vod /> },
    ],
  },
]);

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);

root.render(
  <React.StrictMode>
    {/* <App /> */}
    <RouterProvider router={router} />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
