import ReactPlayer from "react-player";
import styles from "./Preview.module.css";

type Video = {
  url: string;
  title: string;
};

const Preview = ({ url, title }: Video) => {
  const splitTitle = title.split("/").at(-1);
  return (
    <div className={styles.previewPlayer}>
      <ReactPlayer
        className={styles.previewItem}
        url={"https://" + url}
        width="426px"
        height="240px"
        type="application/x-mpegURL"
        controls></ReactPlayer>
      <span className="preview-title">{splitTitle}</span>
    </div>
  );
};

export default Preview;
