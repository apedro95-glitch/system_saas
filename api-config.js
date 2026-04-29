import { db } from "./firebase-config.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const FALLBACK_API_URL = "https://worm-dem-harold-oak.trycloudflare.com";
let cachedApiUrl = "";
let cachedAt = 0;
const CACHE_TTL_MS = 60 * 1000;

function cleanUrl(value){
  return String(value || "").trim().replace(/\/+$/, "");
}

function isHttpUrl(value){
  return /^https?:\/\//i.test(String(value || ""));
}

export async function getApiBaseUrl({ force = false } = {}){
  const now = Date.now();
  if(!force && cachedApiUrl && now - cachedAt < CACHE_TTL_MS){
    return cachedApiUrl;
  }

  try{
    const snap = await getDoc(doc(db, "system", "config"));
    const firestoreUrl = cleanUrl(snap.exists() ? snap.data()?.apiUrl : "");
    if(isHttpUrl(firestoreUrl)){
      cachedApiUrl = firestoreUrl;
      cachedAt = now;
      window.TOPBRS_ACTIVE_API_URL = cachedApiUrl;
      return cachedApiUrl;
    }
  }catch(error){
    console.warn("Não foi possível carregar system/config.apiUrl:", error);
  }

  const localUrl = cleanUrl(
    window.TOPBRS_API_URL ||
    localStorage.getItem("TOPBRS_API_URL") ||
    localStorage.getItem("topbrs_api_url") ||
    ""
  );

  cachedApiUrl = isHttpUrl(localUrl) ? localUrl : FALLBACK_API_URL;
  cachedAt = now;
  window.TOPBRS_ACTIVE_API_URL = cachedApiUrl;
  return cachedApiUrl;
}

export async function getApiBaseCandidates(){
  const urls = [
    await getApiBaseUrl(),
    cleanUrl(window.TOPBRS_API_URL),
    cleanUrl(localStorage.getItem("TOPBRS_API_URL")),
    cleanUrl(localStorage.getItem("topbrs_api_url")),
    FALLBACK_API_URL
  ].filter(isHttpUrl);

  return [...new Set(urls)];
}

export function clearApiBaseUrlCache(){
  cachedApiUrl = "";
  cachedAt = 0;
}
