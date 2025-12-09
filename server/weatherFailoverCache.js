import fs from 'fs/promises';

const CACHE_FILE = '/tmp/weather_cache.json';


function makeLocalDateKey(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0'); 
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
}

async function keepRecent3Days() {
  try {
    const raw = await fs.readFile(CACHE_FILE, 'utf-8');
    const data = JSON.parse(raw);

    const today = new Date();
    const datesToKeep = [];

    for (let i = 0; i < 3; i++) {
      const today_copy = new Date(today);
      today_copy.setDate(today.getDate() + i);
      const key = makeLocalDateKey(today_copy);
      datesToKeep.push(key);
      console.log('date', datesToKeep);
    }

    const filtered = Object.fromEntries(
      Object.entries(data).filter(([dateTime]) => {
        const dateKey = dateTime.slice(0, 8);
        return datesToKeep.includes(dateKey);
    })
  );

    await fs.writeFile(CACHE_FILE, JSON.stringify(filtered, null, 2));
  } catch (err) {
    console.log('[캐시 저장 실패]', err.message);
  }
}

// API 성공 시 저장
export async function saveDataToCache(data) {
  try {
    await fs.writeFile(CACHE_FILE, JSON.stringify(data, null, 2));
    await keepRecent3Days();
    console.log('[캐시 저장 완료]');
  } catch (err) {
    console.log('[캐시 저장 실패]', err.message);
  }
}

// API 실패 시 캐시 읽기
export async function getCacheData() {
  try {
    const raw = await fs.readFile(CACHE_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    throw new Error('캐시 파일 없음 / 읽기 실패');
  }
}
