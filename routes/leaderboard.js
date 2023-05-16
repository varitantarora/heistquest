import express from "express";
import db from "./db-config.js";
const router = express.Router();

router.get("/", async (req, res) => {
  let status = 200;
	let retVal = {};
	try {
		const query = 'SELECT userid, name, totalTime, totalScore FROM users';
		const [rows] = await db.query(query);
		retVal.data = rows;
	} catch (error) {
		console.error(error);
		retVal.error = error;
		status = 500;
	}finally{
		res.status(status).json(retVal);
	}
});

export default router;
