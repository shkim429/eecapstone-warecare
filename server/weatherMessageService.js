import { weatherPromptTemplate } from './weatherPrompt.js';
import { callGPT } from './openaiClient.js';
import { parseForecast } from './utils/parseForecast.js';

// 프롬프트에 {{}} 치환하는 함수
function applyTemplate(template, data) {
  return template.replace(/{{(.*?)}}/g, (_, key) => {
    const keys = key.trim().split(".");
    return keys.reduce((acc, cur) => acc?.[cur], data) ?? "";
  });
}

// SKY, PTY 코드 → 한글로 변환
function mapSky(code) {
  const map = { 1: '맑음', 3: '구름많음', 4: '흐림' };
  return map[code] || '맑음';
}
function mapPty(code) {
  const map = { 0: '없음', 1: '비', 2: '비/눈', 3: '눈', 4: '소나기' };
  return map[code] || '없음';
}

// 계절 계산 함수
function getSeason(month) {
  if ([3, 4, 5].includes(month)) return "봄";
  if ([6, 7, 8].includes(month)) return "여름";
  if ([9, 10, 11].includes(month)) return "가을";
  return "겨울";
}

// GPT 문구 생성 로직
async function getWeatherMessage(rawData) {

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const season = getSeason(currentMonth);
  const parsed = parseForecast(rawData);

  const weatherData = {
    currentHour: now.getHours(),
    currentMonth,
    season,
    morning: {
      temp: parsed.morning.temp,
      rain: parsed.morning.rain,
      sky: mapSky(parsed.morning.sky),
      pty: mapPty(parsed.morning.pty),
      pcp: parsed.morning.pcp,
      sno: parsed.morning.sno
    },
    afternoon: {
      temp: parsed.afternoon.temp,
      rain: parsed.afternoon.rain,
      sky: mapSky(parsed.afternoon.sky),
      pty: mapPty(parsed.afternoon.pty),
      pcp: parsed.afternoon.pcp,
      sno: parsed.afternoon.sno
    },
    evening: {
      temp: parsed.evening.temp,
      rain: parsed.evening.rain,
      sky: mapSky(parsed.evening.sky),
      pty: mapPty(parsed.evening.pty),
      pcp: parsed.evening.pcp,
      sno: parsed.evening.sno
    },
    night: {
      temp: parsed.night.temp,
      rain: parsed.night.rain,
      sky: mapSky(parsed.night.sky),
      pty: mapPty(parsed.night.pty),
      pcp: parsed.night.pcp,
      sno: parsed.night.sno
    }
  };

  const userPrompt = applyTemplate(weatherPromptTemplate.user, weatherData);
  const gptRes = await callGPT(weatherPromptTemplate.system, userPrompt);
  return gptRes;
}

export { getWeatherMessage };
