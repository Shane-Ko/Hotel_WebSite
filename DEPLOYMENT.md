# Hotel_WebSite 배포 기록

2026-09-22, 로컬에서만 돌던 프로젝트를 vcluster(kopo02)에 올리고 CI/CD를 붙인 과정.

## 결과

**http://kopo02-hotelweb.std.kopoctc.kr**

```
git push gitlab main
  → GitLab 웹훅 → Jenkins(hotelweb-pipeline) → kaniko 빌드
  → Harbor(std-harbor.kopoctc.kr/kopo02/hotelweb:v{BUILD_NUMBER})
  → kopo021/gitops 의 apps/hotelweb/deployment.yaml 태그 갱신·push
  → ArgoCD(kopo02-hotelweb) 자동 배포
```

| 구성 요소 | 위치 |
|---|---|
| 소스 | GitHub `Shane-Ko/Hotel_WebSite` (백업), GitLab `kopo02/hotelweb` (CI 대상) |
| 이미지 | `std-harbor.kopoctc.kr/kopo02/hotelweb` |
| 매니페스트 | `kopo021/gitops` 의 `apps/hotelweb/` |
| 네임스페이스 | `hotelweb` (vcluster kopo02) |
| 데이터 | PVC `hotelweb-data` (1Gi, `nfs-std-1`) |

## 배포 전에 고쳐야 했던 것

원본은 `json-server --watch db.json`으로 로컬 실행만 상정하고 있었다. 그대로 컨테이너화하면 화면이 뜨지 않는다.

### 1. 정적 자원 경로 불일치

HTML·CSS·JS가 전부 `/src/css/...`, `/src/image/...` 같은 **절대경로**로 자원을 참조한다. 초기 Dockerfile은 `--static src`라 `src/`가 웹 루트가 되어 `/src/...`가 전부 404였다.

→ `src`를 `public/src`에 두고 `--static public`으로 서빙. 웹 루트가 `src`의 상위가 되어 절대경로가 그대로 맞는다.

### 2. `API_BASE` 하드코딩

`src/js/reservation.js`, `src/js/insertInfo.js`의 `const API_BASE = 'http://localhost:3000'`. 이 코드는 **브라우저에서** 실행되므로 인그레스로 접속하면 사용자 PC의 3000 포트를 찾다가 실패한다.

→ `API_BASE = ''`. json-server가 정적 파일과 API를 같은 오리진에서 서빙하므로 상대경로면 로컬·클러스터 양쪽에서 동작한다.

### 3. 루트 진입점 없음

`/`로 들어오면 보여줄 문서가 없었다.

→ `public/index.html` 추가 (`/src/html/home.html`로 meta refresh).

### 4. 예약 데이터 영속화

`json-server`는 예약 생성 시 `db.json` 파일에 직접 쓴다. 이미지에만 두면 파드 재시작 때 사라진다.

→ `db.json`은 이미지의 `/app/seed/db.json`에 **씨앗으로만** 넣고, 런타임은 PVC의 `/data/db.json`을 사용. initContainer가 최초 1회만 복사한다:

```sh
[ -f /data/db.json ] || cp /app/seed/db.json /data/db.json
```

`[ -f ] ||` 조건 덕분에 재배포해도 기존 예약을 덮어쓰지 않는다. 실제로 v1→v4 롤링 업데이트를 거치는 동안 예약 24건이 그대로 유지됐다.

## 겪은 문제

### Harbor push 401

처음 `docker push`가 `unauthorized to access repository` 로 거부됐다. 같은 자격증명으로 pull은 됐는데, 그건 `kopo02` 프로젝트가 public이라 **익명 pull**이 됐던 것이고 인증과는 무관했다. Harbor가 OIDC(keycloak) 모드라 **CLI secret**으로 `docker login` 하면 해결된다.

### ArgoCD 등록 거부

```
permission denied: applications, create, kopo02/hotelweb
```

앱 이름에 `kopo02-` 접두사가 필요하고, **`metadata.namespace: kopo02-apps`** 도 함께 필요하다. 네임스페이스를 빼면 ArgoCD가 기본 `argocd` 네임스페이스로 해석해 RBAC 대상이 달라진다. UI의 **EDIT AS YAML**로 등록하는 게 확실하다.

### 첫 빌드가 배포로 이어지지 않음

빌드 #1은 성공했는데 아무 일도 일어나지 않았다. `BUILD_NUMBER=1` → 태그 `v1`인데 매니페스트에도 이미 `v1`이 적혀 있어 `sed` 결과가 동일 → `git diff --cached --quiet`로 커밋이 생기지 않음 → ArgoCD가 볼 변화 없음.

정상 동작이며 #2부터 흐른다. 빌드 #2에서 `v2` 배포까지 실제로 확인했다.

## 운영 메모

- 클러스터 리소스를 `kubectl edit`/`apply`로 직접 고치지 말 것. ArgoCD selfHeal이 Git 상태로 되돌린다. 모든 변경은 Git 커밋으로.
- `gitops`는 강사 계정(`kopo021`) 소유라 다른 사람 커밋이 계속 올라온다. push 전 **항상 `git pull --rebase origin main`**, force push 금지.
- `Jenkinsfile`의 `sed`에 `g` 플래그가 있어야 initContainer와 메인 컨테이너 이미지가 함께 갱신된다.
- `node_modules`가 저장소에 커밋돼 있다. 빌드는 되지만 체크아웃이 무겁다. 정리하려면 `.gitignore` 추가 후 `git rm -r --cached node_modules`.

## 검증 방법

```bash
kubectl -n hotelweb get pods,pvc,svc,ingress
kubectl -n hotelweb exec deploy/hotelweb -- wget -qO- http://127.0.0.1:3000/rooms | head -c 200
# 예약 1건 생성 후 재시작해도 남아 있으면 PVC 정상
kubectl -n hotelweb rollout restart deploy/hotelweb
```
