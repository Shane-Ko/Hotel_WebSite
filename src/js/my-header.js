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
            const a = document.createElement("a");
            a.textContent = link.text;
            a.href = link.href;
            li.appendChild(a);

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