import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { localizeCamera } from "../src/data/localization.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// 默认从项目内 scripts/extract/ 读取提取结果;可用 PENTAGI_OUTPUTS 覆盖回旧目录
const outputsRoot = process.env.PENTAGI_OUTPUTS || path.join(root, "scripts", "extract");
const streamsPath = path.join(outputsRoot, "webcams.json");
const citiesPath = path.join(root, "tmp-cities.json");
const outputPath = path.join(root, "public", "data", "skyline-cameras.json");

function slugify(value = "") {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function titleCase(value = "") {
  return value.split("-").filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function buildCountryCodes() {
  const names = new Intl.DisplayNames(["en"], { type: "region" });
  const map = new Map();
  for (let a = 65; a <= 90; a += 1) {
    for (let b = 65; b <= 90; b += 1) {
      const code = String.fromCharCode(a, b);
      const label = names.of(code);
      if (label && label !== code) map.set(slugify(label), code);
    }
  }
  const aliases = {
    bolivia: "BO", "czech-republic": "CZ", "dominican-republic": "DO",
    iran: "IR", russia: "RU", "south-korea": "KR", taiwan: "TW",
    tanzania: "TZ", "united-states": "US", venezuela: "VE",
    vietnam: "VN", "us-virgin-islands": "VI", curacao: "CW",
    "saint-barthelemy": "BL", "sint-maarten": "SX", italia: "IT",
    ellada: "GR", espana: "ES", norge: "NO", deutschland: "DE",
    brasil: "BR", hrvatska: "HR", schweiz: "CH", svezia: "SE",
    slovenija: "SI", "citta-del-vaticano": "VA",
    "repubblica-di-san-marino": "SM", zanzibar: "TZ"
  };
  for (const [name, code] of Object.entries(aliases)) map.set(name, code);
  return map;
}

function buildCityIndex(rows) {
  const index = new Map();
  const byCountry = new Map();
  for (const row of rows) {
    const key = `${row.country}/${slugify(row.name)}`;
    const location = { name: slugify(row.name), lat: Number(row.lat), lon: Number(row.lng) };
    if (!index.has(key)) index.set(key, location);
    if (!byCountry.has(row.country)) byCountry.set(row.country, []);
    byCountry.get(row.country).push(location);
  }
  return { index, byCountry };
}

const [grouped, cityRows] = await Promise.all([
  fs.readFile(streamsPath, "utf8").then(JSON.parse),
  fs.readFile(citiesPath, "utf8").then(JSON.parse)
]);
const countryCodes = buildCountryCodes();
const { index: cityIndex, byCountry: citiesByCountry } = buildCityIndex(cityRows);
const cameras = [];

for (const item of Object.values(grouped).flat()) {
  const countrySlug = slugify(item.country);
  const citySlug = slugify(item.city);
  const countryCode = countryCodes.get(countrySlug);
  let location = countryCode ? cityIndex.get(`${countryCode}/${citySlug}`) : null;
  if (!location && countryCode) {
    const regionSlug = slugify(item.region);
    location = cityIndex.get(`${countryCode}/${regionSlug}`) ||
      citiesByCountry.get(countryCode)?.find((candidate) =>
        candidate.name.includes(citySlug) || citySlug.includes(candidate.name)
      );
  }
  const playbackType = item.stream_type === "youtube" ? "youtube" :
    item.stream_type === "hls" ? "hls" : "offline";
  cameras.push({
    id: `${countrySlug}-${slugify(item.region)}-${citySlug}-${slugify(item.camera_name)}`,
    playbackType,
    status: item.status,
    title: titleCase(item.camera_name),
    subtitle: item.link_text,
    pageUrl: item.page_url,
    thumbnail: item.thumbnail_url,
    streamUrl: item.full_stream_url,
    videoId: playbackType === "youtube" ? item.token : null,
    countrySlug,
    regionSlug: slugify(item.region),
    citySlug,
    cityKey: `${countrySlug}/${slugify(item.region)}/${citySlug}`,
    cityName: titleCase(item.city),
    countryName: titleCase(item.country),
    lat: location?.lat ?? null,
    lon: location?.lon ?? null,
    precision: location ? "城市级" : "位置待补充"
  });
}

// 为每台摄像头生成中文字段与搜索串(搜索在服务端直接匹配 searchText)
const localized = cameras.map((camera) => {
  const zh = localizeCamera(camera);
  const searchText = [camera.title, zh.title, camera.subtitle, camera.cityName, zh.cityName,
    camera.countryName, zh.countryName].filter(Boolean).join(" ").toLowerCase();
  return {
    ...camera,
    titleZh: zh.title,
    cityZh: zh.cityName,
    countryZh: zh.countryName,
    searchText
  };
});

const counts = localized.reduce((result, camera) => {
  result[camera.playbackType] = (result[camera.playbackType] || 0) + 1;
  return result;
}, {});
const result = {
  source: streamsPath.replaceAll("\\", "/"),
  generatedAt: new Date().toISOString(),
  total: localized.length,
  playable: (counts.hls || 0) + (counts.youtube || 0),
  counts,
  filter: "Pentagi outputs 完整摄像头目录（HLS、YouTube、离线）",
  cameras: localized
};

await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
console.log(`Wrote ${localized.length} cameras (${result.playable} playable) to ${outputPath}`);
