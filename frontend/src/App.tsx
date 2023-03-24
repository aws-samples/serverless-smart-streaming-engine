import Streaming from "./components/Streaming/Streaming";
import Vod from "./components/Vod/Vod";
import NavBar from "./components/NavBar/NavBar";
import styles from "./App.module.css";
import { Outlet } from "react-router-dom";

function App() {
  return (
    <>
      {/* <div className="App"> */}
      <NavBar />
      {/* <div className={styles.mainArea}>
        <div className="wrapper">
          <Streaming></Streaming>
          <Vod></Vod>
        </div>
      </div> */}
      <Outlet />
      {/* </div> */}
    </>
  );
}

export default App;
