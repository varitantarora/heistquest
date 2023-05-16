import express from "express";
import db from "./db-config.js";
import token from "./verifyToken.js";

const router = express.Router();
const verifyTokenAndAdmin=token.verifyTokenAndAdmin;

router.get("/", verifyTokenAndAdmin, async (req, res) => {
  try {
    const getUsersQuery = "SELECT * FROM users";
    const [usersResult] = await db.execute(getUsersQuery);
    const users = usersResult;

    const userPromises = users.map(async (user) => {
      const getScoresQuery = "SELECT * FROM scores WHERE userId = ?";
      const [scoresResult] = await db.execute(getScoresQuery, [user.userId]);
      const scores = scoresResult;

      const scoresWithTime = scores.map((score) => {
        const timeInSeconds = (score.endTime - score.startTime) / 1000;
        const puzzle = {
          puzzleId: score.puzzleId,
          score: score.score,
          time: timeInSeconds,
        };
        return puzzle;
      });

      const totalScore = scores.reduce((acc, curr) => acc + curr.score, 0);
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

      return userWithScores;
    });

    const usersWithScores = await Promise.all(userPromises);
    res.json(usersWithScores);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});


export default router;
