import React from "react";
import logo from "./logo.svg";
import "./App.css";
import Streaming from "./components/Streaming/Streaming";
import Vod from "./components/Vod/Vod";
import NavBar from "./components/NavBar/NavBar";
import styles from "./App.module.css";

function App() {
  return (
    <div className="App">
      <NavBar></NavBar>
      <div className={styles.mainArea}>
        <Streaming></Streaming>
        <Vod></Vod>
      </div>
    </div>
  );
}

export default App;
