function getBaseDateTime() {
	const now = new Date();
	const hour = now.getHours(); // 현재 시
	let baseHour; // 예보 기준 시

	let year = now.getFullYear(); // 현재 연도
	let month = String(now.getMonth()+1).padStart(2,'0'); // 현재 월(01, 02 .. 등의 형식으로 지정)
	let day = String(now.getDate()).padStart(2,'0'); // 현재 일

	// 현재 시간을 기준으로 예보 시간 설정
	if (hour < 2) baseHour = '2300';
	else if(hour < 5) baseHour = '0200';
	else if(hour < 8) baseHour = '0500';
	else if(hour < 11) baseHour = '0800';
	else if(hour < 14) baseHour = '1100';
	else if(hour < 17) baseHour = '1400';
	else if(hour < 20) baseHour = '1700';
	else if(hour < 23) baseHour = '2000';
	else baseHour = '2300';

	// 현재 시간이 02시 이전일 때, 호출 예보일시 예외 처리
	if(hour < 2) {
		const yestderday = new Date(now); // 현재 일시 복사본 
		yestderday.setDate(yestderday.getDate()-1); // 현재 일시 기준으로 어제 일시로 변경
		year = yestderday.getFullYear();
		month = String(yestderday.getMonth()+1).padStart(2,'0');
		day = String(yestderday.getDate()).padStart(2,'0');
	}

	return {
		base_date: `${year}${month}${day}`,
		base_time: baseHour
	};
}

export default getBaseDateTime; // 다른 파일로의 모듈 사용 허용