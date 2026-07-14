class MyFooter extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `
        <footer>
            <h1>H</h1>
            <div class="footer-icons">
                <i class="fa-brands fa-instagram"></i>
                <i class="fa-brands fa-facebook-f"></i>
                <i class="fa-brands fa-youtube"></i>
            </div>
            
            <p class="address">경기 성남시 분당구 황새울로329번길 5 한국폴리텍대학 융합기술교육원</p>
            <div class="contact">
                <span>사업자등록번호 000-00-0000</span>
                <span>전화 012-345-6789</span>
                <span>팩스 01-234-5678</span>
            </div>
            <p class="links">이용약관 개인정보처리방침</p>
            <p class="copyright">Copyright © 2025 예약연습 All rights reserved.</p>
        </footer>
        `;
    }
}
customElements.define("my-footer", MyFooter);
