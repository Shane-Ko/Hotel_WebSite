FROM node:20-alpine

WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --production

# 정적 자원은 public/ 아래에 두고 --static public 으로 서빙한다.
# HTML/CSS/JS가 /src/... 절대경로를 쓰므로 src 는 public/src 에 놓여야 한다.
COPY public ./public
COPY src ./public/src

# db.json 은 씨앗으로만 이미지에 넣는다. 런타임 데이터는 PVC(/data)에 있다.
COPY db.json ./seed/db.json

EXPOSE 3000

CMD ["npx", "json-server", "--watch", "/data/db.json", "--host", "0.0.0.0", "--port", "3000", "--static", "public"]
