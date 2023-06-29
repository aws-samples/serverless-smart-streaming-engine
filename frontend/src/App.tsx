import NavBar from "./components/NavBar/NavBar";
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
