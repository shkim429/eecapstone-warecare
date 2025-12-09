import dotenv from 'dotenv';
import express from 'express';
import axios from 'axios';
import cors from 'cors';
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

app.listen(PORT, () => {
console.log(`Server running on port ${PORT}`);
});

