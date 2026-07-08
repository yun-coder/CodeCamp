# Docker Deployment

<div class="doc-kicker">Self-host The Docs And Demo</div>

## Run From Docker Hub

```bash
docker run -d \
  --name file-viewer \
  -p 8080:80 \
  flyfishdev/file-viewer:latest
```

Open `http://localhost:8080`.

## Build Locally

```bash
pnpm docker:build
docker run --rm -p 8080:80 flyfishdev/file-viewer:latest
```

## Multi-arch Publish

```bash
docker login
DOCKER_IMAGE=flyfishdev/file-viewer pnpm docker:publish
```

The Docker flow targets `linux/amd64` and `linux/arm64`.

## Offline Notes

The image should serve static demo/docs assets from itself. For application integrations, still copy viewer runtime assets into your own product deployment with:

```bash
npx file-viewer-copy-assets ./public/file-viewer
```

