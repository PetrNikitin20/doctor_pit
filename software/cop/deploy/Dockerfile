FROM node:24-bookworm-slim
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN corepack pnpm install --frozen-lockfile --prod
COPY src ./src
COPY scripts ./scripts
COPY migrations ./migrations
COPY content ./content
COPY public ./public
USER node
EXPOSE 3000
CMD ["node","src/server.mjs"]
