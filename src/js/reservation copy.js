/**
 * reservation.js
 * ------------------------------------------------------------
 * URL 예:
 *   /src/html/reservation.html?room=standard
 *   /src/html/reservation.html?room=deluxe
 *   /src/html/reservation.html?room=premium
 *   /src/html/reservation.html?room=sweet
 *
 * 필요한 엔드포인트:
 *   GET  http://localhost:3000/rooms
 *   GET  http://localhost:3000/price
 *   GET  http://localhost:3000/holiday
 *   GET  http://localhost:3000/season
 *   GET  http://localhost:3000/reservation
 *   POST http://localhost:3000/reservation
 * ------------------------------------------------------------
 */

// 편의를 위해서 json-server 주소 변수로 빼두기
const API_BASE = 'http://localhost:3000';
const IMG_BASE = '/src/image/rooms/';

// ============ 전역 상태 ============
const state = {
    room: null,          // 현재 방 객체 (rooms에서 찾은 것)
    prices: [],          // 이 방의 price 배열 (비수기/성수기)
    seasons: [],         // season 전체
    holidays: [],        // holiday 전체
    reservations: [],    // 이 방의 예약 목록 (예약완료 표시용)
    today: new Date(),   // 오늘
    viewYear: 0,         // 현재 캘린더가 보여주는 년
    viewMonth: 0,        // 현재 캘린더가 보여주는 월 (0-based)
    startDate: null,     // 선택 시작일 (Date | null)
    endDate: null,       // 선택 종료일 (Date | null)
    extraGuest: 0,       // 추가 인원 (0 ~ 2)
};

// ============ DOM refs ============
const $ = (sel) => document.querySelector(sel);
const els = {};

document.addEventListener('DOMContentLoaded', init);

async function init() {
    // DOM 캐싱
    els.roomName = $('#roomName');
    els.roomDesc = $('#roomDesc');
    els.roomDescEng = $('#roomDescEng');
    els.mainImage = $('#mainImage');
    els.thumbList = $('#thumbList');
    els.calTitle = $('#calTitle');
    els.calPrev = $('#calPrev');
    els.calNext = $('#calNext');
    els.calGrid = $('#calendarGrid');
    els.extraGuest = $('#extraGuest');
    els.totalPrice = $('#totalPrice');
    els.btnCancel = $('#btnCancel');
    els.btnReserve = $('#btnReserve');

    // 오늘 기준으로 캘린더 초기 위치 세팅
    const t = state.today;
    state.viewYear = t.getFullYear();
    state.viewMonth = t.getMonth();

    // 이벤트 바인딩
    els.calPrev.addEventListener('click', () => moveMonth(-1));
    els.calNext.addEventListener('click', () => moveMonth(1));
    els.extraGuest.addEventListener('change', onExtraGuestChange);
    els.btnCancel.addEventListener('click', onCancel);
    els.btnReserve.addEventListener('click', onReserve);

    // ============ 데이터 로딩 ============
    // URL query string에서 room 이름 가져오기
    const param = new URLSearchParams(location.search);
    const roomName = param.get('room');

    // 잘못된 경로 접근 시, 방선택 페이지로 이동
    if (!roomName) {
        alert('잘못된 접근');
        location.href = '/src/html/roomSelect.html';
        return;
    }

    // # 순차 실행
    // const roomsResponse = await fetch(`${API_BASE}/rooms`);
    // const rooms = await response.json();

    // const priceResponse = await fetch(`${API_BASE}/price`);
    // const price = await response.json();

    // const seasonResponse = await fetch(`${API_BASE}/season`);
    // const season = await response.json();

    // const holidayResponse = await fetch(`${API_BASE}/holiday`);
    // const holiday = await response.json();

    // 병렬 실행 (순차 실행보다 속도 빠름)
    const [rooms, prices, seasons, holidays, reservations] = await Promise.all([
        fetch(`${API_BASE}/rooms`).then(r => r.json()),
        fetch(`${API_BASE}/price`).then(r => r.json()),
        fetch(`${API_BASE}/season`).then(r => r.json()),
        fetch(`${API_BASE}/holiday`).then(r => r.json()),
        fetch(`${API_BASE}/reservation`).then(r => r.json()),
    ]);

    // 이 방 찾기
    const room = rooms.find(r => r.name_eng === roomName);
    if (!room) {
        alert('존재하지 않는 방입니다.');
        location.href = '/src/html/roomSelect.html';
        return;
    }

    // state에 저장
    state.room = room;
    state.prices = prices.filter(p => p.room_id === room.id);
    state.seasons = seasons;
    state.holidays = holidays;
    state.reservations = reservations.filter(r => r.room_id === room.id);

    // 렌더링
    renderRoomInfo();
    renderCalendar();
    updateTotal();
}

// ============ 렌더링 ============

function renderRoomInfo() {
    // 방 이름, 설명 반영
    els.roomName.textContent = state.room.name_eng.toUpperCase();
    els.roomDesc.textContent = state.room.desc;
    els.roomDescEng.textContent = state.room.desc_eng;

    // 메인 이미지 (첫 번째)
    els.mainImage.src = IMG_BASE + state.room.images[0];

    // 썸네일 리스트
    els.thumbList.innerHTML = '';
    state.room.images.forEach((imgName, idx) => {
        const li = document.createElement('li');
        const img = document.createElement('img');
        img.src = IMG_BASE + imgName;
        img.alt = `${state.room.name_eng} ${idx + 1}`;
        li.appendChild(img);

        // 첫 번째는 active
        if (idx === 0) li.classList.add('active');

        // 클릭 시 메인 이미지 교체
        li.addEventListener('click', () => {
            els.mainImage.src = IMG_BASE + imgName;
            els.thumbList.querySelectorAll('li').forEach(x => x.classList.remove('active'));
            li.classList.add('active');
        });

        els.thumbList.appendChild(li);
    });
}

function renderCalendar() {
    const y = state.viewYear;
    const m = state.viewMonth;
    els.calTitle.textContent = `${y}년 ${String(m + 1).padStart(2, '0')}월`;

    // 이 달의 1일 요일 (0=일)
    const firstDow = new Date(y, m, 1).getDay();
    // 이 달 마지막 날짜
    const lastDate = new Date(y, m + 1, 0).getDate();
    // 저번 달 마지막 날짜 (앞쪽 채우기용)
    const prevLastDate = new Date(y, m, 0).getDate();

    els.calGrid.innerHTML = '';

    // 앞쪽 - 저번달 날짜 (회색)
    for (let i = firstDow - 1; i >= 0; i--) {
        const d = prevLastDate - i;
        els.calGrid.appendChild(makeDayCell(d, true, null));
    }

    // 이번달
    for (let d = 1; d <= lastDate; d++) {
        const dateObj = new Date(y, m, d);
        els.calGrid.appendChild(makeDayCell(d, false, dateObj));
    }

    // 뒤쪽 - 다음달 (7칸 배수 맞추기)
    const total = firstDow + lastDate;
    const tail = (7 - (total % 7)) % 7;
    for (let d = 1; d <= tail; d++) {
        els.calGrid.appendChild(makeDayCell(d, true, null));
    }
}

function makeDayCell(dayNum, isOtherMonth, dateObj) {
    const cell = document.createElement('div');
    cell.className = 'day';

    const numSpan = document.createElement('span');
    numSpan.textContent = dayNum;
    cell.appendChild(numSpan);

    // 다른 달 or 오늘 이전 → disabled
    if (isOtherMonth) {
        cell.classList.add('disabled');
        return cell;
    }

    // 요일별 색
    const dow = dateObj.getDay();
    if (dow === 0) cell.classList.add('sun');

    // 공휴일 색
    if (isHoliday(dateObj)) cell.classList.add('holiday');

    // 오늘 이전 disabled
    if (isBeforeToday(dateObj)) {
        cell.classList.add('disabled');
        return cell;
    }

    // 예약완료 표시
    if (isReserved(dateObj)) {
        const sub = document.createElement('span');
        sub.className = 'sub';
        sub.textContent = '예약완료';
        cell.appendChild(sub);
        cell.classList.add('disabled');
        return cell;
    }

    // 선택된 범위 표시
    if (state.startDate && sameDay(dateObj, state.startDate)) {
        cell.classList.add('selected');
    } else if (state.endDate && sameDay(dateObj, state.endDate)) {
        cell.classList.add('selected');
    } else if (state.startDate && state.endDate &&
        dateObj > state.startDate && dateObj < state.endDate) {
        cell.classList.add('in-range');
    }

    // 클릭 이벤트
    cell.addEventListener('click', () => onDayClick(dateObj));

    return cell;
}

// ============ 이벤트 핸들러 ============

function onDayClick(dateObj) {
    if (!state.startDate) {
        // 시작일도 없으면 → 시작일로
        state.startDate = dateObj;
        state.endDate = null;
    } else if (!state.endDate) {
        if (dateObj < state.startDate) {
            // 시작일보다 이전 클릭 → 시작일 갈아끼우기
            state.startDate = dateObj;
        } else if (sameDay(dateObj, state.startDate)) {
            // 같은 날 다시 클릭 → 취소
            state.startDate = null;
        } else {
            // 시작일 이후 클릭 → 종료일로
            // 단, 그 사이에 예약완료가 끼어있으면 안 됨
            if (hasReservedBetween(state.startDate, dateObj)) {
                alert('선택하신 기간 사이에 예약된 날짜가 있습니다.');
                state.startDate = null;
                state.endDate = null;
            } else {
                state.endDate = dateObj;
            }
        }
    } else {
        // 둘 다 있으면 → 리셋 후 시작일로
        state.startDate = dateObj;
        state.endDate = null;
    }

    renderCalendar();
    updateTotal();
}

function onExtraGuestChange(e) {
    state.extraGuest = parseInt(e.target.value, 10) || 0;
    updateTotal();
}

function moveMonth(delta) {
    let y = state.viewYear;
    let m = state.viewMonth + delta;
    if (m < 0) { m = 11; y--; }
    if (m > 11) { m = 0; y++; }
    state.viewYear = y;
    state.viewMonth = m;
    renderCalendar();
}

function onCancel() {
    state.startDate = null;
    state.endDate = null;
    state.extraGuest = 0;
    els.extraGuest.value = '0';
    renderCalendar();
    updateTotal();
}

async function onReserve() {
    // 유효성 검사
    if (!state.startDate || !state.endDate) {
        alert('체크인/체크아웃 날짜를 선택해주세요.');
        return;
    }

    // 사용자 정보 입력 (임시로 prompt, 나중에 모달로)
    const customer_name = prompt('예약자 이름을 입력해주세요.');
    if (!customer_name) return;
    const phone_number = prompt('연락처를 입력해주세요. (예: 01012345678)');
    if (!phone_number) return;

    // 총 가격 계산
    const total_price = calcTotal();

    // 요청 body 만들기
    const body = {
        room_id: state.room.id,
        check_in_date: ymd(state.startDate),
        check_out_date: ymd(state.endDate),
        total_price: total_price,
        number_of_guests: 2 + state.extraGuest,
        customer_name: customer_name,
        phone_number: phone_number,
    };

    try {
        const res = await fetch(`${API_BASE}/reservation`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error('예약 실패');
        const created = await res.json();

        alert(`예약이 완료되었습니다.\n예약번호: ${created.id}`);

        // state에 새 예약 반영 (다시 fetch 하지 않고)
        state.reservations.push(created);

        // 리셋
        state.startDate = null;
        state.endDate = null;
        state.extraGuest = 0;
        els.extraGuest.value = '0';
        renderCalendar();
        updateTotal();
    } catch (err) {
        console.error(err);
        alert('예약 처리 중 오류가 발생했습니다.');
    }
}

// ============ 가격 계산 ============

function updateTotal() {
    const total = calcTotal();
    els.totalPrice.textContent = total.toLocaleString();
}

// 순수 계산 함수 (표시와 분리)
function calcTotal() {
    if (!state.startDate || !state.endDate) return 0;

    let total = 0;

    // startDate ~ endDate 하루 전까지 (체크아웃 날짜는 숙박 X)
    const cur = new Date(state.startDate);
    while (cur < state.endDate) {
        total += getDayPrice(cur);
        cur.setDate(cur.getDate() + 1);
    }

    // 추가 인원 반영 (한 명당 20%)
    total = total * (1 + 0.2 * state.extraGuest);

    return Math.round(total);
}

// 특정 날짜의 하루치 가격
function getDayPrice(dateObj) {
    const seasonId = getSeasonId(dateObj);
    const priceRow = state.prices.find(p => p.season_id === seasonId);
    if (!priceRow) return 0;

    if (isHoliday(dateObj)) return priceRow.holiday_price;
    if (isWeekend(dateObj)) return priceRow.weekend_price;
    return priceRow.weekday_price;
}

// ============ 유틸 ============

function isBeforeToday(d) {
    const today = new Date(state.today.getFullYear(), state.today.getMonth(), state.today.getDate());
    const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    return target < today;
}

function sameDay(a, b) {
    return a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate();
}

function ymd(d) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

function isHoliday(dateObj) {
    const key = ymd(dateObj);
    return state.holidays.some(h => h.holiday_date === key);
}

function isWeekend(dateObj) {
    const dow = dateObj.getDay();
    return dow === 0 || dow === 6; // 일=0, 토=6
}

// 성수기(2): 7-9월, 나머지는 비수기(1)
// db.json의 season 데이터가 연도 걸쳐있어서 month로 판정하는게 간단함
function getSeasonId(dateObj) {
    const month = dateObj.getMonth() + 1; // 1-12
    if (month >= 7 && month <= 9) return 2; // 성수기
    return 1; // 비수기
}

// 예약완료 날짜인지 (체크인 <= date < 체크아웃)
function isReserved(dateObj) {
    return state.reservations.some(r => {
        const ci = new Date(r.check_in_date);
        const co = new Date(r.check_out_date);
        return dateObj >= ci && dateObj < co;
    });
}

// start ~ end 사이 (양 끝 포함)에 예약완료가 있는지
function hasReservedBetween(start, end) {
    const cur = new Date(start);
    while (cur <= end) {
        if (isReserved(cur)) return true;
        cur.setDate(cur.getDate() + 1);
    }
    return false;
}
