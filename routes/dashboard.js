import express from "express";
import db from "./db-config.js";
import token from "./verifyToken.js";

const router = express.Router();
const verifyTokenAndAdmin=token.verifyTokenAndAdmin;

router.get("/", verifyTokenAndAdmin, (req, res) => {
  const getUsersQuery = "SELECT * FROM users";
  db.query(getUsersQuery, (err, results) => {
    if (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
    } else {
      const users = results;

      const userPromises = users.map((user) => {
        const getScoresQuery = "SELECT * FROM scores WHERE userId = ?";
        return new Promise((resolve, reject) => {
          db.query(getScoresQuery, [user.userId], (err, results) => {
            if (err) {
              console.error(err);
              reject(err);
            } else {
              const scores = results;

              const scoresWithTime = scores.map((score) => {
                const timeInSeconds = (score.endTime - score.startTime) / 1000;
                const puzzle = {
                  puzzleId: score.puzzleId,
                  score: score.score,
                  time: timeInSeconds,
                };
                return puzzle;
              });

              const totalScore = scores.reduce(
                (acc, curr) => acc + curr.score,
                0
              );
              const totalTimeInSeconds = scores.reduce(
                (acc, curr) => acc + (curr.endTime - curr.startTime) / 1000,
                0
              );
              const totalTimeInMinutes = Math.round(totalTimeInSeconds / 60);

              const userWithScores = {
                userId: user.userId,
                name: user.name,
                totalScore: totalScore,
                totalTime: totalTimeInMinutes,
                puzzles: scoresWithTime,
              };

              resolve(userWithScores);
            }
          });
        });
      });

      Promise.all(userPromises)
        .then((usersWithScores) => {
          res.json(usersWithScores);
        })
        .catch((err) => {
          console.error(err);
          res.status(500).json({ message: "Server error" });
        });
    }
  });
});

export default router;
