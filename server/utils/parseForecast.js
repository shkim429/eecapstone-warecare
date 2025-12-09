// utils/parseForecast.js

function parseForecast(groupedData) {
  // 유효성 검사: null, undefined, 비객체 방지
  if (!groupedData || typeof groupedData !== 'object') {
    console.warn("[parseForecast] 유효하지 않은 데이터:", groupedData);
    return {
      morning: {}, afternoon: {}, evening: {}, night: {}
    };
  }
  const timeMap = {
    morning: ["0600", "0700", "0800", "0900"],
    afternoon: ["1200", "1300", "1400", "1500", "1600"],
    evening: ["1700", "1800", "1900", "2000", "2100"],
    night: ["2200", "2300", "0000"]
  };

  // 초기 구조 설정 (배열로 누적 저장)
  const result = {
    morning: { temp: [], rain: [], sky: null, pty: null, pcp: null, sno: null },
    afternoon: { temp: [], rain: [], sky: null, pty: null, pcp: null, sno: null },
    evening: { temp: [], rain: [], sky: null, pty: null, pcp: null, sno: null },
    night: { temp: [], rain: [], sky: null, pty: null, pcp: null, sno: null }
  };

  for (const [time, values] of Object.entries(groupedData)) {
    const hour = time.split(" ")[1];

    for (const [period, hours] of Object.entries(timeMap)) {
      if (hours.includes(hour)) {
        if (values.T1H) result[period].temp.push(parseFloat(values.T1H));
        if (values.POP) result[period].rain.push(parseInt(values.POP));

        // 마지막 값만 사용 (덮어쓰기)
        if (values.SKY) result[period].sky = values.SKY;
        if (values.PTY) result[period].pty = values.PTY;
        if (values.PCP) result[period].pcp = values.PCP;
        if (values.SNO) result[period].sno = values.SNO;
      }
    }
  }

  // 평균값 계산
  for (const period of Object.keys(result)) {
    const data = result[period];
    data.temp = average(data.temp);
    data.rain = average(data.rain);
  }

  return result;
}

// 평균 함수
function average(arr) {
  if (!arr.length) return null;
  const sum = arr.reduce((acc, val) => acc + val, 0);
  return Math.round(sum / arr.length);
}

export { parseForecast };
