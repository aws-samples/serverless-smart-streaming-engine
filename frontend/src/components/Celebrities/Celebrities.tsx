import { API } from "aws-amplify";
import { useEffect, useState, MouseEvent } from "react";
import { ReactElement } from "react";
import styles from "./Celebrities.module.css";
import { useNavigate } from "react-router-dom";

export default function Celebrities() {
  const [celebs, setCelebs] = useState<ReactElement[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    let list: ReactElement[] = [];
    const set = new Set<string>();

    const apiName = "GetVideoList";
    const apiPath = "/vod";
    const testEvent = {
      message: "Hello, this is the test event from the amplify",
    };

    const onClickHander = (e: MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      console.log(e.currentTarget.name);
      navigate(`/shorts/${e.currentTarget.name}`);
    };

    API.get(apiName, apiPath, testEvent)
      .then((response) => {
        // console.log(response);
        for (const res of response) {
          set.add(res.celebName);
        }
        const temp = [...set];
        for (const elem of temp) {
          list.push(
            <button
              className={styles.button}
              key={elem}
              name={elem}
              onClick={onClickHander}>
              {elem}
            </button>
          );
        }

        setCelebs(list);
      })
      .catch((error) => {
        console.error(error.response);
      });
  }, []);
  return <div className={styles.buttonGroup}>{celebs}</div>;
}
