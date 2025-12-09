// server/weatherMessage.js
import express from 'express';
import { getWeatherMessage } from './weatherMessageService.js';

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const weatherData = req.body;
    const message = await getWeatherMessage(weatherData);
    res.json({ message });
  } catch (error) {
    console.error("GPT 호출 오류:", error);
    res.status(500).json({ error: "GPT 호출 실패" });
  }
});

export default router;
