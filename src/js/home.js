var swiper = new Swiper(".swiper", {
    loop:true,
    pagination: {
        el: ".swiper-pagination",
        clickable: true,
    },
    // 자동 넘기기
    autoplay: {
        delay: 5000,
        disableOnInteraction: false,
    },
});