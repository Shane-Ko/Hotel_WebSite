var swiper = new Swiper(".swiper", {
    loop: true,
    pagination: {
        el: ".swiper-pagination",
        clickable: true,
    },
    autoplay: {
        delay: 5000,
        disableOnInteraction: false,
    },
});

document.addEventListener('DOMContentLoaded', () => {
    const popup = document.getElementById('imagePopup');
    const popupImg = document.getElementById('imagePopupImg');
    const popupClose = document.getElementById('imagePopupClose');

    // ROOMS 이미지 클릭 → 팝업으로 확대
    const roomImages = document.querySelectorAll('.roomImage img');
    roomImages.forEach((img) => {
        img.addEventListener('click', () => {
            popupImg.src = img.src;
            popupImg.alt = img.alt;
            popup.classList.add('show');
        });
    });

    // 배경 클릭하면 닫기
    popup.addEventListener('click', (e) => {
        if (e.target === popup) {
            popup.classList.remove('show');
        }
    });

    // 닫기 버튼
    popupClose.addEventListener('click', () => {
        popup.classList.remove('show');
    });

    // ESC로 닫기
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && popup.classList.contains('show')) {
            popup.classList.remove('show');
        }
    });
});