import dotenv from 'dotenv';
import express from 'express';
import axios from 'axios';
import cors from 'cors';
import mqtt from "mqtt";

import getBaseDateTime from './utils/timeNdate.js';
import weatherMessageRouter from './weatherMessage.js';
import dhtRouter from './dhtData.js';
import { saveDataToCache, getCacheData } from './weatherFailoverCache.js';

dotenv.config();
console.log('[DEBUG] API 키 확인:', process.env.WEATHER_API_KEY);

const app = express();
const PORT = process.env.PORT || 3001;
// const CACHE_FILE = '/tmp/weather_cache.json';

app.use(cors());
app.use(express.json());
app.use('/api/weather-message', weatherMessageRouter); 
app.use('/api/sensor', dhtRouter);

// MQTT 연결
const mqttClient = mqtt.connect(
  "wss://" + process.env.HIVEMQ_HOST + ":8884/mqtt",
  {
    username: process.env.HIVEMQ_USERNAME,
    password: process.env.HIVEMQ_PASSWORD,
    clientId: "NodeServerClient"
  }
);

app.post("/api/warecare", (req, res) => {
  const { command } = req.body;

  if (!command)
    return res.status(400).json({ error: "command 누락됨" });

  mqttClient.publish("esp32/wareCareSystem", command);
  console.log("[WARECARE CMD]", command);

  res.json({ success: true });
});

app.post("/api/motor", (req, res) => {
  const { command } = req.body;

  if (!command)
    return res.status(400).json({ error: "command 누락됨" });

  mqttClient.publish("esp32/motor", command);
  console.log("[MOTOR CMD]", command);

  res.json({ success: true });
});

let currentPhase = "idle";

mqttClient.on("connect", () => {
  console.log("[MQTT] Connected to HiveMQ Cloud!");

  // ESP32가 보내는 Phase 메시지 구독
  mqttClient.subscribe("esp32/wareCareSystem/phase", (err) => {
    if (!err) console.log("[MQTT] Phase topic subscribed");
  });
});

// ESP32가 보내는 단계 정보 받기
mqttClient.on("message", (topic, message) => {
  if (topic === "esp32/wareCareSystem/phase") {
    currentPhase = message.toString();
    console.log("[MQTT] 현재 단계:", currentPhase);
  }
});

// MQTT 명령 전달 API
app.post("/api/mqtt/send", (req, res) => {
  const { topic, cmd } = req.body;

  if (!topic || !cmd)
    return res.status(400).json({ error: "topic 또는 cmd 누락됨" });

  mqttClient.publish(topic, cmd);
  console.log(`[MQTT Publish] ${topic} → ${cmd}`);

  res.json({ success: true });
});

// 현재 Phase 요청 응답
app.get("/api/phase", (req, res) => {
  res.json({ phase: currentPhase });
});

app.get('/api/weather', async(req, res) => {
	const {base_date, base_time} = getBaseDateTime();
	const url = 'http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst';

    const queryParams = 
		`serviceKey=${process.env.WEATHER_API_KEY}` +
  		`&pageNo=1` + // 페이지 번호
  		`&numOfRows=1000` + // 데이터 개수
  		`&dataType=JSON` + // 응답 형식
  		`&base_date=${base_date}` + // 예보 날짜
  		`&base_time=${base_time}` + // 예보 시간
  		`&nx=55` + // x좌표
  		`&ny=127`; // y좌표

	const maxRetries = 3;
	let response;
	console.log("최종 요청 URL: ",`${url}?${queryParams}`);

	for (let attempt = 1; attempt <= maxRetries; attempt++) {
		try {
			console.log(`[시도 ${attempt}] 기상청 API 요청 중...`);
			response = await axios.get(`${url}?${queryParams}`, { timeout: 30000 });

			const headerMsg = response.data?.response?.header?.resultMsg;
			if (headerMsg && headerMsg.includes("NO_DATA")) {
				throw new Error("기상청 응답: NO_DATA (데이터 없음)");
			}

			const items = response.data?.response?.body?.items?.item;
			if (!items || !Array.isArray(items)) {
				throw new Error("기상청 응답 구조 이상");
			}

			const group = {};
			for (const item of items) {
				const key = `${item.fcstDate} ${item.fcstTime}`;
				if (!group[key]) group[key] = {};
				group[key][item.category] = item.fcstValue;
			}

			// API 연동 성공 시, 캐시 저장
			await saveDataToCache(group);
			return res.json(group);

		} catch (err) {
			console.warn(`[시도 ${attempt}] 실패: ${err.message}`);

			if (attempt >= maxRetries) {
				try{
					const cachedData = await getCacheData();
					console.warn('[대체]캐시된 데이터로 응답');
					return res.status(206).json({ cached: true, data: cachedData});
				} catch {
					console.error('[실패]캐시 없음');
					return res.status(500).json({ error: '기상청 API 실패/캐시 없음'});
				}
			}
			await new Promise(r => setTimeout(r, 1000 * attempt));
		}
	}
});

app.get("/api/mqtt-test", (req, res) => {
  try {
    mqttClient.publish("esp32/test", "TLS_OK_TEST");
    res.json({ success: true, message: "MQTT publish 성공 — TLS 연결 정상!" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(PORT, () => {
console.log(`Server running on port ${PORT}`);
});

