import express from "express";
import db from "./db-config.js";
import CryptoJS from "crypto-js";
import jwt from "jsonwebtoken";
import token from "./verifyToken.js";
const router = express.Router();
const verifyTokenAndAuthorization=token.verifyTokenAndAuthorization;

router.post("/register", (req, res) => {
  const name = req.body.name;
  const email = req.body.email;
  const password = CryptoJS.AES.encrypt(
    req.body.password,
    process.env.PASS_SEC
  ).toString();
  const q = "SELECT * FROM users WHERE email = ?";
  db.query(q, [email], (err, results) => {
    if (err) {
      res.status(500).json("internal server error");
    } else if (results.length > 0) {
      res.status(409).json("email already exists");
    } else {
      const q = `INSERT INTO users (name, email, password) VALUES (?, ?, ?);`;
      db.query(q, [name, email, password], (err, results) => {
        if (err) {
          res.status(500).json(err);
        } else {
          res.status(200).json("registration successful");
          // res.redirect('/login');
        }
      });
    }
  });
});

const generateAccessToken = (user) => {
  return jwt.sign({ id: user.id, isAdmin: user.isAdmin }, process.env.JWT_SEC , {
    expiresIn: "15m",
  });
};

const generateRefreshToken = (user) => {
  return jwt.sign({ id: user.id, isAdmin: user.isAdmin }, process.env.JWT_REFRESH );
};


router.post("/login", (req, res) => {
  const email = req.body.email;
  const password = req.body.password;
  const q = "SELECT * FROM users WHERE email = ?";
  db.query(q, [email], (err, results) => {
    if (err) {
      res.status(500).json(err);
    } else if (results.length === 0) {
      res.status(401).json("Wrong Credentials");
    } else {
      const hashedPw = CryptoJS.AES.decrypt(
        results[0].password,
        process.env.PASS_SEC
      );
      const pw = hashedPw.toString(CryptoJS.enc.Utf8);
      if (pw != password) {
        res.status(401).json("Wrong Credentials");
      } else {

        const user = { id: results[0].userId, isAdmin: results[0].isAdmin };
        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);
        db.query('INSERT INTO refresh_tokens (userId, token) VALUES (?, ?) ON DUPLICATE KEY UPDATE token = ?',
        [results[0].userId, refreshToken, refreshToken], (error) => {
          if (error) {
            console.log(error);
            res.status(500).json(error);
          } else {
            const { password, ...others } = results[0];
            res.status(200).json({ ...others, accessToken, refreshToken });
          }
        });
        router.post("/:userid/logout", verifyTokenAndAuthorization, (req, res) => {
          const refreshToken = req.body.token;
          const q = "DELETE FROM refresh_tokens WHERE token = ?";
          db.query(q, [refreshToken], (err, results) => {
            if (err) {
              res.status(500).json(err);
            } else {
              res.status(200).json("You logged out successfully.");
            }
          });
        });
      }
    }
  });
});

router.post("/:userid/logout", verifyTokenAndAuthorization, (req, res) => {
  const refreshToken = req.body.token;
  const q = "DELETE FROM refresh_tokens WHERE token = ?";
  db.query(q, [refreshToken], (err, results) => {
    if (err) {
      res.status(500).json(err);
    } else {
      res.status(200).json("You logged out successfully.");
    }
  });
});



router.post("/:userid/refresh",verifyTokenAndAuthorization, (req, res) => {
  //take the refresh token from the user
  const refreshToken = req.body.token;

  //send error if there is no token or it's invalid
  if (!refreshToken) return res.status(401).json("You are not authenticated!");
  
  const q = "SELECT * FROM refresh_tokens WHERE token = ?";
  db.query(q, [refreshToken], (err, results) => {
    console.log(results);
    if (err) {
      res.status(500).json(err);
    } else if (results.length === 0) {
      res.status(403).json("Refresh token is not valid!");
    } else {
      jwt.verify(refreshToken, process.env.JWT_REFRESH, (err, user) => {
        if (err) {
          res.status(403).json("Refresh token is not valid!");
        } else {
          db.query("DELETE FROM refresh_tokens WHERE token = ?", [refreshToken], (err, result) => {
            if (err) {
              res.status(500).json(err);
            } else {
              const newAccessToken = generateAccessToken(user);
              const newRefreshToken = generateRefreshToken(user);
              
              db.query("INSERT INTO refresh_tokens SET ? ", {userId: results[0].userId, token: newRefreshToken }, (err, result) => {
                if (err) {
                  res.status(500).json(err);
                } else {
                  res.status(200).json({
                    accessToken: newAccessToken,
                    refreshToken: newRefreshToken,
                  });
                }
              });
            }
          });
        }
      });
    }
  });
});

export default router;
