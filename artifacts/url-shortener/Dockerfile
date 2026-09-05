FROM node:24-alpine

WORKDIR /app
RUN corepack enable

ENV CI=true

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY artifacts/url-shortener/package.json artifacts/url-shortener/package.json
COPY lib/api-client-react/package.json lib/api-client-react/package.json
COPY lib/api-zod/package.json lib/api-zod/package.json
RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm --filter @workspace/api-spec run codegen

ENV PORT=5173
ENV BASE_PATH=/

RUN pnpm --filter @workspace/url-shortener run build

ENV NODE_ENV=production
EXPOSE 5173
CMD ["pnpm", "--filter", "@workspace/url-shortener", "run", "serve"]