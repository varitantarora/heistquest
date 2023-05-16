import db from "./db-config.js";
import express from "express";
import token from "./verifyToken.js";
const verifyTokenAndAuthorization = token.verifyTokenAndAuthorization;
const router = express.Router();
router.get("/:puzzleid/:userid", verifyTokenAndAuthorization, async (req, res) => {
  try {
    const puzzleId = parseInt(req.params.puzzleid);
    const userId = parseInt(req.params.userid);
    const sql = "SELECT question,url FROM puzzles WHERE puzzleId = ?";
    const [rows] = await db.query(sql, [puzzleId]);
    if (rows.length === 0) {
      res.status(404).json({ error: "Puzzle not found" });
      return;
    }
    const puzzle = rows[0];
    const startTime = new Date();
    const checkScoreQuery = "SELECT * FROM scores WHERE userId = ? AND puzzleId = ?";
    const [scoreResult] = await db.query(checkScoreQuery, [userId, puzzleId]);
    if (scoreResult.length === 0) {
      const insertScoreQuery = "INSERT INTO scores (userId, puzzleId, startTime) VALUES (?, ?, ?)";
      await db.query(insertScoreQuery, [userId, puzzleId, startTime]);
      res.json("startTime updated");
    } else {
      res.json(puzzle);
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});


router.post("/:puzzleid/:userid",verifyTokenAndAuthorization, async (req, res) => {
  try {
    const puzzleid = parseInt(req.params.puzzleid);
    const userid = parseInt(req.params.userid);
    const answer = req.body.answer;

    // Get the puzzle answer from the database
    const getPuzzleQuery = "SELECT answer FROM puzzles WHERE puzzleId = ?";
    const [puzzleResult] = await db.execute(getPuzzleQuery, [puzzleid]);
    const puzzleAnswer = puzzleResult[0].answer;

    // Check if the answer is correct
    if (answer === puzzleAnswer) {
      // Update the score in the scores table
      const endTime = new Date();
      const updateScoreQuery =
        "UPDATE scores SET endTime=?, score=100 WHERE userId=? AND puzzleId=?";
      await db.execute(updateScoreQuery, [endTime, userid, puzzleid]);

      // Update the totalScore in the users table
      // Get sum of scores for the user
      const totalScoreQuery =
        "SELECT SUM(score) as totalScore FROM scores WHERE userId=?";
      const [results] = await db.execute(totalScoreQuery, [userid]);

      const totalScore = results[0].totalScore || 0;

      // Update totalScore in users table
      const userQuery = "UPDATE users SET totalScore=? WHERE userId=?";
      await db.execute(userQuery, [totalScore, userid]);

      return res.status(200).send("Score updated");
    } else {
      return res.status(400).json({ message: "Answer is incorrect" });
    }
  } catch (error) {
    console.log(error);
    res.status(500).send("Server error");
  }
});



export default router;
