class MyHeader extends HTMLElement {
    connectedCallback() {
        const header = document.createElement("header");

        const h1 = document.createElement("h1");
        h1.textContent = "H";

        const nav = document.createElement("nav");
        const ul = document.createElement("ul");
        const links = [
            {
                text: "ABOUT",
                href: "#",
                subs: ["호텔 소개","오시는 길"]

            },
            {
                text: "ROOMS",
                href: "#",
                subs: ["ROOMS1","ROOMS2","ROOMS3"]
            },
            {
                text: "RESERVATION",
                href: "#",
                subs: ["예약안내","실시간예약"]
            },
            {
                text: "COMMUNITY",
                href: "#",
                subs: ["공지사항","이벤트","FAQ"]
            }
        ];

        links.forEach(function(link) {
            const li = document.createElement("li");
            const a = document.createElement("a");
            a.textContent = link.text;
            li.appendChild(a);

            const subUl = document.createElement("ul")
            link.subs.forEach(function(sub) {
                const subLi = document.createElement("li");
                subLi.textContent = sub;
                subUl.appendChild(subLi);
            });
            
            li. appendChild(subUl);
            ul.appendChild(li);
            });

        header.appendChild(h1);
        header.appendChild(nav);
        nav.appendChild(ul);
        this.appendChild(header);   // 컴포넌트에 붙임
    }
}

customElements.define("my-header",MyHeader);




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