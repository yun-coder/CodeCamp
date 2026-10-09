import React, { useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import maplibregl from "maplibre-gl";
import Hls from "hls.js";
import { Camera, ChevronDown, CircleAlert, Globe2, List, LocateFixed, MapPin, Play, Search, X } from "lucide-react";
import "maplibre-gl/dist/maplibre-gl.css";
import { CUSTOM_OFM_STYLE, OSM_FALLBACK_STYLE } from "./data/ofmStyle.js";
import "./styles.css";

const EMPTY_COLLECTION = { type: "FeatureCollection", features: [] };

// globe 投影在 Windows/WebGL 上高缩放易黑屏,超过该 zoom 切换到稳定的 mercator
const GLOBE_MAX_ZOOM = 8;

function toFeatureCollection(cameras) {
  return {
    type: "FeatureCollection",
    features: cameras.filter((camera) => Number.isFinite(camera.lon) && Number.isFinite(camera.lat)).map((camera) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [camera.lon, camera.lat] },
      properties: { ...camera }
    }))
  };
}

function cameraIcon() {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ff6249";
  ctx.beginPath();
  ctx.arc(32, 32, 25, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 4;
  ctx.strokeRect(17, 23, 30, 22);
  ctx.beginPath();
  ctx.arc(32, 34, 7, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = "#fff";
  ctx.fillRect(23, 17, 15, 7);
  return ctx.getImageData(0, 0, 64, 64);
}

function LivePlayer({ camera, onState }) {
  const videoRef = useRef(null);
  const [playback, setPlayback] = useState(null);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const retries = useRef(0);

  useEffect(() => {
    const controller = new AbortController();
    setPlayback(null);
    setError("");
    onState("loading");
    fetch(`/api/camera-stream?id=${encodeURIComponent(camera.id)}&refresh=${refresh}`, { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "视频地址刷新失败");
        return body;
      })
      .then((body) => { setPlayback(body); onState("ready"); })
      .catch((reason) => {
        if (reason.name === "AbortError") return;
        setError(reason.message);
        onState("error");
      });
    return () => controller.abort();
  }, [camera.id, refresh, onState]);

  useEffect(() => {
    if (playback?.type !== "hls" || !videoRef.current) return undefined;
    const video = videoRef.current;
    let hls;
    const refreshToken = () => {
      if (retries.current < 2) {
        retries.current += 1;
        setRefresh((value) => value + 1);
      } else {
        setError("视频流连续刷新失败，请稍后重试");
        onState("error");
      }
    };
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = playback.streamUrl;
      video.play().catch(() => {});
      video.addEventListener("error", refreshToken, { once: true });
    } else if (Hls.isSupported()) {
      hls = new Hls({ lowLatencyMode: true, backBufferLength: 20, maxBufferLength: 15 });
      hls.loadSource(playback.streamUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.ERROR, (_event, data) => data.fatal && refreshToken());
    } else refreshToken();
    return () => {
      hls?.destroy();
      video.pause();
      video.removeAttribute("src");
      video.load();
    };
  }, [playback, onState]);

  if (error) return <div className="player-state error"><CircleAlert /><strong>暂时无法播放</strong><span>{error}</span></div>;
  if (!playback) return <div className="player-state"><span className="spinner" /><strong>正在刷新视频地址</strong><span>短期 token 会在此刻重新获取</span></div>;
  if (playback.type === "youtube") return <iframe className="live-media" src={playback.streamUrl} title={camera.title} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />;
  return <video ref={videoRef} className="live-media" controls autoPlay muted playsInline />;
}

// 数据统一入口:优先取构建期生成的中文字段,缺失时回退英文
function displayCamera(camera) {
  return {
    title: camera.titleZh || camera.title,
    city: camera.cityZh || camera.cityName,
    country: camera.countryZh || camera.countryName
  };
}

function CountryDirectory({ groups, open, onToggle, onSelect }) {
  return (
    <aside className={`country-directory ${open ? "open" : ""}`}>
      <button className="directory-toggle" onClick={onToggle} aria-expanded={open} aria-label="切换国家/地区目录">
        <List size={16} />
        <span>国家/地区</span>
        <ChevronDown size={14} className="dir-chevron" />
      </button>
      {open && (
        <div className="directory-body">
          {groups.map((group) => (
            <section key={group.continent} className="directory-group">
              <h4>{group.label}<span>{group.countries.length}</span></h4>
              <ul>
                {group.countries.map((country) => (
                  <li key={country.slug}>
                    <button onClick={() => onSelect(country)}>
                      <span className="dir-name"><strong>{country.zhName}</strong><small>{country.enName}</small></span>
                      <span className="dir-count">{country.count}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </aside>
  );
}

function App() {
  const mapNode = useRef(null);
  const mapRef = useRef(null);
  const loadSequence = useRef(0);
  const loadTimer = useRef(null);
  const fetchAbort = useRef(null);
  const zoomRaf = useRef(0);
  const [meta, setMeta] = useState(null);
  const [zoom, setZoom] = useState(1.65);
  const [visibleCount, setVisibleCount] = useState(0);
  const [selected, setSelected] = useState(null);
  const [playerState, setPlayerState] = useState("idle");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [groups, setGroups] = useState([]);
  const [directoryOpen, setDirectoryOpen] = useState(() => {
    try { return localStorage.getItem("skyline.directory.open") !== "0"; } catch { return false; }
  });

  const scheduleLoad = useCallback(() => {
    if (loadTimer.current) clearTimeout(loadTimer.current);
    loadTimer.current = setTimeout(() => {
      const map = mapRef.current;
      if (!map || !map.isStyleLoaded()) return;
      const currentZoom = map.getZoom();
      setZoom(currentZoom);
      if (currentZoom < 3.5) {
        map.getSource("cameras")?.setData(EMPTY_COLLECTION);
        setVisibleCount(0);
        return;
      }
      const bounds = map.getBounds();
      const sequence = ++loadSequence.current;
      fetchAbort.current?.abort();
      const controller = new AbortController();
      fetchAbort.current = controller;
      const params = new URLSearchParams({
        west: bounds.getWest(), south: bounds.getSouth(), east: bounds.getEast(), north: bounds.getNorth(), zoom: currentZoom
      });
      fetch(`/api/cameras?${params}`, { signal: controller.signal, cache: "no-store" })
        .then((response) => response.json())
        .then((payload) => {
          if (sequence !== loadSequence.current) return;
          map.getSource("cameras")?.setData(toFeatureCollection(payload.cameras || []));
          setVisibleCount(payload.cameras?.length || 0);
        })
        .catch((error) => {
          if (error.name === "AbortError") return;
          setVisibleCount(0);
        });
    }, 180);
  }, []);

  // 根据当前 zoom 维护投影:低缩放 globe,高缩放切 mercator 规避黑屏
  const syncProjection = useCallback((map, currentZoom) => {
    const wantGlobe = currentZoom < GLOBE_MAX_ZOOM;
    const current = map.getProjection()?.type;
    if ((wantGlobe && current !== "globe") || (!wantGlobe && current !== "mercator")) {
      map.setProjection({ type: wantGlobe ? "globe" : "mercator" });
    }
  }, []);

  const initMap = useCallback(() => {
    const map = new maplibregl.Map({
      container: mapNode.current,
      style: CUSTOM_OFM_STYLE,
      center: [12, 24],
      zoom: 1.65,
      maxZoom: 19,
      minZoom: 1,
      attributionControl: true,
      renderWorldCopies: false
    });
    mapRef.current = map;
    let contextLostCount = 0;

    // 摄像头数据图层:样式加载完成后调用;setStyle 回退后会重建,所以需可重复调用
    function setupDataLayers() {
      if (map.getSource("cameras")) return;
      map.addImage("camera-pin", cameraIcon(), { pixelRatio: 2 });
      map.addSource("cameras", { type: "geojson", data: EMPTY_COLLECTION, cluster: true, clusterRadius: 42, clusterMaxZoom: 13 });
      map.addLayer({ id: "camera-clusters", type: "circle", source: "cameras", filter: ["has", "point_count"], paint: { "circle-color": "#101b22", "circle-stroke-color": "#ff6249", "circle-stroke-width": 2, "circle-radius": ["step", ["get", "point_count"], 17, 20, 21, 100, 26] } });
      map.addLayer({ id: "cluster-count", type: "symbol", source: "cameras", filter: ["has", "point_count"], layout: { "text-field": ["get", "point_count_abbreviated"], "text-size": 12 }, paint: { "text-color": "#fff" } });
      map.addLayer({ id: "camera-pins", type: "symbol", source: "cameras", filter: ["!", ["has", "point_count"]], layout: { "icon-image": "camera-pin", "icon-size": 0.62, "icon-allow-overlap": false } });
      map.on("click", "camera-pins", (event) => setSelected(event.features?.[0]?.properties || null));
      map.on("click", "camera-clusters", async (event) => {
        const feature = event.features?.[0];
        if (!feature) return;
        const nextZoom = await map.getSource("cameras").getClusterExpansionZoom(feature.properties.cluster_id);
        map.easeTo({ center: feature.geometry.coordinates, zoom: nextZoom });
      });
      for (const layer of ["camera-pins", "camera-clusters"]) {
        map.on("mouseenter", layer, () => { map.getCanvas().style.cursor = "pointer"; });
        map.on("mouseleave", layer, () => { map.getCanvas().style.cursor = ""; });
      }
      scheduleLoad();
    }

    map.on("error", (event) => {
      // 底图加载失败(无网络/样式 404)时回退到 OSM 栅格
      if (event?.error && !map.isStyleLoaded() && !map._styleFallbackApplied) {
        map._styleFallbackApplied = true;
        map.once("load", setupDataLayers);
        map.setStyle(OSM_FALLBACK_STYLE);
      }
    });

    map.on("zoom", () => {
      if (zoomRaf.current) return;
      zoomRaf.current = requestAnimationFrame(() => {
        zoomRaf.current = 0;
        setZoom(map.getZoom());
      });
    });
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "bottom-right");
    map.addControl(new maplibregl.ScaleControl({ unit: "metric" }), "bottom-left");

    map.on("load", () => {
      map._styleFallbackApplied = true;
      syncProjection(map, map.getZoom());
      setupDataLayers();
    });

    // 投影在 moveend 统一切换,避免交互中反复 setProjection 抖动
    map.on("moveend", () => {
      syncProjection(map, map.getZoom());
      scheduleLoad();
    });

    // 黑屏防护:WebGL 上下文丢失时阻止默认并重绘;连续丢失则重建地图
    map.on("webglcontextlost", (event) => {
      event.preventDefault();
      contextLostCount += 1;
      if (contextLostCount > 2) {
        const state = { center: map.getCenter(), zoom: map.getZoom(), pitch: map.getPitch(), bearing: map.getBearing() };
        map.remove();
        mapRef.current = null;
        initMapWithState(state);
      } else {
        map.triggerRepaint();
      }
    });
    map.on("webglcontextrestored", () => { contextLostCount = 0; });

    return map;
  }, [scheduleLoad, syncProjection]);

  // 重建地图(保留视口),供 WebGL 上下文连续丢失时使用
  const initMapWithState = useCallback((state) => {
    const map = initMap();
    map.once("load", () => {
      map.jumpTo({ center: state.center, zoom: state.zoom, pitch: state.pitch, bearing: state.bearing });
    });
  }, [initMap]);

  useEffect(() => {
    fetch("/api/catalog").then((response) => response.json()).then(setMeta);
    fetch("/api/directory").then((response) => response.json()).then((payload) => setGroups(payload.groups || [])).catch(() => {});
    const map = initMap();
    return () => {
      if (loadTimer.current) clearTimeout(loadTimer.current);
      map.remove();
      mapRef.current = null;
    };
  }, [initMap]);

  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); return undefined; }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setSearching(true);
      fetch(`/api/camera-search?q=${encodeURIComponent(query.trim())}`, { signal: controller.signal })
        .then((response) => response.json()).then((payload) => setResults(payload.cameras || []))
        .catch((error) => { if (error.name !== "AbortError") setResults([]); })
        .finally(() => setSearching(false));
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query]);

  function toggleDirectory() {
    setDirectoryOpen((value) => {
      const next = !value;
      try { localStorage.setItem("skyline.directory.open", next ? "1" : "0"); } catch { /* ignore */ }
      return next;
    });
  }

  function focusCamera(camera) {
    setResults([]);
    setQuery("");
    if (Number.isFinite(camera.lon) && Number.isFinite(camera.lat)) {
      mapRef.current?.flyTo({ center: [camera.lon, camera.lat], zoom: 15, duration: 1800 });
      window.setTimeout(scheduleLoad, 1900);
    }
    setSelected(camera);
  }

  function focusCountry(country) {
    if (!country.center) return;
    mapRef.current?.flyTo({ center: country.center, zoom: 8, duration: 1600 });
    window.setTimeout(scheduleLoad, 1700);
  }

  const zoomedIn = zoom >= 3.5;
  const hintTitle = zoomedIn ? `${visibleCount} 个附近摄像头` : "放大到国家或城市";
  const hintText = zoomedIn ? "继续放大可查看街道与具体点位" : "摄像头将在进入区域后按需显示";

  return (
    <div className="app-shell">
      <div ref={mapNode} className="navigation-map" />
      <header className="top-bar">
        <div className="brand"><Globe2 /><span><strong>SKYLINE GLOBE</strong><small>LIVE STREET VIEW</small></span></div>
        <div className="search-box">
          <Search size={18} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索国家、城市、街道或摄像头(支持中文)" />
          {query && <button onClick={() => setQuery("")} aria-label="清除搜索"><X size={16} /></button>}
          {(results.length > 0 || searching) && <div className="search-results">
            {searching ? <div className="search-status">正在搜索…</div> : results.map((camera) => {
              const label = displayCamera(camera);
              return (
                <button key={camera.id} onClick={() => focusCamera(camera)}>
                  <Camera size={17} /><span><strong>{label.title}</strong><small>{label.city} · {label.country}</small></span>
                </button>
              );
            })}
          </div>}
        </div>
        <div className="status-pill"><span className="online-dot" />{meta?.playable || "—"} LIVE</div>
      </header>

      <CountryDirectory groups={groups} open={directoryOpen} onToggle={toggleDirectory} onSelect={focusCountry} />

      <aside className="map-hint">
        <span className="hint-icon"><LocateFixed size={19} /></span>
        <span><strong>{hintTitle}</strong><small>{hintText}</small></span>
      </aside>

      {selected && <div className="video-backdrop" onClick={() => setSelected(null)}>
        <section className="video-card" onClick={(event) => event.stopPropagation()}>
          <button className="close-video" onClick={() => setSelected(null)} aria-label="关闭视频"><X /></button>
          {(() => { const label = displayCamera(selected); return (
            <div className="video-heading"><span className="camera-badge"><Play size={14} /> LIVE</span><h1>{label.title}</h1><p>{selected.subtitle}</p></div>
          ); })()}
          <div className="video-stage"><LivePlayer camera={selected} onState={setPlayerState} /></div>
          {(() => { const label = displayCamera(selected); return (
            <footer><span><MapPin size={15} />{label.city} · {label.country}</span><span className={`stream-status ${playerState}`}>{playerState === "ready" ? "播放中" : playerState === "error" ? "连接失败" : "刷新地址"}</span></footer>
          ); })()}
        </section>
      </div>}
    </div>
  );
}

const rootElement = document.getElementById("root");
const reactRoot = globalThis.__skylineReactRoot || createRoot(rootElement);
globalThis.__skylineReactRoot = reactRoot;
reactRoot.render(<React.StrictMode><App /></React.StrictMode>);
