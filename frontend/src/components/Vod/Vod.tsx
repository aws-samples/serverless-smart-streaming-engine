import React, { ReactElement, MouseEvent } from "react";
import Preview from "../Preview/Preview";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faRotate, faVideo } from "@fortawesome/free-solid-svg-icons";
import { API } from "aws-amplify";
import { useState } from "react";
import styles from "./Vod.module.css";

type data = {
  key: string;
  value: string;
};

const Vod = () => {
  const [playlist, setplaylist] = useState<ReactElement[]>([]);

  const getVodList = (e: MouseEvent) => {
    e.preventDefault();

    const apiName = "AbpDemoApiGateway";
    const apiPath = "/vod";
    const testEvent = {
      message: "Hello, this is the test event from the amplify",
    };

    const list: ReactElement[] = [];

    API.get(apiName, apiPath, testEvent)
      .then((response) => {
        console.log(response);

        for (const [key, value] of response) {
          // this.list.push(<li key={key.toString}><a href={value}>{key}</a></li>)
          list.push(
            <li key={key.toString()}>
              <Preview url={value} title={key}></Preview>
            </li>
          );
        }

        setplaylist(list);
        console.log(playlist);
      })
      .catch((error) => {
        console.log(error.response);
      });
  };

  return (
    <div className={styles.vod}>
      {/* <h1 onClick={this.getVodList.bind(this)}>{this.state.pageTitle}</h1> */}
      <div className={styles.vodBar}>
        <div>
          <FontAwesomeIcon icon={faVideo} />
          <span>&nbsp;손흥민 하이라이트</span>
        </div>
        <FontAwesomeIcon className={styles.vodRefreshIcon} icon={faRotate} onClick={getVodList} />
      </div>
      <ul>{playlist}</ul>
    </div>
  );
};

export default Vod;
