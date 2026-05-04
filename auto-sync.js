import { syncWarSilently } from "./war-logic.js";

const MIN_INTERVAL = 2 * 60 * 1000;

async function runSilentSync(reason = "auto"){
  const last = Number(localStorage.getItem("topbrs_last_war_sync") || 0);
  if(Date.now() - last < MIN_INTERVAL) return;

  try{
    await syncWarSilently();
  }catch(error){
    console.warn("Sync invisível da guerra falhou:", reason, error);
  }
}

window.topbrsSilentWarSync = runSilentSync;

document.addEventListener("visibilitychange", ()=>{
  if(!document.hidden) runSilentSync("visible");
});

window.addEventListener("focus", ()=>runSilentSync("focus"));

runSilentSync("load");
