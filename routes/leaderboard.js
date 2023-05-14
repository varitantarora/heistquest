import express from "express";
import db from "./db-config.js";
const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const q = "SELECT userid,name,totalTime, totalScore from users";
    db.query(q, (err, results) => {
        if(err)res.status(400).json(err);
      else res.status(200).json(results);
    });
  } catch (err) {
    res.status(500).json(err);
  }
});

export default router;
