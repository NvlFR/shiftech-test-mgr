# Playwright Local Runner. Based on the official Playwright image so Chromium/
# Firefox/WebKit and their OS deps are preinstalled. Run this on a machine that
# can reach BOTH the central server (outbound HTTPS) and the app under test.
FROM mcr.microsoft.com/playwright:v1.49.0-noble

WORKDIR /runner

# Install the runner itself (zero runtime deps; only TypeScript to build).
COPY package.json tsconfig.json ./
RUN npm install
COPY src ./src
RUN npm run build

# The Playwright project under test is mounted at runtime, e.g.
#   docker run --env-file .env -v /path/to/project:/project \
#     -e TM_PROJECT_DIR=/project testmanager-local-runner
ENV TM_PROJECT_DIR=/project

CMD ["node", "dist/index.js"]
