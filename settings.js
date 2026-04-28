const user = JSON.parse(localStorage.getItem("topbrs_user") || "{}");
const clan = JSON.parse(localStorage.getItem("topbrs_clan") || "{}");

document.querySelector("#settingsNick").textContent = user.nome || user.nick || user.email || "Usuário";
document.querySelector("#settingsMeta").textContent = `${user.role || "membro"} • ${user.playerTag || "sem tag"}`;
document.querySelector("#settingsClan").textContent = clan.name || "TopBRS";
document.querySelector("#settingsClanTag").textContent = clan.clanTag || clan.tag || "#ABC123";

document.querySelector("#logoutSettings")?.addEventListener("click", ()=>{
  if(typeof logoutUser === "function") logoutUser();
  else window.location.href = "index.html";
});
