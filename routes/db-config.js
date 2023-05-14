import mysql from "mysql";
import dotenv from "dotenv";
dotenv.config();
const db = mysql.createConnection({
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PW,
    database: process.env.DATABASE_NAME,
    port: process.env.DATABASE_PORT
});
  export default db;