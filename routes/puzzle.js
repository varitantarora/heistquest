import db from "./db-config.js";
import express from "express";
import token from "./verifyToken.js";
const verifyTokenAndAuthorization = token.verifyTokenAndAuthorization;
const router = express.Router();
router.get("/:puzzleid/:userid",verifyTokenAndAuthorization, (req, res) => {
  const puzzleId = parseInt(req.params.puzzleid);
  const userId = parseInt(req.params.userid);
  const sql = "SELECT question,url FROM puzzles WHERE puzzleId = ?";
  db.query(sql, [puzzleId], (error, result) => {
    if (error) {
      console.log(error);
      res.status(500).json({ error: "Internal server error" });
    } else if (result.length === 0) {
      res.status(404).json({ error: "Puzzle not found" });
    } else {
      const puzzle = result[0];
      const startTime = new Date();
      // Check if there is an existing entry in the scores table
      const checkScoreQuery =
        "SELECT * FROM scores WHERE userId = ? AND puzzleId = ?";
      db.query(
        checkScoreQuery,
        [userId, puzzleId],
        (scoreError, scoreResult) => {
          if (scoreError) {
            console.log(scoreError);
            res.status(500).json({ error: "Internal server error" });
          } else if (scoreResult.length === 0) {
            // Insert a new entry in the scores table with the start time
            const insertScoreQuery =
              "INSERT INTO scores (userId, puzzleId, startTime) VALUES (?, ?, ?)";
            db.query(
              insertScoreQuery,
              [userId, puzzleId, startTime],
              (insertError, insertResult) => {
                if (insertError) {
                  console.log(insertError);
                  res.status(500).json({ error: "Internal server error" });
                } else {
                  res.json("strtTime updated");
                }
              }
            );
          } else {
            res.json(puzzle);
          }
        }
      );
    }
  });
});

router.post(
  "/:puzzleid/:userid",
  async (req, res) => {
    const puzzleid = parseInt(req.params.puzzleid);
    const userid = parseInt(req.params.userid);
    const answer = req.body.answer;

    // Get the puzzle answer from the database
    const getPuzzleQuery = "SELECT answer FROM puzzles WHERE puzzleId = ?";
    db.query(getPuzzleQuery, [puzzleid], (puzzleErr, puzzleResult) => {
      if (puzzleErr) {
        return res
          .status(500)
          .json({ message: "Error retrieving puzzle answer" });
      }
      const puzzleAnswer = puzzleResult[0].answer;
      // Check if the answer is correct
      if (answer === puzzleAnswer) {
        // Update the score in the scores table
        const endTime = new Date();
        const updateScoreQuery =
          "UPDATE scores SET endTime=?, score=100 WHERE userId=? AND puzzleId=?";
        db.query(
          updateScoreQuery,
          [endTime, userid, puzzleid],
          (scoreErr, scoreResult) => {
            if (scoreErr) {
              return res.status(500).json(scoreErr);
            }
            // Update the totalScore in the users table
            // Get sum of scores for the user
            const totalScoreQuery =
              "SELECT SUM(score) as totalScore FROM scores WHERE userId=?";
            db.query(totalScoreQuery, [userid], async (err, results) => {
              if (err) {
                console.log(err);
                return res.status(500).send("Server error");
              }

              const totalScore = results[0].totalScore || 0;

              // Update totalScore in users table
              const userQuery = "UPDATE users SET totalScore=? WHERE userId=?";
              db.query(
                userQuery,
                [totalScore, userid],
                async (err, results) => {
                  if (err) {
                    console.log(err);
                    return res.status(500).send("Server error");
                  }
                  return res.status(200).send("Score updated");
                }
              );
            });
          }
        );
      } else {
        return res.status(400).json({ message: "Answer is incorrect" });
      }
    });
  }
);

export default router;
