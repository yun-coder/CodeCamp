import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs/promises";
import { CONTINENTS_ZH, COUNTRY_CONTINENT } from "./src/data/continents.js";
import { COUNTRY_LABELS_ZH } from "./src/data/localization.js";

const catalogPath = new URL("./public/data/skyline-cameras.json", import.meta.url);
const headers = { "user-agent": "SkylineGlobe live viewer/0.2" };
const readCatalog = async () => JSON.parse(await fs.readFile(catalogPath, "utf8"));

function allowedPage(value) {
  try { const url = new URL(value); return url.protocol === "https:" && url.hostname === "www.skylinewebcams.com"; }
  catch { return false; }
}

function allowedMedia(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" &&
      (url.hostname === "hd-auth.skylinewebcams.com" || url.hostname.endsWith(".skylinewebcams.com"));
  } catch { return false; }
}

function proxyUrl(pathname, params) {
  return `${pathname}?${new URLSearchParams(params).toString()}`;
}

async function resolveStream(camera) {
  if (camera.playbackType === "offline") throw new Error("该摄像头当前离线，没有可播放的视频流");
  if (!allowedPage(camera.pageUrl)) throw new Error("摄像头页面不在允许的 Skyline 来源范围内");
  let lastError = "未检测到可播放的视频流";

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(camera.pageUrl, { headers, cache: "no-store" });
      if (!response.ok) { lastError = `摄像头页面返回 ${response.status}`; continue; }
      const html = await response.text();
      const youtubeId =
        html.match(/videoId\s*:\s*['"]([a-zA-Z0-9_-]{11})['"]/i)?.[1] ||
        html.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/i)?.[1];
      if (youtubeId) {
        return { type: "youtube", videoId: youtubeId,
          streamUrl: `https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&mute=1` };
      }
      const source = html.match(/source\s*:\s*['"]([^'"]+\.m3u8[^'"]*)['"]/i)?.[1] ||
        html.match(/['"]([^'"]*livee\.m3u8[^'"]*)['"]/i)?.[1];
      if (!source) continue;
      const normalized = source.replace(/^\/+/, "").replace("livee.", "live.");
      const streamUrl = normalized.startsWith("http") ? normalized : `https://hd-auth.skylinewebcams.com/${normalized}`;
      if (allowedMedia(streamUrl)) return { type: "hls", streamUrl };
    } catch (error) {
      lastError = error.message || "摄像头页面请求失败";
    }
  }

  if (camera.playbackType === "youtube" && camera.videoId) {
    return { type: "youtube", videoId: camera.videoId,
      streamUrl: `https://www.youtube-nocookie.com/embed/${camera.videoId}?autoplay=1&mute=1` };
  }
  if (camera.playbackType === "hls" && allowedMedia(camera.streamUrl)) {
    return { type: "hls", streamUrl: camera.streamUrl, staleFallback: true };
  }
  throw new Error(lastError);
}

function rewritePlaylist(playlist, cameraId, playlistUrl) {
  const proxied = (raw) => {
    const target = new URL(raw, playlistUrl).toString();
    if (!allowedMedia(target)) throw new Error("播放列表包含不受支持的媒体地址");
    return proxyUrl("/api/camera-segment", { id: cameraId, url: target });
  };
  return playlist.split(/\r?\n/).map((line) => {
    const trimmed = line.trim();
    if (!trimmed) return line;
    if (trimmed.startsWith("#")) {
      return line.replace(/URI="([^"]+)"/g, (_match, uri) => `URI="${proxied(uri)}"`);
    }
    return proxied(trimmed);
  }).join("\n");
}

function apiMiddleware(req, res, next) {
  if (!req.url?.startsWith("/api/")) return next();
  (async () => {
    const url = new URL(req.url, "http://localhost");
    if (url.pathname === "/api/health") return void res.end(JSON.stringify({ ok: true }));
    const catalog = await readCatalog();
    if (url.pathname === "/api/catalog") {
      res.setHeader("content-type", "application/json; charset=utf-8");
      return void res.end(JSON.stringify({
        source: catalog.source,
        generatedAt: catalog.generatedAt,
        total: catalog.total,
        playable: catalog.playable,
        counts: catalog.counts
      }));
    }
    if (url.pathname === "/api/cameras") {
      const west = Number(url.searchParams.get("west"));
      const south = Number(url.searchParams.get("south"));
      const east = Number(url.searchParams.get("east"));
      const north = Number(url.searchParams.get("north"));
      const zoom = Number(url.searchParams.get("zoom"));
      const validBounds = [west, south, east, north, zoom].every(Number.isFinite);
      const cameras = !validBounds || zoom < 3.5 ? [] : catalog.cameras
        .filter((item) => Number.isFinite(item.lat) && Number.isFinite(item.lon))
        .filter((item) => item.lat >= south && item.lat <= north &&
          (west <= east ? item.lon >= west && item.lon <= east : item.lon >= west || item.lon <= east))
        .slice(0, 2000)
        .map(({ streamUrl: _streamUrl, videoId: _videoId, searchText: _searchText, ...item }) => item);
      res.setHeader("content-type", "application/json; charset=utf-8");
      res.setHeader("cache-control", "no-store");
      return void res.end(JSON.stringify({ cameras, zoom, truncated: cameras.length === 2000 }));
    }
    if (url.pathname === "/api/camera-search") {
      const query = (url.searchParams.get("q") || "").trim().toLowerCase();
      const cameras = query.length < 2 ? [] : catalog.cameras
        .filter((item) => (item.searchText || "").includes(query))
        .slice(0, 20)
        .map(({ streamUrl: _streamUrl, videoId: _videoId, searchText: _searchText, ...item }) => item);
      res.setHeader("content-type", "application/json; charset=utf-8");
      return void res.end(JSON.stringify({ cameras }));
    }
    if (url.pathname === "/api/directory") {
      // 按大洲分组的国家目录:含中文名、摄像头数、在线数、中心经纬度(取该国摄像头坐标均值)
      const groups = CONTINENTS_ZH.map(({ key, label }) => ({ continent: key, label, countries: [] }));
      const groupByContinent = new Map(groups.map((g) => [g.continent, g]));
      const byCountry = new Map();
      for (const item of catalog.cameras) {
        if (!byCountry.has(item.countrySlug)) {
          byCountry.set(item.countrySlug, { slug: item.countrySlug, zhName: item.countryZh, enName: item.countryName, count: 0, online: 0, latSum: 0, lonSum: 0, posCount: 0 });
        }
        const entry = byCountry.get(item.countrySlug);
        entry.count += 1;
        if (item.playbackType !== "offline") entry.online += 1;
        if (Number.isFinite(item.lat) && Number.isFinite(item.lon)) {
          entry.latSum += item.lat;
          entry.lonSum += item.lon;
          entry.posCount += 1;
        }
      }
      for (const entry of byCountry.values()) {
        const continent = COUNTRY_CONTINENT[entry.slug] || "europe";
        const center = entry.posCount > 0
          ? [entry.lonSum / entry.posCount, entry.latSum / entry.posCount]
          : null;
        groupByContinent.get(continent).countries.push({
          slug: entry.slug,
          zhName: entry.zhName,
          enName: entry.enName,
          count: entry.count,
          online: entry.online,
          center
        });
      }
      for (const group of groups) {
        group.countries.sort((a, b) => b.count - a.count);
      }
      res.setHeader("content-type", "application/json; charset=utf-8");
      res.setHeader("cache-control", "no-store");
      return void res.end(JSON.stringify({ groups }));
    }
    const camera = catalog.cameras.find((item) => item.id === url.searchParams.get("id"));
    if (!camera) { res.statusCode = 404; throw new Error("未找到摄像头"); }

    if (url.pathname === "/api/camera-thumbnail") {
      if (!camera.thumbnail) { res.statusCode = 404; return void res.end("Thumbnail not found"); }
      const response = await fetch(camera.thumbnail, { headers: { ...headers, referer: camera.pageUrl } });
      res.statusCode = response.status;
      res.setHeader("content-type", response.headers.get("content-type") || "image/jpeg");
      res.setHeader("cache-control", "public, max-age=300");
      return void res.end(Buffer.from(await response.arrayBuffer()));
    }
    if (url.pathname === "/api/camera-stream") {
      const stream = await resolveStream(camera);
      res.setHeader("content-type", "application/json; charset=utf-8");
      return void res.end(JSON.stringify({ camera, ...stream,
        streamUrl: stream.type === "hls" ? proxyUrl("/api/camera-hls", { id: camera.id }) : stream.streamUrl }));
    }
    if (url.pathname === "/api/camera-hls") {
      const stream = await resolveStream(camera);
      if (stream.type !== "hls") throw new Error("该摄像头不是 HLS 视频流");
      const response = await fetch(stream.streamUrl, { headers: { ...headers, referer: camera.pageUrl }, cache: "no-store" });
      if (!response.ok) throw new Error(`HLS 播放列表返回 ${response.status}`);
      res.setHeader("content-type", "application/vnd.apple.mpegurl; charset=utf-8");
      res.setHeader("cache-control", "no-store");
      return void res.end(rewritePlaylist(await response.text(), camera.id, stream.streamUrl));
    }
    if (url.pathname === "/api/camera-segment") {
      const target = url.searchParams.get("url");
      if (!target || !allowedMedia(target)) { res.statusCode = 400; return void res.end("Invalid media URL"); }
      const response = await fetch(target, { headers: { ...headers, referer: camera.pageUrl }, cache: "no-store" });
      res.statusCode = response.status;
      res.setHeader("content-type", response.headers.get("content-type") || "application/octet-stream");
      res.setHeader("cache-control", "no-store");
      return void res.end(Buffer.from(await response.arrayBuffer()));
    }
    res.statusCode = 404; res.end("Not found");
  })().catch((error) => {
    if (res.writableEnded) return;
    if (res.statusCode < 400) res.statusCode = 502;
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ error: error.message }));
  });
}

export default defineConfig({
  plugins: [react(), {
    name: "skyline-api",
    configureServer(server) { server.middlewares.use(apiMiddleware); },
    configurePreviewServer(server) { server.middlewares.use(apiMiddleware); }
  }]
});
