import React from "react";
import ReactPlayer from "react-player";
import styles from "./Video.module.css";

const Video = () => {
  const videoURL = process.env.REACT_APP_LIVE_STREAMING_CF_URL;

  return (
    <div className={styles.videoPlayer}>
      <ReactPlayer
        className={styles.reactPlayerLive}
        url={videoURL}
        width="100%"
        height="100%"
        type="application/x-mpegURL"
        controls
      ></ReactPlayer>
    </div>
  );
};

export default Video;
