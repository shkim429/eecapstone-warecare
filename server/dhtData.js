// server/sensor.js
import express from "express";
import mqtt from "mqtt";

const router = express.Router();

let latestSensorData = null;

const mqttClient = mqtt.connect("mqtt://localhost:1883");

mqttClient.on("connect", () => {
  console.log("MQTT connected.");
  mqttClient.subscribe("esp32/dht11", (err) => {
    if (!err) console.log("Subscribed to esp32/dht11");
  });
});

mqttClient.on("message", (topic, message) => {
if (topic === "esp32/dht11") {
  try {
    latestSensorData = JSON.parse(message.toString());
  } catch (err) {
    console.error("Invalid JSON: ", message.toString());
  }
}
});

router.get("/", (req, res) => {
  console.log("브라우저 요청, latest data: ", latestSensorData);
  res.json(latestSensorData || {humidity: "--", temperature: "--"});
});

export default router;