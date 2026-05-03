import { db } from "./firebase-config.js";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

export function normalizeTag(value){
  const cleaned = String(value || "").trim().toUpperCase().replace(/\s+/g, "");
  return cleaned.startsWith("#") ? cleaned : (cleaned ? `#${cleaned}` : "");
}

export function cleanTag(value){
  return normalizeTag(value).replace("#", "");
}

export function parseLocalJSON(key){
  try{
    return JSON.parse(localStorage.getItem(key) || "{}");
  }catch{
    return {};
  }
}

export function getCurrentUser(){
  return parseLocalJSON("topbrs_user");
}

export function getCurrentUserTag(){
  const user = getCurrentUser();
  return normalizeTag(user.playerTag || user.tag || localStorage.getItem("topbrs_player_tag") || "");
}

export function getCurrentClanTag(){
  const user = getCurrentUser();
  const clan = parseLocalJSON("topbrs_clan");
  return normalizeTag(user.clanTag || clan.clanTag || clan.tag || localStorage.getItem("topbrs_clan_tag") || localStorage.getItem("selectedClan") || "");
}

export function isCurrentUserMember(member){
  const userTag = cleanTag(getCurrentUserTag());
  const memberTag = cleanTag(member?.tag || member?.playerTag || member?.id || "");
  return Boolean(userTag && memberTag && userTag === memberTag);
}

export function getAvatarForMember(member){
  if(member?.avatar) return member.avatar;
  if(isCurrentUserMember(member)){
    return localStorage.getItem("topbrs_avatar") || "assets/icons/profile-user.svg";
  }
  return "assets/icons/profile-user.svg";
}

export async function findCurrentMemberProfile(){
  const user = getCurrentUser();
  const uid = localStorage.getItem("topbrs_user_uid") || user.uid || "";
  const clanTag = getCurrentClanTag();
  const playerTag = cleanTag(getCurrentUserTag());

  let profile = {...user};

  if(uid){
    try{
      const userSnap = await getDoc(doc(db, "users", uid));
      if(userSnap.exists()){
        profile = {...profile, ...userSnap.data()};
      }
    }catch(error){
      console.warn("Usuário offline:", error);
    }
  }

  if(clanTag && playerTag){
    try{
      const memberSnap = await getDoc(doc(db, "clans", clanTag, "members", playerTag));
      if(memberSnap.exists()){
        const member = memberSnap.data();
        profile = {
          ...profile,
          nick: profile.nick || member.name,
          name: profile.name || member.name,
          playerTag: member.tag || profile.playerTag,
          role: profile.role || member.role,
          avatar: profile.avatar || member.avatar
        };
      }
    }catch(error){
      console.warn("Membro offline:", error);
    }
  }

  localStorage.setItem("topbrs_user", JSON.stringify(profile));
  if(profile.avatar) localStorage.setItem("topbrs_avatar", profile.avatar);

  return profile;
}

export async function saveAvatarEverywhere(src){
  const user = getCurrentUser();
  const uid = localStorage.getItem("topbrs_user_uid") || user.uid || "";
  const clanTag = getCurrentClanTag();
  const playerTag = cleanTag(getCurrentUserTag());

  localStorage.setItem("topbrs_avatar", src);

  if(uid){
    await setDoc(doc(db, "users", uid), {
      avatar: src,
      updatedAt: serverTimestamp()
    }, { merge:true });
  }

  if(clanTag && playerTag){
    await setDoc(doc(db, "clans", clanTag, "members", playerTag), {
      avatar: src,
      updatedAt: serverTimestamp()
    }, { merge:true });
  }

  const updated = {...user, avatar: src};
  localStorage.setItem("topbrs_user", JSON.stringify(updated));
  return updated;
}


export async function saveClanBadgeEverywhere(src){
  const clanTag = getCurrentClanTag();
  const clan = parseLocalJSON("topbrs_clan");

  const updatedClan = {
    ...clan,
    badge: src,
    badgeSrc: src,
    badgeUrl: src,
    updatedAtLocal: Date.now()
  };

  localStorage.setItem("topbrs_clan", JSON.stringify(updatedClan));

  if(clanTag){
    await setDoc(doc(db, "clans", clanTag), {
      badge: src,
      badgeSrc: src,
      badgeUrl: src,
      updatedAt: serverTimestamp()
    }, { merge:true });
  }

  return updatedClan;
}
