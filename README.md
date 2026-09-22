# Hotel_WebSite

호텔 예약 웹사이트. 정적 프론트엔드와 `json-server` 기반 REST API를 하나의 컨테이너에서 같은 오리진으로 서빙한다.

## 구성

| 영역 | 내용 |
|---|---|
| 프론트엔드 | 순수 HTML/CSS/JS (빌드 도구 없음), Swiper CDN 사용 |
| API | `json-server` 0.17.4 — `db.json` 파일이 곧 데이터베이스 |
| 런타임 | `node:20-alpine`, 포트 3000 |

정적 파일과 API가 **같은 포트·같은 오리진**에서 제공되므로 프론트엔드는 `API_BASE = ''`(상대경로)로 API를 호출한다. 덕분에 로컬 실행과 클러스터 배포 양쪽에서 코드 수정 없이 동작한다.

### 디렉터리

```
public/index.html     루트 진입점 — /src/html/home.html 로 리다이렉트
src/html/             페이지 (home, roomSelect, reservation, reservationInfo, insertInfo)
src/css/              페이지별 스타일
src/js/               페이지별 로직
src/image/            이미지 (rooms/, main/, event/ …)
src/font/             KOROAD 서체
db.json               초기 데이터 (rooms, season, holiday, price, reservation)
```

HTML·CSS·JS가 모두 `/src/...` **절대경로**로 자원을 참조한다. 따라서 웹 루트는 `src/`의 **상위**여야 하며, 컨테이너에서는 `src/`를 `public/src`에 두고 `--static public`으로 서빙한다.

## 로컬 실행

```bash
yarn install
npx json-server --watch db.json --port 3000 --static .
```

`http://localhost:3000` 접속. `--static .`으로 프로젝트 루트를 웹 루트로 삼아야 `/src/...` 경로가 맞는다.

## 컨테이너

```bash
docker build -t hotelweb:local .
docker run --rm -p 3000:3000 -v hoteldata:/data hotelweb:local
```

`db.json`은 이미지의 `/app/seed/db.json`에 **씨앗으로만** 들어간다. 런타임 데이터는 `/data/db.json`이며 볼륨으로 분리되어 있다. 예약이 생성되면 `json-server`가 이 파일에 기록하므로, 볼륨 없이 실행하면 컨테이너 재시작 시 데이터가 사라진다.

쿠버네티스에서는 initContainer가 최초 1회만 씨앗을 복사한다:

```sh
[ -f /data/db.json ] || cp /app/seed/db.json /data/db.json
```

조건 검사 덕분에 파드가 재시작해도 기존 예약을 덮어쓰지 않는다.

## 배포 (CI/CD)

```
GitLab(kopo02/hotelweb) --webhook--> Jenkins(hotelweb-pipeline)
  → kaniko 빌드 → Harbor(std-harbor.kopoctc.kr/kopo02/hotelweb:v{BUILD_NUMBER})
  → gitops 저장소의 apps/hotelweb/deployment.yaml 태그 갱신 후 push
  → ArgoCD(kopo02-hotelweb)가 감지해 자동 배포
```

| 항목 | 값 |
|---|---|
| 서비스 주소 | http://kopo02-hotelweb.std.kopoctc.kr |
| 네임스페이스 | `hotelweb` (vcluster kopo02) |
| 매니페스트 | `kopo021/gitops` 의 `apps/hotelweb/` |
| 데이터 | PVC `hotelweb-data` (1Gi, `nfs-std-1`) |

파이프라인 정의는 `Jenkinsfile`에 있다. 이미지 태그 치환 시 `sed`에 `g` 플래그를 주어 initContainer와 메인 컨테이너의 이미지가 **함께** 갱신된다 — 둘이 어긋나면 씨앗 복사 이미지와 실행 이미지가 달라진다.

### 주의

- 클러스터 리소스를 `kubectl edit`/`apply`로 직접 고치지 말 것. ArgoCD의 selfHeal이 Git 상태로 되돌린다. 모든 변경은 Git 커밋으로 한다.
- 이미지 태그는 `BUILD_NUMBER`를 따른다. 매니페스트에 이미 적힌 태그와 같으면 `git diff`가 비어 커밋이 생기지 않고, 따라서 재배포도 일어나지 않는다.

## 리모트

| 이름 | 용도 |
|---|---|
| `origin` | GitHub — 소스 백업 |
| `gitlab` | GitLab — CI 대상. **여기에 push해야 빌드가 걸린다** |
