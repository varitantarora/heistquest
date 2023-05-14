import express from "express";
import bodyParser from "body-parser";
import userRoute from "./routes/user.js";
import authRoute from "./routes/auth.js";
import leaderboardRoute from "./routes/leaderboard.js";
import puzzleRoute from "./routes/puzzle.js";
import dashboardRoute from "./routes/dashboard.js";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import cors from "cors";
const app = express();
dotenv.config();

app.get("/", (req, res) => {
    res.json("This is backend");
});

app.use(cors());
app.use(bodyParser.json());
app.use(cookieParser());
app.use("/user", userRoute); 
app.use("/auth", authRoute);
app.use("/puzzle", puzzleRoute);
app.use("/leaderboard", leaderboardRoute);
app.use("/dashboard", dashboardRoute);

app.listen(process.env.PORT, () => {
    console.log("Backend is connected");
});

