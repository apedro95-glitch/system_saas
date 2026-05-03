require("dotenv").config();

const admin = require("firebase-admin");
const { spawn } = require("child_process");

const LOCAL_API_PORT = process.env.LOCAL_API_PORT || "45547";
const SERVICE_ACCOUNT_PATH = process.env.FIREBASE_SERVICE_ACCOUNT || "./serviceAccount.json";

admin.initializeApp({
  credential: admin.credential.cert(require(SERVICE_ACCOUNT_PATH))
});

const db = admin.firestore();
let lastUrl = "";

function extractUrl(text){
  const matches = String(text || "").match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/g);
  return matches?.length ? matches[matches.length - 1] : "";
}

async function saveUrl(url){
  if(!url || url === lastUrl) return;
  await db.collection("system").doc("config").set({
    apiUrl:url,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    source:"topbrs-vps-auto"
  }, { merge:true });
  lastUrl = url;
  console.log("🔥 Firestore system/config.apiUrl atualizado:", url);
}

function startTunnel(){
  console.log(`🌐 Abrindo tunnel para http://localhost:${LOCAL_API_PORT}`);
  const tunnelProcess = spawn("cloudflared", ["tunnel", "--url", `http://localhost:${LOCAL_API_PORT}`], {
    stdio:["ignore", "pipe", "pipe"]
  });

  tunnelProcess.stdout.on("data", async chunk=>{
    const txt = chunk.toString();
    process.stdout.write(txt);
    const url = extractUrl(txt);
    if(url) await saveUrl(url).catch(console.error);
  });

  tunnelProcess.stderr.on("data", async chunk=>{
    const txt = chunk.toString();
    process.stderr.write(txt);
    const url = extractUrl(txt);
    if(url) await saveUrl(url).catch(console.error);
  });

  tunnelProcess.on("exit", code=>{
    console.log("cloudflared saiu:", code, "reiniciando em 5s...");
    setTimeout(startTunnel, 5000);
  });
}

startTunnel();
