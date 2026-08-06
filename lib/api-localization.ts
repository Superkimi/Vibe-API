import { catalogLocalesZh } from "./catalog-locales.generated";
import type { ApiDefinition, ApiParam } from "./api-schema";

export type CatalogLocale = "zh" | "en";

const categoryTranslations: Record<string, string> = {
  "60s Collection": "60s 接口集合",
  "APIs Covered Under APILayer Suite": "APILayer 接口套件",
  "Anti-Malware": "反恶意软件",
  "Art & Design": "艺术与设计",
  "Authentication & Authorization": "身份认证与授权",
  "Cloud Storage & File Sharing": "云存储与文件共享",
  "Continuous Integration": "持续集成",
  "Cryptocurrency": "加密货币",
  "Currency Exchange": "货币汇率",
  "Data Validation": "数据验证",
  "Developer & Utility": "开发者与工具",
  "Documents & Productivity": "文档与生产力",
  "Games & Comics": "游戏与漫画",
  "Geocoding": "地理编码",
  "Government": "政府",
  "Machine Learning": "机器学习",
  "Open Data": "开放数据",
  "Science & Math": "科学与数学",
  "Social": "社交",
  "Sports & Fitness": "运动与健身",
  "URL Shorteners": "短链接",
};

const routeNames: Record<string, string> = {
  "Daily 60s News": "每日 60s 新闻",
  "Daily News RSS": "每日新闻 RSS",
  "Weather Realtime": "实时天气",
  "Weather Forecast": "天气预报",
  "Exchange Rates": "汇率",
  "Gold Price": "金价",
  "Fuel Price": "油价",
  "IP Geolocation": "IP 地理位置",
  "WHOIS Lookup": "WHOIS 查询",
  "Hacker News · New": "Hacker News · 最新",
  "Hacker News · Top": "Hacker News · 热门",
  "Hacker News · Best": "Hacker News · 精选",
  "AI News": "AI 新闻",
  "IT News": "IT 新闻",
  "IT News Ranking": "IT 新闻排行",
  "Today in History": "历史上的今天",
  "NetEase Music Ranking": "网易云音乐榜单",
  "NetEase Music Ranking Detail": "网易云音乐榜单详情",
  "Maoyan Movie List": "猫眼电影榜单",
  "Maoyan Movie Realtime": "猫眼电影实时榜",
  "Maoyan TV Realtime": "猫眼电视剧实时榜",
  "Maoyan Web Realtime": "猫眼网络实时榜",
  "Douban Weekly Movies": "豆瓣一周电影",
  "Random Color": "随机颜色",
  "Color Palette": "颜色调色板",
  "QR Code": "二维码",
  "Hash Generator": "哈希生成器",
  "Password Generator": "密码生成器",
  Translation: "翻译",
  "Translation Languages": "翻译语言",
  "Open Graph Image": "Open Graph 图片",
  "Health Check": "健康检查",
};

const parameterTranslations: Record<string, string> = {
  city: "城市",
  province: "省份",
  location: "位置",
  region: "地区",
  currency: "货币",
  date: "日期",
  days: "天数",
  id: "ID",
  size: "数量",
  limit: "上限",
  type: "类型",
  query: "查询内容",
  domain: "域名",
  ip: "IP 地址",
  encoding: "编码格式",
  url: "URL 地址",
  text: "文本",
  from: "源语言",
  to: "目标语言",
  color: "颜色",
  content: "内容",
  page: "页码",
  keyword: "关键词",
  lang: "语言",
  province_code: "省份编码",
};

const responseKeyTranslations: Record<string, string> = {
  source: "来源",
  api: "接口",
  preview: "预览说明",
  description: "接口简介",
  auth: "认证方式",
  https: "HTTPS",
  cors: "跨域支持",
  code: "状态码",
  message: "消息",
  data: "数据",
  endpoint: "接口路径",
  result: "结果",
  sample: "示例",
  date: "日期",
  title: "标题",
  link: "链接",
  location: "位置",
  name: "名称",
  province: "省份",
  city: "城市",
  county: "区县",
  weather: "天气",
  condition: "天气状况",
  temperature: "温度",
  humidity: "湿度",
  pressure: "气压",
  precipitation: "降水量",
  wind_direction: "风向",
  wind_power: "风力",
  air_quality: "空气质量",
  aqi: "空气质量指数",
  quality: "空气质量等级",
  rates: "汇率",
  updatedAt: "更新时间",
  updated: "更新时间",
  color: "颜色",
  palette: "调色板",
  password: "密码",
  length: "长度",
  news: "新闻",
  tip: "提示",
};

const valueTranslations: Record<string, string> = {
  Unknown: "未知",
  No: "无需认证",
  Yes: "支持",
  "Public endpoint": "公共接口",
  none: "无需认证",
  success: "成功",
  ok: "正常",
  live: "实时",
  Cloudy: "多云",
  Good: "良好",
  Shanghai: "上海",
  "Live response available": "可获取实时响应",
  "Live preview returns the latest collection.": "实时预览会返回最新的数据集合。",
  "Daily news item": "每日新闻条目",
};

export function localizeCategory(category: string, locale: CatalogLocale) {
  if (locale === "en") return category;
  if (categoryTranslations[category]) return categoryTranslations[category];
  return category
    .replace(/Developer/gi, "开发者")
    .replace(/Utility/gi, "工具")
    .replace(/Entertainment/gi, "娱乐")
    .replace(/Finance/gi, "金融")
    .replace(/News/gi, "新闻")
    .replace(/Weather/gi, "天气")
    .replace(/Music/gi, "音乐")
    .replace(/Books/gi, "图书")
    .replace(/Images?/gi, "图片")
    .replace(/and/gi, "与");
}

function translateParamLabel(param: ApiParam, locale: CatalogLocale) {
  if (locale === "en") return param.label;
  return parameterTranslations[param.name.toLowerCase()] ?? param.label;
}

function translateParamDescription(param: ApiParam, locale: CatalogLocale) {
  if (locale === "en") return param.description;
  return param.description === "Query or path parameter discovered from the upstream module."
    ? "来自上游模块识别出的查询或路径参数。"
    : param.description;
}

function translateName(name: string, locale: CatalogLocale) {
  if (locale === "en") return name;
  return routeNames[name] ?? name;
}

function translateValue(value: unknown, locale: CatalogLocale, overrides: Record<string, unknown> = {}): unknown {
  if (locale === "en") return value;
  if (typeof value === "string") return valueTranslations[value] ?? value;
  if (Array.isArray(value)) return value.map((item) => translateValue(item, locale));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => {
      const label = responseKeyTranslations[key];
      const displayKey = label ? `${label} (${key})` : key;
      return [displayKey, key in overrides ? overrides[key] : translateValue(item, locale)];
    }));
  }
  return value;
}

export function localizeSampleResponse(value: unknown, locale: CatalogLocale, overrides: Record<string, unknown> = {}) {
  return translateValue(value, locale, overrides);
}

export function localizeApiDefinition(api: ApiDefinition, locale: CatalogLocale): ApiDefinition {
  if (locale === "en") return api;
  const localeRecord = catalogLocalesZh[api.id as keyof typeof catalogLocalesZh];
  const description = api.source === "60s"
    ? `来自 60s 开放 API 集合的实时路由：${api.path}。`
    : localeRecord?.description ?? `接口说明：${api.description}`;
  const sample = localizeSampleResponse(api.sampleResponse, locale, {
    api: translateName(api.name, locale),
    description,
    preview: api.livePreview ? "实时预览会返回当前数据集合。" : "目录元数据；请打开提供方文档查看实时接口契约。",
  }) as unknown;
  return {
    ...api,
    name: translateName(api.name, locale),
    category: localizeCategory(api.category, locale),
    description,
    authLabel: valueTranslations[api.authLabel] ?? api.authLabel,
    sourceLabel: api.source === "60s" ? "60s 开放 API" : "public-apis 目录",
    params: api.params.map((param) => ({ ...param, label: translateParamLabel(param, locale), description: translateParamDescription(param, locale) })),
    responsePreview: api.livePreview ? "实时接口 · 点击“实时请求”获取当前响应" : "目录元数据 · 实际响应取决于提供方",
    sampleResponse: sample,
  };
}
