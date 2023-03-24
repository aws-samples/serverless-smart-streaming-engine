import React, { ReactElement, MouseEvent, useEffect } from "react";
import Preview from "../Preview/Preview";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faVideo } from "@fortawesome/free-solid-svg-icons";
import { API } from "aws-amplify";
import { useState } from "react";
import styles from "./Vod.module.css";
import { useParams } from "react-router-dom";

const Vod = () => {
  const [playlist, setPlaylist] = useState<ReactElement[]>([]);
  const { keyword } = useParams();

  useEffect(() => {
    const apiName = "GetVideoList";
    const apiPath = "/vod";
    const testEvent = {
      message: "Hello, this is the test event from the amplify",
    };

    const list: ReactElement[] = [];

    // temporary array and set to remove duplicate
    let tempArray: string[] = [];
    const tempSet: Set<string> = new Set();

    API.get(apiName, apiPath, testEvent)
      .then((response) => {
        for (const item of response) {
          if (!keyword) tempSet.add(item.url);
          else {
            if (keyword === item.celebName) {
              console.log(`${keyword} provided`);
              tempSet.add(item.url);
            }
          }
        }

        tempArray = [...tempSet];

        for (const elem of tempArray) {
          list.push(
            <li key={elem}>
              <Preview url={elem} title={elem}></Preview>
            </li>
          );
        }

        setPlaylist(list);
      })
      .catch((error) => {
        // console.log(error.response);
      });
  }, []);

  return (
    <div className={styles.vod}>
      <div className={styles.vodBar}>
        {/* <FontAwesomeIcon icon={faVideo} />
        <span>&nbsp;Shorts</span> */}
      </div>
      <ul>{playlist}</ul>
    </div>
  );
};

export default Vod;
