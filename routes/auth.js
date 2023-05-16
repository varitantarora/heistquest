import express from "express";
import CryptoJS from "crypto-js";
import jwt from "jsonwebtoken";
import token from "./verifyToken.js";
import db from "./db-config.js";
// import dotenv from "dotenv";
// dotenv.config();
// import mysql from "mysql2/promise";
// const pool = mysql.createPool(process.env.DATABASE_URL);
// const pool = mysql.createPool({
//   host: process.env.DATABASE_HOST,
//   user: process.env.DATABASE_USER,
//   password: process.env.DATABASE_PW,
//   database: process.env.DATABASE_NAME,
//   waitForConnections: true,
//   connectionLimit: 10,
//   queueLimit: 0
// });
const router = express.Router();
const verifyTokenAndAuthorization=token.verifyTokenAndAuthorization;

router.post("/register", async (req, res) => {
  const name = req.body.name;
  const email = req.body.email;
  const password = CryptoJS.AES.encrypt(
    req.body.password,
    process.env.PASS_SEC
  ).toString();
  try {
    const [rows] = await db.query("SELECT * FROM users WHERE email = ?", [email]);
    if (rows.length > 0) {
      res.status(409).json("email already exists");
    } else {
      const q = `INSERT INTO users (name, email, password) VALUES (?, ?, ?);`;
      await db.query(q, [name, email, password]);
      res.status(200).json("registration successful");
    }
  } catch (err) {
    console.error(err);
    res.status(500).json(err);
  }
});

const generateAccessToken = (user) => {
  return jwt.sign({ id: user.id, isAdmin: user.isAdmin }, process.env.JWT_SEC , {
    expiresIn: "15m",
  });
};

const generateRefreshToken = (user) => {
  return jwt.sign({ id: user.id, isAdmin: user.isAdmin }, process.env.JWT_REFRESH );
};


router.post("/login", async (req, res) => {
  const email = req.body.email;
  const password = req.body.password;
  try {
    const [rows] = await db.query("SELECT * FROM users WHERE email = ?", [email]);
    if (rows.length === 0) {
      res.status(401).json("Wrong Credentials");
      return;
    }
    const hashedPw = CryptoJS.AES.decrypt(
      rows[0].password,
      process.env.PASS_SEC
    );
    const pw = hashedPw.toString(CryptoJS.enc.Utf8);
    if (pw !== password) {
      res.status(401).json("Wrong Credentials");
      return;
    }
    const user = { id: rows[0].userId, isAdmin: rows[0].isAdmin };
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    await db.execute('INSERT INTO refresh_tokens (userId, token) VALUES (?, ?) ON DUPLICATE KEY UPDATE token = ?', [rows[0].userId, refreshToken, refreshToken]);
    const { password: _, ...others } = rows[0];
    res.status(200).json({ ...others, accessToken, refreshToken });
  } catch (error) {
    console.log(error);
    res.status(500).json("internal server error");
  }
});

router.post("/:userid/logout",verifyTokenAndAuthorization, async (req, res) => {
  const refreshToken = req.body.token;
  const q = "DELETE FROM refresh_tokens WHERE token = ?";
  try {
    const [results, fields] = await db.execute(q, [refreshToken]);
    res.status(200).json("You logged out successfully.");
  } catch (error) {
    console.error(error);
    res.status(500).json(error);
  }
});




// router.post("/:userid/refresh",verifyTokenAndAuthorization, (req, res) => {
//   //take the refresh token from the user
//   const refreshToken = req.body.token;

//   //send error if there is no token or it's invalid
//   if (!refreshToken) return res.status(401).json("You are not authenticated!");
  
//   const q = "SELECT * FROM refresh_tokens WHERE token = ?";
//   db.query(q, [refreshToken], (err, results) => {
//     console.log(results);
//     if (err) {
//       res.status(500).json(err);
//     } else if (results.length === 0) {
//       res.status(403).json("Refresh token is not valid!");
//     } else {
//       jwt.verify(refreshToken, process.env.JWT_REFRESH, (err, user) => {
//         if (err) {
//           res.status(403).json("Refresh token is not valid!");
//         } else {
//           db.query("DELETE FROM refresh_tokens WHERE token = ?", [refreshToken], (err, result) => {
//             if (err) {
//               res.status(500).json(err);
//             } else {
//               const newAccessToken = generateAccessToken(user);
//               const newRefreshToken = generateRefreshToken(user);
              
//               db.query("INSERT INTO refresh_tokens SET ? ", {userId: results[0].userId, token: newRefreshToken }, (err, result) => {
//                 if (err) {
//                   res.status(500).json(err);
//                 } else {
//                   res.status(200).json({
//                     accessToken: newAccessToken,
//                     refreshToken: newRefreshToken,
//                   });
//                 }
//               });
//             }
//           });
//         }
//       });
//     }
//   });
// });

export default router;
