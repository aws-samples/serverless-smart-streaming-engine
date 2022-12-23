import ReactPlayer from "react-player";
import React, { MouseEvent } from "react";
import { useState } from "react";
import styles from "./Preview.module.css";

type Video = {
  url: string;
  title: string;
};

const Preview = (props: Video) => {
  const [playing, setPlaying] = useState(false);

  const playVideoOnMouseEnter = (e: MouseEvent<HTMLVideoElement>) => {
    e.preventDefault();

    console.log("Mouse Entered!");
    setPlaying(true); // Play the video
  };

  const playVideoOnMouseLeave = (e: MouseEvent<HTMLVideoElement>) => {
    e.preventDefault();

    console.log("Mouse Entered!");
    setPlaying(false); // Play the video
  };

  return (
    <div>
      <div className={styles.previewPlayer}>
        <ReactPlayer
          className={styles.previewItem}
          url={props.url}
          width="426px"
          height="240px"
          type="application/x-mpegURL"
          playing={playing}
          onMouseEnter={playVideoOnMouseEnter}
          onMouseLeave={playVideoOnMouseLeave}
          controls
        ></ReactPlayer>
        <span className="preview-title">{props.title}</span>
      </div>
    </div>
  );
};

export default Preview;
