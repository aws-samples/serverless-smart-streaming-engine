import React from "react";
import styles from "./NarBar.module.css";
import { Link } from "react-router-dom";

const NavBar = () => {
  return (
    <div className={styles.navbar}>
      <Link className={styles.link} to="/">
        <h2>AnyCompany Shorts Generator</h2>
      </Link>
      <div className={styles.toCelebButton__container}>
        <Link className={styles.toCelebButton} to="/celebs">
          Celebrities
        </Link>
      </div>
    </div>
  );
};

export default NavBar;
