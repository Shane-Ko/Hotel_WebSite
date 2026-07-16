class MyHeader extends HTMLElement {
    connectedCallback() {
        const header = document.createElement("header");

        const h1 = document.createElement("h1");
        const h1Link = document.createElement("a");
        h1Link.textContent = "H";
        h1Link.href = "/src/html/home.html";
        h1.appendChild(h1Link);

        const nav = document.createElement("nav");
        const ul = document.createElement("ul");
        const links = [
            {
                text: "ABOUT",
                href: "#",
                subs: [
                    { text: "호텔 소개", href: "#" },
                    { text: "오시는 길", href: "#" }
                ]
            },
            {
                text: "ROOMS",
                href: "#",
                subs: [
                    { text: "ROOMS1", href: "#" },
                    { text: "ROOMS2", href: "#" },
                    { text: "ROOMS3", href: "#" }
                ]
            },
            {
                text: "RESERVATION",
                href: "#",
                subs: [
                    { text: "예약안내", href: "/src/html/reservationInfo.html" },
                    { text: "실시간예약", href: "/src/html/roomSelect.html" }
                ]
            },
            {
                text: "COMMUNITY",
                href: "#",
                subs: [
                    { text: "공지사항", href: "#" },
                    { text: "이벤트", href: "#" },
                    { text: "FAQ", href: "#" }
                ]
            }
        ];

        links.forEach(function (link) {
            const li = document.createElement("li");
            const span = document.createElement("a");
            span.textContent = link.text;
            span.href = link.href;
            li.appendChild(span);

            const subUl = document.createElement("ul");
            link.subs.forEach(function (sub) {
                const subLi = document.createElement("li");
                const subA = document.createElement("a");
                subA.textContent = sub.text;
                subA.href = sub.href;
                subLi.appendChild(subA);
                subUl.appendChild(subLi);
            });

            li.appendChild(subUl);

            // ========== 추가된 모바일 클릭 이벤트 부분 ==========
            span.addEventListener("click", function (e) {
                // 화면 너비가 1000px 이하(모바일)일 때만
                if (window.innerWidth <= 1000) {
                    // 서브메뉴가 있는 경우 기본 링크 이동 방지
                    if (link.subs.length > 0) {
                        e.preventDefault();
                    }

                    // 현재 클릭한 메뉴가 이미 열려있는지 상태 확인
                    const isActive = li.classList.contains("is-active");

                    // 1. 모든 메뉴의 서브메뉴를 일단 닫기 (클래스 제거)
                    const allLis = ul.querySelectorAll("li");
                    allLis.forEach(item => item.classList.remove("is-active"));

                    // 2. 클릭한 메뉴가 닫혀있던 상태였다면 열어주기
                    if (!isActive) {
                        li.classList.add("is-active");
                    }
                }
            });
            // ====================================================

            ul.appendChild(li);
        });

        header.appendChild(h1);
        header.appendChild(nav);
        nav.appendChild(ul);
        this.appendChild(header);   // 컴포넌트에 붙임
    }
}

customElements.define("my-header", MyHeader);




// ####구조####
// <ul>                          ← 최상위 메뉴
//   <li>
//     <a>ABOUT</a>
//     <subUl>                      ← ABOUT의 서브메뉴 (li 안에 중첩)
//       <subLi>호텔 소개</subLi>
//       <subLi>오시는 길</subLi>
//     </subUl>
//   </li>
//   ...
// </ul>


