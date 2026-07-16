/**
 * reservation.js
 */

const API_BASE = 'http://localhost:3000';
const IMG_BASE = '/src/image/rooms/';

// ============ 전역 상태 ============
const state = {
    room: null,
    prices: [],
    seasons: [],
    holidays: [],
    reservations: [],
    today: new Date(),
    viewYear: 0,
    viewMonth: 0,
    startDate: null,
    endDate: null,
    extraGuest: 0,
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

    // 모달 DOM
    els.modal = $('#modal');
    els.modalMessage = $('#modalMessage');
    els.modalConfirm = $('#modalConfirm');

    // 예약 폼 모달 DOM
    els.formModal = $('#formModal');
    els.fmRoom = $('#fmRoom');
    els.fmGuests = $('#fmGuests');
    els.fmName = $('#fmName');
    els.fmPhone = $('#fmPhone');
    els.fmTotal = $('#fmTotal');
    els.fmCancel = $('#fmCancel');
    els.fmSubmit = $('#fmSubmit');
    els.fmNameError = $('#fmNameError');
    els.fmPhoneError = $('#fmPhoneError');

    // 오늘 기준으로 캘린더 초기 위치 세팅
    const t = state.today;
    state.viewYear = t.getFullYear();
    state.viewMonth = t.getMonth();

    // 이벤트 바인딩
    els.calPrev.addEventListener('click', () => moveMonth(-1));
    els.calNext.addEventListener('click', () => moveMonth(1));
    els.extraGuest.addEventListener('change', onExtraGuestChange);
    els.btnCancel.addEventListener('click', onCancel);
    els.btnReserve.addEventListener('click', () => {
        if (!state.startDate || !state.endDate) {
            showModal('체크인/체크아웃 날짜를 선택해주세요.');
            return;
        }

        // 다음 페이지로 데이터를 넘기기 위해 sessionStorage에 정보 저장
        sessionStorage.setItem('res_roomId', state.room.id); // <--- 이 줄을 추가해 주세요!
        sessionStorage.setItem('res_startDate', state.startDate);
        sessionStorage.setItem('res_endDate', state.endDate);
        sessionStorage.setItem('res_roomName', state.room.name_eng);
        sessionStorage.setItem('res_extraGuest', state.extraGuest);
        sessionStorage.setItem('res_totalPrice', calcTotal());

        // insertInfo.html 페이지로 이동
        location.href = '/src/html/insertInfo.html';
    });
    els.modalConfirm.addEventListener('click', hideModal);

    // 폼 모달 이벤트 바인딩
    els.fmCancel.addEventListener('click', closeFormModal);
    els.fmSubmit.addEventListener('click', submitReservation);

    // ============ 데이터 로딩 ============
    const param = new URLSearchParams(location.search);
    const roomName = param.get('room');

    if (!roomName) {
        alert('잘못된 접근');
        location.href = '/src/html/roomSelect.html';
        return;
    }

    const [rooms, prices, seasons, holidays, reservations] = await Promise.all([
        fetch(`${API_BASE}/rooms`).then(r => r.json()),
        fetch(`${API_BASE}/price`).then(r => r.json()),
        fetch(`${API_BASE}/season`).then(r => r.json()),
        fetch(`${API_BASE}/holiday`).then(r => r.json()),
        fetch(`${API_BASE}/reservation`).then(r => r.json()),
    ]);

    const room = rooms.find(r => r.name_eng === roomName);
    if (!room) {
        alert('존재하지 않는 방입니다.');
        location.href = '/src/html/roomSelect.html';
        return;
    }

    state.room = room;
    state.prices = prices.filter(p => p.room_id === room.id);
    state.seasons = seasons;
    state.holidays = holidays;
    state.reservations = reservations.filter(r => r.room_id === room.id);

    renderRoomInfo();
    renderCalendar();
    updateTotal();
}

// ============ 렌더링 ============
let roomSwiper = null;

function renderRoomInfo() {
    els.roomName.textContent = state.room.name_eng.toUpperCase();
    els.roomDesc.textContent = state.room.desc;
    els.roomDescEng.textContent = state.room.desc_eng;
    els.mainImage.src = IMG_BASE + state.room.images[0];
    els.thumbList.innerHTML = '';

    state.room.images.forEach((imgName, idx) => {
        const li = document.createElement('li');
        const img = document.createElement('img');
        img.src = IMG_BASE + imgName;
        img.alt = `${state.room.name_eng} ${idx + 1}`;
        li.appendChild(img);

        if (idx === 0) li.classList.add('active');

        li.addEventListener('click', () => {
            els.mainImage.src = IMG_BASE + imgName;
            els.thumbList.querySelectorAll('li').forEach(x => x.classList.remove('active'));
            li.classList.add('active');
        });
        els.thumbList.appendChild(li);
    });

    // 모바일일 때만 Swiper 렌더링
    const swiperWrapper = document.getElementById('roomSwiperWrapper');
    if (swiperWrapper && window.innerWidth <= 1000) {
        swiperWrapper.innerHTML = '';
        state.room.images.forEach((imgName) => {
            const slide = document.createElement('div');
            slide.className = 'swiper-slide';
            const img = document.createElement('img');
            img.src = IMG_BASE + imgName;
            img.alt = state.room.name_eng;
            slide.appendChild(img);
            swiperWrapper.appendChild(slide);
        });

        if (roomSwiper) {
            roomSwiper.update();
        } else {
            roomSwiper = new Swiper('.room-swiper', {
                loop: true,
                pagination: {
                    el: '.room-swiper .swiper-pagination',
                    clickable: true,
                },
            });
        }
    }

    // 추가 인원 드롭다운 동적 생성 (capacity - 기본 2명)
    const maxExtra = state.room.capacity - 2;
    els.extraGuest.innerHTML = '';

    if (maxExtra <= 0) {
        const opt = document.createElement('option');
        opt.value = '0';
        opt.textContent = '추가 불가';
        els.extraGuest.appendChild(opt);
        els.extraGuest.disabled = true;
    } else {
        els.extraGuest.disabled = false;
        const noneOpt = document.createElement('option');
        noneOpt.value = '0';
        noneOpt.textContent = '없음';
        els.extraGuest.appendChild(noneOpt);

        for (let i = 1; i <= maxExtra; i++) {
            const opt = document.createElement('option');
            opt.value = String(i);
            opt.textContent = `${i}명`;
            els.extraGuest.appendChild(opt);
        }
    }

    state.extraGuest = 0;
    els.extraGuest.value = '0';
}

function renderCalendar() {
    const y = state.viewYear;
    const m = state.viewMonth;
    els.calTitle.textContent = `${y}년 ${String(m + 1).padStart(2, '0')}월`;

    const firstDow = new Date(y, m, 1).getDay();
    const lastDate = new Date(y, m + 1, 0).getDate();
    const prevLastDate = new Date(y, m, 0).getDate();

    els.calGrid.innerHTML = '';

    for (let i = firstDow - 1; i >= 0; i--) {
        const d = prevLastDate - i;
        els.calGrid.appendChild(makeDayCell(d, true, null));
    }

    for (let d = 1; d <= lastDate; d++) {
        const dateObj = new Date(y, m, d);
        els.calGrid.appendChild(makeDayCell(d, false, dateObj));
    }

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

    if (isOtherMonth) {
        cell.classList.add('disabled');
        return cell;
    }

    const dow = dateObj.getDay();
    if (dow === 0) cell.classList.add('sun');
    if (isHoliday(dateObj)) cell.classList.add('holiday');

    if (isBeforeToday(dateObj)) {
        cell.classList.add('disabled');
        return cell;
    }

    if (isReserved(dateObj)) {
        const sub = document.createElement('span');
        sub.className = 'sub';
        sub.textContent = '예약완료';
        cell.appendChild(sub);
        cell.classList.add('disabled');
        return cell;
    }

    if (state.startDate && sameDay(dateObj, state.startDate)) {
        cell.classList.add('selected');
        const sub = document.createElement('span');
        sub.className = 'sub';
        sub.textContent = '입실';
        cell.appendChild(sub);
    } else if (state.endDate && sameDay(dateObj, state.endDate)) {
        cell.classList.add('selected');
        const sub = document.createElement('span');
        sub.className = 'sub';
        sub.textContent = '퇴실';
        cell.appendChild(sub);
    } else if (state.startDate && state.endDate &&
        dateObj > state.startDate && dateObj < state.endDate) {
        cell.classList.add('in-range');
    }

    cell.addEventListener('click', () => onDayClick(dateObj));
    return cell;
}

// ============ 이벤트 핸들러 ============
function onDayClick(dateObj) {
    if (!state.startDate) {
        state.startDate = dateObj;
        state.endDate = null;
    } else if (!state.endDate) {
        if (dateObj < state.startDate) {
            state.startDate = dateObj;
        } else if (sameDay(dateObj, state.startDate)) {
            state.startDate = null;
        } else {
            // 6일(5박) 이상 예약 제한 안내
            const nights = daysBetween(state.startDate, dateObj);
            if (nights >= 6) {
                showModal('최대 5박까지만 예약 가능합니다.');
                return;
            }

            if (hasReservedBetween(state.startDate, dateObj)) {
                showModal('선택하신 기간 사이에 예약된 날짜가 있습니다.');
                state.startDate = null;
                state.endDate = null;
            } else {
                state.endDate = dateObj;
            }
        }
    } else {
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

    // 오늘의 달보다 이전으로 가려는 경우만 차단
    const todayY = state.today.getFullYear();
    const todayM = state.today.getMonth();
    if (y < todayY || (y === todayY && m < todayM)) {
        return;
    }

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

// ============ 폼 모달 기능 ============
function openFormModal() {
    if (!state.startDate || !state.endDate) {
        showModal('체크인/체크아웃 날짜를 선택해주세요.');
        return;
    }

    els.fmRoom.value = state.room.name_eng.toUpperCase();
    els.fmGuests.value = state.extraGuest + '명';
    els.fmTotal.textContent = calcTotal().toLocaleString();

    // 폼 초기화
    els.fmName.value = '';
    els.fmPhone.value = '';
    els.fmNameError.style.display = 'none';
    els.fmPhoneError.style.display = 'none';

    els.formModal.classList.add('show');
}

function closeFormModal() {
    els.formModal.classList.remove('show');
}

async function submitReservation() {
    const customer_name = els.fmName.value.trim();
    const phone_number = els.fmPhone.value.trim();

    // 유효성 검사
    let hasError = false;
    if (!customer_name) {
        els.fmNameError.style.display = 'block';
        hasError = true;
    } else {
        els.fmNameError.style.display = 'none';
    }

    if (!phone_number) {
        els.fmPhoneError.style.display = 'block';
        hasError = true;
    } else {
        els.fmPhoneError.style.display = 'none';
    }

    if (hasError) return;

    const total_price = calcTotal();

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

        closeFormModal();
        showModal('예약이 완료되었습니다.');

        state.reservations.push(created);

        state.startDate = null;
        state.endDate = null;
        state.extraGuest = 0;
        els.extraGuest.value = '0';
        renderCalendar();
        updateTotal();
    } catch (err) {
        console.error(err);
        showModal('예약 처리 중 오류가 발생했습니다.');
    }
}

// ============ 가격 계산 ============
function updateTotal() {
    const total = calcTotal();
    els.totalPrice.textContent = total.toLocaleString();
}

function calcTotal() {
    if (!state.startDate || !state.endDate) return 0;
    let total = 0;
    const cur = new Date(state.startDate);
    while (cur < state.endDate) {
        total += getDayPrice(cur);
        cur.setDate(cur.getDate() + 1);
    }
    total = total * (1 + 0.2 * state.extraGuest);
    return Math.round(total);
}

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
    return dow === 0 || dow === 6;
}

function getSeasonId(dateObj) {
    const month = dateObj.getMonth() + 1;
    if (month >= 7 && month <= 9) return 2;
    return 1;
}
//################################################################
// 문제: 체크인, 체크아웃 날짜 모두 예약완료로 변경
// 해결 방안: 2번으로
// 1. 시간통일
// 2. 년월일 뽑기
function isReserved(dateObj) {
    const target = ymd(dateObj);  // 로컬 기준 YYYY-MM-DD
    return state.reservations.some(r => {
        // 체크인일 <= target < 체크아웃일
        // (체크아웃일은 다른 사람이 예약 가능하므로 미포함)
        return target >= r.check_in_date && target < r.check_out_date;
    });
}
//################################################################

function hasReservedBetween(start, end) {
    const cur = new Date(start);
    // end 날짜(체크아웃)는 남이 예약 가능하니 포함해서 검사
    while (cur < end) {
        if (isReserved(cur)) return true;
        cur.setDate(cur.getDate() + 1);
    }
    return false;
}

function daysBetween(a, b) {
    const ms = new Date(b.getFullYear(), b.getMonth(), b.getDate())
        - new Date(a.getFullYear(), a.getMonth(), a.getDate());
    return Math.round(ms / (1000 * 60 * 60 * 24));
}

// ============ 모달 유틸 ============
function showModal(message) {
    els.modalMessage.textContent = message;
    els.modal.classList.add('show');
}

function hideModal() {
    els.modal.classList.remove('show');
}