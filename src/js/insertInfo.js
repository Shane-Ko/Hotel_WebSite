const API_BASE = 'http://localhost:3000'; // 최상단에 추가

const state = {
    today: new Date(),
    viewYear: 0,
    viewMonth: 0,
    startDate: null,
    endDate: null,
    roomName: 'STANDARD',
    extraGuest: 0,
    totalPrice: 0
};

const els = {};

document.addEventListener('DOMContentLoaded', () => {
    els.fmRoom = document.getElementById('fmRoom');
    els.fmGuests = document.getElementById('fmGuests');
    els.fmTotal = document.getElementById('fmTotal');
    els.fmName = document.getElementById('fmName');
    els.fmPhone = document.getElementById('fmPhone');
    els.fmNameError = document.getElementById('fmNameError');
    els.fmPhoneError = document.getElementById('fmPhoneError');

    els.calTitle = document.getElementById('calTitle');
    els.calPrev = document.getElementById('calPrev');
    els.calNext = document.getElementById('calNext');
    els.calGrid = document.getElementById('calendarGrid');

    els.btnSubmit = document.getElementById('btnSubmit');
    els.btnCancel = document.getElementById('btnCancel');

    els.modal = document.getElementById('successModal');
    els.modalConfirm = document.getElementById('modalConfirm');

    // 1. 이전 페이지에서 저장한 정보 불러오기
    const savedStart = sessionStorage.getItem('res_startDate');
    const savedEnd = sessionStorage.getItem('res_endDate');

    if (savedStart && savedEnd) {
        state.startDate = new Date(savedStart);
        state.endDate = new Date(savedEnd);
        state.roomName = sessionStorage.getItem('res_roomName') || 'STANDARD';
        state.extraGuest = sessionStorage.getItem('res_extraGuest') || '0';
        state.totalPrice = parseInt(sessionStorage.getItem('res_totalPrice')) || 0;

        // 달력을 체크인 날짜 기준으로 보여주기
        state.viewYear = state.startDate.getFullYear();
        state.viewMonth = state.startDate.getMonth();
    } else {
        // 직접 주소로 치고 들어오는 등 정보가 없으면 뒤로가기
        alert('예약 정보가 없습니다. 이전 페이지로 돌아갑니다.');
        history.back();
        return;
    }

    // 2. 입력 폼에 불러온 정보 세팅
    els.fmRoom.value = state.roomName.toUpperCase();
    els.fmGuests.value = state.extraGuest + '명';
    els.fmTotal.textContent = state.totalPrice.toLocaleString();

    // 이벤트
    els.calPrev.addEventListener('click', () => moveMonth(-1));
    els.calNext.addEventListener('click', () => moveMonth(1));
    els.btnCancel.addEventListener('click', () => history.back());
    els.btnSubmit.addEventListener('click', validateAndSubmit);
    els.modalConfirm.addEventListener('click', () => {
        // 확인 누르면 메인으로 이동 후 세션 비우기
        sessionStorage.clear();
        window.location.href = '/src/html/home.html';
    });

    [els.fmName, els.fmPhone].forEach(input => {
        input.addEventListener('input', function () {
            this.classList.remove('error');
            this.nextElementSibling.style.display = 'none';
        });
    });

    renderCalendar();
});

async function validateAndSubmit() {
    let isValid = true;
    const customerName = els.fmName.value.trim();
    const phoneNumber = els.fmPhone.value.trim();

    if (!customerName) {
        els.fmName.classList.add('error');
        els.fmNameError.style.display = 'block';
        isValid = false;
    }
    if (!phoneNumber) {
        els.fmPhone.classList.add('error');
        els.fmPhoneError.style.display = 'block';
        isValid = false;
    }

    // 유효성 검사 실패 시 종료
    if (!isValid) return;

    // DB에 보낼 데이터 구성
    const body = {
        room_id: parseInt(sessionStorage.getItem('res_roomId')), // 이전 페이지에서 넘겨받은 방 ID
        check_in_date: ymd(state.startDate),
        check_out_date: ymd(state.endDate),
        total_price: state.totalPrice,
        number_of_guests: 2 + parseInt(state.extraGuest),
        customer_name: customerName,
        phone_number: phoneNumber,
    };

    try {
        // json-server로 POST 요청 (db.json에 저장)
        const res = await fetch(`${API_BASE}/reservation`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        if (!res.ok) throw new Error('예약 실패');

        // DB 저장 성공 시 예약 완료 팝업 띄우기
        els.modal.classList.add('show');
    } catch (err) {
        console.error(err);
        alert('예약 처리 중 오류가 발생했습니다.');
    }
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
        els.calGrid.appendChild(makeDayCell(prevLastDate - i, true, null));
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

    if (dateObj.getDay() === 0) cell.classList.add('sun');
    if (isBeforeToday(dateObj)) cell.classList.add('disabled');

    // 불러온 날짜 고정 표시 (클릭 이벤트 없음)
    if (state.startDate && sameDay(dateObj, state.startDate)) {
        cell.classList.add('selected');
        const sub = document.createElement('span');
        sub.className = 'sub-text';
        sub.textContent = '입실';
        cell.appendChild(sub);
    }
    else if (state.endDate && sameDay(dateObj, state.endDate)) {
        cell.classList.add('selected');
        const sub = document.createElement('span');
        sub.className = 'sub-text';
        sub.textContent = '퇴실';
        cell.appendChild(sub);
    }
    else if (state.startDate && state.endDate && dateObj > state.startDate && dateObj < state.endDate) {
        cell.classList.add('in-range');
    }

    return cell;
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

function isBeforeToday(d) {
    const today = new Date(state.today.getFullYear(), state.today.getMonth(), state.today.getDate());
    const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    return target < today;
}
function sameDay(a, b) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// 날짜 객체를 YYYY-MM-DD 형식으로 변환하는 함수
function ymd(d) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}