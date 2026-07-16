const API_BASE = 'http://localhost:3000';

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
    els.calGrid = document.getElementById('calendarGrid');

    els.btnSubmit = document.getElementById('btnSubmit');
    els.btnCancel = document.getElementById('btnCancel');

    els.modal = document.getElementById('successModal');
    els.modalConfirm = document.getElementById('modalConfirm');

    els.fmCheckIn = document.getElementById('fmCheckIn');
    els.fmCheckOut = document.getElementById('fmCheckOut');

    const savedStart = sessionStorage.getItem('res_startDate');
    const savedEnd = sessionStorage.getItem('res_endDate');

    if (savedStart && savedEnd) {
        state.startDate = new Date(savedStart);
        state.endDate = new Date(savedEnd);
        state.roomName = sessionStorage.getItem('res_roomName') || 'STANDARD';
        state.extraGuest = sessionStorage.getItem('res_extraGuest') || '0';
        state.totalPrice = parseInt(sessionStorage.getItem('res_totalPrice')) || 0;

        state.viewYear = state.startDate.getFullYear();
        state.viewMonth = state.startDate.getMonth();
    } else {
        alert('예약 정보가 없습니다. 이전 페이지로 돌아갑니다.');
        history.back();
        return;
    }

    els.fmRoom.value = state.roomName.toUpperCase();
    els.fmGuests.value = state.extraGuest + '명';
    els.fmTotal.textContent = state.totalPrice.toLocaleString();
    els.fmCheckIn.value = ymd(state.startDate);
    els.fmCheckOut.value = ymd(state.endDate);

    els.btnCancel.addEventListener('click', (e) => { e.preventDefault(); history.back(); });
    els.btnSubmit.addEventListener('click', validateAndSubmit);

    // ★ 확인 버튼: 모달 닫고 → 세션 비우고 → 홈으로 이동
    els.modalConfirm.addEventListener('click', (e) => {
        e.preventDefault();
        els.modal.classList.remove('show');
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

async function validateAndSubmit(e) {
    if (e) e.preventDefault();

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

    if (!isValid) return;

    const body = {
        room_id: parseInt(sessionStorage.getItem('res_roomId')),
        check_in_date: ymd(state.startDate),
        check_out_date: ymd(state.endDate),
        total_price: state.totalPrice,
        number_of_guests: 2 + parseInt(state.extraGuest),
        customer_name: customerName,
        phone_number: phoneNumber,
    };

    try {
        const res = await fetch(`${API_BASE}/reservation`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        if (!res.ok) throw new Error('예약 실패');

        // 예약 성공 → 모달 표시 (사용자가 확인 누를 때까지 유지)
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


function isBeforeToday(d) {
    const today = new Date(state.today.getFullYear(), state.today.getMonth(), state.today.getDate());
    const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    return target < today;
}
function sameDay(a, b) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function ymd(d) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}