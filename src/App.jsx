import { useState, useEffect, useRef } from "react";
import QRCode from 'qrcode';
import jsQR from 'jsqr';
import { createClient } from '@supabase/supabase-js';

let supabase = null;
try{
  const url=import.meta.env.VITE_SUPABASE_URL;
  const key=import.meta.env.VITE_SUPABASE_ANON_KEY;
  if(url&&key&&url.startsWith('http')){
    supabase=createClient(url,key);
  }
}catch(e){console.error('Supabase init failed:',e);}

/* ── AUTH HELPERS ── */
async function signUp(email,password){
  if(!supabase)throw new Error("Supabase未接続");
  const{data,error}=await supabase.auth.signUp({email,password});
  if(error)throw error;
  return data.user;
}
async function signIn(email,password){
  if(!supabase)throw new Error("Supabase未接続");
  const{data,error}=await supabase.auth.signInWithPassword({email,password});
  if(error)throw error;
  return data.user;
}
async function signOut(){
  if(!supabase)return;
  await supabase.auth.signOut();
}
async function getUser(){
  if(!supabase)return null;
  const{data}=await supabase.auth.getUser();
  return data?.user||null;
}
async function saveCharToCloud(user,char){
  if(!supabase||!user||!char)return false;
  const{error}=await supabase.from('characters').upsert({id:user.id,data:char,updated_at:new Date().toISOString()});
  if(error)console.error("☁️ saveCharToCloud ERROR:",error.message,error);
  else console.log("☁️ saveCharToCloud OK:",char.name,"exp:",char.exp);
  return!error;
}
async function loadCharFromCloud(user){
  if(!supabase||!user)return null;
  const{data}=await supabase.from('characters').select('data').eq('id',user.id).single();
  return data?.data||null;
}

/* ── メッセージ機能 ── */
async function sendMsg(fromName,toName,body){
  if(!supabase)return{ok:false,err:"Supabase未接続"};
  if(!fromName||!toName||!body.trim())return{ok:false,err:"名前またはメッセージが空"};
  const{error}=await supabase.from('messages').insert({from_name:fromName,to_name:toName,body:body.trim()});
  if(error)console.error("sendMsg error:",error);
  return{ok:!error,err:error?.message||""};
}
async function fetchInbox(myName){
  if(!supabase||!myName)return[];
  const{data}=await supabase.from('messages')
    .select('*').eq('to_name',myName)
    .order('created_at',{ascending:false}).limit(50);
  return data||[];
}
async function fetchThread(myName,otherName){
  if(!supabase)return[];
  const{data}=await supabase.from('messages')
    .select('*')
    .or(`and(from_name.eq.${myName},to_name.eq.${otherName}),and(from_name.eq.${otherName},to_name.eq.${myName})`)
    .order('created_at',{ascending:true}).limit(100);
  return data||[];
}
async function markRead(myName,fromName){
  if(!supabase)return;
  await supabase.from('messages').update({read:true}).eq('to_name',myName).eq('from_name',fromName).eq('read',false);
}
async function countUnread(myName){
  if(!supabase||!myName)return 0;
  const{count}=await supabase.from('messages').select('*',{count:'exact',head:true}).eq('to_name',myName).eq('read',false);
  return count||0;
}
(function(){
  if(document.getElementById("dl5"))return;
  const l=document.createElement("link");l.rel="stylesheet";
  l.href="https://fonts.googleapis.com/css2?family=Press+Start+2P&family=M+PLUS+Rounded+1c:wght@400;700;900&display=swap";
  document.head.appendChild(l);
  const s=document.createElement("style");s.id="dl5";
  s.textContent=`
    @keyframes fl{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
    @keyframes pi{0%{transform:scale(.4);opacity:0}70%{transform:scale(1.1)}100%{transform:scale(1);opacity:1}}
    @keyframes su{from{transform:translateY(22px);opacity:0}to{transform:translateY(0);opacity:1}}
    @keyframes pu{0%,100%{opacity:.9}50%{opacity:.15}}
    @keyframes bt{0%,100%{transform:translateX(0)}25%{transform:translateX(-20px) rotate(-7deg)}75%{transform:translateX(20px) rotate(7deg)}}
    @keyframes vi{0%{transform:scale(1)}33%{transform:scale(1.4) rotate(-8deg)}66%{transform:scale(1.4) rotate(8deg)}100%{transform:scale(1)}}
    @keyframes sh{0%,100%{transform:translateX(0)}25%,75%{transform:translateX(-6px)}50%{transform:translateX(6px)}}
    @keyframes fd{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
    @keyframes flap{0%{transform:rotate(-5deg)}50%{transform:rotate(5deg)}100%{transform:rotate(-5deg)}}
    *{box-sizing:border-box;margin:0;padding:0}
    ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:#2a2a50;border-radius:2px}
    button{cursor:pointer;border:none;background:none;font-family:inherit}input{font-family:inherit}
  `;
  document.head.appendChild(s);
})();

const BG="#0c0c18",BG2="#161630",BG3="#1e1e3a",BD="#323258";
const TX="#e8e8f8",TX2="#9090c0",TX3="#5a5a8a";

/* ── GENRES ── */
const GENRES={
  ballet:      {name:"Ballet",      jp:"バレエ",          e:"🩰",c:"#ff9ec4"},
  contemporary:{name:"Contemporary",jp:"コンテンポラリー",e:"🌊",c:"#c77dff"},
  house:       {name:"House",       jp:"ハウス",          e:"🕺",c:"#00e5ff"},
  hiphop:      {name:"Hip-Hop",     jp:"ヒップホップ",    e:"🎤",c:"#ff6b35"},
  lock:        {name:"Lock",        jp:"ロック",          e:"🔒",c:"#ffea00"},
  popping:     {name:"Popping",     jp:"ポッピング",      e:"⚡",c:"#b3ff00"},
  breaking:    {name:"Breaking",    jp:"ブレイキン",      e:"🌀",c:"#ff7c3a"},
  waacking:    {name:"Waacking",    jp:"ワッキング",      e:"💃",c:"#ff4da6"},
  jazz:        {name:"Jazz",        jp:"ジャズ",          e:"🎷",c:"#ffd60a"},
};
const BASE={
  ballet:{technique:5,rhythm:2,style:4,stamina:2,charisma:3},
  contemporary:{technique:3,rhythm:2,style:5,stamina:3,charisma:2},
  house:{technique:2,rhythm:5,style:2,stamina:4,charisma:2},
  hiphop:{technique:2,rhythm:5,style:3,stamina:2,charisma:4},
  lock:{technique:2,rhythm:3,style:2,stamina:2,charisma:6},
  popping:{technique:6,rhythm:2,style:4,stamina:2,charisma:1},
  breaking:{technique:3,rhythm:2,style:2,stamina:6,charisma:2},
  waacking:{technique:2,rhythm:3,style:3,stamina:2,charisma:5},
  jazz:{technique:2,rhythm:4,style:3,stamina:2,charisma:4},
};

/* ── BATTLE COMMENTS (AI不要・ジャンルごと) ── */
const BC={
  ballet:["完璧なピルエット！","アントルラッセで宙を舞う！","シャンジュマンが決まった！","アッサンブレで魅せる！","シスで空間を支配！","グリッサードが流れるように！"],
  contemporary:["魂のインプロ！","フロアワークで大地を掌握","呼吸が爆発する！","リリースで重力を無視！","コンタクトで一体化！"],
  house:["シャッフルが炸裂！🕺","ルースレッグが止まらない！","２STEPでリズムを刻む！","ピーターポール炸裂！！","スウォルで会場が震える！","トレインが走る！"],
  hiphop:["グルーヴが止まらない！🎤","シルエットで魅せる！","プランサーみたいに決めた！","バイブスがヤバい！","ミュージカリティ全開！","ダウンがキレキレ！","リズムが体に宿る！","フリースタイルが炸裂！"],
  lock:["トゥエルが炸裂！🔒","ポイントで観客を射抜く！","スクーバーが決まった！","ロック！電光石火！","ウィッチウェイで翻弄！","クロスハンドが鮮やか！","GET DOWN !!!!!!!!"],
  popping:["フレズノが炸裂！⚡","ティッキングが止まらない！","ストロボが炸裂！","ウェーブが全身に！","ヒット！会場に衝撃！","ダイムストップ！時が止まる！","マペットが観客を魅了！"],
  breaking:["フリーズで時間が凍る！🌀","チェアーが決まった！","６歩が轟く！","３歩のリズムが光る！","トーマス！重力を無視！","エアーで会場が沸く！","スレッドが炸裂！","トップロックで場を制圧！"],
  waacking:["アームスウィングが閃光！💃","プリエが決まった！","ポーズが完璧！","ワックが空気を切る！","キャットウォークで魅了！"],
  jazz:["プリエが流れる！🎷","ジャンプで跳躍！","ジャズウォークが決まった！","イリュージョンで魅了！","アクセルターン炸裂！","ジャズハンドが光る！","シミーで会場を魅了！"],
};
const OBC={ // 相手のコメント
  popping:["電撃のようなポッピング！","ウェーブが伝わってくる","まるで電流が走るよう","止まらないポップ！"],
  house:["グルーヴが止まらない！","フットワークが神速！","会場が揺れてる","本場のハウスムーブ"],
  hiphop:["グルーヴが止まらない！","シルエットが!!","プランサーみたい!!","ミュージカリティが半端ない！","リズムの取り方がヤバい！","ダウンがキレキレ！","フリースタイルが炸裂！","バイブスが会場を包む！","ウォームアップから本気！","フロアが揺れてる！","トップがナチュラル！","アイソレが鋭い！"],
  breaking:["パワーの嵐！","回転が止まらない","重力を無視した動き","フリーズが完璧！"],
  lock:["ファンクが炸裂！","ロックが冴え渡る","ポイントが鋭い！","スクービーが炸裂"],
  ballet:["優雅さが際立つ！","技術の極致！","クラシックの美しさ","ポアントが完璧！"],
  contemporary:["感情が溢れる！","コンテの世界へ","インプロが自由！","フロアが光る"],
  waacking:["ワックが輝く！","ディスコの魂！","アームが閃光！","ポーズが決まった"],
  jazz:["スウィングが最高！","ジャズの魂！","リズムが最高！","ランが疾走する"],
};

/* ── WORKSHOPS ── */
const WS=[
  {id:"drum",  n:"ドラムWS",       e:"🥁",p:1500, ec:10, stat:"rhythm",    amt:3, desc:"ビートの根幹を学ぶ"},
  {id:"gym",   n:"ジムトレーニング",e:"🏋️",p:1000, ec:20, stat:"stamina",   amt:4, desc:"体を徹底的に鍛える"},
  {id:"mirror",n:"鏡前特訓",       e:"🪞",p:800,  ec:10, stat:"style",     amt:2, desc:"自分のスタイルを磨く"},
  {id:"ballet",n:"バレエクラス",    e:"🩰",p:2000, ec:15, stat:"technique", amt:4, desc:"技術を根本から鍛える"},
  {id:"yoga",  n:"ヨガクラス",      e:"🧘",p:1000, ec:10, stat:"style",     amt:3, desc:"柔軟性と体の使い方"},
  {id:"mc",    n:"MCスクール",      e:"🎤",p:3000, ec:15, stat:"charisma",  amt:5, desc:"カリスマ性を引き上げる"},
  {id:"photo", n:"フォト撮影会",    e:"📸",p:1200, ec:5,  stat:"charisma",  amt:3, desc:"SNSでバズってカリスマUP"},
  {id:"music", n:"音楽理論WS",      e:"🎵",p:1800, ec:12, stat:"rhythm",    amt:4, desc:"リズムの核心を学ぶ"},
];

/* ── SHOP ── */
const SHOP={
  costumes:[
    {id:"street",  n:"ストリートウェア",     lv:1,  p:500,   b:{style:2},             col:"#4a4a7a",desc:"定番ストリートスタイル"},
    {id:"hip",     n:"ヒップホップパンツ",    lv:1,  p:700,   b:{rhythm:2,stamina:1},  col:"#2a4a2a",desc:"バギーパンツ"},
    {id:"leo",     n:"ダンスレオタード",      lv:5,  p:600,   b:{technique:2,style:1}, col:"#4a0a6a",desc:"クラシック用タイトウェア"},
    {id:"battle",  n:"バトルジャケット",      lv:8,  p:900,   b:{stamina:2,charisma:1},col:"#3a0a0a",desc:"バトル向けジャケット"},
    {id:"stussy",  n:"Stüssy クルーネック",   lv:10, p:1500,  b:{style:2,charisma:1},  col:"#1a2a3a",desc:"ストリートの定番"},
    {id:"palace",  n:"Palace トラックスーツ", lv:14, p:2000,  b:{rhythm:2,style:2},    col:"#1a0a2a",desc:"スケーターの聖典"},
    {id:"supreme", n:"Supreme ボックスロゴ",  lv:18, p:4000,  b:{charisma:3,style:2},  col:"#2a0000",desc:"ストリートカルチャーの王"},
    {id:"stage",   n:"ステージスーツ",        lv:20, p:2500,  b:{charisma:3,style:2},  col:"#0a0a4a",desc:"ステージ映え豪華スーツ"},
    {id:"wtaps",   n:"WTAPS カレッジジャケット",lv:25,p:5000, b:{style:3,charisma:2},  col:"#0a1a0a",desc:"日本ストリートの頂点"},
    {id:"cdg",     n:"Comme des Garçons",     lv:35, p:8000,  b:{style:5,charisma:3},  col:"#111111",desc:"前衛ファッションの極み"},
    {id:"offwhite",n:"Off-White",             lv:40, p:10000, b:{charisma:4,style:4},  col:"#e8e0c8",desc:"ヴァージルの遺産"},
    {id:"gold",    n:"ゴールドコスチューム",  lv:50, p:20000, b:{charisma:6,style:5},  col:"#3a2200",desc:"レジェンド専用黄金衣装"},
    {id:"space",   n:"宇宙服コスチューム",    lv:60, p:50000, b:{charisma:8,style:6,technique:4},col:"#0a1a2a",desc:"宇宙ダンサー専用スーツ"},
  ],
  sneakers:[
    {id:"chuck",   n:"Chuck Taylor",          lv:1,  p:550,  b:{charisma:1,style:1},           col:"#cc2222",sol:"#ffffff",desc:"永遠のオールスター"},
    {id:"cortez",  n:"Nike Cortez",           lv:3,  p:600,  b:{rhythm:1,stamina:1},            col:"#f8f0e0",sol:"#4444cc",desc:"クラシックランナー"},
    {id:"samba",   n:"Adidas Samba OG",       lv:5,  p:900,  b:{rhythm:2,style:2},              col:"#111111",sol:"#eeeeee",desc:"ハウスダンサーの定番！"},
    {id:"blazer",  n:"Nike Blazer Mid",       lv:5,  p:750,  b:{style:2},                       col:"#e8c880",sol:"#c8a860",desc:"ビンテージな佇まい"},
    {id:"puma",    n:"Puma Suede Classic",    lv:6,  p:720,  b:{rhythm:2,charisma:1},            col:"#333399",sol:"#cccccc",desc:"ブレイキンの定番"},
    {id:"af1",     n:"Air Force 1 Low",       lv:7,  p:900,  b:{rhythm:2,style:1},              col:"#f8f8f8",sol:"#dddddd",desc:"ハウスの定番・白AF1"},
    {id:"vans",    n:"Vans Old Skool",        lv:8,  p:680,  b:{style:2,rhythm:1},              col:"#222222",sol:"#eeeeee",desc:"スケーターの魂"},
    {id:"reebok",  n:"Reebok Classic",        lv:8,  p:700,  b:{technique:1,rhythm:1},           col:"#ffffff",sol:"#cccccc",desc:"クリーンなクラシック"},
    {id:"nb574",   n:"New Balance 574",       lv:10, p:950,  b:{stamina:2,style:1},             col:"#888888",sol:"#cccccc",desc:"バランス最強のNB"},
    {id:"hp",      n:"Hush Puppies Loafer",   lv:10, p:900,  b:{style:2,stamina:1},             col:"#c8a870",sol:"#8a6a40",desc:"スムースレザーの優雅さ"},
    {id:"timb",    n:"Timberland 6inch",      lv:12, p:1100, b:{stamina:3},                     col:"#c8860a",sol:"#8a5a00",desc:"ストリートの王道ブーツ"},
    {id:"nb990",   n:"New Balance 990v6",     lv:15, p:1800, b:{stamina:2,technique:2},          col:"#666666",sol:"#aaaaaa",desc:"USA製フラッグシップ"},
    {id:"aj1",     n:"Air Jordan 1 Retro",    lv:18, p:2200, b:{stamina:3,rhythm:2},            col:"#dd2222",sol:"#111111",desc:"バスケとストリートの融合"},
    {id:"yeezy",   n:"Yeezy Boost 350 V2",    lv:28, p:4500, b:{charisma:3,style:3},            col:"#ccbb99",sol:"#ddccaa",desc:"カニエのレガシー"},
    {id:"jordan4", n:"Air Jordan 4 Retro",    lv:35, p:6000, b:{stamina:3,charisma:2,style:2},  col:"#111111",sol:"#cccccc",desc:"マイケルの遺産"},
    {id:"ltds",    n:"限定コラボスニーカー",  lv:50, p:20000,b:{charisma:5,style:4,rhythm:3},   col:"#ffd700",sol:"#888888",desc:"世界100足のレア限定品"},
  ],
  accessories:[
    {id:"chain",  n:"ゴールドチェーン",       slot:"neck",    lv:1,  p:400,  b:{charisma:2},        desc:"ゴールドが輝く存在感"},
    {id:"sunglass",n:"サングラス",            slot:"face",    lv:1,  p:350,  b:{charisma:1,style:1}, desc:"クールな一枚"},
    {id:"bandana",n:"バンダナ",               slot:"forehead",lv:1,  p:200,  b:{style:1},            desc:"額に巻いてスタイルアップ"},
    {id:"cap",    n:"スナップバックキャップ",  slot:"head",    lv:3,  p:450,  b:{charisma:1,rhythm:1},desc:"かぶって気合い入れろ"},
    {id:"beanie", n:"ビーニー",               slot:"head",    lv:3,  p:300,  b:{style:1,stamina:1},  desc:"どんな時も全力で"},
    {id:"durag",  n:"デュラグ",               slot:"head",    lv:8,  p:800,  b:{charisma:2,style:2}, desc:"ウェーブカルチャーの象徴"},
    {id:"fan",    n:"ゴールドファン",           slot:"hand",    lv:15, p:1500, b:{charisma:3,style:2}, desc:"ワッキングの女王専用"},
    {id:"goldring",n:"ゴールドリング",         slot:"hand",    lv:20, p:2000, b:{charisma:4},         desc:"存在感抜群のリング"},
  ],
  drinks:[
    {id:"water",   n:"ミネラルウォーター", lv:1, p:1,  energy:5,  desc:"基本の水分補給"},
    {id:"sports",  n:"スポーツドリンク",   lv:1, p:2,  energy:10, desc:"素早いエネルギー補給"},
    {id:"energy",  n:"エナジードリンク",   lv:5, p:4,  energy:25, desc:"エネルギー爆発補給！"},
    {id:"protein", n:"プロテインシェイク", lv:8, p:5,  energy:15, desc:"スタミナ+3も！",bonus:{stamina:3}},
    {id:"medial",  n:"メディカルドリンク", lv:20,p:10, energy:50, desc:"完全回復！"},
  ],
  legend:[
    {id:"michael_glove", n:"マイケルの手袋", lv:50, p:500000, pg:500, e:"🧤", b:{charisma:10,style:8}, desc:"フリースタイルの神が残した伝説の白い手袋。宇宙の扉を開く", require:null},
    {id:"michael_loafer",n:"マイケルのローファー",lv:50,p:500000,pg:500,e:"👞",b:{rhythm:10,technique:8},desc:"ムーンウォークを生んだ伝説の靴。月面を踏んだ者だけが履ける",require:null},
    {id:"michael_hat",   n:"マイケルのハット",   lv:50, p:500000, pg:500, e:"🎩", b:{charisma:8,style:10},desc:"ステージを支配した黒いフェドーラ。これを被る者は伝説となる",require:null},
    {id:"moon_rover",    n:"月の探索車",         lv:55, p:800000, pg:800, e:"🚗", b:{stamina:5,technique:5},desc:"月面・宇宙探索専用の車両。これなし��は宇宙MAP探索不可能",require:"moon_stone"},
  ],
};

/* ── STAT META ── */
const SM={technique:{jp:"テクニック",c:"#4fc3f7"},rhythm:{jp:"リズム",c:"#b3ff00"},style:{jp:"スタイル",c:"#ff9ec4"},stamina:{jp:"スタミナ",c:"#ff7c3a"},charisma:{jp:"カリスマ",c:"#ffd60a"}};
const RANKS=[{n:"Rookie",jp:"ルーキー",lv:1,c:"#9090b0"},{n:"Amateur",jp:"アマチュア",lv:5,c:"#4fc3f7"},{n:"Pro",jp:"プロ",lv:12,c:"#81c784"},{n:"Expert",jp:"エキスパート",lv:22,c:"#ce93d8"},{n:"Master",jp:"マスター",lv:38,c:"#ffcc02"},{n:"Legend",jp:"レジェンド",lv:55,c:"#ff6b6b"},{n:"Galaxy",jp:"ギャラクシー",lv:70,c:"#00ffff"},{n:"GOD",jp:"神話",lv:100,c:"#ff4da6"},{n:"LEGEND",jp:"伝説",lv:150,c:"#ffffff"}];

/* ── 秘宝システム（レベル上限解放） ── */
const ARTIFACTS=[
  {id:"lava",    e:"🌋",name:"溶岩の魂",    desc:"鹿児島の火山が宿す古代の魂",  hint:"鹿児島のBOSS全員を倒せ",    city:"kagoshima", need:["Minoda","Su"]},
  {id:"dragon",  e:"🐉",name:"龍の鱗",      desc:"小倉の龍が落とした黄金の鱗",  hint:"小倉のBOSS全員を倒せ",      city:"kokura",    need:["TAKAFUMI","RYU"]},
  {id:"flame",   e:"🔥",name:"博多の炎",    desc:"博多のクラブで燃え続ける情熱",hint:"博多のBOSS全員を倒せ",      city:"hakata",    need:["Yoshibow","SO"]},
  {id:"dove",    e:"🕊",name:"瀬戸内の証",  desc:"瀬戸内の海に眠る平和の宝",    hint:"広島を制覇",                 cities:["hiroshima"]},
  {id:"blossom", e:"🌸",name:"古都の証",    desc:"千年の都が認めし踊り手の証",  hint:"大阪と京都を両方制覇",       cities:["osaka","kyoto"]},
  {id:"gear",    e:"⚙️",name:"産業の心臓",  desc:"名古屋の産業が生んだ機械の魂",hint:"名古屋を制覇",               cities:["nagoya"]},
  {id:"thunder", e:"⚡",name:"東京の雷",    desc:"東京の夜空に落ちた雷の結晶",  hint:"東京を制覇",                 cities:["tokyo"]},
  {id:"moon",    e:"🌙",name:"北の月",      desc:"北海道の夜空に輝く月の欠片",  hint:"仙台と札幌を両方制覇",       cities:["sendai","sapporo"]},
  {id:"key",     e:"🔑",name:"伝説の鍵",    desc:"最強の者だけが手にできる伝説の鍵",hint:"強敵を倒し続けよ（超レア）",rare:true,dropRate:.03},
];

function getMaxLv(artifacts){
  const n=(artifacts||[]).length;
  if(n>=9)return 199;if(n>=7)return 175;if(n>=5)return 150;
  if(n>=3)return 130;if(n>=1)return 110;return 99;
}

function computeArtifacts(char,bossDefeats,justClearedCity){
  const existing=char.artifacts||[];
  const cleared={...(char.clearedCities||{}),[justClearedCity]:true};
  const result=[...existing];
  ARTIFACTS.forEach(art=>{
    if(result.includes(art.id))return;
    let earned=false;
    if(art.need&&art.city){
      earned=art.need.every(name=>bossDefeats[`${art.city}_${name}`]);
    }else if(art.cities){
      earned=art.cities.every(c=>cleared[c]);
    }
    if(earned)result.push(art.id);
  });
  return result;
}

/* ── ジャンル相性チャート ── */
const COMPAT={
  house:       ["breaking","jazz"],
  lock:        ["hiphop","waacking"],
  hiphop:      ["house","contemporary"],
  breaking:    ["ballet","lock"],
  popping:     ["breaking","jazz"],
  waacking:    ["popping","contemporary"],
  ballet:      ["jazz","waacking"],
  contemporary:["ballet","lock"],
  jazz:        ["hiphop","popping"],
};
function compatBonus(playerGenre,oppGenre){
  if(!playerGenre||!oppGenre)return{bonus:1,label:""};
  const beats=COMPAT[playerGenre]||[];
  if(beats.includes(oppGenre))return{bonus:1.2,label:"相性有利 ⚡+20%",col:"#b3ff00"};
  const oppBeats=COMPAT[oppGenre]||[];
  if(oppBeats.includes(playerGenre))return{bonus:0.85,label:"相性不利 ⬇-15%",col:"#ff5555"};
  return{bonus:1,label:"互角",col:"#ffcc02"};
}
const AG={chain:"neck",sunglass:"face",bandana:"forehead",cap:"head",beanie:"head",durag:"head",fan:"hand",goldring:"hand"};

/* ── TRAINING MOVES ── */
const MOVES={
  ballet:[
    {id:"pi", name:"ピルエット",         cost:10, g:{technique:3,style:2},          exp:26},
    {id:"jm", name:"ジャンプ",           cost:8,  g:{stamina:2,style:1},            exp:18},
    {id:"en", name:"アントルラッセ",     cost:14, g:{technique:3,stamina:2},        exp:32},
    {id:"si", name:"シス",               cost:8,  g:{technique:2,style:1},          exp:16},
    {id:"ch", name:"シャンジュマン",     cost:12, g:{stamina:2,technique:2},        exp:28},
    {id:"gl", name:"グリッサードサード", cost:16, g:{style:3,technique:2},          exp:36},
    {id:"as", name:"アッサンブレ",       cost:20, g:{stamina:2,charisma:2,style:2}, exp:44},
  ],
  contemporary:[
    {id:"fl", name:"フロアワーク", cost:9,  g:{style:2,technique:1},         exp:15},
    {id:"im", name:"インプロ",     cost:11, g:{style:3,charisma:1},           exp:23},
    {id:"br", name:"呼吸",         cost:11, g:{stamina:2,style:1},            exp:20},
    {id:"re", name:"リリース",     cost:18, g:{stamina:2,style:2,technique:1},exp:38},
    {id:"co", name:"コンタクト",   cost:22, g:{charisma:3,style:2},           exp:50},
  ],
  house:[
    {id:"sf", name:"シャッフル",   cost:8,  g:{rhythm:2,style:1},            exp:14},
    {id:"ll", name:"ルースレッグ", cost:8,  g:{rhythm:2,stamina:1},          exp:14},
    {id:"ts", name:"２STEP",       cost:10, g:{rhythm:2,style:2},            exp:20},
    {id:"pp", name:"ピーターポール",cost:18,g:{charisma:3,rhythm:3},         exp:42},
    {id:"sw", name:"スウォル",     cost:14, g:{rhythm:3,stamina:2},          exp:32},
    {id:"tr", name:"トレイン",     cost:22, g:{stamina:3,rhythm:2,style:1},  exp:48},
  ],
  hiphop:[
    {id:"tl", name:"トゥループ",     cost:10, g:{charisma:2,rhythm:2},       exp:20},
    {id:"rb", name:"ロボコップ",     cost:12, g:{technique:3,style:2},       exp:28},
    {id:"mt", name:"マイクタイソン", cost:18, g:{charisma:4,rhythm:2},       exp:40},
    {id:"pm", name:"パーティマシン", cost:14, g:{charisma:3,style:2},        exp:30},
    {id:"wv", name:"ウェーブ",       cost:10, g:{technique:2,style:2},       exp:22},
    {id:"tt", name:"タット",         cost:16, g:{technique:3,charisma:1},    exp:34},
  ],
  lock:[
    {id:"tw", name:"トゥエル",       cost:9,  g:{style:2,technique:1},       exp:18},
    {id:"pt", name:"ポイント",       cost:8,  g:{charisma:3,style:1},        exp:16},
    {id:"sc", name:"スクーバー",     cost:14, g:{stamina:2,charisma:2},      exp:30},
    {id:"lk", name:"ロック",         cost:10, g:{charisma:2,rhythm:2},       exp:20},
    {id:"ww", name:"ウィッチウェイ", cost:12, g:{style:3,charisma:2},        exp:28},
    {id:"cr", name:"クロスハンド",   cost:16, g:{technique:3,style:2},       exp:36},
  ],
  popping:[
    {id:"fr", name:"フレズノ",       cost:10, g:{technique:2,rhythm:2},      exp:22},
    {id:"tk", name:"ティッキング",   cost:8,  g:{technique:3,style:1},       exp:18},
    {id:"sb", name:"ストロボ",       cost:16, g:{technique:3,style:2},       exp:36},
    {id:"wv", name:"ウェーブ",       cost:10, g:{technique:2,style:2},       exp:22},
    {id:"ht", name:"ヒット",         cost:12, g:{technique:3,stamina:1},     exp:26},
    {id:"ds", name:"ダイムストップ", cost:20, g:{technique:4,charisma:1},    exp:44},
    {id:"mp", name:"マペット",       cost:14, g:{style:3,charisma:2},        exp:32},
  ],
  breaking:[
    {id:"fz", name:"フリーズ",       cost:20, g:{technique:3,stamina:2},     exp:46},
    {id:"ch", name:"チェアー",       cost:16, g:{technique:3,stamina:2},     exp:36},
    {id:"ss", name:"６歩",           cost:12, g:{stamina:2,rhythm:2},        exp:26},
    {id:"ts", name:"３歩",           cost:10, g:{rhythm:2,technique:2},      exp:22},
    {id:"th", name:"トーマス",       cost:28, g:{stamina:4,technique:2},     exp:60},
    {id:"ar", name:"エアー",         cost:24, g:{stamina:3,charisma:2},      exp:52},
    {id:"sl", name:"スレッド",       cost:18, g:{technique:3,stamina:2},     exp:40},
    {id:"tl", name:"トップロック",   cost:8,  g:{charisma:2,rhythm:2},       exp:18},
  ],
  waacking:[
    {id:"sw", name:"アームスウィング",cost:8,  g:{charisma:2,style:1},       exp:14},
    {id:"wp", name:"プリエ",          cost:8,  g:{style:2,technique:1},      exp:14},
    {id:"po", name:"ポーズ",          cost:9,  g:{charisma:2,style:2},       exp:19},
    {id:"wh", name:"ワック",          cost:18, g:{charisma:3,rhythm:2},      exp:38},
    {id:"cw", name:"キャットウォーク",cost:13, g:{style:3,charisma:1},       exp:28},
  ],
  jazz:[
    {id:"jp", name:"プリエ",         cost:8,  g:{technique:2,style:1},       exp:16},
    {id:"jm", name:"ジャンプ",       cost:10, g:{stamina:2,style:1},         exp:20},
    {id:"jw", name:"ジャズウォーク", cost:10, g:{charisma:2,style:2},        exp:22},
    {id:"il", name:"イリュージョン", cost:18, g:{style:3,charisma:2},        exp:38},
    {id:"at", name:"アクセルターン", cost:14, g:{technique:2,rhythm:2},      exp:30},
    {id:"jh", name:"ジャズハンド",   cost:8,  g:{charisma:3,style:1},        exp:18},
    {id:"sm", name:"シミー",         cost:12, g:{charisma:2,rhythm:2},       exp:26},
  ],
};
const CMOVES=[{id:"st",name:"ストレッチ",cost:4,g:{stamina:1,style:1},exp:8},{id:"im2",name:"イメトレ",cost:3,g:{technique:1},exp:6},{id:"vd",name:"ビデオ研究",cost:2,g:{style:1,charisma:1},exp:7}];

/* ── QUICK OPPONENTS ── */
const QOPPS=[
  {id:"q1",name:"ルーキーのレン",  style:"popping",  e:"🤖",lv:2,  pw:100,  rw:{exp:60,  coins:150}},
  {id:"q2",name:"ハウスのハナ",    style:"house",    e:"💃",lv:5,  pw:280,  rw:{exp:120, coins:300, title:"バトルデビュー！"}},
  {id:"q3",name:"ファンクのRika",  style:"lock",     e:"🔥",lv:8,  pw:550,  rw:{exp:200, coins:500}},
  {id:"q4",name:"ロックキングLeo", style:"lock",     e:"🦁",lv:12, pw:950,  rw:{exp:350, coins:900, title:"ローカルチャンピオン"}},
  {id:"q5",name:"テクニシャンMai", style:"ballet",   e:"🩰",lv:18, pw:1800, rw:{exp:600, coins:1800}},
  {id:"q6",name:"バレエの女王Bea", style:"ballet",   e:"👸",lv:22, pw:3000, rw:{exp:900, coins:3000, title:"テクニシャン"}},
  {id:"q7",name:"ストリート王者Shin",style:"breaking",e:"⚡",lv:32, pw:5500, rw:{exp:1800,coins:6000, title:"ストリートの王者"}},
  {id:"q8",name:"ワールドスターYuki",style:"contemporary",e:"🌟",lv:48,pw:9000, rw:{exp:3000,coins:12000,title:"ワールドクラス"}},
  {id:"q9", name:"レジェンド・GOAT", style:"popping",  e:"👑",lv:60, pw:15000, rw:{exp:6000, coins:30000,title:"GOAT"}, requireItems:["michael_glove","michael_hat"]},
  {id:"q10",name:"宇宙人ダンサー",  style:"breaking", e:"👽",lv:70, pw:25000, rw:{exp:12000,coins:80000,title:"GALAXY DANCER"}, requireItems:["michael_glove","michael_loafer","michael_hat","moon_stone"], requireHint:"月に光るものが見える..."},
];

/* ── SHOWS ── */
const SHOWS=[
  {id:"s1",name:"地区センター発表会",   venue:"地元",  e:"🏫",lv:1, ec:8, rw:{exp:25, coins:200,  fame:10},  desc:"まずは地元で名を上げろ！",dailyMax:5},
  {id:"s2",name:"渋谷ストリートイベント",venue:"東京",  e:"🗼",lv:5, ec:10,rw:{exp:60, coins:500,  fame:40},  desc:"東京のストリートで輝け",dailyMax:4},
  {id:"s3",name:"全国ダンスコンペティション",venue:"全国",e:"🏆",lv:12,ec:15,rw:{exp:130,coins:1500, fame:150}, desc:"全国の猛者と競え！優勝賞金あり",dailyMax:3},
  {id:"s4",name:"アジアダンスフェスティバル",venue:"アジア",e:"🌏",lv:25,ec:18,rw:{exp:250,coins:4000, fame:400}, desc:"アジアの頂点を目指せ",dailyMax:3},
  {id:"s5",name:"ワールドダンスショー",   venue:"全世界",e:"🌍",lv:42,ec:22,rw:{exp:500,coins:12000,fame:1200},desc:"全世界が注目する最高峰の舞台",dailyMax:2},
  {id:"s6",name:"宇宙ステーション公演",   venue:"宇宙",  e:"🚀",lv:62,ec:28,rw:{exp:900,coins:30000,fame:3000},desc:"人類初の宇宙ダンスショー！",dailyMax:1},
];

/* ── 隠しアイテム（世界7カ所） ── */
const HIDDEN_ITEMS=[
  {id:"h1",name:"🗻 古代の勾玉",    mapId:"japan",    x:10,y:35,reward:{gems:15,title:"秘宝探索者"},    desc:"日本の山深くに眠る古代の宝石"},
  {id:"h2",name:"🏺 シルクロードの壺",mapId:"asia",   x:16,y:32,reward:{coins:80000},                desc:"古代交易路に埋もれた唐の壺"},
  {id:"h3",name:"🎸 幻のブルースギター",mapId:"usa",  x:21,y:38,reward:{gems:20,title:"ブルースの魂"}, desc:"ミシシッピの地に眠る伝説のギター"},
  {id:"h4",name:"💎 メディチの秘宝", mapId:"europe",  x:8, y:45,reward:{coins:150000},               desc:"ルネサンスの隠された財宝"},
  {id:"h5",name:"🐘 ガネーシャの像", mapId:"india",   x:10,y:42,reward:{gems:25,title:"インドの守護神"},desc:"ヒマラヤ奥地に祀られた神の像"},
  {id:"h6",name:"🌺 アマゾンの秘花", mapId:"samerica",x:10,y:22,reward:{exp:8000,title:"ジャングルの王"},desc:"アマゾン奥地にのみ咲く幻の花"},
  {id:"h7",name:"💀 サハラの財宝",   mapId:"africa",  x:18,y:14,reward:{coins:300000,gems:30},        desc:"サハラ砂漠に埋もれた失われた文明"},
];
const J={
  kagoshima:{id:"kagoshima",name:"鹿児島",x:152,y:408,g:"house",lv:1,cn:["kumamoto","miyazaki"],
    ch:{name:"Minoda",e:"🌋",pw:220},
    bosses:[
      {name:"Minoda",e:"🌋",pw:220,style:"house",intro:"鹿児島の溶岩を纏うHOUSEの使い手！"},
      {name:"Su",    e:"🔥",pw:280,style:"hiphop",intro:"炎のリズムで迫り来る！"},
    ],
    rw:{exp:160,coins:400,title:"鹿児島の王"},desc:"火山の島から生まれたHOUSEの聖地",food:[
    {n:"油そば専門 兎",p:900,e:15,h:40,desc:"鹿児島発！自分好みにカスタムする油そば"},
    {n:"うなぎの松重",p:2500,e:25,h:45,desc:"鹿児島名物！ふっくら肉厚のうなぎ蒲焼き"},
    {n:"爾今のそば",p:1200,e:12,h:35,desc:"手打ちそばの名店。落ち着いた一杯"},
  ]},
  miyazaki:{id:"miyazaki",name:"宮崎",x:200,y:365,g:"breaking",lv:3,cn:["kagoshima","kumamoto","oita"],ch:{name:"サーファーBreaker・Ryo",e:"🏄",pw:320},rw:{exp:220,coins:600,title:"宮崎ライダー"},desc:"南国の太陽の下のBREAKING",food:[
    {n:"味のおぐら チキン南蛮",p:1400,e:22,h:50,desc:"チキン南蛮発祥の名店！秘伝タルタルが絶品"},
    {n:"おらが村 地鶏炭火焼き",p:1800,e:20,h:40,desc:"宮崎地鶏を炭火でじっくり。ワイルドな旨さ"},
    {n:"戸隠本店 冷や汁",p:800,e:10,h:30,desc:"宮崎の郷土料理。夏に最高の冷たい汁かけ飯"},
  ]},
  nagasaki:{id:"nagasaki",name:"長崎",x:86,y:316,g:"waacking",lv:5,cn:["kumamoto","hakata"],
    ch:{name:"Uchikawa",e:"⛵",pw:520},
    bosses:[
      {name:"Uchikawa",e:"⛵",pw:520,style:"waacking",intro:"長崎の海風を切るWAACKING！"},
      {name:"Kosuke",  e:"🌊",pw:600,style:"contemporary",intro:"港町の詩人。圧倒的なCONTEMPORARY！"},
    ],
    rw:{exp:300,coins:800,title:"長崎ソウルクイーン"},desc:"港町の哀愁を纏うSOUL & WAACKING",food:[
    {n:"新地中華街 角煮まん",p:600,e:12,h:30,desc:"日本三大中華街！とろとろ角煮がたまらない"},
    {n:"四海楼のちゃんぽん",p:1200,e:18,h:45,desc:"ちゃんぽん発祥の店！野菜たっぷり濃厚スープ"},
    {n:"トルコライス",p:900,e:15,h:40,desc:"長崎名物のハイカラ飯。ピラフ＋カツ＋スパゲティ"},
  ]},
  kumamoto:{id:"kumamoto",name:"熊本",x:148,y:330,g:"lock",lv:5,cn:["kagoshima","miyazaki","oita","nagasaki","hakata"],
    ch:{name:"Issei",e:"🏯",pw:540},
    bosses:[
      {name:"Issei",e:"🏯",pw:540,style:"lock",intro:"熊本城の番人！鉄壁のLOCK！"},
    ],
    rw:{exp:290,coins:750,title:"熊本ロックダウン"},desc:"お城の麓で炸裂するLOCK",food:[
    {n:"馬刺し（上赤身）",p:1500,e:20,h:35,desc:"熊本名物！甘口醤油で食べる最高の馬刺し"},
    {n:"太平燕（たいぴーえん）",p:800,e:12,h:35,desc:"熊本だけの春雨鍋料理。ヘルシーで旨い"},
    {n:"辛子蓮根",p:500,e:8,h:20,desc:"熊本の郷土料理。ピリ辛の味噌が蓮根に最高"},
  ]},
  oita:{id:"oita",name:"大分",x:200,y:298,g:"jazz",lv:7,cn:["miyazaki","kumamoto","kokura"],
    ch:{name:"Hirossy",e:"♨",pw:740},
    bosses:[
      {name:"Hirossy",e:"♨",pw:740,style:"jazz",intro:"温泉の湯けむりの中に生きるJAZZの魂！"},
    ],
    rw:{exp:360,coins:900,title:"大分スウィング"},desc:"湯けむりの中に流れるJAZZ",food:[
    {n:"炎の中華",p:1000,e:15,h:35,desc:"大分の名中華料理店。本格的な一皿"},
    {n:"大納言のとり天定食",p:1100,e:18,h:40,desc:"大分名物とり天！サクサクのもも肉天ぷら"},
    {n:"だご汁定食",p:800,e:12,h:35,desc:"大分の郷土料理。平打ち麺が入った味噌汁"},
  ]},
  hakata:{id:"hakata",name:"博多",x:136,y:296,g:"lock",lv:8,cn:["nagasaki","kumamoto","kokura"],
    ch:{name:"Yoshibow",e:"🦝",pw:900},
    bosses:[
      {name:"Yoshibow",e:"🦝",pw:900, style:"lock",  intro:"博多の夜を支配するLOCKの番人！"},
      {name:"SO",      e:"⚡",pw:1000,style:"hiphop", intro:"電光石火のHIPHOPで会場を制圧！"},
    ],
    rw:{exp:400,coins:1100,title:"博多の王者"},desc:"熱い男たちのLOCKが博多の夜を揺らす",food:[
    {n:"水炊き いろは",p:3500,e:25,h:50,desc:"昭和28年創業の名店！コラーゲンたっぷり水炊き"},
    {n:"元祖長浜屋のラーメン",p:700,e:18,h:40,desc:"長浜ラーメン発祥の店。極細麺と豚骨スープ"},
    {n:"博多もつ鍋",p:2000,e:22,h:45,desc:"コラーゲン満点のもつ鍋。〆はちゃんぽん麺"},
  ]},
  kokura:{id:"kokura",name:"小倉",x:166,y:284,g:"house",lv:9,cn:["hakata","oita","hiroshima"],
    ch:{name:"TAKAFUMI",e:"🐉",pw:1100},
    bosses:[
      {name:"TAKAFUMI",e:"🔱",pw:1100,style:"house",  intro:"小倉を制する者が九州を制す！HOUSEの絶対王者！"},
      {name:"RYU",     e:"🐉",pw:1200,style:"breaking",intro:"龍の如く舞う！BREAKINGの伝説！"},
    ],
    rw:{exp:450,coins:1300,title:"小倉HouseChamp"},desc:"鉄の街のHOUSEスタイル",food:[
    {n:"娘娘（にゃんにゃん）肉やきめし",p:800,e:15,h:40,desc:"テレビで話題！豚コマ肉をのせた小倉名物焼き飯"},
    {n:"だるま堂の焼きうどん",p:700,e:12,h:35,desc:"焼きうどん発祥のお店！乾麺ならではの食感"},
    {n:"サバのぬか炊き",p:600,e:10,h:25,desc:"小倉の郷土料理。骨まで柔らか甘辛風味"},
  ]},
  hiroshima:{id:"hiroshima",name:"広島",x:148,y:252,g:"contemporary",lv:11,cn:["kokura","kobe"],
    ch:{name:"TAKA",e:"🕊",pw:1400},
    bosses:[{name:"TAKA",e:"🕊",pw:1400,style:"contemporary",intro:"広島の魂を纏うCONTEMPORARY！瀬戸内の風が吹く！"}],
    rw:{exp:520,coins:1600,title:"広島コンテポラリー"},desc:"平和への祈りを込めたCONTEMPORARY",food:[
    {n:"広島風お好み焼き",p:1000,e:15,h:45,desc:"そば入り！重ねて焼く本場の広島スタイル"},
    {n:"牡蠣フライ定食",p:1200,e:18,h:40,desc:"広島産の新鮮な牡蠣。外カリ中トロ！"},
    {n:"汁なし担々麺",p:900,e:12,h:35,desc:"広島で人気の辛旨まぜそば"},
  ]},
  kobe:{id:"kobe",name:"神戸",x:184,y:226,g:"waacking",lv:12,cn:["hiroshima","osaka"],ch:{name:"港の女王・Yuki",e:"⚓",pw:1600},rw:{exp:580,coins:1800,title:"神戸ディスコクイーン"},desc:"異国情緒の港町のWAACKING",food:[
    {n:"神戸牛ステーキ",p:8000,e:30,h:50,desc:"世界最高の和牛！口の中でとける至極の一枚"},
    {n:"神戸プリン",p:400,e:8,h:20,desc:"港町スイーツの定番。濃厚で上品な甘さ"},
    {n:"ケバブサンド（北野）",p:600,e:10,h:25,desc:"異人館の街・北野の本格トルコケバブ"},
  ]},
  osaka:{id:"osaka",name:"大阪",x:208,y:224,g:"popping",lv:13,cn:["kobe","kyoto"],
    ch:{name:"DAN",e:"🐡",pw:2100},
    bosses:[{name:"DAN",e:"🐡",pw:2100,style:"popping",intro:"難波を震わせるPOPPINGの鬼神！DAN参上！"}],
    rw:{exp:600,coins:2000,title:"大阪の帝王"},desc:"ど派手なPOPPINGが大阪を沸かせる！",food:[
    {n:"象屋（ぞうや）お好み焼き",p:1000,e:15,h:45,desc:"玉出の百名店！厚切り豚が覆うカリふわ焼き"},
    {n:"たこ焼き（道頓堀）",p:400,e:8,h:25,desc:"外カリ中トロ！これが本場の味やで"},
    {n:"串カツ（新世界）",p:700,e:12,h:30,desc:"二度漬け禁止！衣サクサクのソース串カツ"},
  ]},
  kyoto:{id:"kyoto",name:"京都",x:194,y:210,g:"ballet",lv:14,cn:["osaka","nagoya"],ch:{name:"舞妓バレリーナ・Kei",e:"🏮",pw:2400},rw:{exp:650,coins:2200,title:"京都の雅"},desc:"千年の都の和と洋の融合バレエ",food:[
    {n:"湯豆腐（嵯峨野）",p:1500,e:10,h:35,desc:"京都の繊細な豆腐料理。出汁の旨さが染みる"},
    {n:"おばんざい定食",p:1200,e:15,h:40,desc:"京都の家庭料理の真髄。旬の野菜が主役"},
    {n:"鴨川沿いのラーメン",p:900,e:15,h:35,desc:"京都独自のあっさり醤油ラーメン"},
  ]},
  nagoya:{id:"nagoya",name:"名古屋",x:228,y:202,g:"breaking",lv:16,cn:["kyoto","tokyo","yokohama"],ch:{name:"モーニングBreaker・Jun",e:"☕",pw:3200},rw:{exp:720,coins:2600,title:"名古屋城の破壊者"},desc:"味噌の街のBREAKINGパワー",food:[
    {n:"味噌カツ（矢場とん）",p:1500,e:20,h:45,desc:"濃厚八丁味噌ダレのカツ！名古屋の魂"},
    {n:"ひつまぶし",p:3500,e:25,h:45,desc:"鰻の3通りの楽しみ方。名古屋の極上グルメ"},
    {n:"名古屋モーニング",p:400,e:8,h:25,desc:"コーヒー頼んだら全部ついてくる名古屋の文化"},
  ]},
  yokohama:{id:"yokohama",name:"横浜",x:280,y:190,g:"breaking",lv:18,cn:["nagoya","tokyo"],ch:{name:"港ブレイカー・Daisuke",e:"🛳",pw:4200},rw:{exp:800,coins:3000,title:"横浜レジェンド"},desc:"関東最強の横浜ブレイキン",food:[
    {n:"横浜家系ラーメン（壱六家）",p:950,e:20,h:45,desc:"豚骨醤油の最高峰！太麺と濃厚スープ"},
    {n:"崎陽軒のシウマイ",p:500,e:8,h:20,desc:"横浜を代表する名物。冷めても旨いシウマイ"},
    {n:"中華街の北京ダック",p:3000,e:25,h:40,desc:"日本最大の中華街で食べる本格北京ダック"},
  ]},
  tokyo:{id:"tokyo",name:"東京",x:294,y:172,g:"popping",lv:22,cn:["yokohama","sendai"],
    ch:{name:"SAM",e:"🏙",pw:6500},
    bosses:[
      {name:"SAM",   e:"🏙",pw:6500,style:"hiphop",  intro:"東京を制する者が日本を制す！HIPHOPの王！"},
      {name:"SAKUMA",e:"⚡",pw:7200,style:"popping",intro:"POPPINGで東京の夜を爆破する！SAKUMA降臨！"},
    ],
    rw:{exp:1000,coins:5000,title:"東京の覇者"},desc:"全スタイルが集結する日本の聖地",food:[
    {n:"築地の海鮮丼",p:2000,e:25,h:50,desc:"新鮮なネタが輝く！築地場外の本物を食らえ"},
    {n:"もんじゃ焼き（月島）",p:1200,e:12,h:35,desc:"下町の味！おこげが美味しい月島スタイル"},
    {n:"高級寿司（銀座）",p:8000,e:30,h:45,desc:"江戸前の真髄。口に入れた瞬間にとろける"},
  ]},
  sendai:{id:"sendai",name:"仙台",x:290,y:122,g:"lock",lv:26,cn:["tokyo","sapporo"],ch:{name:"七夕LOCKer・Tanaka",e:"🎋",pw:8000},rw:{exp:1100,coins:6000,title:"東北のLOCK王"},desc:"七夕のリズムに乗るLOCK",food:[
    {n:"牛タン焼き定食（喜助）",p:2000,e:22,h:45,desc:"仙台の牛タンは別格！分厚くてジューシー"},
    {n:"ずんだ餅",p:400,e:6,h:20,desc:"枝豆の甘さが絶品！仙台の定番スイーツ"},
    {n:"冷やし中華（発祥の地）",p:800,e:10,h:30,desc:"冷やし中華は仙台発祥！夏の名物"},
  ]},
  sapporo:{id:"sapporo",name:"札幌",x:272,y:50,g:"jazz",lv:30,cn:["sendai"],
    ch:{name:"NAOYA",e:"❄",pw:12000},
    bosses:[
      {name:"NAOYA",e:"❄",pw:12000,style:"jazz",   intro:"北海道の極寒の中に咲くJAZZの魂！"},
      {name:"K-SK", e:"🌨",pw:13500,style:"hiphop",intro:"雪原を駆けるHIPHOPの嵐！K-SK参上！"},
    ],
    rw:{exp:1300,coins:8000,title:"北の王者"},desc:"雪と氷の中に咲くJAZZ",food:[
    {n:"味噌ラーメン（すみれ）",p:1100,e:20,h:45,desc:"北海道味噌！バターコーン入りの濃厚スープ"},
    {n:"ジンギスカン（だるま）",p:2500,e:25,h:50,desc:"北海道の大地の恵み！豪快に焼いて食らえ"},
    {n:"スープカレー（奥芝商店）",p:1400,e:18,h:40,desc:"野菜たっぷりスパイシー！スープカレー発祥の地"},
  ]},
};
const JE=[["sapporo","sendai"],["sendai","tokyo"],["tokyo","yokohama"],["tokyo","nagoya"],["yokohama","nagoya"],["nagoya","kyoto"],["kyoto","osaka"],["osaka","kobe"],["kobe","hiroshima"],["hiroshima","kokura"],["kokura","hakata"],["kokura","oita"],["hakata","nagasaki"],["hakata","kumamoto"],["oita","kumamoto"],["oita","miyazaki"],["kumamoto","nagasaki"],["kumamoto","miyazaki"],["miyazaki","kagoshima"],["kumamoto","kagoshima"]];


/* ── ASIA CITIES DATA ── */
const ASIA={
  seoul:     {id:"seoul",     name:"ソウル",       e:"🇰🇷",g:"popping",   lv:18,
    ch:{name:"K-POPPER",e:"🇰🇷",pw:5000},
    bosses:[
      {name:"K-POPPER",  e:"🇰🇷",pw:5000,style:"popping",intro:"K-POPが世界を変えた！韓国のPOPPINGシーン！"},
      {name:"SEOULWAVE", e:"⚡",pw:5800,style:"hiphop", intro:"ソウルの夜に轟くHIPHOPウェーブ！"},
    ],
    rw:{exp:1200,coins:7000,title:"Seoul Style"},
    desc:"K-POPとストリートダンスが融合した熱狂の都",
    food:[{n:"サムギョプサル",p:1500,e:20,h:45,desc:"焼肉の王道！豚バラ肉がジューシー"},{n:"チキン＆ビール",p:1000,e:12,h:30,desc:"韓国の国民食！チメク文化"}]},
  busan:     {id:"busan",     name:"釜山",         e:"🌊",g:"breaking",  lv:19,
    ch:{name:"BUSAN B-BOY",e:"🌊",pw:5500},
    bosses:[{name:"BUSAN B-BOY",e:"🌊",pw:5500,style:"breaking",intro:"海風が吹く釜山！B-BOYシーンは本物だ！"}],
    rw:{exp:1300,coins:7500,title:"Busan B-Boy"},
    desc:"韓国第2の都市の熱いB-BOYシーン",
    food:[{n:"ミルメク（ラーメン）",p:400,e:8,h:25,desc:"釜山の粉もん文化！ローカルラーメン"},{n:"タコ刺し",p:1200,e:15,h:35,desc:"釜山の新鮮な海の幸"}]},
  beijing:   {id:"beijing",   name:"北京",         e:"🐉",g:"breaking",  lv:20,
    ch:{name:"BEIJING DRAGON",e:"🐉",pw:6000},
    bosses:[{name:"BEIJING DRAGON",e:"🐉",pw:6000,style:"breaking",intro:"中国B-BOYシーンのトップ！龍の如く舞う！"}],
    rw:{exp:1400,coins:8000,title:"Beijing Champion"},
    desc:"中国B-BOYシーンの聖地。歴史と革命の都",
    food:[{n:"北京ダック",p:3000,e:25,h:50,desc:"世界最高峰の鴨料理！皮がパリパリ"},{n:"炸酱面（ジャージャー麺）",p:600,e:12,h:35,desc:"北京の魂のローカル麺"}]},
  shanghai:  {id:"shanghai",  name:"上海",         e:"🌆",g:"hiphop",    lv:21,
    ch:{name:"SHANGHAI BOSS",e:"🌆",pw:6500},
    bosses:[{name:"SHANGHAI BOSS",e:"🌆",pw:6500,style:"hiphop",intro:"上海のクラブシーンを支配する！Asia HipHopの王！"}],
    rw:{exp:1500,coins:9000,title:"Shanghai King"},
    desc:"アジアHipHopの震源地。東洋のパリ",
    food:[{n:"小籠包",p:800,e:15,h:35,desc:"上海名物！スープがじゅわっと溢れる"},{n:"生煎包（焼き小籠包）",p:600,e:12,h:28,desc:"底がカリカリ！上海ソウルフード"}]},
  taipei:    {id:"taipei",    name:"台北",         e:"🌸",g:"popping",   lv:20,
    ch:{name:"TAIPEI ELECTRIC",e:"🌸",pw:5800},
    bosses:[{name:"TAIPEI ELECTRIC",e:"🌸",pw:5800,style:"popping",intro:"台湾のPOPPINGシーンは最高峰！電流が走る！"}],
    rw:{exp:1350,coins:7800,title:"Taipei Popper"},
    desc:"台湾のストリートダンスシーンは世界レベル",
    food:[{n:"鶏排（ジーパイ）",p:300,e:10,h:30,desc:"台湾の巨大フライドチキン！屋台名物"},{n:"タピオカミルクティー",p:200,e:5,h:15,desc:"台湾発祥！世界を席巻したドリンク"}]},
  bangkok:   {id:"bangkok",   name:"バンコク",     e:"🙏",g:"contemporary",lv:19,
    ch:{name:"BANGKOK SOUL",e:"🙏",pw:5200},
    bosses:[{name:"BANGKOK SOUL",e:"🙏",pw:5200,style:"contemporary",intro:"タイの魂を体で表現！CONTEMPORARYの花が咲く！"}],
    rw:{exp:1250,coins:7200,title:"Bangkok Dancer"},
    desc:"タイのダンスシーンは独自の美学を持つ",
    food:[{n:"パッタイ",p:500,e:12,h:32,desc:"タイ炒め麺の王道！甘辛酸っぱい絶品"},{n:"マンゴースティッキーライス",p:400,e:8,h:22,desc:"タイのデザートの王様！甘くて最高"}]},
  manila:    {id:"manila",    name:"マニラ",       e:"💃",g:"waacking",  lv:20,
    ch:{name:"MANILA QUEEN",e:"💃",pw:5800},
    bosses:[{name:"MANILA QUEEN",e:"💃",pw:5800,style:"waacking",intro:"フィリピンのWAACKINGは世界最強！女王降臨！"}],
    rw:{exp:1350,coins:7500,title:"Manila Queen"},
    desc:"フィリピンのWAACKINGシーンは世界が注目",
    food:[{n:"アドボ",p:700,e:15,h:38,desc:"フィリピンのソウルフード！酢醤油煮込み"},{n:"ハロハロ",p:400,e:8,h:20,desc:"フィリピン最強かき氷！具材盛りだくさん"}]},
  singapore: {id:"singapore", name:"シンガポール", e:"🦁",g:"house",     lv:22,
    ch:{name:"LION CITY GROOVER",e:"🦁",pw:7000},
    bosses:[{name:"LION CITY GROOVER",e:"🦁",pw:7000,style:"house",intro:"シンガポールのHOUSEは洗練の極み！"}],
    rw:{exp:1600,coins:10000,title:"Singapore Lion"},
    desc:"アジア最先端のHOUSEシーン。多文化が融合",
    food:[{n:"チキンライス",p:500,e:12,h:32,desc:"シンガポール国民食！シンプルで最高"},{n:"チリクラブ",p:3000,e:22,h:45,desc:"シンガポール名物！スパイシーシーフード"}]},
  jakarta:   {id:"jakarta",   name:"ジャカルタ",   e:"🌴",g:"breaking",  lv:19,
    ch:{name:"JAKARTA CREW",e:"🌴",pw:5300},
    bosses:[{name:"JAKARTA CREW",e:"🌴",pw:5300,style:"breaking",intro:"インドネシアB-BOYシーン！熱帯の闘志で来い！"}],
    rw:{exp:1280,coins:7300,title:"Jakarta B-Boy"},
    desc:"インドネシアのB-BOYシーンは急成長中",
    food:[{n:"ナシゴレン",p:500,e:12,h:32,desc:"インドネシアの炒飯！スパイシーで旨い"},{n:"バクソ（ミートボールスープ）",p:400,e:10,h:28,desc:"ジャカルタの屋台名物スープ"}]},
};

const ASIA_W=42,ASIA_H=65;
const ASIA_WALK_CITIES=[
  {id:"seoul",     x:36,y:8,  name:"ソウル",       e:"🇰🇷",g:"popping"},
  {id:"busan",     x:36,y:14, name:"釜山",         e:"🌊",g:"breaking"},
  {id:"beijing",   x:22,y:10, name:"北京",         e:"🐉",g:"breaking"},
  {id:"shanghai",  x:26,y:20, name:"上海",         e:"🌆",g:"hiphop"},
  {id:"taipei",    x:28,y:28, name:"台北",         e:"🌸",g:"popping"},
  {id:"manila",    x:33,y:38, name:"マニラ",       e:"💃",g:"waacking"},
  {id:"bangkok",   x:20,y:40, name:"バンコク",     e:"🙏",g:"contemporary"},
  {id:"singapore", x:22,y:50, name:"シンガポール", e:"🦁",g:"house"},
  {id:"jakarta",   x:20,y:56, name:"ジャカルタ",   e:"🌴",g:"breaking"},
];

function buildASIAMap(){
  const G=Array.from({length:ASIA_H},()=>new Array(ASIA_W).fill('~'));
  const s=(x,y,t)=>{if(y>=0&&y<ASIA_H&&x>=0&&x<ASIA_W)G[y][x]=t;};
  const rect=(x1,y1,x2,y2,t)=>{for(let y=Math.min(y1,y2);y<=Math.max(y1,y2);y++)for(let x=Math.min(x1,x2);x<=Math.max(x1,x2);x++)s(x,y,t);};
  const road=(x1,y1,x2,y2)=>{let x=x1,y=y1;while(y!==y2){s(x,y,'.');y+=(y<y2?1:-1);}while(x!==x2){s(x,y,'.');x+=(x<x2?1:-1);}s(x2,y2,'.');};
  // 中国大陸
  rect(4,5,32,35,'f');rect(6,7,30,33,'.');
  // 朝鮮半島
  rect(33,5,40,18,'f');rect(34,6,39,17,'.');
  // 台湾（島）
  rect(26,25,30,32,'f');rect(27,26,29,31,'.');
  // フィリピン諸島
  rect(31,35,38,44,'f');rect(32,36,37,43,'.');
  // 東南アジア半島
  rect(14,35,26,58,'f');rect(15,37,25,57,'.');
  // インドネシア
  rect(16,52,26,60,'f');rect(17,53,25,59,'.');
  // シンガポール（マレーシア南端）
  rect(20,48,24,54,'f');rect(21,49,23,53,'.');
  // 各都市間の道
  for(let i=0;i<ASIA_WALK_CITIES.length-1;i++){
    const a=ASIA_WALK_CITIES[i],b=ASIA_WALK_CITIES[i+1];
    road(a.x,a.y,b.x,b.y);
  }
  road(26,20,22,10);// 上海→北京
  road(36,14,26,20);// 釜山→上海（海路イメージ）
  ASIA_WALK_CITIES.forEach(c=>s(c.x,c.y,'@'));
  return G;
}
const ASIA_MAP=buildASIAMap();

/* ── USA CITIES DATA ── */
const USA={
  harlem:     {id:"harlem",    name:"ハーレム",       e:"🎷",g:"jazz",     lv:25,
    ch:{name:"HARLEM KING",e:"🎷",pw:8000},
    bosses:[{name:"HARLEM KING",e:"🎷",pw:8000,style:"jazz",intro:"ハーレムに響くJAZZの魂！1920年代から続く伝説！"}],
    rw:{exp:1800,coins:12000,title:"Harlem Renaissance"},
    desc:"JAZZ DANCEの魂の故郷。Renaissance の聖地",
    food:[{n:"ソウルフード",p:1000,e:18,h:40,desc:"コラードグリーン＆フライドチキン"},{n:"スイートポテトパイ",p:600,e:10,h:25,desc:"ハーレムのおばあちゃんの味"}]},
  bronx:      {id:"bronx",     name:"ブロンクス",     e:"🏙",g:"breaking", lv:27,
    ch:{name:"BBOY BRONX",e:"🏙",pw:9500},
    bosses:[
      {name:"BBOY BRONX",   e:"🏙",pw:9500, style:"breaking",intro:"Breaking発祥の地！1970年代の路上が俺の故郷！"},
      {name:"ZULU KING",    e:"⚡",pw:10500,style:"hiphop",  intro:"Afrika Bambaataa の魂を継ぐ者！"},
    ],
    rw:{exp:2200,coins:18000,title:"Bronx B-Boy Legend"},
    desc:"Breaking発祥の地。HipHop4大要素が生まれた聖地",
    food:[{n:"グランドコンコース・ピザ",p:500,e:12,h:30,desc:"ブロンクス定番のNYスタイルピザ"},{n:"プエルトリコ料理",p:800,e:15,h:35,desc:"ブロンクスの多文化が生んだ味"}]},
  brooklyn:   {id:"brooklyn",  name:"ブルックリン",   e:"🌉",g:"hiphop",   lv:26,
    ch:{name:"BK FINEST",e:"🌉",pw:9000},
    bosses:[
      {name:"BK FINEST",   e:"🌉",pw:9000, style:"hiphop",intro:"Brooklyn in the house！BKスタイルで来い！"},
      {name:"HOUSE QUEEN", e:"🕺",pw:9800, style:"house", intro:"BKのHOUSEシーンを牛耳る女王！"},
    ],
    rw:{exp:2000,coins:15000,title:"Brooklyn Legend"},
    desc:"HipHopとHouseが交差するストリートの聖地",
    food:[{n:"Junior's チーズケーキ",p:1200,e:15,h:30,desc:"ブルックリン名物！絶品チーズケーキ"},{n:"ブルックリンスタイルピザ",p:700,e:12,h:28,desc:"薄くてパリッとしたNYピザの原点"}]},
  atlanta:    {id:"atlanta",   name:"アトランタ",     e:"🍑",g:"hiphop",   lv:24,
    ch:{name:"ATL OG",e:"🍑",pw:7500},
    bosses:[{name:"ATL OG",e:"🍑",pw:7500,style:"hiphop",intro:"Dirty South！アトランタがHipHopを変えた！"}],
    rw:{exp:1700,coins:11000,title:"ATL Legend"},
    desc:"Dirty South HipHopの震源地。Trap発祥の地",
    food:[{n:"フライドチキン＆ワッフル",p:1100,e:20,h:45,desc:"アトランタ名物の最強コンビ"},{n:"ピーチコブラー",p:600,e:10,h:25,desc:"ジョージアの桃を使った極上デザート"}]},
  newolreans: {id:"newolreans",name:"ニューオーリンズ",e:"🎷",g:"jazz",     lv:23,
    ch:{name:"JAZZ SAINT",e:"🎷",pw:7000},
    bosses:[{name:"JAZZ SAINT",e:"🎷",pw:7000,style:"jazz",intro:"マルディグラの夜に踊る！JAZZ発祥の地の魂！"}],
    rw:{exp:1600,coins:10000,title:"New Orleans Jazz King"},
    desc:"Jazz発祥の港町。Second Lineの聖地",
    food:[{n:"ガンボ",p:1200,e:20,h:42,desc:"ニューオーリンズ名物！シーフードたっぷりシチュー"},{n:"ベニエ",p:400,e:8,h:20,desc:"揚げドーナツに粉砂糖！カフェ・デュ・モンド"}]},
  fresno:     {id:"fresno",    name:"フレズノ",       e:"⚡",g:"popping",  lv:22,
    ch:{name:"ELECTRIC SAM",e:"⚡",pw:6500},
    bosses:[{name:"ELECTRIC SAM",e:"⚡",pw:6500,style:"popping",intro:"POPPING発祥の地フレズノ！Electric Boogaloos の魂！"}],
    rw:{exp:1500,coins:9000,title:"Fresno Popping OG"},
    desc:"POPPINGとElectric Boogaloosが生まれた地",
    food:[{n:"フレズノ・バーベキュー",p:1000,e:18,h:40,desc:"カリフォルニア農業地帯の旨いBBQ"},{n:"タコス",p:500,e:10,h:25,desc:"本格メキシカンタコス。LAより安くて旨い"}]},
  compton:    {id:"compton",   name:"コンプトン",     e:"🎤",g:"hiphop",   lv:23,
    ch:{name:"WEST COAST G",e:"🎤",pw:7000},
    bosses:[{name:"WEST COAST G",e:"🎤",pw:7000,style:"hiphop",intro:"West Side！ギャングスタラップの聖地コンプトン！"}],
    rw:{exp:1600,coins:10000,title:"West Coast Legend"},
    desc:"West Coast HipHopの聖地。N.W.Aの故郷",
    food:[{n:"フライドチキン",p:800,e:15,h:38,desc:"コンプトンのローカル名物チキン"},{n:"クールエイド",p:200,e:5,h:15,desc:"ストリートの定番ドリンク。甘くて冷たい"}]},
  hollywood:  {id:"hollywood", name:"ハリウッド",     e:"🎬",g:"jazz",     lv:21,
    ch:{name:"STAGE STAR",e:"🎬",pw:6000},
    bosses:[{name:"STAGE STAR",e:"🎬",pw:6000,style:"jazz",intro:"ハリウッドのステージを支配するJAZZの女王！"}],
    rw:{exp:1400,coins:8000,title:"Hollywood Star"},
    desc:"エンタメとJAZZ DANCEが輝く夢の街",
    food:[{n:"In-N-Out バーガー",p:800,e:15,h:35,desc:"カリフォルニア名物！ダブルダブルマストライ！"},{n:"アサイーボウル",p:1000,e:12,h:25,desc:"LAヘルシー飯の定番。映えも最高"}]},
};

/* ── USA WALK MAP ── */
const USA_W=42,USA_H=62;
const USA_WALK_CITIES=[
  {id:"harlem",   x:38,y:10,name:"ハーレム",    e:"🎷",g:"jazz"},
  {id:"bronx",    x:39,y:13,name:"ブロンクス",  e:"🏙",g:"breaking"},
  {id:"brooklyn", x:38,y:17,name:"ブルックリン",e:"🌉",g:"hiphop"},
  {id:"atlanta",  x:30,y:35,name:"アトランタ",  e:"🍑",g:"hiphop"},
  {id:"newolreans",x:24,y:46,name:"ニューオーリンズ",e:"🎷",g:"jazz"},
  {id:"fresno",   x:5, y:20,name:"フレズノ",    e:"⚡",g:"popping"},
  {id:"compton",  x:5, y:30,name:"コンプトン",  e:"🎤",g:"hiphop"},
  {id:"hollywood",x:6, y:38,name:"ハリウッド",  e:"🎬",g:"jazz"},
];

function buildUSAMap(){
  const G=Array.from({length:USA_H},()=>new Array(USA_W).fill('~'));
  const s=(x,y,t)=>{if(y>=0&&y<USA_H&&x>=0&&x<USA_W)G[y][x]=t;};
  const rect=(x1,y1,x2,y2,t)=>{for(let y=Math.min(y1,y2);y<=Math.max(y1,y2);y++)for(let x=Math.min(x1,x2);x<=Math.max(x1,x2);x++)s(x,y,t);};
  const road=(x1,y1,x2,y2)=>{let x=x1,y=y1;while(y!==y2){s(x,y,'.');y+=(y<y2?1:-1);}while(x!==x2){s(x,y,'.');x+=(x<x2?1:-1);}s(x2,y2,'.');};

  // 西海岸（California）
  rect(2,10,12,52,'f');rect(3,12,10,50,'.');
  // ロッキー山脈（通行不可）
  rect(13,10,18,50,'^');
  // 中央平原〜南部
  rect(19,28,35,52,'f');rect(20,30,33,50,'.');
  // 東海岸（NY〜南部）
  rect(34,5,41,42,'f');rect(35,7,40,40,'.');
  // 北部接続
  rect(19,10,34,14,'f');rect(20,11,33,13,'.');
  // 西〜東の接続ルート（南部経由）
  road(10,50,24,46);road(24,46,30,35);road(30,35,35,35);
  // 西海岸〜ロッキー越え（北ルート）
  road(10,12,19,12);road(19,12,34,12);road(34,12,38,10);

  // 各都市間
  for(let i=0;i<USA_WALK_CITIES.length-1;i++){
    const a=USA_WALK_CITIES[i],b=USA_WALK_CITIES[i+1];
    road(a.x,a.y,b.x,b.y);
  }
  USA_WALK_CITIES.forEach(c=>s(c.x,c.y,'@'));
  return G;
}
const USA_MAP=buildUSAMap();

/* ── WORLD MAP (拡張版 13都市) ── */
// viewBox 0 0 380 230
const W={
  norway:   {id:"norway",   name:"NORWAY",   x:100,y:38, g:"contemporary",lv:38,cn:["germany","london"],ch:{name:"Northern Lights Dancer",e:"🌌",pw:8500}, rw:{exp:2200,coins:35000,title:"Norway Aurora"},desc:"オーロラの光の中のCONTEMPORARY",food:[{n:"サーモン料理",p:1200,e:20,h:40,desc:"ノルウェーサーモンは格別"}]},
  germany:  {id:"germany",  name:"GERMANY",  x:118,y:62, g:"house",       lv:39,cn:["norway","london","paris"],ch:{name:"Techno King Klaus",e:"🎛",pw:9000}, rw:{exp:2400,coins:38000,title:"Berlin House God"},desc:"ベルリンから生まれたTECHNO HOUSEの聖地",food:[{n:"ソーセージ盛り合わせ",p:800,e:15,h:40,desc:"本場ドイツの絶品ソーセージ"}]},
  london:   {id:"london",   name:"LONDON",   x:90,y:72,  g:"breaking",    lv:40,cn:["germany","paris","wf"],ch:{name:"GRIME King Akira",e:"🏰",pw:9500},  rw:{exp:2500,coins:40000,title:"London Legend"},desc:"UKグライムとBREAKING最強スタイル",food:[{n:"Fish & Chips",p:600,e:12,h:35,desc:"英国の魂のフード"}]},
  paris:    {id:"paris",    name:"PARIS",    x:118,y:98, g:"ballet",      lv:40,cn:["germany","london","wf"],ch:{name:"Ballet Dieu Celestine",e:"🗼",pw:9800},rw:{exp:2600,coins:42000,title:"Paris Royale"},desc:"バレエの本場パリ。技術の極致へ",food:[{n:"クロワッサン",p:400,e:8,h:20,desc:"パリジャンの朝の定番"},{n:"ブーフ・ブルギニョン",p:1500,e:22,h:45,desc:"フレンチの真髄"}]},
  russia:   {id:"russia",   name:"RUSSIA",   x:175,y:42, g:"breaking",    lv:41,cn:["germany","china","wf"],ch:{name:"Red Square Breaker",e:"❄️",pw:10000},rw:{exp:2700,coins:44000,title:"Russia Champion"},desc:"赤の広場で舞う究極のBREAKING",food:[{n:"ボルシチ",p:600,e:12,h:35,desc:"ビーツの赤が鮮やかなスープ"}]},
  china:    {id:"china",    name:"CHINA",    x:262,y:78, g:"popping",     lv:41,cn:["russia","taiwan","seoul","wf"],ch:{name:"Shanghai Popper Long",e:"🐉",pw:10500},rw:{exp:2800,coins:46000,title:"China Dragon"},desc:"上海ストリートのPOPPINGは最速！",food:[{n:"小籠包",p:500,e:10,h:30,desc:"ジューシーな上海の味"},{n:"北京ダック",p:2000,e:25,h:45,desc:"皇帝の料理"}]},
  taiwan:   {id:"taiwan",   name:"TAIWAN",   x:282,y:100,g:"contemporary",lv:41,cn:["china","wf"],ch:{name:"Night Market Dancer",e:"🏮",pw:10200},rw:{exp:2700,coins:44000,title:"Taiwan Star"},desc:"夜市から生まれるCONTEMPORARY",food:[{n:"牛肉麺",p:500,e:10,h:35,desc:"台湾最高の麺料理"},{n:"臭豆腐",p:200,e:5,h:20,desc:"チャレンジ！独特の香り"}]},
  seoul:    {id:"seoul",    name:"SEOUL",    x:288,y:60, g:"popping",     lv:42,cn:["china","wf"],ch:{name:"K-POP GOD Hyun",e:"🇰🇷",pw:11000},rw:{exp:2800,coins:48000,title:"Seoul Champion"},desc:"K-POPとPOPPING世界最速スタイル",food:[{n:"サムギョプサル",p:1000,e:18,h:40,desc:"豚バラ肉を自分で焼く！"},{n:"ビビンバ",p:700,e:12,h:35,desc:"カラフルで栄養満点"}]},
  india:    {id:"india",    name:"INDIA",    x:228,y:120,g:"contemporary",lv:41,cn:["russia","wf"],ch:{name:"Bollywood King Arjun",e:"🎬",pw:10000},rw:{exp:2700,coins:44000,title:"India Bollywood King"},desc:"ボリウッドとCONTEMPORARYの融合",food:[{n:"ビリヤニ",p:800,e:15,h:40,desc:"スパイスの王様！"},{n:"マサラチャイ",p:200,e:5,h:10,desc:"インドのスパイスティー"}]},
  s_africa: {id:"s_africa", name:"S.AFRICA", x:155,y:182,g:"waacking",    lv:43,cn:["wf"],ch:{name:"Ubuntu Waacker Zola",e:"🌍",pw:11500},rw:{exp:2900,coins:50000,title:"Africa Champion"},desc:"アフリカのリズムとWAACKINGの融合",food:[{n:"ブレイ（BBQ）",p:1000,e:18,h:40,desc:"南アフリカのBBQ文化"}]},
  australia:{id:"australia",name:"AUSTRALIA",x:290,y:182,g:"breaking",    lv:43,cn:["wf"],ch:{name:"Outback Breaker Jake",e:"🦘",pw:11500},rw:{exp:2900,coins:50000,title:"Australia Champion"},desc:"アウトバックから生まれる野生のBREAKING",food:[{n:"バーミーチェス",p:800,e:15,h:35,desc:"オーストラリアの家庭料理"}]},
  rio:      {id:"rio",      name:"RIO",      x:200,y:195,g:"waacking",    lv:42,cn:["wf"],ch:{name:"Carnival Queen Isabela",e:"🌺",pw:11000},rw:{exp:2700,coins:45000,title:"Rio Carnival Queen"},desc:"カーニバルのWAACKING覇者",food:[{n:"シュラスコ",p:1500,e:22,h:45,desc:"本場のブラジルBBQ！"},{n:"アサイーボウル",p:600,e:10,h:25,desc:"エネルギー補給に最適"}]},
  wf:       {id:"wf",       name:"WORLD FINAL",x:192,y:128,g:"contemporary",lv:47,cn:["london","paris","russia","china","seoul","s_africa","australia","rio"],ch:{name:"WORLD GOD INFINITY",e:"🌍",pw:20000},rw:{exp:5000,coins:200000,title:"🏆 WORLD CHAMPION"},desc:"最終決戦！優勝賞金¥200,000！",food:[{n:"ワールドビュッフェ",p:2000,e:30,h:50,desc:"世界中の料理が一堂に！"}]},
};
const WE=[["norway","germany"],["norway","london"],["germany","london"],["germany","paris"],["london","paris"],["london","wf"],["paris","wf"],["russia","germany"],["russia","china"],["russia","wf"],["china","taiwan"],["china","seoul"],["china","wf"],["taiwan","wf"],["seoul","wf"],["india","wf"],["s_africa","wf"],["australia","wf"],["rio","wf"]];

/* ── SPACE MAP ── */
const SP={
  moon:  {id:"moon",  name:"MOON BASE",   x:90,  y:80, g:"contemporary",lv:58,cn:["iss"],    ch:{name:"月面ダンサー・Luna",   e:"🌕",pw:30000},rw:{exp:8000, coins:120000,title:"Moon Dancer"},   desc:"無重力の月面で魂のCONTEMPORARY",food:[{n:"宇宙食セット",p:500,e:12,h:30,desc:"NASA認定の宇宙食！"}]},
  iss:   {id:"iss",   name:"ISS STATION", x:190, y:50, g:"jazz",        lv:60,cn:["moon","mars"],ch:{name:"宇宙ステーションのMichi",e:"🛸",pw:40000},rw:{exp:10000,coins:160000,title:"ISS Performer"}, desc:"国際宇宙ステーションでのJAZZ公演",food:[{n:"フリーズドライカレー",p:800,e:15,h:35,desc:"宇宙で食べるカレー！"}]},
  mars:  {id:"mars",  name:"MARS COLONY", x:290, y:80, g:"breaking",    lv:62,cn:["iss"],     ch:{name:"火星の征服者・Ares",    e:"🔴",pw:55000},rw:{exp:15000,coins:250000,title:"Mars Conqueror"}, desc:"赤い惑星で重力に逆らうBREAKING",food:[{n:"火星スムージー",p:1000,e:20,h:40,desc:"火星産の謎の果物！"}]},
  galaxy:{id:"galaxy",name:"GALAXY FINAL",x:190, y:135,g:"jazz",        lv:70,cn:["moon","iss","mars"],ch:{name:"銀河の支配者・COSMOS",e:"✨",pw:100000},rw:{exp:30000,coins:1000000,title:"🌌 GALAXY CHAMPION"},desc:"銀河系の頂点！優勝賞金¥1,000,000！",food:[{n:"銀河食",p:5000,e:50,h:50,desc:"宇宙の神秘的な食事"}]},
};
const SPE=[["moon","iss"],["iss","mars"],["moon","galaxy"],["iss","galaxy"],["mars","galaxy"]];

/* ── HOMETOWNS ── */
const HT=[
  {id:"kagoshima",label:"鹿児島",region:"九州",bonus:"house",e:"🌋",desc:"HOUSEのメッカ"},
  {id:"hakata",label:"福岡・博多",region:"九州",bonus:"lock",e:"🍜",desc:"LOCKの熱い街"},
  {id:"nagasaki",label:"長崎",region:"九州",bonus:"waacking",e:"⛵",desc:"SOULの港町"},
  {id:"osaka",label:"大阪",region:"関西",bonus:"popping",e:"🐡",desc:"POPPINGの都"},
  {id:"tokyo",label:"東京",region:"関東",bonus:null,e:"🏙",desc:"全ジャンルの聖地"},
  {id:"sapporo",label:"札幌",region:"北海道",bonus:"jazz",e:"❄",desc:"雪のJAZZ"},
  {id:"ny",label:"NEW YORK",region:"USA",bonus:"breaking",e:"🗽",desc:"BREAKING発祥地"},
  {id:"la",label:"LOS ANGELES",region:"USA",bonus:"popping",e:"🎬",desc:"POPPINGの聖地"},
];

/* ── HELPERS ── */
const xpL=lv=>{
  if(lv<=1)return 0;
  if(lv<=99)return Math.floor(Math.pow(lv-1,1.75)*130);
  return xpL(99)+Math.floor((lv-99)*8000*Math.pow(lv-98,1.2)); // 99以降はめちゃ重い
};
function getLv(xp){let lv=1;while(xpL(lv+1)<=xp)lv++;return lv;}
function getMaxEnergy(lv){if(lv>=150)return 90;if(lv>=99)return 70;return 50;}
function getRocketParts(char){
  const bd=char.bossDefeats||{};
  const si=char.specialItems||[];
  const cleared=char.clearedCities||{};
  return{
    engine: !!(bd["SAM"]||bd["SAKUMA"]||cleared["tokyo"]),    // 東京BOSS撃破
    fuel:   !!(bd["NAOYA"]||bd["K-SK"]||cleared["sapporo"]),  // 札幌BOSS撃破
    shield: si.includes("michael_glove")&&si.includes("michael_hat")&&si.includes("michael_loafer"),
    nav:    getLv(char.exp||0)>=50,                            // Lv.50以上で入手
  };
}
function hasSpaceship(char){const p=getRocketParts(char);return p.engine&&p.fuel&&p.shield&&p.nav;}
function getLvCapped(xp,artifacts){return Math.min(getLv(xp),getMaxLv(artifacts||[]));}

function calcPow(s){return Object.values(s).reduce((a,b)=>a+b,0)*3;}
function rnkOf(lv){let r=RANKS[0];RANKS.forEach(k=>{if(lv>=k.lv)r=k;});return r;}
function faceOf(mood,energy){if(energy<10)return"dizzy";if(mood>75)return"happy";if(mood>45)return"ok";if(mood>20)return"sad";return"cry";}
const fc=n=>"¥"+n.toLocaleString();
function allC(){return{...J,...W,...SP};}
function regC(r){return r==="japan"?J:r==="usa"?W:r==="world"?W:r==="space"?SP:W;}
function regE(r){return r==="japan"?JE:r==="space"?SPE:WE;}
function eqBonus(eq){
  const b={};
  const add=o=>Object.entries(o||{}).forEach(([k,v])=>{b[k]=(b[k]||0)+v;});
  if(eq?.costume){const c=SHOP.costumes.find(x=>x.id===eq.costume);if(c)add(c.b);}
  if(eq?.sneakers){const s=SHOP.sneakers.find(x=>x.id===eq.sneakers);if(s)add(s.b);}
  (eq?.accessories||[]).forEach(id=>{const a=SHOP.accessories.find(x=>x.id===id);if(a)add(a.b);});
  return b;
}
function togAcc(id,accs){
  const acc=SHOP.accessories.find(a=>a.id===id);if(!acc)return accs;
  if(accs.includes(id))return accs.filter(a=>a!==id);
  return[...accs.filter(a=>AG[a]!==acc.slot),id];
}
function canVisit(id,char,region){
  const all=allC();const city=all[id];if(!city)return false;
  const lv=getLv(char.exp);if(lv<city.lv)return false;
  const cl=char.clearedCities||{};
  if(cl[id])return true;
  if(region==="world"&&!cl["tokyo"]&&!W[char.hometown])return false;
  if(region==="space"){if(!cl["wf"])return false;if(["moon","iss","mars"].includes(id))return true;}
  if(region==="japan"&&!J[char.hometown]&&id==="kagoshima")return true;
  return city.cn.some(a=>cl[a]);
}
function pick(arr){return arr[Math.floor(Math.random()*arr.length)];}

/* ── SOUND SYSTEM ── */
const KYUSHU_IDS=['kagoshima','miyazaki','nagasaki','kumamoto','oita','hakata','kokura'];
const HONSHU_IDS=['hiroshima','kobe','osaka','kyoto','nagoya','yokohama','tokyo','sendai','sapporo'];
const USA_IDS=['ny','la','chicago','atl','miami','seattle'];

function getCityBGM(cityId){
  if(!cityId)return'kyushu';
  if(SP[cityId])return'space';
  if(USA_IDS.includes(cityId))return'usa';
  if(Object.keys(W).includes(cityId))return'world';
  if(HONSHU_IDS.includes(cityId))return'honshu';
  return'kyushu';
}

const Sound={
  ctx:null, master:null, loopId:null, muted:false,

  init(){
    if(this.ctx)return;
    try{
      this.ctx=new(window.AudioContext||window.webkitAudioContext)();
      this.master=this.ctx.createGain();
      this.master.gain.value=0.2;
      this.master.connect(this.ctx.destination);
    }catch(e){}
  },

  tone(freq,start,dur,vol=0.2,type='square'){
    if(!this.ctx||this.muted)return;
    try{
      const o=this.ctx.createOscillator();
      const g=this.ctx.createGain();
      o.type=type;o.frequency.value=freq;
      g.gain.setValueAtTime(0.001,this.ctx.currentTime+start);
      g.gain.linearRampToValueAtTime(vol,this.ctx.currentTime+start+0.02);
      g.gain.exponentialRampToValueAtTime(0.001,this.ctx.currentTime+start+dur);
      o.connect(g);g.connect(this.master);
      o.start(this.ctx.currentTime+start);
      o.stop(this.ctx.currentTime+start+dur+0.05);
    }catch(e){}
  },

  stop(){if(this.loopId){clearInterval(this.loopId);this.loopId=null;}},

  // 九州：ファンキー・ソウル
  kyushu(){
    this.stop();this.init();
    const play=()=>{
      if(this.muted)return;
      [[98,0],[98,.2],[110,.4],[98,.6],[87.3,.8],[98,1.0],[110,1.2],[87.3,1.4]].forEach(([f,t])=>this.tone(f,t,.18,.16,'sawtooth'));
      [[330,0],[370,.3],[330,.6],[294,.9],[330,1.2],[370,1.5],[392,1.8],[330,2.1]].forEach(([f,t])=>this.tone(f,t,.22,.1,'triangle'));
      [.5,1.5].forEach(t=>{this.tone(1800,t,.04,.1,'square');this.tone(2200,t+.02,.04,.06,'square');});
      [0,.5,1.0,1.5].forEach(t=>this.tone(70,t,.1,.2,'sine'));
    };
    play();this.loopId=setInterval(play,2400);
  },

  // 本州：J-POP冒険
  honshu(){
    this.stop();this.init();
    const play=()=>{
      if(this.muted)return;
      [[392,0],[440,.3],[494,.6],[523,.9],[587,1.2],[523,1.5],[494,1.8],[440,2.1]].forEach(([f,t])=>{
        this.tone(f,t,.25,.1,'triangle');
        this.tone(f*.5,t,.2,.05,'sine');
      });
      [[196,0,.55],[220,.6,.55],[247,1.2,.55],[196,1.8,.55]].forEach(([f,t,d])=>this.tone(f,t,d,.1,'sine'));
      [0,.6,1.2,1.8].forEach(t=>{this.tone(80,t,.12,.22,'sine');this.tone(50,t,.18,.15,'sine');});
      [.3,.9,1.5,2.1].forEach(t=>this.tone(2500,t,.05,.08,'square'));
    };
    play();this.loopId=setInterval(play,2500);
  },

  // USA：ヒップホップ
  usa(){
    this.stop();this.init();
    const play=()=>{
      if(this.muted)return;
      [0,.5,1.0,1.5].forEach(t=>{this.tone(55,t,.22,.38,'sine');this.tone(40,t,.32,.22,'sine');});
      [.5,1.5].forEach(t=>{this.tone(2800,t,.06,.15,'square');this.tone(3200,t+.01,.05,.1,'square');});
      Array.from({length:8}).forEach((_,i)=>this.tone(7000+Math.random()*1500,i*.25,.04,.06,'square'));
      [55,55,65.4,55,55,49,55,65.4].forEach((f,i)=>this.tone(f,i*.25,.2,.18,'square'));
    };
    play();this.loopId=setInterval(play,2000);
  },

  // WORLD：グローバルエレクトロ
  world(){
    this.stop();this.init();
    const play=()=>{
      if(this.muted)return;
      [0,.5,1.0,1.5].forEach(t=>this.tone(58,t,.18,.3,'sine'));
      [.25,.75,1.25,1.75].forEach(t=>this.tone(4000,t,.05,.08,'square'));
      [[293.7,0],[329.6,.3],[369.9,.6],[392,.9],[440,1.2],[392,1.5],[369.9,1.8],[329.6,2.1]].forEach(([f,t])=>this.tone(f,t,.24,.11,'square'));
      [[73.4,0,.45],[82.4,.5,.45],[73.4,1.0,.45],[65.4,1.5,.45]].forEach(([f,t,d])=>this.tone(f,t,d,.14,'sine'));
    };
    play();this.loopId=setInterval(play,2300);
  },

  // SPACE：コズミックアンビエント
  space(){
    this.stop();this.init();
    const play=()=>{
      if(this.muted)return;
      [[130.8,0],[164.8,.6],[196,1.2],[261.6,1.8]].forEach(([f,t])=>{
        this.tone(f,t,.8,.06,'sine');
        this.tone(f*2,t+.15,.6,.03,'triangle');
        this.tone(f*3,t+.3,.4,.02,'sine');
      });
      [[880,.2],[1047,.8],[784,1.4],[1175,2.0]].forEach(([f,t])=>this.tone(f,t,.12,.05,'sine'));
    };
    play();this.loopId=setInterval(play,2900);
  },

  // バトル：クラブエレクトロ（地域問わず）
  battle(){
    this.stop();this.init();
    const play=()=>{
      if(this.muted)return;
      [0,.5,1.0,1.5].forEach(t=>{this.tone(60,t,.18,.35,'sine');this.tone(40,t,.25,.2,'sine');});
      [0,.25,.5,.75,1.0,1.25,1.5,1.75].forEach(t=>this.tone(6000+Math.random()*2000,t,.04,.05,'square'));
      [110,110,130.8,110,98,110,110,123.5].forEach((f,i)=>this.tone(f,i*.25,.22,.18,'sawtooth'));
      [440,494,440,392,440,523,494,440].forEach((f,i)=>this.tone(f,i*.25,.18,.1,'square'));
    };
    play();this.loopId=setInterval(play,2000);
  },

  // 勝利ファンファーレ（ドラクエ風）
  fanfare(){
    this.stop();this.init();
    if(this.muted)return;
    [[523,.0,.14],[523,.15,.14],[523,.3,.14],[415,.45,.1],[523,.56,.14],[622,.72,.14],[784,.88,.5]].forEach(([f,t,d])=>{
      this.tone(f,t,d,.28,'square');this.tone(f*1.5,t,d,.08,'triangle');
    });
  },

  // 都市クリア
  clear(){
    this.stop();this.init();
    if(this.muted)return;
    [[784,0,.1],[880,.13,.1],[988,.26,.1],[1047,.4,.35]].forEach(([f,t,d])=>{
      this.tone(f,t,d,.2,'square');this.tone(f*.5,t,d,.1,'sine');
    });
  },

  // 敗北
  lose(){
    this.stop();this.init();
    if(this.muted)return;
    [[392,0,.22],[349.2,.24,.22],[311.1,.48,.45]].forEach(([f,t,d])=>this.tone(f,t,d,.2,'square'));
  },

  toggle(){
    this.muted=!this.muted;
    if(this.master)this.master.gain.value=this.muted?0:.2;
    return this.muted;
  },

  // エリアに合ったBGMを再生
  playRegion(cityId){
    const region=getCityBGM(cityId);
    this[region]();
  }
};


function DancerSVG({genre:gn,mood,energy,equipped,size=120}){
  const g=GENRES[gn]||GENRES.house;
  const fs=faceOf(mood,energy);
  const cos=equipped?.costume?SHOP.costumes.find(c=>c.id===equipped.costume):null;
  const sne=equipped?.sneakers?SHOP.sneakers.find(s=>s.id===equipped.sneakers):null;
  const accs=equipped?.accessories||[];
  const cid=cos?.id||"street";
  const bc=cos?cos.col:g.c+"66";const gc=g.c;
  const sc=sne?.col||"#ccc";const sl=sne?.sol||"#aaa";
  const skin="#ffdbbd";const isHip=cid==="hip";
  const AL={ballet:"-60",contemporary:"-50",waacking:"-80",lock:"10",house:"-20",popping:"-10",breaking:"-5",jazz:"-30"};
  const AR={ballet:"60",contemporary:"50",waacking:"80",lock:"-10",house:"20",popping:"10",breaking:"5",jazz:"30"};
  const al=AL[gn]||"-20",ar=AR[gn]||"20";
  return(
    <svg viewBox="0 0 100 158" width={size} height={Math.round(size*1.58)} style={{display:"block",overflow:"visible"}}>
      <ellipse cx="50" cy="155" rx="22" ry="5" fill="rgba(0,0,0,.3)"/>
      {sne?.id==="timb"?<g><rect x="20" y="128" width="28" height="22" rx="5" fill={sc}/><rect x="52" y="128" width="28" height="22" rx="5" fill={sc}/><rect x="19" y="148" width="30" height="6" rx="3" fill={sl}/><rect x="51" y="148" width="30" height="6" rx="3" fill={sl}/><line x1="23" y1="131" x2="44" y2="131" stroke="#fff" strokeWidth="1.2" opacity=".3"/><line x1="23" y1="135" x2="44" y2="135" stroke="#fff" strokeWidth="1.2" opacity=".3"/><line x1="55" y1="131" x2="77" y2="131" stroke="#fff" strokeWidth="1.2" opacity=".3"/><line x1="55" y1="135" x2="77" y2="135" stroke="#fff" strokeWidth="1.2" opacity=".3"/></g>:<g><path d="M18 138 Q20 131 36 131 Q50 131 50 138 L50 146 L18 146 Z" fill={sc}/><rect x="17" y="145" width="34" height="5" rx="2" fill={sl}/><ellipse cx="20" cy="139" rx="5" ry="4" fill={sc} opacity=".7"/><path d="M82 138 Q80 131 64 131 Q50 131 50 138 L50 146 L82 146 Z" fill={sc}/><rect x="49" y="145" width="34" height="5" rx="2" fill={sl}/><ellipse cx="80" cy="139" rx="5" ry="4" fill={sc} opacity=".7"/>{["af1","aj1","cortez","blazer","vans","samba","sambawht"].includes(sne?.id)&&<g><path d="M24 140 Q31 136 42 138" stroke={sne?.id==="aj1"?"#dd4444":"#c8a860"} strokeWidth="1.8" fill="none" opacity=".9"/><path d="M76 140 Q69 136 58 138" stroke={sne?.id==="aj1"?"#dd4444":"#c8a860"} strokeWidth="1.8" fill="none" opacity=".9"/></g>}</g>}
      <rect x={isHip?18:30} y="102" width={isHip?22:15} height={isHip?46:44} rx={isHip?8:6} fill={bc} stroke={gc} strokeWidth=".7"/>
      <rect x={isHip?60:55} y="102" width={isHip?22:15} height={isHip?46:44} rx={isHip?8:6} fill={bc} stroke={gc} strokeWidth=".7"/>
      {cid==="battle"?<g><rect x="24" y="56" width="52" height="50" rx="12" fill={bc} stroke={gc} strokeWidth="1"/><path d="M38 58 L50 72 L62 58" stroke={gc} strokeWidth="2.5" fill={bc}/><line x1="50" y1="72" x2="50" y2="106" stroke={gc+"88"} strokeWidth="2.5" strokeDasharray="4,2"/></g>:cid==="stage"?<g><rect x="24" y="56" width="52" height="50" rx="12" fill={bc} stroke={gc} strokeWidth="1"/><path d="M44 56 L50 68 L56 56 L50 62 Z" fill={gc+"66"}/><path d="M48 67 L52 67 L54 90 L50 96 L46 90 Z" fill={gc+"cc"}/><ellipse cx="50" cy="67" rx="4" ry="3" fill={gc}/></g>:cid==="leo"?<g><rect x="28" y="58" width="44" height="48" rx="14" fill={bc} stroke={gc} strokeWidth="1"/><rect x="36" y="50" width="8" height="18" rx="4" fill={bc} stroke={gc} strokeWidth=".7"/><rect x="56" y="50" width="8" height="18" rx="4" fill={bc} stroke={gc} strokeWidth=".7"/></g>:cid==="gold"||cid==="space"?<g><rect x="24" y="56" width="52" height="50" rx="12" fill={bc} stroke={cid==="space"?"#00e5ff":"#ffd60a"} strokeWidth="2.5"/><text x="50" y="83" textAnchor="middle" fontSize="18" dominantBaseline="middle">{cid==="space"?"🚀":"⭐"}</text></g>:<g><rect x="24" y="56" width="52" height="50" rx="13" fill={bc} stroke={gc} strokeWidth="1"/>{isHip?<line x1="44" y1="60" x2="56" y2="60" stroke={gc+"88"} strokeWidth="2" strokeLinecap="round"/>:<g><rect x="32" y="82" width="36" height="16" rx="6" fill="none" stroke={gc+"66"} strokeWidth="1.2"/><line x1="50" y1="82" x2="50" y2="98" stroke={gc+"44"} strokeWidth="1"/></g>}</g>}
      {gn==="popping"&&<text x="50" y="84" textAnchor="middle" fontSize="12" dominantBaseline="middle">⚡</text>}
      {gn==="jazz"&&<text x="50" y="84" textAnchor="middle" fontSize="11" dominantBaseline="middle">♪</text>}
      {gn==="breaking"&&cid!=="battle"&&<rect x="35" y="64" width="30" height="7" rx="3" fill={gc} opacity=".5"/>}
      <rect x="-4" y="60" width="32" height="11" rx="5.5" fill={bc} stroke={gc} strokeWidth=".8" style={{transformOrigin:"24px 65px",transform:`rotate(${al}deg)`}}/>
      <rect x="72" y="60" width="32" height="11" rx="5.5" fill={bc} stroke={gc} strokeWidth=".8" style={{transformOrigin:"76px 65px",transform:`rotate(${ar}deg)`}}/>
      {gn==="waacking"&&<rect x="-4" y="40" width="32" height="11" rx="5.5" fill={bc} stroke={gc} strokeWidth=".8" style={{transformOrigin:"24px 45px",transform:"rotate(-90deg)"}}/>}
      <rect x="43" y="46" width="14" height="14" rx="5" fill={skin}/>
      <ellipse cx="50" cy="31" rx="22" ry="24" fill={skin} stroke="#e8c9a0" strokeWidth=".6"/>
      {gn==="ballet"&&<g><ellipse cx="50" cy="11" rx="20" ry="9" fill={gc}/><circle cx="50" cy="5" r="4" fill={gc}/></g>}
      {gn==="house"&&<g><ellipse cx="50" cy="12" rx="18" ry="9" fill="#222"/><rect x="22" y="20" width="7" height="18" rx="4" fill={gc}/><rect x="71" y="20" width="7" height="18" rx="4" fill={gc}/><path d="M25 22 Q50 6 75 22" stroke={gc} strokeWidth="4" fill="none"/></g>}
      {["popping","breaking","lock","waacking"].includes(gn)&&<g><ellipse cx="50" cy="12" rx="19" ry="9" fill={gc}/><ellipse cx="50" cy="9" rx="16" ry="6" fill={gc} opacity=".9"/></g>}
      {gn==="contemporary"&&<g><ellipse cx="50" cy="10" rx="21" ry="10" fill={gc} opacity=".9"/><path d="M30 14 Q50 1 70 14" stroke={gc} strokeWidth="4" fill="none"/></g>}
      {gn==="jazz"&&<g><ellipse cx="50" cy="11" rx="19" ry="10" fill={gc}/><ellipse cx="50" cy="8" rx="14" ry="5" fill={gc}/></g>}
      {fs==="dizzy"?<g><text x="40" y="33" fontSize="10" fill="#555" textAnchor="middle" dominantBaseline="middle">×</text><text x="60" y="33" fontSize="10" fill="#555" textAnchor="middle" dominantBaseline="middle">×</text></g>:<g><ellipse cx="41" cy="32" rx="3.5" ry={fs==="happy"?3:3.5} fill="#222"/><ellipse cx="59" cy="32" rx="3.5" ry={fs==="happy"?3:3.5} fill="#222"/><circle cx="42.5" cy="30.5" r="1.2" fill="white"/><circle cx="60.5" cy="30.5" r="1.2" fill="white"/></g>}
      {fs==="happy"&&<path d="M41 42 Q50 51 59 42" stroke="#cc4444" strokeWidth="2" fill="none" strokeLinecap="round"/>}
      {fs==="ok"&&<line x1="43" y1="44" x2="57" y2="44" stroke="#cc4444" strokeWidth="1.8" strokeLinecap="round"/>}
      {fs==="sad"&&<path d="M41 49 Q50 43 59 49" stroke="#cc4444" strokeWidth="2" fill="none" strokeLinecap="round"/>}
      {fs==="cry"&&<g><path d="M41 50 Q50 44 59 50" stroke="#cc4444" strokeWidth="2" fill="none"/><ellipse cx="38" cy="44" rx="2" ry="4" fill="#4af" opacity=".7"/><ellipse cx="62" cy="44" rx="2" ry="4" fill="#4af" opacity=".7"/></g>}
      {(fs==="happy"||fs==="ok")&&<g><ellipse cx="35" cy="40" rx="4.5" ry="2.5" fill="#ff9ec4" opacity=".6"/><ellipse cx="65" cy="40" rx="4.5" ry="2.5" fill="#ff9ec4" opacity=".6"/></g>}
      {accs.includes("chain")&&<g><path d="M34 68 Q50 77 66 68" stroke="#ffd60a" strokeWidth="2.5" fill="none" strokeLinecap="round"/><circle cx="50" cy="75" r="3.5" fill="#ffd60a"/></g>}
      {accs.includes("fan")&&<g><path d="M68 60 Q84 40 94 52 Q82 60 68 72 Z" fill="#ffd60a" opacity=".85"/><line x1="68" y1="66" x2="86" y2="48" stroke="#ffd60a" strokeWidth=".8" opacity=".6"/></g>}
      {accs.includes("bandana")&&!accs.includes("cap")&&!accs.includes("beanie")&&!accs.includes("durag")&&<path d="M30 22 Q50 10 70 22 L68 32 Q50 22 32 32 Z" fill="#ff006e" opacity=".9"/>}
      {accs.includes("cap")&&<g><ellipse cx="50" cy="12" rx="24" ry="7" fill={gc}/><rect x="26" y="12" width="48" height="9" rx="4" fill={gc}/><rect x="50" y="5" width="24" height="11" rx="2" fill={gc} opacity=".8"/></g>}
      {accs.includes("beanie")&&!accs.includes("cap")&&<ellipse cx="50" cy="11" rx="22" ry="10" fill={gc} opacity=".9"/>}
      {accs.includes("durag")&&!accs.includes("cap")&&<g><ellipse cx="50" cy="12" rx="22" ry="10" fill="#111"/><path d="M62 18 Q75 25 78 38" stroke="#111" strokeWidth="3" fill="none"/></g>}
      {accs.includes("sunglass")&&<g><rect x="31" y="28" width="14" height="9" rx="3" fill="#111" opacity=".92"/><rect x="55" y="28" width="14" height="9" rx="3" fill="#111" opacity=".92"/><line x1="45" y1="32" x2="55" y2="32" stroke="#555" strokeWidth="1.5"/><line x1="31" y1="28" x2="44" y2="28" stroke="#444" strokeWidth="1.5"/><line x1="56" y1="28" x2="69" y2="28" stroke="#444" strokeWidth="1.5"/></g>}
    </svg>
  );
}

/* ── UI PRIMITIVES ── */
function SBar({label,val,col,max=35}){return(<div style={{marginBottom:6}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}><span style={{fontSize:10,color:TX3,fontFamily:"M PLUS Rounded 1c,sans-serif"}}>{label}</span><span style={{fontSize:10,color:col,fontWeight:700}}>{val}</span></div><div style={{height:5,background:BG3,borderRadius:3}}><div style={{height:"100%",width:`${Math.min(100,(val/max)*100)}%`,background:col,borderRadius:3,transition:"width .5s"}}/></div></div>);}
function VBar({label,val,col}){const p=Math.max(0,Math.min(100,val));return(<div style={{display:"flex",alignItems:"center",gap:8,marginBottom:5}}><span style={{fontSize:10,color:TX3,width:52,flexShrink:0,fontFamily:"M PLUS Rounded 1c,sans-serif"}}>{label}</span><div style={{flex:1,height:8,background:BG3,borderRadius:4}}><div style={{height:"100%",width:`${p}%`,background:p>50?col:p>25?"#ffcc02":"#ff5555",borderRadius:4,transition:"width .5s"}}/></div><span style={{fontSize:10,color:TX3,width:22,textAlign:"right"}}>{val}</span></div>);}
function Btn({children,onClick,col=BG3,tc=TX,disabled,full,sx={}}){return(<button onClick={disabled?undefined:onClick} style={{padding:"9px 14px",borderRadius:6,fontSize:12,fontFamily:"M PLUS Rounded 1c,sans-serif",fontWeight:700,background:disabled?"#141428":col,color:disabled?"#404060":tc,border:`1px solid ${disabled?"#252545":col}`,cursor:disabled?"not-allowed":"pointer",transition:"all .15s",width:full?"100%":undefined,...sx}}>{children}</button>);}
function AIB({text,loading}){if(!text&&!loading)return null;return(<div style={{margin:"10px 0",padding:"10px 12px",background:"#0e0e22",border:"1px solid #3a3a60",borderRadius:6,fontSize:12,fontFamily:"M PLUS Rounded 1c,sans-serif",color:TX2,lineHeight:1.65,animation:"su .3s ease"}}>{loading?<span style={{animation:"pu 1s infinite",color:TX3}}>✦ 生成中...</span>:text}</div>);}
function Tag({children,col}){return(<span style={{fontSize:10,padding:"2px 8px",borderRadius:10,background:`${col}33`,color:col,border:`1px solid ${col}55`,fontFamily:"M PLUS Rounded 1c,sans-serif"}}>{children}</span>);}

/* ── ENERGY BAR ── */
function EnergyBar({char}){
  const[tick,setTick]=useState(0);
  useEffect(()=>{const t=setInterval(()=>setTick(n=>n+1),10000);return()=>clearInterval(t);},[]);
  const MAX=char.maxEnergy||50;const cur=char.energy;
  const REGEN_MS=5*60*1000;const now=Date.now();
  const last=char.lastEnergyTime||now;const elapsed=(now-last)%REGEN_MS;
  const nextMs=cur<MAX?Math.max(0,REGEN_MS-elapsed):0;
  const fullMs=cur<MAX?(MAX-cur-1)*REGEN_MS+nextMs:0;
  const fullH=Math.floor(fullMs/3600000);const fullM=Math.floor((fullMs%3600000)/60000);
  const segs=10;const isEmpty=cur===0;
  return(<div style={{padding:"8px 0 2px"}}>
    <div style={{display:"flex",alignItems:"center",gap:8}}>
      <span style={{fontSize:11,color:isEmpty?"#ff5555":"#00e5ff",fontFamily:"'Press Start 2P',monospace",flexShrink:0}}>⚡</span>
      <div style={{display:"flex",gap:2,flex:1}}>
        {Array.from({length:segs}).map((_,i)=>{const sMin=i*(MAX/segs),sMax=(i+1)*(MAX/segs);const filled=cur>=sMax;const partial=!filled&&cur>sMin;const pct=partial?((cur-sMin)/(MAX/segs))*100:0;return(<div key={i} style={{flex:1,height:10,borderRadius:2,background:"#1a1a2e",position:"relative",overflow:"hidden"}}>{filled&&<div style={{position:"absolute",inset:0,background:"#00e5ff"}}/>}{partial&&<div style={{position:"absolute",left:0,top:0,height:"100%",width:`${pct}%`,background:"#00e5ff"}}/>}</div>);})}</div>
      <span style={{fontSize:10,color:isEmpty?"#ff5555":"#00e5ff",fontWeight:700,flexShrink:0}}>{cur}/{MAX}</span>
    </div>
    <div style={{display:"flex",justifyContent:"space-between",marginTop:3}}>
      <span style={{fontSize:9,color:TX3}}>{cur>=MAX?"⚡ FULL！":"⏱ 5分で+1 回復中"}</span>
      {cur<MAX&&<span style={{fontSize:9,color:TX3}}>FULL まで {fullH>0?`${fullH}時間`:`${fullM}分`}</span>}
    </div>
    {isEmpty&&<div style={{fontSize:10,color:"#ff5555",textAlign:"center",marginTop:4,animation:"pu 1.5s infinite",fontFamily:"M PLUS Rounded 1c,sans-serif"}}>⚡ ENERGY ZERO — ❤️ ハートを使って回復！</div>}
  </div>);
}

/* ── HEART BAR ── */
function HeartBar({char,onUseHeart}){
  const[tick,setTick]=useState(0);
  useEffect(()=>{const t=setInterval(()=>setTick(n=>n+1),30000);return()=>clearInterval(t);},[]);
  const MAX=char.maxHearts||6;const cur=char.hearts||0;
  const REGEN_MS=4*60*60*1000;const now=Date.now();
  const last=char.lastHeartTime||now;const elapsed=(now-last)%REGEN_MS;
  const nextMs=cur<MAX?Math.max(0,REGEN_MS-elapsed):0;
  const nextH=Math.floor(nextMs/3600000);const nextM=Math.floor((nextMs%3600000)/60000);
  return(<div style={{display:"flex",alignItems:"center",gap:8,padding:"4px 0"}}>
    <div style={{display:"flex",gap:3}}>
      {Array.from({length:MAX}).map((_,i)=>(
        <span key={i} style={{fontSize:16,opacity:i<cur?1:0.2,filter:i<cur?"drop-shadow(0 0 4px #ff4da6)":"none",transition:"all .3s"}}>❤️</span>
      ))}
    </div>
    {cur<MAX&&<span style={{fontSize:9,color:TX3,fontFamily:"M PLUS Rounded 1c,sans-serif"}}>+1: {nextH>0?`${nextH}h`:`${nextM}m`}</span>}
    {cur>0&&char.energy<(char.maxEnergy||50)&&(
      <Btn onClick={onUseHeart} col="#2a0a1a" tc="#ff9ec4" sx={{fontSize:10,padding:"4px 10px",border:"1px solid #4a1a3a"}}>❤️→⚡ 使う</Btn>
    )}
  </div>);
}

/* ── バトル速度 ── */
let _battleSpeed=1; // 1 or 2

/* ── 4MOVE BATTLE OVERLAY ── */
function BattleOverlay({state,gc,onClose}){
  const[,setTick]=useState(0);
  const toggleSpeed=()=>{_battleSpeed=_battleSpeed===1?2:1;setTick(t=>t+1);};
  const px={fontFamily:"'Press Start 2P',monospace"};
  const base={position:"fixed",inset:0,background:"rgba(5,5,18,.96)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",zIndex:900,padding:24,textAlign:"center"};

  if(state.phase==="seq"){
    const{moves,step}=state;
    const shown=moves.slice(0,step+1);
    return(<div style={base}>
      <div style={{position:"absolute",top:16,right:16}}>
        <button onClick={toggleSpeed} style={{fontSize:11,padding:"5px 12px",borderRadius:6,background:_battleSpeed===2?"#b3ff00":"#1a1a30",color:_battleSpeed===2?"#000":"#b3ff00",border:`1px solid ${_battleSpeed===2?"#b3ff00":"#3a3a50"}`,cursor:"pointer",fontFamily:"M PLUS Rounded 1c,sans-serif",fontWeight:700}}>
          {_battleSpeed===2?"▶ 通常":"⚡ 2x"}
        </button>
      </div>
      <div style={{...px,fontSize:9,color:"#ff6b6b",letterSpacing:2,marginBottom:16}}>⚔️ DANCE BATTLE ⚔️</div>
      {state.compat&&state.compat.label&&(
        <div style={{fontSize:11,color:state.compat.col||"#ffcc02",marginBottom:10,fontFamily:"M PLUS Rounded 1c,sans-serif",textAlign:"center",fontWeight:700}}>
          {GENRES[state.usedGenre]?.e} {GENRES[state.usedGenre]?.jp} で挑む！{state.compat.label}
          {state.useGenre2&&<span style={{fontSize:9,color:"#ce93d8",display:"block",marginTop:2}}>サブジャンルで相性有利！</span>}
        </div>
      )}
      <div style={{width:"100%",maxWidth:340}}>
        {shown.map((m,i)=>(
          <div key={i} style={{display:"flex",alignItems:"flex-start",gap:10,marginBottom:10,animation:"fd .4s ease",textAlign:"left"}}>
            <span style={{fontSize:22,flexShrink:0}}>{m.isPlayer?GENRES[state.playerGenre]?.e:"🆚"}</span>
            <div style={{flex:1,background:m.isPlayer?`${gc}22`:"#1a1a2e",border:`1px solid ${m.isPlayer?gc+"55":"#2a2a4a"}`,borderRadius:8,padding:"8px 12px"}}>
              <div style={{fontSize:9,color:m.isPlayer?gc:TX3,fontFamily:"M PLUS Rounded 1c,sans-serif",marginBottom:3}}>{m.isPlayer?"あなた":"相手"} MOVE {Math.floor(i/2)+1}</div>
              <div style={{fontSize:12,color:TX,fontFamily:"M PLUS Rounded 1c,sans-serif",lineHeight:1.5}}>{m.comment}</div>
            </div>
          </div>
        ))}
        {step>=3&&(
          <div style={{marginTop:16,animation:"fd .5s ease"}}>
            <div style={{...px,fontSize:8,color:"#ffd60a",marginBottom:12}}>⚖️ JUDGE</div>
            <div style={{display:"flex",justifyContent:"center",gap:8,marginBottom:12}}>
              {state.flags.map((f,i)=>(
                <div key={i} style={{fontSize:28,animation:step>=4+i?`fd .3s ${i*0.2}s ease both`:"none",opacity:step>=4+i?1:0}}>
                  {f==="blue"?"🔵":"🔴"}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>);
  }

  if(state.phase==="result"){
    const{won,eg,coins,title,flags}=state;
    const blue=flags?.filter(f=>f==="blue").length||0;
    const red=flags?.filter(f=>f==="red").length||0;
    return(<div style={base}>
      <div style={{fontSize:58,animation:won?"vi .5s ease":"sh .5s ease",marginBottom:14}}>{won?"🏆":"💀"}</div>
      <div style={{...px,fontSize:14,color:won?"#b3ff00":"#ff5555",letterSpacing:3,marginBottom:10}}>{won?"WIN!":"LOSE..."}</div>
      <div style={{display:"flex",justifyContent:"center",gap:6,marginBottom:12}}>
        {flags?.map((f,i)=><span key={i} style={{fontSize:22}}>{f==="blue"?"🔵":"🔴"}</span>)}
      </div>
      <div style={{fontSize:11,color:TX2,marginBottom:6,fontFamily:"M PLUS Rounded 1c,sans-serif"}}>🔵{blue} vs 🔴{red}</div>
      <div style={{display:"flex",gap:16,justifyContent:"center",marginBottom:10}}>
        <span style={{fontSize:13,color:"#ffd60a"}}>+{eg} EXP</span>
        {coins>0&&<span style={{fontSize:13,color:"#b3ff00",fontWeight:700}}>{fc(coins)}</span>}
        {state.gems>0&&<span style={{fontSize:13,color:"#88eeff",fontWeight:700}}>💎+{state.gems}</span>}
      </div>
      {title&&<div style={{fontSize:12,color:"#ce93d8",marginBottom:12}}>🎖 「{title}」獲得！</div>}
      <Btn col={gc} tc="#000" onClick={onClose} sx={{fontSize:12,padding:"10px 36px"}}>続ける</Btn>
    </div>);
  }
  return null;
}

/* ── BATTLE LOGIC ── */
function buildBattle(char,oppStyle,oppPow){
  const eb=eqBonus(char.equipped||{});const ts={};
  Object.entries(char.stats).forEach(([k,v])=>{ts[k]=v+(eb[k]||0);});
  let myP=calcPow(ts);

  // 気分補正
  const mood=char.mood||0;
  if(mood>=90)myP=Math.floor(myP*1.18);
  else if(mood>=75)myP=Math.floor(myP*1.10);
  else if(mood>=50)myP=Math.floor(myP*1.0);
  else if(mood>=25)myP=Math.floor(myP*0.88);
  else myP=Math.floor(myP*0.75);

  // お腹補正
  const hunger=char.hunger||0;
  if(hunger>=80)myP=Math.floor(myP*1.08);
  else if(hunger>=50)myP=Math.floor(myP*1.0);
  else if(hunger>=30)myP=Math.floor(myP*0.92);
  else myP=Math.floor(myP*0.78);

  // 相性チェック（2ジャンルある場合は有利な方を自動選択）
  const cb1=compatBonus(char.genre,oppStyle);
  const cb2=char.genre2?compatBonus(char.genre2,oppStyle):{bonus:0,label:""};
  const cb3=char.genre3?compatBonus(char.genre3,oppStyle):{bonus:0,label:""};
  const best=[{g:char.genre,cb:cb1},{g:char.genre2,cb:cb2},{g:char.genre3,cb:cb3}]
    .filter(x=>x.g).reduce((a,b)=>b.cb.bonus>a.cb.bonus?b:a);
  const usedGenre=best.g;
  const compat=best.cb;
  const useGenre2=usedGenre===char.genre2; // 後方互換
  const useGenre3=usedGenre===char.genre3;
  myP=Math.floor(myP*compat.bonus);

  myP+=Math.floor(Math.random()*50);
  const thP=oppPow+Math.floor(Math.random()*40);
  const won=myP>=thP;
  const pComments=BC[usedGenre]||BC.jazz;
  const oComments=OBC[oppStyle]||OBC.house;
  const p2Comments=BC[usedGenre]; // 使用中のジャンルのコメント
  const moves=[
    {isPlayer:true,  comment:pick(pComments), genre:usedGenre},
    {isPlayer:false, comment:pick(oComments), genre:oppStyle},
    {isPlayer:true,  comment:pick(p2Comments||pComments), genre:usedGenre},
    {isPlayer:false, comment:pick(oComments), genre:oppStyle},
  ];
  const flags=Array.from({length:5}).map((_,i)=>{
    if(won)return i<3||Math.random()<0.6?"blue":"red";
    return i>=3||Math.random()<0.6?"red":"blue";
  });
  return{moves,flags,won,myP,thP,playerGenre:usedGenre,usedGenre,compat,useGenre2,useGenre3};
}

/* ── MAP SVG ── */
function MapSVG({region,char,selected,onSelect,traveling}){
  const cities=region==="japan"?J:region==="world"?W:SP;
  const edges=region==="japan"?JE:region==="space"?SPE:WE;
  const vb=region==="japan"?"0 0 340 440":region==="world"?"0 0 380 230":"0 0 380 200";
  const cl=char.clearedCities||{};
  function cs(id){if(cl[id])return"cleared";if(canVisit(id,char,region))return"avail";return"locked";}
  const areas=region==="japan"?[
    {x:64,y:268,w:162,h:172,rx:12,f:"#1a1428",s:"#3a2a6a",t:"九州",tx:72,ty:282},
    {x:162,y:198,w:76,h:60,rx:8,f:"#0e1a20",s:"#1a4055",t:"関西",tx:167,ty:212},
    {x:254,y:154,w:78,h:50,rx:8,f:"#12141e",s:"#2a2a55",t:"関東",tx:259,ty:168},
    {x:260,y:96,w:60,h:52,rx:8,f:"#0e1618",s:"#1a3045",t:"東北",tx:265,ty:110},
    {x:244,y:22,w:70,h:50,rx:8,f:"#101820",s:"#1a3055",t:"北海道",tx:248,ty:36},
  ]:region==="world"?[
    {x:80,y:28,w:130,h:110,rx:10,f:"#1a1428",s:"#3a2a6a",t:"EUROPE",tx:88,ty:42},
    {x:215,y:45,w:155,h:145,rx:10,f:"#0e1a14",s:"#1a4030",t:"ASIA",tx:223,ty:59},
    {x:130,y:165,w:100,h:55,rx:10,f:"#1a1410",s:"#4a3010",t:"S.AMERICA",tx:138,ty:179},
    {x:130,y:155,w:50,h:45,rx:8,f:"#0e1814",s:"#1a4030",t:"AFRICA",tx:134,ty:168},
    {x:265,y:160,w:105,h:55,rx:10,f:"#0e1a20",s:"#1a4055",t:"OCEANIA",tx:272,ty:174},
  ]:[
    {x:65,y:35,w:250,h:150,rx:15,f:"#080818",s:"#0a0a40",t:"SPACE",tx:80,ty:52},
  ];
  return(<svg viewBox={vb} width="100%" style={{display:"block"}}>
    <rect width="100%" height="100%" fill={region==="space"?"#02020e":"#080818"}/>
    {region==="space"&&<g><ellipse cx="180" cy="100" rx="160" ry="80" fill="#050518" stroke="#0a0a30" strokeWidth="1"/>{Array.from({length:30}).map((_,i)=><circle key={i} cx={Math.random()*380} cy={Math.random()*200} r="1" fill="#fff" opacity={Math.random()*.8+.2}/>)}</g>}
    {areas.map((a,i)=><g key={i}><rect x={a.x} y={a.y} width={a.w} height={a.h} rx={a.rx} fill={a.f} stroke={a.s} strokeWidth="1.5"/><text x={a.tx} y={a.ty} fill={a.s} fontSize="9" fontFamily="M PLUS Rounded 1c,sans-serif" fontWeight="700">{a.t}</text></g>)}
    {edges.map(([a,b])=>{const ca=cities[a],cb=cities[b];if(!ca||!cb)return null;const sa=cs(a),sb=cs(b);const both=sa==="locked"&&sb==="locked";return<line key={`${a}-${b}`} x1={ca.x} y1={ca.y} x2={cb.x} y2={cb.y} stroke={both?"#181830":"#505090"} strokeWidth={both?1:2} strokeDasharray={both?"4,4":"none"}/>;  })}
    {Object.values(cities).map(city=>{
      const st=cs(city.id);const isCur=city.id===char.currentCity;const isSel=selected?.id===city.id;
      const gc2=GENRES[city.g]?.c||"#888";const lk=st==="locked";const cl2=st==="cleared";const av=st==="avail";
      const r=isCur?13:lk?7:10;
      return(<g key={city.id} onClick={()=>!lk&&onSelect(city)} style={{cursor:lk?"default":"pointer"}}>
        {isCur&&<circle cx={city.x} cy={city.y} r="22" fill="none" stroke={gc2} strokeWidth="2.5" style={{animation:"pu 2s ease-in-out infinite"}} opacity=".5"/>}
        {isSel&&!isCur&&<circle cx={city.x} cy={city.y} r="16" fill="none" stroke={gc2} strokeWidth="2" opacity=".8"/>}
        {av&&!isCur&&<circle cx={city.x} cy={city.y} r="14" fill={gc2} opacity=".12"/>}
        <circle cx={city.x} cy={city.y} r={r} fill={lk?"#0e0e1e":cl2?gc2+"44":isCur?gc2+"cc":gc2+"88"} stroke={lk?"#252545":cl2?gc2+"88":gc2} strokeWidth={isCur?2.5:av?2:1}/>
        {lk&&<text x={city.x} y={city.y} textAnchor="middle" dominantBaseline="middle" fontSize="7" fill="#303060">🔒</text>}
        {cl2&&!isCur&&<text x={city.x} y={city.y} textAnchor="middle" dominantBaseline="middle" fontSize="9" fill={gc2}>✓</text>}
        {(av||isCur)&&<text x={city.x} y={city.y} textAnchor="middle" dominantBaseline="middle" fontSize={isCur?12:10}>{GENRES[city.g]?.e}</text>}
        {city.id===char.hometown&&<text x={city.x+12} y={city.y-10} fontSize="10">🏠</text>}
        <text x={city.x} y={city.y+(isCur?22:17)} textAnchor="middle" fontSize={isCur?9:lk?7:8} fill={lk?"#2a2a50":cl2?gc2+"cc":isCur?gc2:TX} fontFamily="M PLUS Rounded 1c,sans-serif" fontWeight={isCur?"700":"400"}>{city.name}</text>
        {lk&&<g><rect x={city.x-15} y={city.y+17} width="30" height="11" rx="3" fill="#12122a" stroke="#2a2a48" strokeWidth=".8"/><text x={city.x} y={city.y+25} textAnchor="middle" fontSize="7" fill="#5050a0" fontFamily="M PLUS Rounded 1c,sans-serif">Lv.{city.lv}</text></g>}
      </g>);
    })}
    {/* 移動アニメーション */}
    {traveling&&(()=>{
      const ease=t=>t<0.5?2*t*t:1-Math.pow(-2*t+2,2)/2;
      const p=ease(traveling.prog);
      const cx=traveling.fx+(traveling.tx-traveling.fx)*p;
      const cy=traveling.fy+(traveling.ty-traveling.fy)*p;
      // 軌跡
      const trailCount=6;
      return(<g>
        {Array.from({length:trailCount}).map((_,i)=>{
          const tp=Math.max(0,p-(i+1)*0.06);
          const ep=ease(Math.min(tp,1));
          const tx2=traveling.fx+(traveling.tx-traveling.fx)*ep;
          const ty2=traveling.fy+(traveling.ty-traveling.fy)*ep;
          return<circle key={i} cx={tx2} cy={ty2} r={5-i*0.7} fill="#ffffff" opacity={(1-i/trailCount)*0.25}/>;
        })}
        <circle cx={cx} cy={cy} r="14" fill="rgba(0,0,0,0.4)"/>
        <circle cx={cx} cy={cy} r="12" fill="#ff4da6" opacity="0.9"/>
        <circle cx={cx} cy={cy} r="10" fill="#ff4da6"/>
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fontSize="12">{traveling.emoji}</text>
      </g>);
    })()}
  </svg>);
}

/* ── CITY PANEL ── */
function CityPanel({city,char,region,cleared,gc2,onClose,onTravel,onBattle,onEatFood,pushNotif}){
  const isAvail=canVisit(city.id,char,region);
  const isCl=!!cleared[city.id];const isCur=city.id===char.currentCity;
  const gColor=GENRES[city.g]?.c||"#888";
  const canBoss=isCur&&!isCl&&char.energy>=20;
  return(<div style={{background:BG2,border:`2px solid ${gColor}66`,borderRadius:10,padding:14,marginBottom:10,animation:"su .25s ease"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
      <div style={{display:"flex",gap:10,alignItems:"center"}}>
        <span style={{fontSize:30}}>{city.ch.e}</span>
        <div><div style={{fontWeight:700,fontSize:14,color:gColor,fontFamily:"M PLUS Rounded 1c,sans-serif"}}>{city.name}</div><div style={{fontSize:10,color:TX3}}>{GENRES[city.g]?.e} {GENRES[city.g]?.jp} · Lv.{city.lv}+</div></div>
      </div>
      <button onClick={onClose} style={{color:TX3,fontSize:20,padding:"0 6px",lineHeight:1}}>✕</button>
    </div>
    <div style={{fontSize:11,color:TX2,lineHeight:1.7,marginBottom:8,fontFamily:"M PLUS Rounded 1c,sans-serif"}}>{city.desc}</div>
    <div style={{background:"#0a0a1c",border:"1px solid #2a2a50",borderRadius:6,padding:"8px 12px",marginBottom:10}}>
      <div style={{fontSize:11,fontFamily:"M PLUS Rounded 1c,sans-serif",marginBottom:4}}>
        <span style={{color:"#ff6b6b",fontWeight:700}}>⚔️ BOSS: {city.ch.name}</span>
        <span style={{color:TX3,marginLeft:10,fontSize:10}}>POWER {city.ch.pw.toLocaleString()}</span>
      </div>
      <div style={{display:"flex",flexWrap:"wrap",gap:12}}>
        <span style={{fontSize:10,color:"#ffd60a"}}>+{city.rw.exp}EXP</span>
        <span style={{fontSize:10,color:"#b3ff00",fontWeight:700}}>{fc(city.rw.coins)} 賞金</span>
        {city.rw.title&&<span style={{fontSize:10,color:"#ce93d8"}}>🎖{city.rw.title}</span>}
      </div>
    </div>
    {/* 現地グルメ - 現在地 OR クリア済みで移動後に表示 */}
    {(isCur)&&city.food&&city.food.length>0&&(
      <div style={{background:"#0a1a0a",border:"1px solid #1a3a1a",borderRadius:6,padding:"8px 12px",marginBottom:10}}>
        <div style={{fontSize:9,color:"#60c060",fontFamily:"'Press Start 2P',monospace",marginBottom:8}}>🍜 現地グルメ</div>
        {city.food.map(f=>(
          <div key={f.n} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6,paddingBottom:6,borderBottom:"1px solid #1a2a1a"}}>
            <div style={{flex:1}}>
              <div style={{fontSize:12,color:TX,fontWeight:700,fontFamily:"M PLUS Rounded 1c,sans-serif"}}>{f.n}</div>
              <div style={{fontSize:10,color:TX3}}>{f.desc} · ⚡+{f.e} 🍚+{f.h}</div>
            </div>
            <Btn col="#0a2a0a" tc="#80e080" onClick={()=>onEatFood(f)} sx={{fontSize:10,padding:"5px 10px",border:"1px solid #1a4a1a",marginLeft:8,flexShrink:0}}>{fc(f.p)}</Btn>
          </div>
        ))}
      </div>
    )}
    {/* クリア済み → 移動ボタン＋グルメ予告 */}
    {isCl?(
      <div>
        <div style={{fontSize:11,color:"#60c080",textAlign:"center",padding:"6px 0",fontWeight:700,marginBottom:8}}>✓ クリア済み！</div>
        {!isCur&&city.food&&city.food.length>0&&(
          <div style={{background:"#0a1a0a",border:"1px solid #1a3a1a",borderRadius:6,padding:"8px 12px",marginBottom:8}}>
            <div style={{fontSize:9,color:"#60c060",fontFamily:"'Press Start 2P',monospace",marginBottom:6}}>🍜 現地グルメ（移動して食べよう）</div>
            {city.food.map(f=>(
              <div key={f.n} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:11,color:TX2,fontFamily:"M PLUS Rounded 1c,sans-serif"}}>{f.n}</div>
                  <div style={{fontSize:9,color:TX3}}>⚡+{f.e} 🍚+{f.h} · {fc(f.p)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
        {!isCur&&<Btn disabled={char.energy<5} col="#0a1828" tc="#00e5ff" onClick={()=>onTravel(city)} full sx={{fontSize:11,border:"1px solid #1a4870"}}>{char.energy<5?"⚡ エネルギー不足":"📍 グルメ目的で移動 ⚡5"}</Btn>}
      </div>
    ):(
      <div style={{display:"flex",gap:8}}>
        {!isCur&&<Btn disabled={!isAvail||char.energy<5} col="#0a1828" tc="#00e5ff" onClick={()=>onTravel(city)} sx={{flex:1,fontSize:11,border:"1px solid #1a4870"}}>{isAvail?"📍 移動 ⚡5":"🔒 未開通"}</Btn>}
        {isCur&&<Btn disabled={!canBoss} col="#280a0a" tc="#ff7070" onClick={()=>onBattle(city)} sx={{flex:2,fontSize:12,padding:"11px",border:"1px solid #5a1818",fontWeight:700}}>{char.energy<20?"⚡ エネルギー不足":"⚔️ ボスに挑む！"}</Btn>}
      </div>
    )}
  </div>);
}

/* ── MAP TAB ── */
/* ══════════════════════════════════════
   🚶 JAPAN WALK MODE（伊能忠敬スタイル）
   24×90タイルの巨大日本マップ
══════════════════════════════════════ */
const WK_W=26,WK_H=90,VW=16,VH=12,TS=22;

const WALK_CITIES=[
  {id:"kagoshima",x:6, y:83,name:"鹿児島",e:"🌋",g:"house"},
  {id:"miyazaki", x:13,y:79,name:"宮崎",  e:"🏄",g:"breaking"},
  {id:"nagasaki", x:3, y:75,name:"長崎",  e:"⛵",g:"waacking"},
  {id:"kumamoto", x:7, y:73,name:"熊本",  e:"🏯",g:"lock"},
  {id:"oita",     x:13,y:70,name:"大分",  e:"♨", g:"jazz"},
  {id:"hakata",   x:6, y:67,name:"博多",  e:"🍜",g:"lock"},
  {id:"kokura",   x:9, y:63,name:"小倉",  e:"🏭",g:"house"},
  // ↑小倉から斜め右上（本州）
  {id:"hiroshima",x:12,y:57,name:"広島",  e:"🕊",g:"contemporary"},
  {id:"kobe",     x:15,y:51,name:"神戸",  e:"⚓",g:"waacking"},
  {id:"osaka",    x:16,y:49,name:"大阪",  e:"🐡",g:"popping"},
  {id:"kyoto",    x:15,y:47,name:"京都",  e:"🏮",g:"ballet"},
  {id:"nagoya",   x:19,y:42,name:"名古屋",e:"☕",g:"breaking"},
  {id:"tokyo",    x:23,y:33,name:"東京",  e:"🏙",g:"popping"},
  {id:"sendai",   x:23,y:23,name:"仙台",  e:"🎋",g:"lock"},
  {id:"sapporo",  x:20,y:8, name:"札幌",  e:"❄", g:"jazz"},
];

function buildWalkMap(){
  const G=Array.from({length:WK_H},()=>new Array(WK_W).fill('~'));
  const s=(x,y,t)=>{if(y>=0&&y<WK_H&&x>=0&&x<WK_W)G[y][x]=t;};
  const rect=(x1,y1,x2,y2,t)=>{for(let y=Math.min(y1,y2);y<=Math.max(y1,y2);y++)for(let x=Math.min(x1,x2);x<=Math.max(x1,x2);x++)s(x,y,t);};
  const road=(x1,y1,x2,y2)=>{let x=x1,y=y1;while(y!==y2){s(x,y,'.');y+=(y<y2?1:-1);}while(x!==x2){s(x,y,'.');x+=(x<x2?1:-1);}s(x2,y2,'.');};

  // 九州（y=61-88, x=1-18）
  rect(1,62,17,88,'f');rect(3,64,15,86,'.');
  rect(1,73,5,78,'.');// 長崎方面
  rect(11,77,16,82,'.');// 宮崎方面

  // 九州→本州 関門海峡
  rect(7,59,11,64,'.');

  // 中国山陽（小倉から斜め右上 y=54-64, 地形が斜め）
  for(let step=0;step<=10;step++){
    const bx=8+Math.round(step*0.4);
    const by=64-step;
    for(let dx=-2;dx<=4;dx++)s(bx+dx,by,'f');
    s(bx+1,by,'.');s(bx+2,by,'.');
  }
  // 広島周辺
  rect(9,52,17,58,'f');rect(11,54,16,57,'.');

  // 近畿（Honshu中部, 右上に広がる y=44-53）
  rect(12,44,19,53,'f');rect(13,46,18,52,'.');
  rect(13,47,16,51,'^');// 山

  // 中部（名古屋 y=38-45）
  rect(16,38,23,45,'f');rect(17,40,22,44,'.');
  rect(17,39,20,43,'^');// アルプス

  // 関東（東京 y=28-37）
  rect(19,28,25,37,'f');rect(20,30,24,36,'.');

  // 東北（y=14-26）
  rect(19,14,25,26,'f');rect(20,16,24,25,'.');
  rect(20,16,22,23,'^');// 奥羽山脈

  // 津軽海峡
  rect(20,12,22,14,'.');

  // 北海道（y=3-13）
  rect(16,3,25,13,'f');rect(17,5,24,12,'.');

  // 各都市間の道
  for(let i=0;i<WALK_CITIES.length-1;i++){
    const a=WALK_CITIES[i],b=WALK_CITIES[i+1];
    road(a.x,a.y,b.x,b.y);
  }
  road(6,67,3,75);// 博多→長崎
  road(7,73,13,70);// 熊本→大分

  // 都市配置
  WALK_CITIES.forEach(c=>s(c.x,c.y,'@'));
  return G;
}

const WK_MAP=buildWalkMap();

const WT={
  '~':{bg:"#050d1a",pass:false,enc:false},
  '.':{bg:"#162010",pass:true, enc:false},
  'f':{bg:"#0d1a0d",pass:true, enc:true,rate:.15},
  '^':{bg:"#1a1208",pass:false,enc:false},
  '@':{bg:"#1a0a2a",pass:true, enc:false},
};

function DPad({onMove}){
  const bs={width:46,height:46,borderRadius:10,background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.18)",color:"#fff",fontSize:20,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",touchAction:"none",userSelect:"none",WebkitUserSelect:"none"};
  const h=d=>e=>{e.preventDefault();onMove(d);};
  return(<div style={{position:"fixed",bottom:88,left:14,display:"grid",gridTemplateColumns:"46px 46px 46px",gap:5,zIndex:200}}>
    <div/><button style={bs} onPointerDown={h("up")}>▲</button><div/>
    <button style={bs} onPointerDown={h("left")}>◀</button>
    <div style={{...bs,background:"rgba(255,255,255,.03)",cursor:"default"}}/>
    <button style={bs} onPointerDown={h("right")}>▶</button>
    <div/><button style={bs} onPointerDown={h("down")}>▼</button><div/>
  </div>);
}

function AButton({onPress,label="A",col="#ff4da6",disabled=false,sub=""}){
  return(<div style={{position:"fixed",bottom:100,right:18,zIndex:200,display:"flex",flexDirection:"column",alignItems:"center",gap:6}}>
    {sub&&<div style={{fontSize:8,color:col,fontFamily:"M PLUS Rounded 1c,sans-serif",textAlign:"center",maxWidth:64,lineHeight:1.3,opacity:.9}}>{sub}</div>}
    <button
      onPointerDown={e=>{e.preventDefault();if(!disabled)onPress();}}
      style={{width:58,height:58,borderRadius:"50%",background:disabled?"#1a1a2a":`${col}33`,border:`2.5px solid ${disabled?"#2a2a4a":col}`,color:disabled?"#3a3a5a":col,fontSize:20,fontWeight:900,cursor:disabled?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Press Start 2P',monospace",touchAction:"none",userSelect:"none",WebkitUserSelect:"none",boxShadow:disabled?"none":`0 0 12px ${col}44`}}>
      {label}
    </button>
  </div>);
}

/* ── 🛸 UFOパーツ（惑星間移動用） ── */
const UFO_PARTS=[
  // 月 → 火星UFO
  {id:"u_m1",name:"🔩 月面鋼鉄",forPlanet:"mars",foundOn:"moon_base",
   quiz:{q:"Breakingが生まれたニューヨークの区は？",as:["ブロンクス","bronx"],
         hint:"💡 月の北東の岩礁付近に光るものが..."}},
  {id:"u_m2",name:"⚡ 月光太陽電池",forPlanet:"mars",foundOn:"moon_base",
   quiz:{q:"バレエを宮廷で広めた一族は？（ヒント：イタリア）",as:["メディチ","メディチ家","medici"],
         hint:"💡 月の西側の影の中...クレーターを探せ"}},
  // 火星 → 木星UFO
  {id:"u_r1",name:"🔴 火星鉄鉱石",forPlanet:"jupiter",foundOn:"mars",
   quiz:{q:"POPPINGが生まれたカリフォルニアの都市は？",as:["フレズノ","fresno"],
         hint:"💡 火星の赤い大地、北部の岩山付近を探せ"}},
  {id:"u_r2",name:"🌋 火星マグマコア",forPlanet:"jupiter",foundOn:"mars",
   quiz:{q:"HIPHOPの誕生に貢献したDJの名前は？（DJ ●●●●●）",as:["クール・ハーク","kool herc","クールハーク","kool-herc"],
         hint:"💡 火星南部の火山帯...溶岩の流れに沿って"}},
  // 木星 → 土星UFO
  {id:"u_j1",name:"⚡ 木星雷電コア",forPlanet:"saturn",foundOn:"jupiter",
   quiz:{q:"WAACKINGが生まれた70年代の都市は？（アメリカ）",as:["LA","ロサンゼルス","los angeles"],
         hint:"💡 木星の嵐の渦の中心付近...危険だが宝がある"}},
  {id:"u_j2",name:"🌀 大赤斑クリスタル",forPlanet:"saturn",foundOn:"jupiter",
   quiz:{q:"HOUSE MUSICが発祥した都市は？",as:["シカゴ","chicago"],
         hint:"💡 大赤斑の渦の外縁部...光る欠片を探せ"}},
  // 土星 → 冥王星UFO
  {id:"u_s1",name:"🪐 土星リング断片",forPlanet:"pluto",foundOn:"saturn",
   quiz:{q:"ジャズダンスが生まれた港町は？（アメリカ南部）",as:["ニューオーリンズ","new orleans"],
         hint:"💡 土星の輪の外縁部...氷の中に光るものが"}},
  {id:"u_s2",name:"💎 タイタンの氷晶",forPlanet:"pluto",foundOn:"saturn",
   quiz:{q:"Breaking発祥のパーティで使われた手法は？（DJ ●●●●●●）",as:["ブレイク","breakbeat","ブレイクビーツ"],
         hint:"💡 タイタン衛星の氷の海の底..."}},
];

function isPlanetUnlocked(planetId,char){
  const cp=char.clearedPlanets||[];
  const fp=char.ufoFoundParts||[];
  const hasUFO=(ids)=>ids.every(id=>fp.includes(id));
  switch(planetId){
    case"moon_base":return true;
    case"mars":     return cp.includes("moon_base")&&hasUFO(["u_m1","u_m2"]);
    case"jupiter":  return cp.includes("mars")&&hasUFO(["u_r1","u_r2"]);
    case"saturn":   return cp.includes("jupiter")&&hasUFO(["u_j1","u_j2"]);
    case"pluto":    return cp.includes("saturn")&&hasUFO(["u_s1","u_s2"]);
    case"galaxy":   return cp.includes("pluto");
    default:        return false;
  }
}

function getUFOPartsForPlanet(fromPlanet){
  return UFO_PARTS.filter(p=>p.foundOn===fromPlanet);
}

/* ── 🚀 SPACE MAP ── */
const SPACE_CITIES_DATA={
  moon_base:  {id:"moon_base",  name:"月基地",     e:"🌙",g:"popping",   lv:35,
    ch:{name:"LUNAR DANCER",e:"🌙",pw:14000},
    bosses:[{name:"LUNAR DANCER",e:"🌙",pw:14000,style:"popping",intro:"月面に響くPOPPIN！無重力でもリズムは止まらない！"}],
    rw:{exp:4000,coins:30000,title:"Lunar Popper"},
    desc:"月面基地。地球を見下ろしながら踊る究極の舞台",
    food:[{n:"宇宙食カレー",p:2000,e:20,h:40,desc:"JAXAの宇宙食！無重力でも食べられる特製カレー"},{n:"月のクレーター餅",p:1000,e:10,h:25,desc:"月面で発見された謎の餅状物質...うまい"}]},
  mars:       {id:"mars",       name:"火星",       e:"🔴",g:"breaking",  lv:40,
    ch:{name:"MARS WARRIOR",e:"🔴",pw:18000},
    bosses:[
      {name:"MARS WARRIOR",  e:"🔴",pw:18000,style:"breaking",    intro:"火星の重力でBREAKING！赤い砂塵が舞う！"},
      {name:"RED PLANET BBOY",e:"💥",pw:19500,style:"hiphop",     intro:"火星のHIPHOPは地球より激しい！"},
    ],
    rw:{exp:5500,coins:45000,title:"Mars Warrior"},
    desc:"赤い惑星。低重力がBREAKINGに革命をもたらす",
    food:[{n:"火星岩塩ステーキ",p:5000,e:28,h:55,desc:"火星で採れた希少な岩塩で味付けた宇宙の最高峰"},{n:"テラフォームドリンク",p:2000,e:15,h:30,desc:"火星の大気を利用した特殊飲料。エネルギー爆発！"}]},
  jupiter:    {id:"jupiter",    name:"木星",       e:"⚡",g:"hiphop",    lv:45,
    ch:{name:"JUPITER THUNDER",e:"⚡",pw:22000},
    bosses:[
      {name:"JUPITER THUNDER",e:"⚡",pw:22000,style:"hiphop",      intro:"木星の嵐の中でHIPHOP！大赤斑のリズムで踊れ！"},
      {name:"GREAT RED SPOT", e:"🌪",pw:24000,style:"waacking",    intro:"大赤斑の暴風がWAACKING！宇宙最強の嵐！"},
    ],
    rw:{exp:7000,coins:60000,title:"Jupiter Thunder"},
    desc:"太陽系最大の惑星。嵐の中でダンスする究極の試練",
    food:[{n:"ガスジャイアントラーメン",p:8000,e:35,h:60,desc:"木星のガスから生成された謎の液体で作るラーメン"},{n:"嵐のエネルギーゼリー",p:3000,e:20,h:40,desc:"大赤斑の電気エネルギーを凝縮した究極のゼリー"}]},
  saturn:     {id:"saturn",     name:"土星",       e:"🪐",g:"ballet",    lv:43,
    ch:{name:"SATURN ELEGANT",e:"🪐",pw:20000},
    bosses:[{name:"SATURN ELEGANT",e:"🪐",pw:20000,style:"ballet",intro:"土星の輪の上でBALLET！宇宙で最も美しいダンス！"}],
    rw:{exp:6000,coins:50000,title:"Saturn Ballet Master"},
    desc:"美しい環を持つ惑星。零重力BALLETの頂点",
    food:[{n:"リングスープ",p:6000,e:30,h:52,desc:"土星の輪の成分（氷と岩石）から作った宇宙のスープ"},{n:"シルキームーン",p:3000,e:15,h:35,desc:"土星の月タイタンで採れた絹のような食材のデザート"}]},
  uranus:     {id:"uranus",     name:"天王星",     e:"🌀",g:"waacking",  lv:44,
    ch:{name:"URANUS ELECTRIC",e:"🌀",pw:21000},
    bosses:[{name:"URANUS ELECTRIC",e:"🌀",pw:21000,style:"waacking",intro:"横倒しの惑星天王星！異次元WAACKINGが炸裂する！"}],
    rw:{exp:6500,coins:55000,title:"Uranus Wave King"},
    desc:"横倒しに自転する不思議な惑星。WAACKINGの極致",
    food:[{n:"ブルーアイスダイン",p:5000,e:25,h:45,desc:"天王星の青い大気から結晶化した幻のアイス"},{n:"メタンフォンデュ",p:4000,e:18,h:38,desc:"天王星のメタン海から作った宇宙チーズフォンデュ"}]},
  pluto:      {id:"pluto",      name:"冥王星",     e:"💫",g:"jazz",      lv:42,
    ch:{name:"PLUTO SHADOW",e:"💫",pw:19000},
    bosses:[
      {name:"PLUTO SHADOW", e:"💫",pw:19000,style:"jazz",    intro:"太陽系の果て！孤独な冥王星でJAZZが響く..."},
      {name:"💀 HADES",     e:"💀",pw:99999,style:"breaking",intro:"冥界の王ハーデス降臨！全惑星を制した者よ...ここが終着点だ！宇宙の覇権を懸けて踊れ！！！",isHades:true},
    ],
    rw:{exp:5800,coins:48000,title:"Pluto Jazz King"},
    desc:"太陽系の端。孤独と静寂の中でJAZZが輝く",
    food:[{n:"ダークマターシチュー",p:9000,e:32,h:58,desc:"冥王星の暗黒物質から作ったという謎のシチュー"},{n:"ニュートリノスープ",p:4000,e:20,h:40,desc:"冥王星を貫通するニュートリノを凝縮したスープ"}]},
  galaxy:     {id:"galaxy",     name:"銀河中心",   e:"🌌",g:"hiphop",   lv:70,
    ch:{name:"GALAXY EMPEROR",e:"🌌",pw:50000},
    bosses:[{name:"GALAXY EMPEROR",e:"🌌",pw:50000,style:"hiphop",intro:"銀河の中心に君臨する最強のダンサー！全ジャンルを超えた存在！真のラスボス！"}],
    rw:{exp:20000,coins:200000,title:"🌌 GALAXY CHAMPION"},
    desc:"銀河の中心。ここを超えた者が真の伝説となる",
    food:[{n:"ビッグバンバーガー",p:50000,e:50,h:100,desc:"宇宙誕生のエネルギーを凝縮！食べると全能力MAX！"},{n:"クオーサーエリクサー",p:30000,e:40,h:80,desc:"最強の天体クオーサーから抽出した究極の液体"}]},
};

const SPC_W=32,SPC_H=40;
const SPC_WALK_CITIES=[
  {id:"moon_base",x:5, y:5,  name:"月基地",   e:"🌙",g:"popping"},
  {id:"mars",     x:16,y:8,  name:"火星",     e:"🔴",g:"breaking"},
  {id:"saturn",   x:25,y:12, name:"土星",     e:"🪐",g:"ballet"},
  {id:"jupiter",  x:24,y:20, name:"木星",     e:"⚡",g:"hiphop"},
  {id:"uranus",   x:14,y:22, name:"天王星",   e:"🌀",g:"waacking"},
  {id:"pluto",    x:6, y:30, name:"冥王星",   e:"💫",g:"jazz"},
  {id:"galaxy",   x:26,y:34, name:"銀河中心", e:"🌌",g:"hiphop"},
];

function buildSPCMap(){
  const G=Array.from({length:SPC_H},()=>new Array(SPC_W).fill('.'));
  const s=(x,y,t)=>{if(y>=0&&y<SPC_H&&x>=0&&x<SPC_W)G[y][x]=t;};
  // 小惑星帯（通行不可）
  for(let x=10;x<20;x++)s(x,15,'^');
  for(let x=18;x<28;x++)s(x,28,'^');
  SPC_WALK_CITIES.forEach(c=>s(c.x,c.y,'@'));
  return G;
}
const SPC_MAP=buildSPCMap();

function SpaceWalkMode({char,setChar,genre,onExit,pushNotif,addLog}){
  const hasRover=(char.specialItems||[]).includes("moon_rover");
  const[pos,setPos]=useState({x:SPC_WALK_CITIES[0].x,y:SPC_WALK_CITIES[0].y});
  const[cityAt,setCityAt]=useState(null);
  const[cityMini,setCityMini]=useState(null);
  const[battle,setBattle]=useState(null);
  const[steps,setSteps]=useState(0);
  const[msg,setMsg]=useState(hasRover?"🚗 探索車を起動... 星々が待っている。":"🌌 探索車がない...動けない...");

  const camX=Math.max(0,Math.min(SPC_W-VW,pos.x-Math.floor(VW/2)));
  const camY=Math.max(0,Math.min(SPC_H-VH,pos.y-Math.floor(VH/2)));
  const gt=(x,y)=>{if(x<0||x>=SPC_W||y<0||y>=SPC_H)return'~';return SPC_MAP[y]?.[x]||'.';}
  const cityAt2=(x,y)=>SPC_WALK_CITIES.find(c=>c.x===x&&c.y===y)||null;

  function move(dir){
    if(!hasRover){pushNotif("🚗 月の探索車が必要！","#c0c0ff");return;}
    if(cityAt||cityMini)return;
    setPos(prev=>{
      let{x,y}=prev;let nx=x,ny=y;
      if(dir==="up")ny--;if(dir==="down")ny++;if(dir==="left")nx--;if(dir==="right")nx++;
      if(nx<0||nx>=SPC_W||ny<0||ny>=SPC_H)return prev;
      if(gt(nx,ny)==='^')return prev; // 小惑星帯
      const city=cityAt2(nx,ny);
      if(city){setCityAt(city);setMsg(`${city.e} ${city.name}に到着！`);return{x:nx,y:ny};}
      setSteps(s=>s+1);return{x:nx,y:ny};
    });
  }

  useEffect(()=>{
    const h=e=>{const m={ArrowUp:"up",ArrowDown:"down",ArrowLeft:"left",ArrowRight:"right",w:"up",s:"down",a:"left",d:"right"};if(m[e.key]){e.preventDefault();move(m[e.key]);}};
    window.addEventListener("keydown",h);return()=>window.removeEventListener("keydown",h);
  },[pos,cityAt,cityMini,hasRover]);

  if(cityMini){
    const cd=SPACE_CITIES_DATA[cityMini];
    const wc=SPC_WALK_CITIES.find(c=>c.id===cityMini);
    if(!cd){setCityMini(null);return null;}
    const ufoFoundParts=char.ufoFoundParts||[];
    const clearedPlanets=char.clearedPlanets||[];
    const planetCleared=clearedPlanets.includes(cityMini);
    const myUFOParts=getUFOPartsForPlanet(cityMini);
    const nextPlanetId={"moon_base":"mars","mars":"jupiter","jupiter":"saturn","saturn":"pluto"}[cityMini];
    const nextPlanetName=nextPlanetId?SPC_WALK_CITIES.find(c=>c.id===nextPlanetId)?.name:"";
    const[quizOpen,setQuizOpen]=useState(null);
    const[quizInput,setQuizInput]=useState("");
    const[quizResult,setQuizResult]=useState(null);
    return<div style={{paddingBottom:80}}>
      {battle&&<BattleOverlay state={battle} gc={genre.c} onClose={()=>setBattle(null)}/>}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 12px",background:"#020210",borderBottom:"1px solid #2a2a5a",marginBottom:12}}>
        <span style={{color:"#c0c0ff",fontWeight:700,fontFamily:"M PLUS Rounded 1c,sans-serif"}}>{wc?.e} {wc?.name}</span>
        <button onClick={()=>{setCityMini(null);setCityAt(null);setQuizOpen(null);}} style={{fontSize:10,color:"#6060a0",background:"none",border:"1px solid #2a2a5a",borderRadius:4,padding:"4px 8px",cursor:"pointer"}}>← SPACE</button>
      </div>

      {(cd.bosses||[]).map((boss,bi)=>{
        const isHades=boss.isHades;
        const hadesLocked=isHades&&!planetCleared;
        return(<div key={bi} style={{background:"#0a0a20",borderRadius:10,margin:"0 4px 12px",border:`1px solid ${isHades?"#ff000066":"#3a3a8a"}`,padding:"18px 16px",textAlign:"center",opacity:hadesLocked?.4:1}}>
          <div style={{fontSize:isHades?64:52,marginBottom:8}}>{boss.e}</div>
          {isHades&&<div style={{fontFamily:"'Press Start 2P',monospace",fontSize:7,color:"#ff4444",marginBottom:6,letterSpacing:1}}>⚠️ 冥界の王</div>}
          <div style={{fontFamily:"'Press Start 2P',monospace",fontSize:7,color:isHades?"#ff4444":"#c0c0ff",marginBottom:4}}>{bi===0?"BOSS":"CHALLENGER"}</div>
          <div style={{fontSize:17,color:isHades?"#ff8888":"#e0e0ff",fontWeight:900,fontFamily:"M PLUS Rounded 1c,sans-serif",marginBottom:4}}>{boss.name}</div>
          <div style={{fontSize:10,color:"#6060a0",marginBottom:6}}>{GENRES[boss.style]?.e}{GENRES[boss.style]?.jp} · POWER {boss.pw===99999?"∞ 99,999":boss.pw.toLocaleString()}</div>
          {boss.intro&&<div style={{fontSize:11,color:isHades?"#ff9090":"#9090d0",marginBottom:12,fontFamily:"M PLUS Rounded 1c,sans-serif",fontStyle:"italic"}}>「{boss.intro}」</div>}
          {hadesLocked?<div style={{fontSize:11,color:"#6060a0",fontFamily:"M PLUS Rounded 1c,sans-serif",padding:8,background:"#100010",borderRadius:6}}>
            🔒 冥王星のBOSSを倒してから挑め
          </div>:<Btn disabled={char.energy<30} col={isHades?"#200000":"#080820"} tc={isHades?"#ff4444":"#c0c0ff"} onClick={async()=>{
            if(char.energy<30){pushNotif("⚡30必要！","#ff5555");return;}
            const btl=buildBattle(char,boss.style||cd.g,boss.pw);
            setBattle({phase:"seq",...btl,oppName:boss.name,step:0});
            for(let ii=0;ii<8;ii++){await new Promise(r=>setTimeout(r,_battleSpeed===2?380:1050));setBattle(b=>b?{...b,step:Math.min(b.step+1,7)}:null);}
            const{won,flags}=btl;
            const eg=won?cd.rw.exp:Math.floor(cd.rw.exp*.5);
            const coins=won?cd.rw.coins:Math.floor(cd.rw.coins*.5);
            const hadesTitle=won&&isHades?"🌌 宇宙の覇者":null;
            setChar(c=>({...c,exp:c.exp+eg,coins:c.coins+coins,energy:Math.max(0,c.energy-30),
              mood:won?Math.min(100,c.mood+30):Math.max(0,c.mood-15),
              battlesWon:won?c.battlesWon+1:c.battlesWon,
              clearedPlanets:won&&bi===0&&!clearedPlanets.includes(cityMini)?[...(c.clearedPlanets||[]),cityMini]:c.clearedPlanets||[],
              titles:hadesTitle?[...(c.titles||[]),hadesTitle]:c.titles||[]}));
            setBattle({phase:"result",won,eg,coins,flags,myP:btl.myP,thP:btl.thP});
            if(won){Sound.fanfare();if(isHades)pushNotif("🌌 HADES撃破！宇宙の覇者！","#ffd60a");}
            else Sound.lose();
            addLog(`${won?"🏆":"💀"} vs ${boss.name} @${wc?.name} +${eg}EXP`);
          }} full sx={{fontSize:12,padding:"14px",fontWeight:700,border:`1px solid ${isHades?"#440000":"#4a4aaa"}`}}>
            {isHades?"💀 HADES に挑む！":"⚔️ バトル！"} ⚡30
          </Btn>}
        </div>);
      })}

      {/* 🛸 UFOパーツクイズ */}
      {myUFOParts.length>0&&<div style={{margin:"0 4px 12px",background:"#08081a",borderRadius:10,padding:14,border:"1px solid #4a4a88"}}>
        <div style={{fontFamily:"'Press Start 2P',monospace",fontSize:7,color:"#c0c0ff",marginBottom:4}}>🛸 UFOパーツ</div>
        <div style={{fontSize:10,color:"#6060a0",marginBottom:10,fontFamily:"M PLUS Rounded 1c,sans-serif"}}>
          {nextPlanetName}へ行くには謎を解け！
        </div>
        {myUFOParts.map(part=>{
          const found=ufoFoundParts.includes(part.id);
          const isOpen=quizOpen===part.id;
          return(<div key={part.id} style={{marginBottom:10,padding:"10px 12px",background:found?"#0a1a0a":"#0a0a18",borderRadius:8,border:`1px solid ${found?"#00ff88":"#2a2a4a"}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:found?0:6}}>
              <span style={{fontSize:12,fontWeight:700,color:found?"#00ff88":"#a0a0ff",fontFamily:"M PLUS Rounded 1c,sans-serif"}}>{part.name}</span>
              <span style={{fontSize:14}}>{found?"✅":"⬜"}</span>
            </div>
            {!found&&<div>
              {isOpen?(
                <div>
                  <div style={{fontSize:11,color:"#e0e0ff",marginBottom:8,fontFamily:"M PLUS Rounded 1c,sans-serif",fontWeight:700,background:"#080820",padding:8,borderRadius:6}}>
                    ❓ {part.quiz.q}
                  </div>
                  <input value={quizInput} onChange={e=>setQuizInput(e.target.value)}
                    onKeyDown={e=>{if(e.key==="Enter"){
                      const ans=quizInput.trim().toLowerCase();
                      const ok=part.quiz.as.some(a=>ans.includes(a.toLowerCase())||a.toLowerCase().includes(ans));
                      setQuizResult(ok?"correct":"wrong");
                      if(ok)setTimeout(()=>{
                        setChar(c=>({...c,ufoFoundParts:[...(c.ufoFoundParts||[]),part.id]}));
                        pushNotif(`🛸 ${part.name}発見！`,"#c0c0ff");
                        addLog(`🛸 UFOパーツ取得：${part.name}`);
                        setQuizOpen(null);setQuizInput("");setQuizResult(null);
                      },1200);
                    }}}
                    placeholder="答えを入力..."
                    style={{width:"100%",padding:"8px",background:"#050515",border:`1px solid ${quizResult==="correct"?"#00ff88":quizResult==="wrong"?"#ff5555":"#3a3a6a"}`,borderRadius:6,color:"#e0e0ff",fontSize:12,fontFamily:"M PLUS Rounded 1c,sans-serif",boxSizing:"border-box"}}/>
                  {quizResult==="wrong"&&<div style={{fontSize:10,color:"#ff5555",marginTop:4,fontFamily:"M PLUS Rounded 1c,sans-serif"}}>❌ 不正解！もう一度...</div>}
                  {quizResult==="correct"&&<div style={{fontSize:10,color:"#00ff88",marginTop:4,fontFamily:"M PLUS Rounded 1c,sans-serif"}}>✅ 正解！パーツを発見！</div>}
                  <div style={{display:"flex",gap:6,marginTop:8}}>
                    <Btn col="#080820" tc="#c0c0ff" onClick={()=>{
                      const ans=quizInput.trim().toLowerCase();
                      const ok=part.quiz.as.some(a=>ans.includes(a.toLowerCase())||a.toLowerCase().includes(ans));
                      setQuizResult(ok?"correct":"wrong");
                      if(ok)setTimeout(()=>{
                        setChar(c=>({...c,ufoFoundParts:[...(c.ufoFoundParts||[]),part.id]}));
                        pushNotif(`🛸 ${part.name}発見！`,"#c0c0ff");
                        setQuizOpen(null);setQuizInput("");setQuizResult(null);
                      },1200);
                    }} sx={{flex:2,fontSize:11,border:"1px solid #3a3a8a"}}>決定</Btn>
                    <Btn col="#050515" tc="#6060a0" onClick={()=>{setQuizOpen(null);setQuizInput("");setQuizResult(null);}} sx={{flex:1,fontSize:10}}>閉じる</Btn>
                  </div>
                </div>
              ):<Btn col="#08081a" tc="#a0a0ff" onClick={()=>{setQuizOpen(part.id);setQuizResult(null);setQuizInput("");}} full sx={{fontSize:11,border:"1px solid #3a3a6a"}}>
                🧠 クイズに答えてパーツを探す
              </Btn>}
            </div>}
          </div>);
        })}
        {myUFOParts.every(p=>ufoFoundParts.includes(p.id))&&(
          <div style={{textAlign:"center",padding:10,background:"#0a2a0a",borderRadius:8,border:"1px solid #00ff88",marginTop:8}}>
            <div style={{fontSize:18,marginBottom:4}}>🛸</div>
            <div style={{fontSize:11,color:"#00ff88",fontWeight:700,fontFamily:"M PLUS Rounded 1c,sans-serif"}}>UFO完成！{nextPlanetName}へ出発できる！</div>
          </div>
        )}
      </div>}

      {cd.food?.length>0&&<div style={{margin:"0 4px 12px",background:"#080818",borderRadius:10,padding:14,border:"1px solid #2a2a5a"}}>
        <div style={{fontFamily:"'Press Start 2P',monospace",fontSize:7,color:"#c0c0ff",marginBottom:10}}>🍽 SPACE FOOD</div>
        {cd.food.map((f,i)=>(
          <div key={i} style={{background:BG3,borderRadius:6,padding:"8px 10px",marginBottom:8}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
              <div><div style={{fontWeight:700,fontSize:12,color:TX}}>{f.n}</div><div style={{fontSize:9,color:TX3}}>{f.desc}</div></div>
              <div style={{fontSize:11,color:char.coins>=f.p?"#b3ff00":"#ff5555",fontWeight:700}}>¥{f.p.toLocaleString()}</div>
            </div>
            <Btn disabled={char.coins<f.p} col="#080818" tc="#c0c0ff" onClick={()=>{
              const MAX=getMaxEnergy(getLvCapped(char.exp,char.artifacts));
              setChar(c=>({...c,coins:c.coins-f.p,energy:Math.min(MAX,c.energy+f.e),mood:Math.min(100,(c.mood||50)+10)}));
              pushNotif(`${f.n}食べた！⚡+${f.e}`,"#c0c0ff");
            }} full sx={{fontSize:11}}>食べる（¥{f.p.toLocaleString()}）</Btn>
          </div>
        ))}
      </div>}
      <DPad onMove={()=>{}}/>
      <AButton onPress={()=>{setCityMini(null);setCityAt(null);setQuizOpen(null);}} col="#c0c0ff" sub="EXIT"/>
    </div>;
  }

  const gc=genre.c;
  return(<div style={{background:"#020210",minHeight:"100vh",paddingBottom:180}}>
    {battle&&<BattleOverlay state={battle} gc={gc} onClose={()=>setBattle(null)}/>}
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 14px",background:"#0a0a20",borderBottom:"2px solid #3a3a8a"}}>
      <div>
        <div style={{fontFamily:"'Press Start 2P',monospace",fontSize:8,color:"#c0c0ff",letterSpacing:2}}>🚀 SPACE MAP</div>
        <div style={{fontSize:10,color:"#6060a0",fontFamily:"M PLUS Rounded 1c,sans-serif",marginTop:2}}>
          {hasRover?"🚗 探索車：稼働中":"❌ 探索車なし"} · {steps}歩
        </div>
      </div>
      <button onClick={onExit} style={{fontSize:10,color:"#6060a0",background:"none",border:"1px solid #2a2a5a",borderRadius:4,padding:"5px 10px",cursor:"pointer"}}>🗺 WORLD MAP</button>
    </div>
    {!hasRover&&<div style={{margin:"8px 4px",padding:14,background:"#080820",border:"2px solid #4a4aff",borderRadius:10,textAlign:"center"}}>
      <div style={{fontSize:28,marginBottom:8}}>🚗</div>
      <div style={{fontFamily:"'Press Start 2P',monospace",fontSize:8,color:"#c0c0ff",marginBottom:8}}>探索車が必要！</div>
      <div style={{fontSize:11,color:"#6060a0",fontFamily:"M PLUS Rounded 1c,sans-serif"}}>ショップ →「👑伝説」タブ<br/>月の石を持っていると購入できる</div>
    </div>}
    <div style={{margin:"8px 4px",border:"1px solid #2a2a5a",borderRadius:8,overflow:"hidden",position:"relative"}}>
      <svg viewBox={`0 0 ${VW*TS} ${VH*TS}`} width="100%" style={{display:"block"}}>
        <rect width={VW*TS} height={VH*TS} fill="#020210"/>
        {/* 星 */}
        {Array.from({length:40},(_,i)=><circle key={i} cx={Math.sin(i*37)*999%( VW*TS)} cy={Math.cos(i*53)*999%(VH*TS)} r="1" fill="#ffffff" opacity={.3+Math.sin(i)*.2}/>)}
        {Array.from({length:VH},(_,vy)=>Array.from({length:VW},(_,vx)=>{
          const mx=camX+vx,my=camY+vy;
          const t=gt(mx,my);
          const city=cityAt2(mx,my);
          const gc2=city?GENRES[city.g]?.c||"#888":null;
          return(<g key={`${vx}-${vy}`}>
            <rect x={vx*TS} y={vy*TS} width={TS} height={TS} fill={t==='^'?"#1a1228":"#030315"} stroke="#060618" strokeWidth=".3"/>
            {t==='^'&&<text x={vx*TS+TS*.5} y={vy*TS+TS*.62} textAnchor="middle" dominantBaseline="middle" fontSize={TS*.5}>🪨</text>}
            {city&&<g>
              <circle cx={vx*TS+TS*.5} cy={vy*TS+TS*.5} r={TS*.45} fill={`${gc2}33`} stroke={gc2} strokeWidth="1.5" style={{filter:`drop-shadow(0 0 4px ${gc2})`}}/>
              <text x={vx*TS+TS*.5} y={vy*TS+TS*.52} textAnchor="middle" dominantBaseline="middle" fontSize={TS*.55}>{city.e}</text>
              <text x={vx*TS+TS*.5} y={vy*TS+TS*.92} textAnchor="middle" fontSize="3.5" fill={gc2} fontFamily="M PLUS Rounded 1c,sans-serif">{city.name}</text>
            </g>}
          </g>);
        }))}
        {(()=>{const vx=pos.x-camX,vy=pos.y-camY;if(vx<0||vx>=VW||vy<0||vy>=VH)return null;return(<g>
          <text x={vx*TS+TS*.5} y={vy*TS+TS*.6} textAnchor="middle" dominantBaseline="middle" fontSize={TS*.65}>{hasRover?"🚗":genre.e}</text>
        </g>);})()}
      </svg>
      <div style={{position:"absolute",top:5,right:5,width:42,height:32,background:"rgba(0,0,0,.85)",borderRadius:4,border:"1px solid #2a2a5a",overflow:"hidden"}}>
        <svg viewBox={`0 0 ${SPC_W} ${SPC_H}`} width="42" height="32">
          <rect width={SPC_W} height={SPC_H} fill="#020210"/>
          {SPC_WALK_CITIES.map(c=><circle key={c.id} cx={c.x} cy={c.y} r="2" fill={GENRES[c.g]?.c||"#888"}/>)}
          <circle cx={pos.x} cy={pos.y} r="2.5" fill="#fff"/>
        </svg>
      </div>
    </div>
    {msg&&<div style={{margin:"0 4px 6px",padding:"8px 12px",background:"#0a0a20",borderRadius:6,fontSize:11,color:"#c0c0ff",fontFamily:"M PLUS Rounded 1c,sans-serif"}}>{msg}</div>}
    {cityAt&&<div style={{margin:"0 4px 8px",padding:14,background:"#0a0a20",borderRadius:10,border:`2px solid ${GENRES[cityAt.g]?.c||"#6060ff"}66`}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <div style={{display:"flex",gap:10,alignItems:"center"}}>
          <span style={{fontSize:32}}>{cityAt.e}</span>
          <div><div style={{fontWeight:700,fontSize:16,color:GENRES[cityAt.g]?.c||"#c0c0ff",fontFamily:"M PLUS Rounded 1c,sans-serif"}}>{cityAt.name}</div></div>
        </div>
        <button onClick={()=>setCityAt(null)} style={{color:"#6060a0",fontSize:22,background:"none",border:"none",cursor:"pointer"}}>✕</button>
      </div>
      {isPlanetUnlocked(cityAt.id,char)?(
        <Btn col="#080820" tc={GENRES[cityAt.g]?.c||"#c0c0ff"} onClick={()=>setCityMini(cityAt.id)} full sx={{fontSize:13,fontWeight:700,padding:"12px",border:"1px solid #3a3a8a"}}>
          🚀 {cityAt.name}に降り立つ
        </Btn>
      ):(
        <div style={{textAlign:"center",padding:12,background:"#080820",borderRadius:8,border:"1px solid #2a2a5a"}}>
          <div style={{fontSize:11,color:"#6060a0",fontFamily:"M PLUS Rounded 1c,sans-serif"}}>
            🔒 前の惑星をクリア＋UFOを作れ！
          </div>
        </div>
      )}
    </div>}
    {!cityAt&&<div style={{textAlign:"center",fontSize:9,color:"#3a3a6a",fontFamily:"M PLUS Rounded 1c,sans-serif"}}>
      {hasRover?"🚗 十字キーで宇宙を探索！":"🚗 ショップで探索車を購入すると動ける"}
    </div>}
    <DPad onMove={move}/>
    {cityAt&&<AButton onPress={()=>setCityMini(cityAt.id)} col="#c0c0ff" sub="降り立つ"/>}
  </div>);
}

/* ── 🌙 MOON WALK MODE ── */
const MOON_W=20,MOON_H=15;
const MOON_TILES=[
  "~~~~~~~~~~~~~~~~~~~~",
  "~~..............~~~~",
  "~...............~~~~",
  "~................~~~",
  "~.......^^.......~~~",
  "~......^^^^.......~~",
  "~.....^^^^^^^.....~~",
  "~................~~~",
  "~...............~~~~",
  "~~..............~~~~",
  "~~~..........~~~~~~~",
  "~~~~.......~~~~~~~~~",
  "~~~~~.....~~~~~~~~~~",
  "~~~~~~...~~~~~~~~~~~",
  "~~~~~~~~~~~~~~~~~~~~",
];
const MOON_STONE_POS={x:3,y:2}; // 光る石の場所（左上隅に隠れてる）

function MoonWalkMode({char,setChar,genre,onExit,pushNotif,addLog}){
  const[pos,setPos]=useState({x:10,y:7}); // 中央からスタート
  const[gotStone,setGotStone]=useState(false);
  const[msg,setMsg]=useState("🌙 月面に降り立った... 静寂だ。");

  const hasStone=(char.specialItems||[]).includes("moon_stone");

  function gt(x,y){if(y<0||y>=MOON_H||x<0||x>=MOON_W)return'~';return MOON_TILES[y]?.[x]||'~';}

  function move(dir){
    if(gotStone)return;
    setPos(prev=>{
      let{x,y}=prev;let nx=x,ny=y;
      if(dir==="up")ny--;if(dir==="down")ny++;if(dir==="left")nx--;if(dir==="right")nx++;
      if(gt(nx,ny)==='~'||gt(nx,ny)==='^')return prev;
      // 月の石チェック
      if(nx===MOON_STONE_POS.x&&ny===MOON_STONE_POS.y&&!hasStone){
        setTimeout(()=>{
          setGotStone(true);
          setChar(c=>({...c,specialItems:[...(c.specialItems||[]),"moon_stone"]}));
          setMsg("✨「これは...！謎の輝きを持つ石を拾った」");
          addLog("🌙 月の石を発見！");
          pushNotif("🌙 月の石を手に入れた！","#c0c0ff");
        },100);
      }
      return{x:nx,y:ny};
    });
  }

  useEffect(()=>{
    const h=e=>{const m={ArrowUp:"up",ArrowDown:"down",ArrowLeft:"left",ArrowRight:"right",w:"up",s:"down",a:"left",d:"right"};if(m[e.key]){e.preventDefault();move(m[e.key]);}};
    window.addEventListener("keydown",h);return()=>window.removeEventListener("keydown",h);
  },[pos,gotStone]);

  const TS2=24;
  const tileColor=(t)=>({'.':'#1a1a2a','^':'#2a2a3a','~':'#050510'}[t]||'#050510');

  return(<div style={{background:"#020210",minHeight:"100vh",paddingBottom:180}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 14px",background:"#0a0a20",borderBottom:"1px solid #2a2a5a"}}>
      <div style={{fontFamily:"'Press Start 2P',monospace",fontSize:9,color:"#c0c0ff",letterSpacing:2}}>🌙 MOON SURFACE</div>
      <button onClick={onExit} style={{fontSize:10,color:"#6060a0",background:"none",border:"1px solid #2a2a5a",borderRadius:4,padding:"5px 10px",cursor:"pointer"}}>← MAP</button>
    </div>

    {/* 星空背景 */}
    <div style={{textAlign:"center",padding:"8px 0 4px",fontSize:9,color:"#4a4a8a",fontFamily:"M PLUS Rounded 1c,sans-serif",letterSpacing:2}}>
      ✦ ✧ ✦ ✧ ✦ ✧ ✦ ✧ ✦ ✧ ✦ ✧ ✦
    </div>

    {/* マップ */}
    <div style={{margin:"4px",border:"1px solid #2a2a5a",borderRadius:8,overflow:"hidden"}}>
      <svg viewBox={`0 0 ${MOON_W*TS2} ${MOON_H*TS2}`} width="100%" style={{display:"block"}}>
        <rect width={MOON_W*TS2} height={MOON_H*TS2} fill="#020210"/>
        {/* 星 */}
        {[[30,20],[80,50],[150,30],[200,80],[300,40],[350,70],[100,100],[250,120]].map(([sx,sy],i)=>(
          <circle key={i} cx={sx} cy={sy} r="1.5" fill="#ffffff" opacity="0.6"/>
        ))}
        {/* タイル */}
        {Array.from({length:MOON_H},(_,y)=>Array.from({length:MOON_W},(_,x)=>{
          const t=gt(x,y);
          const isStone=x===MOON_STONE_POS.x&&y===MOON_STONE_POS.y&&!hasStone&&!gotStone;
          return(<g key={`${x}-${y}`}>
            <rect x={x*TS2} y={y*TS2} width={TS2} height={TS2} fill={tileColor(t)} stroke="#0a0a20" strokeWidth=".5"/>
            {t==='.'&&<rect x={x*TS2+2} y={y*TS2+2} width={TS2-4} height={TS2-4} fill="#1e1e30" rx="2"/>}
            {t==='^'&&<text x={x*TS2+TS2*.5} y={y*TS2+TS2*.65} textAnchor="middle" fontSize={TS2*.6}>🪨</text>}
            {isStone&&<g>
              <circle cx={x*TS2+TS2*.5} cy={y*TS2+TS2*.5} r={TS2*.35} fill="#4040ff" opacity="0.3"/>
              <text x={x*TS2+TS2*.5} y={y*TS2+TS2*.62} textAnchor="middle" fontSize={TS2*.55} style={{animation:"vi 1s ease infinite"}}>✨</text>
            </g>}
            {hasStone&&x===MOON_STONE_POS.x&&y===MOON_STONE_POS.y&&(
              <text x={x*TS2+TS2*.5} y={y*TS2+TS2*.62} textAnchor="middle" fontSize={TS2*.4} opacity=".3">　</text>
            )}
          </g>);
        }))}
        {/* プレイヤー */}
        {(()=>{const vx=pos.x,vy=pos.y;return(<g>
          <circle cx={vx*TS2+TS2*.5} cy={vy*TS2+TS2*.5} r={TS2*.4} fill={genre.c} stroke="#fff" strokeWidth="1.5" opacity=".9"/>
          <text x={vx*TS2+TS2*.5} y={vy*TS2+TS2*.58} textAnchor="middle" dominantBaseline="middle" fontSize={TS2*.45}>{genre.e}</text>
        </g>);})()}
      </svg>
    </div>

    {/* メッセージ */}
    <div style={{margin:"8px 4px",padding:"12px 14px",background:"#0a0a20",borderRadius:8,border:"1px solid #2a2a5a",fontFamily:"M PLUS Rounded 1c,sans-serif",fontSize:12,color:"#c0c0ff",lineHeight:1.7}}>
      {msg}
    </div>

    {gotStone&&<div style={{margin:"0 4px 12px",padding:16,background:"#0a0a2a",borderRadius:10,border:"1px solid #4a4aff",textAlign:"center"}}>
      <div style={{fontSize:32,marginBottom:8}}>🌙</div>
      <div style={{fontFamily:"'Press Start 2P',monospace",fontSize:9,color:"#c0c0ff",marginBottom:8}}>MOON STONE GET</div>
      <div style={{fontSize:11,color:"#8080c0",fontFamily:"M PLUS Rounded 1c,sans-serif",marginBottom:12}}>これが何かはわからない...<br/>でも何かが変わった気がする</div>
      <Btn onClick={onExit} col="#0a0a2a" tc="#c0c0ff" full sx={{fontSize:11,border:"1px solid #4a4aff"}}>← 地球に戻る</Btn>
    </div>}

    {hasStone&&!gotStone&&<div style={{margin:"0 4px",padding:12,background:"#0a0a20",borderRadius:8,border:"1px solid #2a2a5a",textAlign:"center",fontSize:10,color:"#4a4a8a",fontFamily:"M PLUS Rounded 1c,sans-serif"}}>
      🌙 月の石はすでに所持中
    </div>}

    {!gotStone&&!hasStone&&<div style={{textAlign:"center",fontSize:9,color:"#3a3a6a",fontFamily:"M PLUS Rounded 1c,sans-serif",marginTop:4}}>
      十字キーで探索...
    </div>}
    <DPad onMove={move}/>
  </div>);
}

/* ── AFRICA CITIES DATA ── */
const AFRICA={
  cairo:      {id:"cairo",     name:"カイロ",         e:"🏛",g:"contemporary",lv:24,
    ch:{name:"PHARAOH DANCER",e:"🏛",pw:7800},
    bosses:[
      {name:"PHARAOH DANCER",e:"🏛",pw:7800, style:"contemporary",intro:"古代エジプトから続く舞踊の魂！ファラオの動きを見よ！"},
      {name:"NILE GODDESS",  e:"🌊",pw:8500, style:"ballet",      intro:"ナイル川の女神が舞う！エジプシャンバレエ！"},
    ],
    rw:{exp:1900,coins:13000,title:"Cairo Pharaoh Dancer"},
    desc:"古代から続くエジプト舞踊。世界最古のダンスの地",
    food:[{n:"コシャリ",p:200,e:10,h:30,desc:"エジプト国民食！豆・米・パスタの最強盛り合わせ"},{n:"クナーファ",p:400,e:8,h:22,desc:"チーズ入りの甘いエジプトスイーツ！シロップたっぷり"}]},
  dakar:      {id:"dakar",     name:"ダカール",       e:"🥁",g:"contemporary",lv:22,
    ch:{name:"SABAR MASTER",e:"🥁",pw:6800},
    bosses:[{name:"SABAR MASTER",e:"🥁",pw:6800,style:"contemporary",intro:"サバールドラムに合わせて踊れ！セネガルの魂！"}],
    rw:{exp:1600,coins:10000,title:"Dakar Sabar King"},
    desc:"サバール発祥の地。西アフリカCONTEMPORARYの聖地",
    food:[{n:"チェブジェン",p:800,e:16,h:40,desc:"セネガル国民食！魚と米の炊き込みご飯"},{n:"ティアクリ",p:300,e:7,h:20,desc:"キビ粉のデザート。セネガルのおばあちゃんの味"}]},
  lagos:      {id:"lagos",     name:"ラゴス",         e:"🎵",g:"hiphop",     lv:25,
    ch:{name:"AFROBEAT KING",e:"🎵",pw:8200},
    bosses:[
      {name:"AFROBEAT KING", e:"🎵",pw:8200,style:"hiphop",  intro:"Afrobeatが世界を変えた！ラゴスから全世界へ！"},
      {name:"LAGOS STRIKER", e:"⚡",pw:9000,style:"breaking",intro:"ナイジェリアBREAKINGシーン！爆発するエネルギー！"},
    ],
    rw:{exp:2000,coins:14000,title:"Lagos Afrobeat Legend"},
    desc:"Afrobeatの聖地。フェラ・クティの魂が生きる街",
    food:[{n:"ジョロフライス",p:600,e:14,h:36,desc:"西アフリカの魂の炊き込みご飯！スパイスが命"},{n:"スープ・オグボノ",p:700,e:12,h:32,desc:"マンゴーシードのシチュー！ナイジェリア定番"}]},
  douala:     {id:"douala",    name:"ドゥアラ",       e:"🌴",g:"hiphop",     lv:24,
    ch:{name:"CAMEROON GROOVER",e:"🌴",pw:7500},
    bosses:[{name:"CAMEROON GROOVER",e:"🌴",pw:7500,style:"hiphop",intro:"カメルーンのHIPHOPは独自進化！アフリカの心臓で踊れ！"}],
    rw:{exp:1800,coins:12000,title:"Douala Legend"},
    desc:"中央アフリカのHIPHOPシーンの中心地",
    food:[{n:"ンドレ",p:500,e:11,h:30,desc:"葉野菜と落花生の煮込み。カメルーンの家庭料理"},{n:"スフレ・ドゥ・バナン",p:300,e:7,h:18,desc:"バナナの揚げ物。ドゥアラの屋台名物"}]},
  daressalaam:{id:"daressalaam",name:"ダルエスサラーム",e:"🌅",g:"waacking", lv:23,
    ch:{name:"SWAHILI QUEEN",e:"🌅",pw:7200},
    bosses:[{name:"SWAHILI QUEEN",e:"🌅",pw:7200,style:"waacking",intro:"スワヒリ海岸の女王！WAACKINGで夕陽を切り裂く！"}],
    rw:{exp:1700,coins:11000,title:"Swahili Queen"},
    desc:"スワヒリ文化が息づく東アフリカの港町",
    food:[{n:"ウガリ＆スクマウィキ",p:300,e:9,h:28,desc:"東アフリカの主食！コーンミールと葉野菜"},{n:"ビリアニ（タンザニア式）",p:800,e:14,h:35,desc:"スパイス香るタンザニア風炊き込みご飯"}]},
  harare:     {id:"harare",    name:"ハラレ",         e:"🦁",g:"jazz",      lv:26,
    ch:{name:"ZIMBABWE JAZZ MAN",e:"🦁",pw:8800},
    bosses:[{name:"ZIMBABWE JAZZ MAN",e:"🦁",pw:8800,style:"jazz",intro:"ジンバブエのJAZZは独自進化！ムビラの音色で踊る！"}],
    rw:{exp:2100,coins:15000,title:"Harare Jazz Legend"},
    desc:"ムビラ音楽とジャズが融合したジンバブエの首都",
    food:[{n:"サザ＆ムトン",p:500,e:12,h:32,desc:"トウモロコシ粉の主食にマトンシチュー"},{n:"ムティケ（かぼちゃのデザート）",p:250,e:6,h:18,desc:"甘く煮たかぼちゃ。ジンバブエのおやつ"}]},
  johannesburg:{id:"johannesburg",name:"ヨハネスブルグ",e:"💎",g:"breaking", lv:28,
    ch:{name:"SOWETO B-BOY",e:"💎",pw:9500},
    bosses:[
      {name:"SOWETO B-BOY",  e:"💎",pw:9500, style:"breaking",    intro:"ソウェトから世界へ！南アフリカBREAKINGの頂点！"},
      {name:"PANTSULA KING", e:"👟",pw:10200,style:"hiphop",      intro:"パンツラ！南アフリカ独自のストリートダンス！"},
    ],
    rw:{exp:2300,coins:18000,title:"Johannesburg Legend"},
    desc:"ソウェトとパンツラ発祥の地。南アフリカのダンス首都",
    food:[{n:"ブラーイ（南アBBQ）",p:1500,e:20,h:45,desc:"南アフリカ式BBQ！ボーレウォース（ソーセージ）が旨い"},{n:"ビルトン",p:600,e:8,h:20,desc:"南アフリカの干し肉スナック！ジャーキーの王様"}]},
};

const AFR_W=36,AFR_H=65;
const AFR_WALK_CITIES=[
  {id:"cairo",       x:26,y:7,  name:"カイロ",         e:"🏛",g:"contemporary"},
  {id:"dakar",       x:3, y:20, name:"ダカール",       e:"🥁",g:"contemporary"},
  {id:"lagos",       x:13,y:26, name:"ラゴス",         e:"🎵",g:"hiphop"},
  {id:"douala",      x:17,y:34, name:"ドゥアラ",       e:"🌴",g:"hiphop"},
  {id:"daressalaam", x:28,y:38, name:"ダルエスサラーム",e:"🌅",g:"waacking"},
  {id:"harare",      x:24,y:48, name:"ハラレ",         e:"🦁",g:"jazz"},
  {id:"johannesburg",x:21,y:56, name:"ヨハネスブルグ", e:"💎",g:"breaking"},
];

function buildAFRMap(){
  const G=Array.from({length:AFR_H},()=>new Array(AFR_W).fill('~'));
  const s=(x,y,t)=>{if(y>=0&&y<AFR_H&&x>=0&&x<AFR_W)G[y][x]=t;};
  const rect=(x1,y1,x2,y2,t)=>{for(let y=Math.min(y1,y2);y<=Math.max(y1,y2);y++)for(let x=Math.min(x1,x2);x<=Math.max(x1,x2);x++)s(x,y,t);};
  const road=(x1,y1,x2,y2)=>{let x=x1,y=y1;while(y!==y2){s(x,y,'.');y+=(y<y2?1:-1);}while(x!==x2){s(x,y,'.');x+=(x<x2?1:-1);}s(x2,y2,'.');};
  // 北アフリカ（広大）
  rect(2,3,34,18,'f');rect(3,4,33,17,'.');
  // サハラ砂漠（山タイルで表現）
  rect(4,10,28,18,'^');
  // 西アフリカ
  rect(2,18,20,32,'f');rect(3,19,19,31,'.');
  // 中央アフリカ（密林）
  rect(12,28,28,42,'f');rect(13,29,27,41,'.');
  // 東アフリカ
  rect(22,30,34,50,'f');rect(23,31,33,49,'.');
  // 南アフリカ
  rect(10,46,30,62,'f');rect(11,47,29,61,'.');
  // 道路
  for(let i=0;i<AFR_WALK_CITIES.length-1;i++){
    const a=AFR_WALK_CITIES[i],b=AFR_WALK_CITIES[i+1];
    road(a.x,a.y,b.x,b.y);
  }
  road(3,20,26,7); // ダカール→カイロ（北アフリカ横断）
  road(13,26,28,38);// ラゴス→ダルエスサラーム（大陸横断）
  AFR_WALK_CITIES.forEach(c=>s(c.x,c.y,'@'));
  return G;
}
const AFR_MAP=buildAFRMap();

function AFRICAWalkMode(p){return<WorldWalkMode {...p} walkCities={AFR_WALK_CITIES} walkMap={AFR_MAP} cityData={AFRICA} mapW={AFR_W} mapH={AFR_H} regionName="AFRICA MAP" flagEmoji="🌍" mapId="africa"/>;}

/* ── SOUTH AMERICA CITIES DATA ── */
const SAMERICA={
  kingston:  {id:"kingston",  name:"キングストン", e:"🎵",g:"hiphop",      lv:20,
    ch:{name:"DANCEHALL KING",e:"🎵",pw:6000},
    bosses:[{name:"DANCEHALL KING",e:"🎵",pw:6000,style:"hiphop",intro:"ジャマイカから世界へ！レゲエとダンスホールの王！"}],
    rw:{exp:1400,coins:8500,title:"Kingston Legend"},
    desc:"レゲエ・ダンスホール発祥の地。ボブ・マーリーの故郷",
    food:[{n:"ジャークチキン",p:800,e:15,h:38,desc:"スパイシーな炭火焼きチキン！ジャマイカの魂"},{n:"アキーとソルトフィッシュ",p:600,e:12,h:30,desc:"ジャマイカの国民食！不思議な果物と塩漬け魚"}]},
  cali:      {id:"cali",      name:"カリ",         e:"💃",g:"waacking",    lv:22,
    ch:{name:"CALI SALSA QUEEN",e:"💃",pw:6800},
    bosses:[
      {name:"CALI SALSA QUEEN",e:"💃",pw:6800,style:"waacking",intro:"カリスタイルサルサ！コロンビアの情熱が爆発！"},
      {name:"AFRO KING",       e:"🌟",pw:7400,style:"contemporary",intro:"アフロコロンビアンダンスの真髄！"},
    ],
    rw:{exp:1600,coins:10000,title:"Cali Salsa Legend"},
    desc:"世界のサルサの首都カリ！WAACKINGのルーツにも繋がる",
    food:[{n:"バンデハ・パイサ",p:1200,e:20,h:45,desc:"コロンビア最強の盛り合わせ料理！ボリューム満点"},{n:"アレパ",p:300,e:8,h:22,desc:"コーンの生地を焼いたコロンビアのソウルフード"}]},
  lima:      {id:"lima",      name:"リマ",         e:"🦅",g:"breaking",   lv:23,
    ch:{name:"LIMA B-BOY",e:"🦅",pw:7000},
    bosses:[{name:"LIMA B-BOY",e:"🦅",pw:7000,style:"breaking",intro:"ペルーのB-BOYシーンは急成長中！マチュピチュの魂！"}],
    rw:{exp:1650,coins:10500,title:"Lima B-Boy"},
    desc:"南米BREAKING新興の聖地。インカの魂が宿る",
    food:[{n:"セビーチェ",p:1500,e:18,h:38,desc:"ペルーが誇る生魚のマリネ！世界最高峰の一皿"},{n:"ロモ・サルタード",p:1000,e:15,h:35,desc:"中華×ペルーのフュージョン炒め！"}]},
  salvador:  {id:"salvador",  name:"サルバドール", e:"🥁",g:"contemporary",lv:25,
    ch:{name:"AFRO BAHIA MASTER",e:"🥁",pw:8000},
    bosses:[{name:"AFRO BAHIA MASTER",e:"🥁",pw:8000,style:"contemporary",intro:"アフロブラジリアンダンスの聖地！カポエイラの魂！"}],
    rw:{exp:1900,coins:13000,title:"Bahia Legend"},
    desc:"アフロブラジル文化の中心地。カポエイラとサンバの聖地",
    food:[{n:"アカラジェ",p:400,e:10,h:28,desc:"黒目豆のアフリカ風揚げ物！サルバドールの屋台名物"},{n:"モケカ",p:1200,e:18,h:40,desc:"ココナッツミルクのシーフードシチュー！バイーア名物"}]},
  saopaulo:  {id:"saopaulo",  name:"サンパウロ",   e:"🌆",g:"hiphop",     lv:26,
    ch:{name:"SP HIP HOP KING",e:"🌆",pw:8500},
    bosses:[
      {name:"SP HIP HOP KING",e:"🌆",pw:8500,style:"hiphop",  intro:"ブラジルHIPHOPは世界最大規模！サンパウロが震える！"},
      {name:"BREAK SP",       e:"💥",pw:9200,style:"breaking",intro:"サンパウロのBREAKINGシーンも超一流！"},
    ],
    rw:{exp:2100,coins:15000,title:"São Paulo Legend"},
    desc:"南米最大都市。世界最大のHIPHOPシーンを誇る",
    food:[{n:"シュハスコ",p:2500,e:25,h:50,desc:"ブラジル式BBQ！炭火で焼いた肉が無限に来る！"},{n:"ピンガ（カシャーサ）",p:400,e:8,h:15,desc:"サトウキビ焼酎！カイピリーニャの原料"}]},
  rio:       {id:"rio",       name:"リオデジャネイロ",e:"🌴",g:"breaking", lv:27,
    ch:{name:"RIO BBOY",e:"🌴",pw:9000},
    bosses:[
      {name:"RIO BBOY",       e:"🌴",pw:9000, style:"breaking",    intro:"カポエイラがBREAKINGを生んだ！リオの街頭で踊れ！"},
      {name:"SAMBA WARRIOR",  e:"🎭",pw:9800, style:"contemporary",intro:"カーニバルの魂！サンバとCONTEMPORARYの融合！"},
    ],
    rw:{exp:2200,coins:16000,title:"Rio de Janeiro Legend"},
    desc:"カーニバルとカポエイラの都。BREAKING発祥の地の一つ",
    food:[{n:"カイピリーニャ",p:500,e:8,h:18,desc:"ライムとカシャーサの国民カクテル！リオの夜に"},{n:"アサイーボウル",p:600,e:12,h:28,desc:"アマゾン発祥のスーパーフード！リオっ子の朝ごはん"}]},
  buenosaires:{id:"buenosaires",name:"ブエノスアイレス",e:"🌹",g:"jazz",   lv:29,
    ch:{name:"TANGO MASTER",e:"🌹",pw:10000},
    bosses:[
      {name:"TANGO MASTER",  e:"🌹",pw:10000,style:"jazz",        intro:"タンゴはここから生まれた！アルゼンチンの魂！"},
      {name:"MILONGA QUEEN", e:"🌸",pw:10800,style:"contemporary",intro:"ミロンガのリズムで世界を制す女王！"},
    ],
    rw:{exp:2500,coins:20000,title:"Buenos Aires Tango Legend"},
    desc:"タンゴ発祥の地。南米最大のジャズダンスシーン",
    food:[{n:"アサード（アルゼンチンBBQ）",p:2000,e:24,h:48,desc:"世界最高の牛肉！炭火でじっくり焼く"},{n:"エンパナーダ",p:400,e:10,h:26,desc:"肉や野菜入りの揚げパイ。アルゼンチンの屋台名物"}]},
};

const SAM_W=34,SAM_H=65;
const SAM_WALK_CITIES=[
  {id:"kingston",   x:16,y:5,  name:"キングストン",  e:"🎵",g:"hiphop"},
  {id:"cali",       x:9, y:16, name:"カリ",          e:"💃",g:"waacking"},
  {id:"lima",       x:6, y:24, name:"リマ",          e:"🦅",g:"breaking"},
  {id:"salvador",   x:24,y:24, name:"サルバドール",  e:"🥁",g:"contemporary"},
  {id:"saopaulo",   x:22,y:34, name:"サンパウロ",    e:"🌆",g:"hiphop"},
  {id:"rio",        x:23,y:40, name:"リオ",          e:"🌴",g:"breaking"},
  {id:"buenosaires",x:14,y:54, name:"ブエノスアイレス",e:"🌹",g:"jazz"},
];

function buildSAMMap(){
  const G=Array.from({length:SAM_H},()=>new Array(SAM_W).fill('~'));
  const s=(x,y,t)=>{if(y>=0&&y<SAM_H&&x>=0&&x<SAM_W)G[y][x]=t;};
  const rect=(x1,y1,x2,y2,t)=>{for(let y=Math.min(y1,y2);y<=Math.max(y1,y2);y++)for(let x=Math.min(x1,x2);x<=Math.max(x1,x2);x++)s(x,y,t);};
  const road=(x1,y1,x2,y2)=>{let x=x1,y=y1;while(y!==y2){s(x,y,'.');y+=(y<y2?1:-1);}while(x!==x2){s(x,y,'.');x+=(x<x2?1:-1);}s(x2,y2,'.');};
  // カリブ海諸島（ジャマイカ）
  rect(13,3,20,8,'f');rect(14,4,19,7,'.');
  // 中央アメリカ〜コロンビア
  rect(4,10,18,22,'f');rect(5,11,17,21,'.');
  // ブラジル（大陸の大部分）
  rect(14,18,32,48,'f');rect(15,19,31,47,'.');
  // ペルー〜チリ（西海岸）
  rect(3,20,12,52,'f');rect(4,22,11,50,'.');
  // アルゼンチン
  rect(8,46,24,62,'f');rect(9,48,22,61,'.');
  // アンデス山脈
  rect(8,22,12,44,'^');
  // 道路
  for(let i=0;i<SAM_WALK_CITIES.length-1;i++){
    const a=SAM_WALK_CITIES[i],b=SAM_WALK_CITIES[i+1];
    road(a.x,a.y,b.x,b.y);
  }
  road(6,24,22,34);// リマ→サンパウロ（大陸横断）
  road(9,16,24,24);// カリ→サルバドール
  SAM_WALK_CITIES.forEach(c=>s(c.x,c.y,'@'));
  return G;
}
const SAM_MAP=buildSAMMap();

function SAMWalkMode(p){return<WorldWalkMode {...p} walkCities={SAM_WALK_CITIES} walkMap={SAM_MAP} cityData={SAMERICA} mapW={SAM_W} mapH={SAM_H} regionName="S.AMERICA MAP" flagEmoji="🌎" mapId="samerica"/>;}

/* ── INDIA CITIES DATA ── */
const INDIA={
  delhi:     {id:"delhi",     name:"デリー",       e:"🕌",g:"contemporary",lv:24,
    ch:{name:"DELHI CLASSICAL",e:"🕌",pw:7500},
    bosses:[
      {name:"DELHI CLASSICAL",e:"🕌",pw:7500, style:"contemporary",intro:"古代から続くインド舞踊の首都！魂の動きを見よ！"},
      {name:"DELHI STREETS",  e:"🎤",pw:8200, style:"hiphop",      intro:"デリーのストリートHIPHOPは本物だ！"},
    ],
    rw:{exp:1800,coins:12000,title:"Delhi Dance King"},
    desc:"インドの首都。古典舞踊とモダンが交差する",
    food:[{n:"バターチキン",p:800,e:16,h:38,desc:"デリー発祥！世界で愛されるインドカレー"},{n:"チャパティ",p:200,e:6,h:18,desc:"インドの薄焼きパン。毎日食べたい"}]},
  mumbai:    {id:"mumbai",    name:"ムンバイ",     e:"🎬",g:"jazz",        lv:23,
    ch:{name:"BOLLYWOOD STAR",e:"🎬",pw:7000},
    bosses:[{name:"BOLLYWOOD STAR",e:"🎬",pw:7000,style:"jazz",intro:"ボリウッドはムンバイが生んだ夢の工場！踊れ！"}],
    rw:{exp:1600,coins:10500,title:"Bollywood Legend"},
    desc:"ボリウッド映画の聖地。インドのエンタメの都",
    food:[{n:"ヴァダ・パウ",p:100,e:8,h:22,desc:"ムンバイのソウルフード！スパイシーバーガー"},{n:"パウ・バジ",p:300,e:10,h:28,desc:"野菜カレー＆バターロール。屋台の王道"}]},
  kolkata:   {id:"kolkata",   name:"コルカタ",     e:"🌺",g:"contemporary",lv:24,
    ch:{name:"KOLKATA SOUL",e:"🌺",pw:7200},
    bosses:[{name:"KOLKATA SOUL",e:"🌺",pw:7200,style:"contemporary",intro:"コルカタの文化と知性が生んだCONTEMPORARY！"}],
    rw:{exp:1650,coins:11000,title:"Kolkata Artist"},
    desc:"芸術と文化の都。タゴールが愛した街",
    food:[{n:"ロショゴッラ",p:200,e:6,h:20,desc:"コルカタ発祥！シロップ漬けミルクボール"},{n:"コルカタ風ビリヤニ",p:700,e:14,h:36,desc:"ジャガイモ入り！コルカタ独自のビリヤニ"}]},
  bangalore: {id:"bangalore", name:"バンガロール", e:"💻",g:"hiphop",      lv:25,
    ch:{name:"TECH CITY GROOVER",e:"💻",pw:7800},
    bosses:[{name:"TECH CITY GROOVER",e:"💻",pw:7800,style:"hiphop",intro:"インドのシリコンバレー！IT＆HIPHOPの融合！"}],
    rw:{exp:1900,coins:13000,title:"Bangalore B-Boy"},
    desc:"インドのIT都市。若者のHIPHOPシーンが急成長",
    food:[{n:"マサラドーサ",p:400,e:10,h:28,desc:"南インドの薄焼きクレープ！カリカリが最高"},{n:"フィルターコーヒー",p:150,e:5,h:12,desc:"南インド伝統の本格コーヒー！甘くて濃い"}]},
  chennai:   {id:"chennai",   name:"チェンナイ",   e:"🙏",g:"ballet",      lv:26,
    ch:{name:"BHARATA MASTER",e:"🙏",pw:8500},
    bosses:[{name:"BHARATA MASTER",e:"🙏",pw:8500,style:"ballet",intro:"バラタナティアム！インド最古の古典舞踊の真髄！"}],
    rw:{exp:2000,coins:14000,title:"Bharatanatyam Master"},
    desc:"バラタナティアム発祥の地。インドBALLETの聖地",
    food:[{n:"イドリー＆サンバル",p:300,e:9,h:25,desc:"南インドの朝食の王道！ふわふわ蒸しケーキ"},{n:"チェットナードチキン",p:900,e:16,h:38,desc:"スパイスが命！チェンナイ名物辛口チキン"}]},
  goa:       {id:"goa",       name:"ゴア",         e:"🌴",g:"waacking",    lv:22,
    ch:{name:"GOA QUEEN",e:"🌴",pw:6500},
    bosses:[{name:"GOA QUEEN",e:"🌴",pw:6500,style:"waacking",intro:"ゴアのビーチパーティ！WAACKINGで太陽を呼べ！"}],
    rw:{exp:1500,coins:9500,title:"Goa Beach Queen"},
    desc:"ポルトガル文化とインドが融合したビーチリゾート",
    food:[{n:"ゴア・フィッシュカレー",p:800,e:14,h:35,desc:"ココナッツミルクベースの絶品シーフードカレー"},{n:"フェニ（ゴアの地酒）",p:300,e:6,h:15,desc:"カシューナッツ発酵の伝統的なゴアのお酒"}]},
};

const IND_W=30,IND_H=58;
const IND_WALK_CITIES=[
  {id:"delhi",     x:14,y:8,  name:"デリー",       e:"🕌",g:"contemporary"},
  {id:"kolkata",   x:22,y:16, name:"コルカタ",     e:"🌺",g:"contemporary"},
  {id:"mumbai",    x:7, y:24, name:"ムンバイ",     e:"🎬",g:"jazz"},
  {id:"bangalore", x:14,y:36, name:"バンガロール", e:"💻",g:"hiphop"},
  {id:"goa",       x:8, y:34, name:"ゴア",         e:"🌴",g:"waacking"},
  {id:"chennai",   x:18,y:44, name:"チェンナイ",   e:"🙏",g:"ballet"},
];

function buildINDMap(){
  const G=Array.from({length:IND_H},()=>new Array(IND_W).fill('~'));
  const s=(x,y,t)=>{if(y>=0&&y<IND_H&&x>=0&&x<IND_W)G[y][x]=t;};
  const rect=(x1,y1,x2,y2,t)=>{for(let y=Math.min(y1,y2);y<=Math.max(y1,y2);y++)for(let x=Math.min(x1,x2);x<=Math.max(x1,x2);x++)s(x,y,t);};
  const road=(x1,y1,x2,y2)=>{let x=x1,y=y1;while(y!==y2){s(x,y,'.');y+=(y<y2?1:-1);}while(x!==x2){s(x,y,'.');x+=(x<x2?1:-1);}s(x2,y2,'.');};
  // インド亜大陸（三角形状）
  rect(4,4,26,20,'f');rect(5,5,25,19,'.');
  // 中部
  rect(5,18,24,35,'f');rect(6,20,22,34,'.');
  // 南インド（先細り）
  rect(7,32,22,42,'f');rect(8,34,21,41,'.');
  rect(9,40,20,50,'f');rect(10,42,19,49,'.');
  rect(11,48,18,54,'f');rect(12,50,17,53,'.');
  // ゴア（西海岸）
  rect(5,30,10,38,'f');rect(6,31,9,37,'.');
  // 道路
  for(let i=0;i<IND_WALK_CITIES.length-1;i++){
    const a=IND_WALK_CITIES[i],b=IND_WALK_CITIES[i+1];
    road(a.x,a.y,b.x,b.y);
  }
  road(14,8,22,16);// デリー→コルカタ
  road(7,24,8,34); // ムンバイ→ゴア
  IND_WALK_CITIES.forEach(c=>s(c.x,c.y,'@'));
  return G;
}
const IND_MAP=buildINDMap();

function INDIAWalkMode(p){return<WorldWalkMode {...p} walkCities={IND_WALK_CITIES} walkMap={IND_MAP} cityData={INDIA} mapW={IND_W} mapH={IND_H} regionName="INDIA MAP" flagEmoji="🇮🇳" mapId="india"/>;}

/* ── EUROPE CITIES DATA ── */
const EUROPE={
  florence:  {id:"florence",  name:"フィレンツェ",e:"🌹",g:"ballet",      lv:28,
    ch:{name:"MEDICI MASTER",e:"🌹",pw:10000},
    bosses:[{name:"MEDICI MASTER",e:"🌹",pw:10000,style:"ballet",intro:"バレエはここフィレンツェで生まれた！メディチ家の魂！"}],
    rw:{exp:2500,coins:20000,title:"Ballet Origin Master"},
    desc:"バレエ発祥の地。メディチ家がルネサンスと共に育てた芸術",
    food:[{n:"ビステッカ・アッラ・フィオレンティーナ",p:4000,e:28,h:55,desc:"フィレンツェ名物Tボーンステーキ！圧巻の旨さ"},{n:"ジェラート",p:500,e:8,h:20,desc:"本場イタリアのジェラート！毎日食べたい"}]},
  milan:     {id:"milan",     name:"ミラノ",      e:"👗",g:"contemporary",lv:29,
    ch:{name:"MILAN VOGUE",e:"👗",pw:10500},
    bosses:[{name:"MILAN VOGUE",e:"👗",pw:10500,style:"contemporary",intro:"ファッションとダンスが交差するミラノ！"}],
    rw:{exp:2600,coins:21000,title:"Milan Couture"},
    desc:"モードの都でCONTEMPORARYが輝く",
    food:[{n:"リゾット・アッラ・ミラネーゼ",p:2000,e:20,h:42,desc:"サフラン入りの黄金リゾット！ミラノの魂"},{n:"パネットーネ",p:800,e:10,h:25,desc:"ミラノ発祥の伝統菓子パン"}]},
  paris:     {id:"paris",     name:"パリ",        e:"🗼",g:"ballet",      lv:30,
    ch:{name:"PARIS ÉTOILE",e:"🗼",pw:11000},
    bosses:[
      {name:"PARIS ÉTOILE",  e:"🗼",pw:11000,style:"ballet",      intro:"パリ・オペラ座のエトワール！BALLETの真髄！"},
      {name:"PARIS POPPER",  e:"⚡",pw:11800,style:"popping",     intro:"パリのストリートはPOPPINGも最強！"},
    ],
    rw:{exp:2800,coins:23000,title:"Paris Legend"},
    desc:"バレエをイタリアから受け継ぎ世界へ広めた芸術の都",
    food:[{n:"クロワッサン",p:300,e:8,h:18,desc:"本場フランスのバター香るクロワッサン！"},{n:"フォアグラ",p:5000,e:25,h:40,desc:"フランス三大珍味。究極の贅沢フード"}]},
  london:    {id:"london",    name:"ロンドン",    e:"🏰",g:"contemporary",lv:31,
    ch:{name:"GRIME KING",e:"🏰",pw:11500},
    bosses:[
      {name:"GRIME KING",    e:"🏰",pw:11500,style:"contemporary",intro:"UKグライムとCONTEMPORARY！ロンドン最強！"},
      {name:"UK B-BOY",      e:"🎭",pw:12000,style:"breaking",    intro:"UKのBREAKINGシーンは世界トップレベル！"},
    ],
    rw:{exp:2900,coins:24000,title:"London Legend"},
    desc:"グライム・コンテ・BREAKINGが交差する多文化都市",
    food:[{n:"フィッシュ＆チップス",p:800,e:12,h:35,desc:"英国の魂のフード！新聞紙に包まれた伝統"},{n:"バノフィーパイ",p:600,e:8,h:22,desc:"バナナとトフィーの英国スイーツ"}]},
  berlin:    {id:"berlin",    name:"ベルリン",    e:"🎛",g:"house",       lv:30,
    ch:{name:"TECHNO KING",e:"🎛",pw:11200},
    bosses:[{name:"TECHNO KING",e:"🎛",pw:11200,style:"house",intro:"ベルリンはTECHNO HOUSEの聖地！壁が崩れた夜に踊れ！"}],
    rw:{exp:2750,coins:22500,title:"Berlin Techno God"},
    desc:"ベルリンのクラブカルチャーは世界最高峰",
    food:[{n:"カリーヴルスト",p:500,e:10,h:28,desc:"ベルリン名物カレーソースソーセージ！"},{n:"ベルリーナー（ドーナツ）",p:300,e:7,h:18,desc:"ベルリン名物揚げドーナツ"}]},
  madrid:    {id:"madrid",    name:"マドリード",  e:"💃",g:"jazz",        lv:29,
    ch:{name:"FLAMENCO SOUL",e:"💃",pw:10800},
    bosses:[{name:"FLAMENCO SOUL",e:"💃",pw:10800,style:"jazz",intro:"フラメンコとJAZZが融合！スペインの情熱！"}],
    rw:{exp:2650,coins:21500,title:"Madrid Flamenco King"},
    desc:"フラメンコとラテンリズムが溢れる情熱の都",
    food:[{n:"パエリア",p:2000,e:22,h:45,desc:"スペインの魂！サフランライスとシーフード"},{n:"チュロス＆チョコラテ",p:400,e:8,h:22,desc:"揚げたてチュロスをチョコレートに浸す！"}]},
  moscow:    {id:"moscow",    name:"モスクワ",    e:"🏛",g:"ballet",      lv:33,
    ch:{name:"BOLSHOI MASTER",e:"🏛",pw:13000},
    bosses:[{name:"BOLSHOI MASTER",e:"🏛",pw:13000,style:"ballet",intro:"ボリショイバレエの真髄！ロシアBALLETは別格だ！"}],
    rw:{exp:3200,coins:28000,title:"Bolshoi Legend"},
    desc:"ボリショイバレエ団の本拠地。BALLETの極致",
    food:[{n:"ボルシチ",p:800,e:15,h:38,desc:"ビーツの赤いスープ！ロシアの魂の一杯"},{n:"ペリメニ",p:700,e:12,h:32,desc:"ロシア式餃子！サワークリームで食べる"}]},
};

const EUR_W=40,EUR_H=60;
const EUR_WALK_CITIES=[
  {id:"madrid",   x:5,  y:36, name:"マドリード",  e:"💃",g:"jazz"},
  {id:"paris",    x:13, y:22, name:"パリ",        e:"🗼",g:"ballet"},
  {id:"london",   x:11, y:12, name:"ロンドン",    e:"🏰",g:"contemporary"},
  {id:"berlin",   x:21, y:16, name:"ベルリン",    e:"🎛",g:"house"},
  {id:"florence", x:20, y:34, name:"フィレンツェ",e:"🌹",g:"ballet"},
  {id:"milan",    x:18, y:28, name:"ミラノ",      e:"👗",g:"contemporary"},
  {id:"moscow",   x:34, y:10, name:"モスクワ",    e:"🏛",g:"ballet"},
];

function buildEURMap(){
  const G=Array.from({length:EUR_H},()=>new Array(EUR_W).fill('~'));
  const s=(x,y,t)=>{if(y>=0&&y<EUR_H&&x>=0&&x<EUR_W)G[y][x]=t;};
  const rect=(x1,y1,x2,y2,t)=>{for(let y=Math.min(y1,y2);y<=Math.max(y1,y2);y++)for(let x=Math.min(x1,x2);x<=Math.max(x1,x2);x++)s(x,y,t);};
  const road=(x1,y1,x2,y2)=>{let x=x1,y=y1;while(y!==y2){s(x,y,'.');y+=(y<y2?1:-1);}while(x!==x2){s(x,y,'.');x+=(x<x2?1:-1);}s(x2,y2,'.');};
  // 西欧（イベリア半島〜英国〜中欧）
  rect(2,10,28,45,'f');rect(4,12,26,43,'.');
  // 英国（島）
  rect(8,5,16,15,'f');rect(9,6,15,14,'.');
  // イタリア半島
  rect(16,26,24,44,'f');rect(17,28,23,43,'.');
  // 東欧〜ロシア
  rect(28,6,39,30,'f');rect(29,7,38,28,'.');
  // ロシア大陸
  rect(30,5,39,18,'f');rect(31,6,38,17,'.');
  for(let i=0;i<EUR_WALK_CITIES.length-1;i++){
    const a=EUR_WALK_CITIES[i],b=EUR_WALK_CITIES[i+1];
    road(a.x,a.y,b.x,b.y);
  }
  road(11,12,13,22);// ロンドン→パリ（ユーロトンネル）
  road(21,16,34,10);// ベルリン→モスクワ
  EUR_WALK_CITIES.forEach(c=>s(c.x,c.y,'@'));
  return G;
}
const EUR_MAP=buildEURMap();

/* ── WORLD WALK MODE (汎用) ── */
function WorldWalkMode({char,setChar,genre,onExit,pushNotif,addLog,
  walkCities,walkMap,cityData,mapW,mapH,regionName,flagEmoji,mapId}){
  const startC=walkCities[0];
  const[pos,setPos]=useState({x:startC.x,y:startC.y});
  const[steps,setSteps]=useState(0);
  const[enc,setEnc]=useState(null);
  const[cityAt,setCityAt]=useState(null);
  const[cityMini,setCityMini]=useState(null);
  const[msg,setMsg]=useState("");
  const[battle,setBattle]=useState(null);
  const[nearbyHidden,setNearbyHidden]=useState(null);
  const camY=Math.max(0,Math.min(mapH-VH,pos.y-Math.floor(VH/2)));
  const gt=(x,y)=>{if(x<0||x>=mapW||y<0||y>=mapH)return'~';return walkMap[y]?.[x]||'~';};
  const gd=(t)=>WT[t]||WT['~'];
  const cityAt2=(x,y)=>walkCities.find(c=>c.x===x&&c.y===y)||null;

  function move(dir){
    if(enc||cityAt||cityMini)return;
    setPos(prev=>{
      let{x,y}=prev;let nx=x,ny=y;
      if(dir==="up")ny--;if(dir==="down")ny++;if(dir==="left")nx--;if(dir==="right")nx++;
      const t=gt(nx,ny);const d=gd(t);if(!d.pass)return prev;
      const city=cityAt2(nx,ny);
      if(city){setCityAt(city);setChar(c=>({...c,energy:Math.max(0,c.energy-1)}));setMsg(`🏙 ${city.name}に到着！`);return{x:nx,y:ny};}
      if(d.enc&&Math.random()<d.rate){
        const opps=QOPPS.filter(o=>o.lv<=Math.max(18,getLv(char.exp)+2));
        const opp=opps[Math.floor(Math.random()*opps.length)]||QOPPS[5];
        Sound.battle();setEnc(opp);return{x:nx,y:ny};
      }
      // 隠しアイテムチェック（自動取得→「おやっ？」システム）
      if(mapId){
        const found=char.foundItems||[];
        const nearby=HIDDEN_ITEMS.find(h=>h.mapId===mapId&&h.x===nx&&h.y===ny&&!found.includes(h.id));
        setNearbyHidden(nearby||null);
        if(nearby) setMsg("おやっ？何かあるぞ？");
        else if(msg==="おやっ？何かあるぞ？") setMsg("");
      }
      setSteps(s=>s+1);return{x:nx,y:ny};
    });
  }

  async function fightEnc(){
    if(!enc||char.energy<3)return;
    const btl=buildBattle(char,enc.style,enc.pw);
    setBattle({phase:"seq",...btl,oppName:enc.name,step:0});
    setEnc(null);
    for(let i=0;i<8;i++){await new Promise(r=>setTimeout(r,_battleSpeed===2?350:900));setBattle(b=>b?{...b,step:Math.min(b.step+1,7)}:null);}
    const{won}=btl;const eg=won?enc.rw.exp:Math.floor(enc.rw.exp*.5);
    setChar(c=>({...c,exp:c.exp+eg,energy:Math.max(0,c.energy-3),mood:won?Math.min(100,c.mood+10):Math.max(0,c.mood-8),battlesWon:won?c.battlesWon+1:c.battlesWon}));
    setBattle({phase:"result",won,eg,coins:won?enc.rw.coins:Math.floor(enc.rw.coins*.5),flags:btl.flags,myP:btl.myP,thP:btl.thP});
    if(won)Sound.clear();else Sound.lose();
    setMsg(won?`🏆 勝利！+${eg}EXP`:"💀 敗北...");
    setTimeout(()=>setMsg(""),3000);
  }

  useEffect(()=>{
    const h=e=>{const m={ArrowUp:"up",ArrowDown:"down",ArrowLeft:"left",ArrowRight:"right",w:"up",s:"down",a:"left",d:"right"};if(m[e.key]){e.preventDefault();move(m[e.key]);}};
    window.addEventListener("keydown",h);return()=>window.removeEventListener("keydown",h);
  },[pos,enc,cityAt,cityMini]);

  // 都市内ビュー
  if(cityMini){
    const cd=cityData[cityMini];const wc=walkCities.find(c=>c.id===cityMini);
    if(!cd){setCityMini(null);return null;}
    return<div style={{paddingBottom:80}}>
      {battle&&<BattleOverlay state={battle} gc={genre.c} onClose={()=>setBattle(null)}/>}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 12px",background:"#0f0a1a",borderBottom:"1px solid #3a1a4a",marginBottom:12}}>
        <span style={{color:"#ff4da6",fontWeight:700,fontFamily:"M PLUS Rounded 1c,sans-serif"}}>{wc?.e} {wc?.name} CLUB</span>
        <button onClick={()=>{setCityMini(null);setCityAt(null);}} style={{fontSize:10,color:TX3,background:"none",border:`1px solid ${BD}`,borderRadius:4,padding:"4px 8px",cursor:"pointer"}}>← {regionName}</button>
      </div>
      {(cd.bosses||[{...cd.ch,style:cd.g}]).map((boss,i)=>(
        <div key={i} style={{background:"#0f0a1a",borderRadius:10,margin:"0 4px 12px",border:`1px solid ${i===0?"#3a1a4a":"#2a1030"}`,padding:"18px 16px",textAlign:"center"}}>
          <div style={{fontSize:48,marginBottom:8}}>{boss.e}</div>
          <div style={{fontFamily:"'Press Start 2P',monospace",fontSize:8,color:"#ff4da6",marginBottom:4}}>{i===0?"CLUB BOSS":"CHALLENGER"}</div>
          <div style={{fontSize:18,color:TX,fontWeight:900,fontFamily:"M PLUS Rounded 1c,sans-serif",marginBottom:4}}>{boss.name}</div>
          <div style={{fontSize:10,color:TX3,marginBottom:6}}>{GENRES[boss.style]?.e}{GENRES[boss.style]?.jp} · POWER {boss.pw.toLocaleString()}</div>
          {boss.intro&&<div style={{fontSize:11,color:"#ff9ec4",marginBottom:12,fontFamily:"M PLUS Rounded 1c,sans-serif",fontStyle:"italic"}}>「{boss.intro}」</div>}
          <Btn disabled={char.energy<20} col="#280a0a" tc="#ff7070" onClick={async()=>{
            if(char.energy<20){pushNotif("⚡エネルギー不足","#ff5555");return;}
            const btl=buildBattle(char,boss.style||cd.g,boss.pw);
            setBattle({phase:"seq",...btl,oppName:boss.name,step:0});
            for(let i=0;i<8;i++){await new Promise(r=>setTimeout(r,_battleSpeed===2?380:1050));setBattle(b=>b?{...b,step:Math.min(b.step+1,7)}:null);}
            const{won,flags}=btl;const eg=won?cd.rw.exp:Math.floor(cd.rw.exp*.5);
            setChar(c=>({...c,exp:c.exp+eg,coins:c.coins+(won?cd.rw.coins:Math.floor(cd.rw.coins*.5)),energy:Math.max(0,c.energy-20),
              mood:won?Math.min(100,c.mood+20):Math.max(0,c.mood-15),
              battlesWon:won?c.battlesWon+1:c.battlesWon,
              clearedCities:won?{...(c.clearedCities||{}),[cityMini]:true}:c.clearedCities||{}}));
            setBattle({phase:"result",won,eg,coins:won?cd.rw.coins:Math.floor(cd.rw.coins*.5),flags,myP:btl.myP,thP:btl.thP});
            if(won)Sound.fanfare();else Sound.lose();
            addLog(`${won?"🏆":"💀"} vs ${boss.name} @${wc?.name} +${eg}EXP`);
          }} full sx={{fontSize:12,padding:"12px",fontWeight:700}}>⚔️ バトル！ ⚡20</Btn>
        </div>
      ))}
      {cd.food?.length>0&&<div style={{margin:"0 4px 12px",background:"#1f1808",borderRadius:10,padding:14,border:"1px solid #4a3a08"}}>
        <div style={{fontFamily:"'Press Start 2P',monospace",fontSize:7,color:"#ffd60a",marginBottom:10}}>🍽 LOCAL FOOD</div>
        {cd.food.map((f,i)=>(
          <div key={i} style={{background:BG3,borderRadius:6,padding:"8px 10px",marginBottom:8}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
              <div><div style={{fontWeight:700,fontSize:12,color:TX}}>{f.n}</div><div style={{fontSize:9,color:TX3}}>{f.desc}</div></div>
              <div style={{fontSize:11,color:char.coins>=f.p?"#b3ff00":"#ff5555",fontWeight:700}}>¥{f.p.toLocaleString()}</div>
            </div>
            <Btn disabled={char.coins<f.p} col="#1f1808" tc="#ffd60a" onClick={()=>{
              setChar(c=>({...c,coins:c.coins-f.p,energy:Math.min(c.maxEnergy||50,c.energy+f.e),hunger:Math.min(100,(c.hunger||0)+f.h),mood:Math.min(100,(c.mood||50)+8)}));
              pushNotif(`${f.n}食べた！⚡+${f.e}`,"#ffd60a");
            }} full sx={{fontSize:11}}>食べる（¥{f.p.toLocaleString()}）</Btn>
          </div>
        ))}
      </div>}
      <DPad onMove={()=>{}}/>
      <AButton onPress={()=>{setCityMini(null);setCityAt(null);}} col="#80c0ff" sub="EXIT"/>
    </div>;
  }

  const gc=genre.c;
  return(<div style={{background:BG,minHeight:"100vh",paddingBottom:180}}>
    {battle&&<BattleOverlay state={battle} gc={gc} onClose={()=>setBattle(null)}/>}
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 14px",background:BG2,borderBottom:`2px solid ${gc}55`}}>
      <div><div style={{fontFamily:"'Press Start 2P',monospace",fontSize:8,color:"#ffd60a"}}>{flagEmoji} {regionName} WALK</div>
        <div style={{fontSize:10,color:TX2,fontFamily:"M PLUS Rounded 1c,sans-serif",marginTop:2}}>{steps}歩</div></div>
      <button onClick={onExit} style={{fontSize:10,color:TX3,background:"none",border:`1px solid ${BD}`,borderRadius:4,padding:"5px 10px",cursor:"pointer"}}>🗺 WORLD MAP</button>
    </div>
    {enc&&<div style={{position:"fixed",inset:0,background:"rgba(3,3,15,.92)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",zIndex:900}}>
      <div style={{fontSize:62,marginBottom:14}}>{enc.e}</div>
      <div style={{fontFamily:"'Press Start 2P',monospace",fontSize:11,color:"#ff6b6b",marginBottom:8}}>⚡ ENCOUNTER!</div>
      <div style={{fontSize:15,color:TX,fontFamily:"M PLUS Rounded 1c,sans-serif",marginBottom:20,fontWeight:700}}>{enc.name}</div>
      <div style={{display:"flex",gap:12}}>
        <Btn disabled={char.energy<3} col="#280a0a" tc="#ff7070" onClick={fightEnc} sx={{fontSize:13,padding:"12px 28px",fontWeight:700}}>⚔️ バトル</Btn>
        <Btn col="#0a1828" tc="#00e5ff" onClick={()=>setEnc(null)} sx={{fontSize:13,padding:"12px 20px"}}>🏃 逃げる</Btn>
      </div>
    </div>}
    <div style={{margin:"8px 4px",border:`1px solid ${BD}`,borderRadius:8,overflow:"hidden",position:"relative"}}>
      <svg viewBox={`0 0 ${VW*TS} ${VH*TS}`} width="100%" style={{display:"block"}}>
        <rect width={VW*TS} height={VH*TS} fill="#060c18"/>
        {Array.from({length:VH},(_,vy)=>Array.from({length:VW},(_,vx)=>{
          const mx=camX+vx,my=camY+vy;const t=gt(mx,my);const d=gd(t);
          const city=cityAt2(mx,my);const gc2=city?GENRES[city.g]?.c:null;
          return(<g key={`${vx}-${vy}`}>
            <rect x={vx*TS} y={vy*TS} width={TS} height={TS} fill={city?"#1a0a2e":d.bg} stroke="#030810" strokeWidth=".4"/>
            {t==='f'&&<text x={vx*TS+TS*.25} y={vy*TS+TS*.6} fontSize={TS*.35} opacity=".5">🌲</text>}
            {t==='^'&&<text x={vx*TS+TS*.5} y={vy*TS+TS*.62} textAnchor="middle" dominantBaseline="middle" fontSize={TS*.55}>⛰</text>}
            {city&&<g>
              <circle cx={vx*TS+TS*.5} cy={vy*TS+TS*.46} r={TS*.38} fill={`${gc2}44`} stroke={gc2} strokeWidth="1.4"/>
              <text x={vx*TS+TS*.5} y={vy*TS+TS*.52} textAnchor="middle" dominantBaseline="middle" fontSize={TS*.52}>{city.e}</text>
              <text x={vx*TS+TS*.5} y={vy*TS+TS*.9} textAnchor="middle" fontSize="4" fill={gc2} fontFamily="M PLUS Rounded 1c,sans-serif">{city.name}</text>
            </g>}
          </g>);
        }))}
        {(()=>{const vx=pos.x-camX,vy=pos.y-camY;if(vx<0||vx>=VW||vy<0||vy>=VH)return null;return(<g><circle cx={vx*TS+TS*.5} cy={vy*TS+TS*.5} r={TS*.42} fill={gc} stroke="#fff" strokeWidth="2" style={{filter:`drop-shadow(0 0 5px ${gc})`}}/><text x={vx*TS+TS*.5} y={vy*TS+TS*.58} textAnchor="middle" dominantBaseline="middle" fontSize={TS*.52}>{genre.e}</text></g>);})()}
      </svg>
      <div style={{position:"absolute",top:5,right:5,width:42,height:32,background:"rgba(0,0,0,.8)",borderRadius:4,border:"1px solid #2a2a4a",overflow:"hidden"}}>
        <svg viewBox={`0 0 ${mapW} ${mapH}`} width="42" height="32">
          {walkCities.map(c=><circle key={c.id} cx={c.x} cy={c.y} r="1.8" fill={GENRES[c.g]?.c||"#888"}/>)}
          <circle cx={pos.x} cy={pos.y} r="2.2" fill="#fff"/>
        </svg>
      </div>
    </div>
    {msg&&<div style={{margin:"0 4px 6px",padding:"8px 12px",background:nearbyHidden?"#1a1a00":BG2,borderRadius:6,fontSize:11,color:nearbyHidden?"#ffd60a":TX2,fontFamily:"M PLUS Rounded 1c,sans-serif",fontWeight:nearbyHidden?700:400}}>{msg}</div>}

    {/* 🔍 調べるボタン */}
    {nearbyHidden&&!enc&&!cityAt&&<div style={{margin:"0 4px 8px",padding:14,background:"#1a1a00",borderRadius:10,border:"2px solid #ffd60a66",textAlign:"center"}}>
      <div style={{fontSize:28,marginBottom:6}}>❓</div>
      <div style={{fontSize:11,color:"#ffd60a",marginBottom:10,fontFamily:"M PLUS Rounded 1c,sans-serif"}}>
        何かが埋まっているようだ...
      </div>
      <Btn col="#1a1a00" tc="#ffd60a" onClick={()=>{
        setChar(c=>({...c,
          foundItems:[...(c.foundItems||[]),nearbyHidden.id],
          coins:c.coins+(nearbyHidden.reward.coins||0),
          gems:(c.gems||0)+(nearbyHidden.reward.gems||0),
          exp:c.exp+(nearbyHidden.reward.exp||0),
          titles:nearbyHidden.reward.title?[...(c.titles||[]),nearbyHidden.reward.title]:c.titles||[],
        }));
        setMsg(`✨ ${nearbyHidden.name}を発見！`);
        pushNotif(`✨ ${nearbyHidden.name}！${nearbyHidden.desc}`,"#ffd60a");
        addLog(`✨ 隠しアイテム発見：${nearbyHidden.name}`);
        setNearbyHidden(null);
      }} full sx={{fontSize:13,fontWeight:700,padding:"12px",border:"1px solid #4a4a00"}}>
        🔍 調べる
      </Btn>
    </div>}

    {cityAt&&!enc&&<div style={{margin:"0 4px 8px",padding:14,background:BG2,borderRadius:10,border:`2px solid ${GENRES[cityAt.g]?.c||gc}66`}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <div style={{display:"flex",gap:10,alignItems:"center"}}>
          <span style={{fontSize:32}}>{cityAt.e}</span>
          <div><div style={{fontWeight:700,fontSize:16,color:GENRES[cityAt.g]?.c||gc,fontFamily:"M PLUS Rounded 1c,sans-serif"}}>{cityAt.name}</div></div>
        </div>
        <button onClick={()=>setCityAt(null)} style={{color:TX3,fontSize:22,background:"none",border:"none",cursor:"pointer"}}>✕</button>
      </div>
      <Btn col={`${GENRES[cityAt.g]?.c||gc}22`} tc={GENRES[cityAt.g]?.c||gc} onClick={()=>setCityMini(cityAt.id)} full sx={{fontSize:13,fontWeight:700,padding:"12px"}}>🏙 {cityAt.name}に入る</Btn>
    </div>}
    {!cityAt&&!enc&&!nearbyHidden&&<div style={{textAlign:"center",fontSize:9,color:TX3,fontFamily:"M PLUS Rounded 1c,sans-serif"}}>十字キーで移動 · 都市でAボタン</div>}
    <DPad onMove={move}/>
    {cityAt&&!enc&&<AButton onPress={()=>setCityMini(cityAt.id)} col={GENRES[cityAt.g]?.c||gc} sub="入る"/>}
    {nearbyHidden&&!cityAt&&!enc&&<AButton onPress={()=>{
      setChar(c=>({...c,foundItems:[...(c.foundItems||[]),nearbyHidden.id],coins:c.coins+(nearbyHidden.reward.coins||0),gems:(c.gems||0)+(nearbyHidden.reward.gems||0),exp:c.exp+(nearbyHidden.reward.exp||0),titles:nearbyHidden.reward.title?[...(c.titles||[]),nearbyHidden.reward.title]:c.titles||[]}));
      setMsg(`✨ ${nearbyHidden.name}を発見！`);
      pushNotif(`✨ ${nearbyHidden.name}！${nearbyHidden.desc}`,"#ffd60a");
      setNearbyHidden(null);
    }} col="#ffd60a" sub="調べる"/>}
    {enc&&<AButton onPress={fightEnc} col="#ff4da6" sub="バトル！" disabled={char.energy<3}/>}
  </div>);
}

// ASIA・EUROPE・USAはWorldWalkModeを流用
function ASIAWalkMode(p){return<WorldWalkMode {...p} walkCities={ASIA_WALK_CITIES} walkMap={ASIA_MAP} cityData={ASIA} mapW={ASIA_W} mapH={ASIA_H} regionName="ASIA MAP" flagEmoji="🌏" mapId="asia"/>;}
function EUROPEWalkMode(p){return<WorldWalkMode {...p} walkCities={EUR_WALK_CITIES} walkMap={EUR_MAP} cityData={EUROPE} mapW={EUR_W} mapH={EUR_H} regionName="EUROPE MAP" flagEmoji="🌍" mapId="europe"/>;}

/* ── USA WALK MODE ── */
function USAWalkMode({char,setChar,genre,onExit,pushNotif,addLog}){
  const startC=USA_WALK_CITIES.find(c=>c.id==="hollywood")||USA_WALK_CITIES[0];
  const[pos,setPos]=useState({x:startC.x,y:startC.y});
  const[steps,setSteps]=useState(0);
  const[enc,setEnc]=useState(null);
  const[cityAt,setCityAt]=useState(null);
  const[cityMini,setCityMini]=useState(null);
  const[msg,setMsg]=useState("");
  const[battle,setBattle]=useState(null);

  const camX=Math.max(0,Math.min(USA_W-VW,pos.x-Math.floor(VW/2)));
  const camY=Math.max(0,Math.min(USA_H-VH,pos.y-Math.floor(VH/2)));
  const gt=(x,y)=>{if(x<0||x>=USA_W||y<0||y>=USA_H)return'~';return USA_MAP[y]?.[x]||'~';};
  const gd=(t)=>WT[t]||WT['~'];
  const cityAt2=(x,y)=>USA_WALK_CITIES.find(c=>c.x===x&&c.y===y)||null;
  const region=(x)=>x<14?"West Coast":x<20?"Rocky Mts":x<34?"South":"East Coast";

  function move(dir){
    if(enc||cityAt||cityMini)return;
    setPos(prev=>{
      let{x,y}=prev;let nx=x,ny=y;
      if(dir==="up")ny--;if(dir==="down")ny++;if(dir==="left")nx--;if(dir==="right")nx++;
      const t=gt(nx,ny);const d=gd(t);
      if(!d.pass)return prev;
      const city=cityAt2(nx,ny);
      if(city){
        setCityAt(city);
        setChar(c=>({...c,energy:Math.max(0,c.energy-1)}));
        addLog(`📍 ${city.name}に到着！`);
        setMsg(`🏙 ${city.name}に到着！`);
        return{x:nx,y:ny};
      }
      if(d.enc&&Math.random()<d.rate){
        const opps=QOPPS.filter(o=>o.lv<=Math.max(20,getLv(char.exp)+2));
        const opp=opps[Math.floor(Math.random()*opps.length)]||QOPPS[5];
        Sound.battle();setEnc(opp);
        return{x:nx,y:ny};
      }
      setSteps(s=>s+1);return{x:nx,y:ny};
    });
  }

  async function fightEnc(){
    if(!enc||char.energy<3)return;
    const btl=buildBattle(char,enc.style,enc.pw);
    setBattle({phase:"seq",...btl,oppName:enc.name,step:0});
    setEnc(null);
    for(let i=0;i<8;i++){await new Promise(r=>setTimeout(r,_battleSpeed===2?350:900));setBattle(b=>b?{...b,step:Math.min(b.step+1,7)}:null);}
    const{won}=btl;const eg=won?enc.rw.exp:Math.floor(enc.rw.exp*.5);
    setChar(c=>({...c,exp:c.exp+eg,energy:Math.max(0,c.energy-3),
      mood:won?Math.min(100,c.mood+10):Math.max(0,c.mood-8),
      battlesWon:won?c.battlesWon+1:c.battlesWon}));
    setBattle({phase:"result",won,eg,coins:won?enc.rw.coins:Math.floor(enc.rw.coins*.5),flags:btl.flags,myP:btl.myP,thP:btl.thP});
    if(won)Sound.clear();else Sound.lose();
    setMsg(won?`🏆 勝利！+${eg}EXP`:"💀 敗北...");
    setTimeout(()=>setMsg(""),3000);
  }

  useEffect(()=>{
    const h=e=>{const m={ArrowUp:"up",ArrowDown:"down",ArrowLeft:"left",ArrowRight:"right",w:"up",s:"down",a:"left",d:"right"};if(m[e.key]){e.preventDefault();move(m[e.key]);}};
    window.addEventListener("keydown",h);return()=>window.removeEventListener("keydown",h);
  },[pos,enc,cityAt,cityMini]);

  // 都市ミニマップ
  if(cityMini){
    const cityData=USA[cityMini];
    if(cityData){
      // USAの都市はJapanWalkClub/Innを流用
      const wc=USA_WALK_CITIES.find(c=>c.id===cityMini);
      return<div style={{paddingBottom:80}}>
        {battle&&<BattleOverlay state={battle} gc={genre.c} onClose={()=>setBattle(null)}/>}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 12px",background:"#0f0a1a",borderBottom:"1px solid #3a1a4a",marginBottom:12}}>
          <span style={{color:"#ff4da6",fontWeight:700,fontFamily:"M PLUS Rounded 1c,sans-serif"}}>{wc?.e} {wc?.name} CLUB</span>
          <button onClick={()=>{setCityMini(null);setCityAt(null);}} style={{fontSize:10,color:TX3,background:"none",border:`1px solid ${BD}`,borderRadius:4,padding:"4px 8px",cursor:"pointer"}}>← USA MAP</button>
        </div>
        {/* ボス一覧 */}
        {(cityData.bosses||[{...cityData.ch,style:cityData.g}]).map((boss,i)=>(
          <div key={i} style={{background:"#0f0a1a",borderRadius:10,margin:"0 4px 12px",border:`1px solid ${i===0?"#3a1a4a":"#2a1030"}`,padding:"18px 16px",textAlign:"center"}}>
            <div style={{fontSize:48,marginBottom:8}}>{boss.e}</div>
            <div style={{fontFamily:"'Press Start 2P',monospace",fontSize:8,color:"#ff4da6",marginBottom:4}}>{i===0?"CLUB BOSS":"CHALLENGER"}</div>
            <div style={{fontSize:18,color:TX,fontWeight:900,fontFamily:"M PLUS Rounded 1c,sans-serif",marginBottom:4}}>{boss.name}</div>
            <div style={{fontSize:10,color:TX3,marginBottom:6}}>{GENRES[boss.style]?.e}{GENRES[boss.style]?.jp} · POWER {boss.pw.toLocaleString()}</div>
            {boss.intro&&<div style={{fontSize:11,color:"#ff9ec4",marginBottom:12,fontFamily:"M PLUS Rounded 1c,sans-serif",fontStyle:"italic"}}>「{boss.intro}」</div>}
            <Btn disabled={char.energy<20} col="#280a0a" tc="#ff7070" onClick={async()=>{
              if(char.energy<20){pushNotif("⚡エネルギー不足","#ff5555");return;}
              const btl=buildBattle(char,boss.style||cityData.g,boss.pw);
              setBattle({phase:"seq",...btl,oppName:boss.name,step:0});
              for(let i=0;i<8;i++){await new Promise(r=>setTimeout(r,_battleSpeed===2?380:1050));setBattle(b=>b?{...b,step:Math.min(b.step+1,7)}:null);}
              const{won,flags}=btl;const eg=won?cityData.rw.exp:Math.floor(cityData.rw.exp*.5);
              const coins=won?cityData.rw.coins:Math.floor(cityData.rw.coins*.5);
              setChar(c=>({...c,exp:c.exp+eg,coins:c.coins+coins,energy:Math.max(0,c.energy-20),
                mood:won?Math.min(100,c.mood+20):Math.max(0,c.mood-15),
                battlesWon:won?c.battlesWon+1:c.battlesWon,
                clearedCities:won?{...(c.clearedCities||{}),[cityMini]:true}:c.clearedCities||{}}));
              setBattle({phase:"result",won,eg,coins,flags,myP:btl.myP,thP:btl.thP});
              if(won)Sound.fanfare();else Sound.lose();
              addLog(`${won?"🏆":"💀"} vs ${boss.name} @${wc?.name} +${eg}EXP`);
            }} full sx={{fontSize:12,padding:"12px",fontWeight:700}}>⚔️ バトル！ ⚡20</Btn>
          </div>
        ))}
        {/* グルメ */}
        {cityData.food?.length>0&&<div style={{margin:"0 4px 12px",background:"#1f1808",borderRadius:10,padding:14,border:"1px solid #4a3a08"}}>
          <div style={{fontFamily:"'Press Start 2P',monospace",fontSize:7,color:"#ffd60a",marginBottom:10}}>🍔 LOCAL FOOD</div>
          {cityData.food.map((f,i)=>(
            <div key={i} style={{background:BG3,borderRadius:6,padding:"8px 10px",marginBottom:8}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                <div><div style={{fontWeight:700,fontSize:12,color:TX}}>{f.n}</div><div style={{fontSize:9,color:TX3}}>{f.desc}</div></div>
                <div style={{fontSize:11,color:char.coins>=f.p?"#b3ff00":"#ff5555",fontWeight:700}}>¥{f.p.toLocaleString()}</div>
              </div>
              <Btn disabled={char.coins<f.p} col="#1f1808" tc="#ffd60a" onClick={()=>{
                setChar(c=>({...c,coins:c.coins-f.p,energy:Math.min(c.maxEnergy||50,c.energy+f.e),hunger:Math.min(100,(c.hunger||0)+f.h),mood:Math.min(100,(c.mood||50)+8)}));
                pushNotif(`${f.n}食べた！⚡+${f.e}`,"#ffd60a");
              }} full sx={{fontSize:11}}>食べる（¥{f.p.toLocaleString()}）</Btn>
            </div>
          ))}
        </div>}
        <DPad onMove={()=>{}}/>
        <AButton onPress={()=>{setCityMini(null);setCityAt(null);}} col="#80c0ff" sub="EXIT"/>
      </div>;
    }
    setCityMini(null);
  }

  const gc=genre.c;
  return(<div style={{background:BG,minHeight:"100vh",paddingBottom:180}}>
    {battle&&<BattleOverlay state={battle} gc={gc} onClose={()=>setBattle(null)}/>}
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 14px",background:BG2,borderBottom:`2px solid ${gc}55`}}>
      <div>
        <div style={{fontFamily:"'Press Start 2P',monospace",fontSize:8,color:"#00e5ff",letterSpacing:1}}>🇺🇸 USA WALK</div>
        <div style={{fontSize:10,color:TX2,fontFamily:"M PLUS Rounded 1c,sans-serif",marginTop:2}}>{region(pos.x)} · {steps}歩</div>
      </div>
      <button onClick={onExit} style={{fontSize:10,color:TX3,background:"none",border:`1px solid ${BD}`,borderRadius:4,padding:"5px 10px",cursor:"pointer"}}>🗺 WORLD MAP</button>
    </div>
    {enc&&<div style={{position:"fixed",inset:0,background:"rgba(3,3,15,.92)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",zIndex:900}}>
      <div style={{fontSize:62,marginBottom:14}}>{enc.e}</div>
      <div style={{fontFamily:"'Press Start 2P',monospace",fontSize:11,color:"#ff6b6b",marginBottom:8}}>⚡ ENCOUNTER!</div>
      <div style={{fontSize:15,color:TX,fontFamily:"M PLUS Rounded 1c,sans-serif",marginBottom:20,fontWeight:700}}>{enc.name}が現れた！</div>
      <div style={{display:"flex",gap:12}}>
        <Btn disabled={char.energy<3} col="#280a0a" tc="#ff7070" onClick={fightEnc} sx={{fontSize:13,padding:"12px 28px",fontWeight:700}}>⚔️ バトル</Btn>
        <Btn col="#0a1828" tc="#00e5ff" onClick={()=>setEnc(null)} sx={{fontSize:13,padding:"12px 20px"}}>🏃 逃げる</Btn>
      </div>
    </div>}
    <div style={{margin:"8px 4px",border:`1px solid ${BD}`,borderRadius:8,overflow:"hidden",position:"relative"}}>
      <svg viewBox={`0 0 ${VW*TS} ${VH*TS}`} width="100%" style={{display:"block"}}>
        <rect width={VW*TS} height={VH*TS} fill="#060c18"/>
        {Array.from({length:VH},(_,vy)=>Array.from({length:VW},(_,vx)=>{
          const mx=camX+vx,my=camY+vy;const t=gt(mx,my);const d=gd(t);
          const city=cityAt2(mx,my);const gc2=city?GENRES[city.g]?.c:null;
          return(<g key={`${vx}-${vy}`}>
            <rect x={vx*TS} y={vy*TS} width={TS} height={TS} fill={city?"#1a0a2e":d.bg} stroke="#030810" strokeWidth=".4"/>
            {t==='f'&&<text x={vx*TS+TS*.25} y={vy*TS+TS*.6} fontSize={TS*.35} opacity=".5">🌲</text>}
            {t==='^'&&<text x={vx*TS+TS*.5} y={vy*TS+TS*.62} textAnchor="middle" dominantBaseline="middle" fontSize={TS*.55}>⛰</text>}
            {city&&<g>
              <circle cx={vx*TS+TS*.5} cy={vy*TS+TS*.46} r={TS*.38} fill={`${gc2}44`} stroke={gc2} strokeWidth="1.4"/>
              <text x={vx*TS+TS*.5} y={vy*TS+TS*.52} textAnchor="middle" dominantBaseline="middle" fontSize={TS*.52}>{city.e}</text>
              <text x={vx*TS+TS*.5} y={vy*TS+TS*.9} textAnchor="middle" fontSize="4" fill={gc2} fontFamily="M PLUS Rounded 1c,sans-serif">{city.name}</text>
            </g>}
          </g>);
        }))}
        {(()=>{const vx=pos.x-camX,vy=pos.y-camY;if(vx<0||vx>=VW||vy<0||vy>=VH)return null;return(<g><circle cx={vx*TS+TS*.5} cy={vy*TS+TS*.5} r={TS*.42} fill={gc} stroke="#fff" strokeWidth="2" style={{filter:`drop-shadow(0 0 5px ${gc})`}}/><text x={vx*TS+TS*.5} y={vy*TS+TS*.58} textAnchor="middle" dominantBaseline="middle" fontSize={TS*.52}>{genre.e}</text></g>);})()}
      </svg>
      {/* ミニマップ */}
      <div style={{position:"absolute",top:5,right:5,width:42,height:32,background:"rgba(0,0,0,.8)",borderRadius:4,border:"1px solid #2a2a4a",overflow:"hidden"}}>
        <svg viewBox={`0 0 ${USA_W} ${USA_H}`} width="42" height="32">
          {USA_WALK_CITIES.map(c=><circle key={c.id} cx={c.x} cy={c.y} r="1.8" fill={GENRES[c.g]?.c||"#888"}/>)}
          <circle cx={pos.x} cy={pos.y} r="2.2" fill="#fff"/>
        </svg>
      </div>
    </div>
    {msg&&<div style={{margin:"0 4px 6px",padding:"8px 12px",background:BG2,borderRadius:6,fontSize:11,color:TX2,fontFamily:"M PLUS Rounded 1c,sans-serif"}}>{msg}</div>}
    {cityAt&&!enc&&<div style={{margin:"0 4px 8px",padding:14,background:BG2,borderRadius:10,border:`2px solid ${GENRES[cityAt.g]?.c||gc}66`}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <div style={{display:"flex",gap:10,alignItems:"center"}}>
          <span style={{fontSize:32}}>{cityAt.e}</span>
          <div><div style={{fontWeight:700,fontSize:16,color:GENRES[cityAt.g]?.c||gc,fontFamily:"M PLUS Rounded 1c,sans-serif"}}>{cityAt.name}</div>
            <div style={{fontSize:10,color:TX3}}>{GENRES[cityAt.g]?.e}{GENRES[cityAt.g]?.jp}</div></div>
        </div>
        <button onClick={()=>setCityAt(null)} style={{color:TX3,fontSize:22,background:"none",border:"none",cursor:"pointer"}}>✕</button>
      </div>
      <Btn col={`${GENRES[cityAt.g]?.c||gc}22`} tc={GENRES[cityAt.g]?.c||gc} onClick={()=>{setCityMini(cityAt.id);}} full sx={{fontSize:13,fontWeight:700,padding:"12px"}}>
        🏙 {cityAt.name}に入る
      </Btn>
    </div>}
    {!cityAt&&!enc&&<div style={{textAlign:"center",fontSize:9,color:TX3,fontFamily:"M PLUS Rounded 1c,sans-serif"}}>十字キーで移動 · 都市でAボタン</div>}
    <DPad onMove={move}/>
    {cityAt&&!enc&&<AButton onPress={()=>setCityMini(cityAt.id)} col={GENRES[cityAt.g]?.c||gc} sub="入る"/>}
    {enc&&<AButton onPress={fightEnc} col="#ff4da6" sub="バトル！" disabled={char.energy<3}/>}
  </div>);
}

const CITY_MINI_MAP=[
  "wwwwwwwwwwwwwwwwww",
  "w................w",
  "w..cc......ii....w",
  "w..cc......ii....w",
  "w................w",
  "w...n............w",
  "w................w",
  "w..rr......rr....w",
  "w..rr......rr....w",
  "w................w",
  "w........X.......w",
  "wwwwwwwwwwwwwwwwww",
];
const CMT={
  w:{bg:"#090912",pass:false},
  ".":{bg:"#14142a",pass:true},
  c:{bg:"#1f0a2e",pass:false,icon:"🎵",label:"CLUB",action:"club",col:"#ff4da6"},
  i:{bg:"#0a1f1f",pass:false,icon:"🍺",label:"溜まり場",action:"inn",col:"#00e5ff"},
  r:{bg:"#1f1808",pass:false,icon:"🍜",label:"グルメ",action:"food",col:"#ffd60a"},
  n:{bg:"#1a1428",pass:false,icon:"💬",action:"npc",col:"#ce93d8"},
  X:{bg:"#0a1428",pass:true,icon:"🚪",action:"exit",col:"#80c0ff"},
};
const CITY_TS=24;
function CityMiniMap({cityId,char,setChar,genre,onExit,pushNotif,addLog}){
  const rows=CITY_MINI_MAP;
  const MW=rows[0].length,MH=rows.length;
  const city=J[cityId]||W[cityId]||SP[cityId];
  const wc=WALK_CITIES.find(c=>c.id===cityId);
  const food=city?.food||[];
  const[pos,setPos]=useState({x:9,y:9});
  const[view,setView]=useState("map");
  const[prompt,setPrompt]=useState(null);
  const[battle,setBattle]=useState(null);

  function gt(x,y){if(y<0||y>=MH||x<0||x>=MW)return'w';return rows[y]?.[x]||'w';}
  function move(dir){
    setPrompt(null);
    setPos(prev=>{
      let{x,y}=prev;let nx=x,ny=y;
      if(dir==="up")ny--;if(dir==="down")ny++;if(dir==="left")nx--;if(dir==="right")nx++;
      const t=gt(nx,ny);const def=CMT[t]||CMT["."];
      if(!def.pass){if(def.action)setPrompt({type:def.action,def});return prev;}
      if(def.action)setTimeout(()=>setPrompt({type:def.action,def}),50);
      return{x:nx,y:ny};
    });
  }
  useEffect(()=>{
    const h=e=>{if(view!=="map")return;const m={ArrowUp:"up",ArrowDown:"down",ArrowLeft:"left",ArrowRight:"right",w:"up",s:"down",a:"left",d:"right"};if(m[e.key]){e.preventDefault();move(m[e.key]);}};
    window.addEventListener("keydown",h);return()=>window.removeEventListener("keydown",h);
  },[pos,view]);

  if(view==="club")return<JapanWalkClub cityId={cityId} char={char} setChar={setChar} genre={genre} onBack={()=>setView("map")} pushNotif={pushNotif} addLog={addLog}/>;
  if(view==="inn")return<JapanWalkInn cityId={cityId} char={char} setChar={setChar} genre={genre} onBack={()=>setView("map")} pushNotif={pushNotif}/>;

  const gc=genre.c;const ts=CITY_TS;
  const svgW=MW*ts;const svgH=MH*ts;

  return(<div style={{paddingBottom:160}}>
    {battle&&<BattleOverlay state={battle} gc={gc} onClose={()=>setBattle(null)}/>}
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 14px",background:BG2,borderBottom:`2px solid ${gc}55`}}>
      <div style={{display:"flex",gap:8,alignItems:"center"}}>
        <span style={{fontSize:22}}>{wc?.e||"🏙"}</span>
        <div><div style={{fontWeight:700,fontSize:15,color:gc,fontFamily:"M PLUS Rounded 1c,sans-serif"}}>{wc?.name||cityId}</div>
          <div style={{fontSize:9,color:TX3}}>🎵クラブ · 🍺溜まり場 · 🍜グルメ · 🚪EXIT</div></div>
      </div>
      <button onClick={onExit} style={{fontSize:10,color:TX3,background:"none",border:`1px solid ${BD}`,borderRadius:4,padding:"5px 10px",cursor:"pointer"}}>← 全国MAP</button>
    </div>

    {/* ミニマップ */}
    <div style={{border:`1px solid ${BD}`,borderRadius:8,overflow:"hidden",margin:"8px 4px"}}>
      <svg viewBox={`0 0 ${svgW} ${svgH}`} width="100%" style={{display:"block"}}>
        <rect width={svgW} height={svgH} fill="#090912"/>
        {rows.map((row,y)=>Array.from(row).map((tile,x)=>{
          const def=CMT[tile]||CMT["."];
          return(<g key={`${x}-${y}`}>
            <rect x={x*ts} y={y*ts} width={ts} height={ts} fill={def.bg||"#14142a"} stroke="#0a0a18" strokeWidth=".5"/>
            {def.icon&&<text x={x*ts+ts*.5} y={y*ts+ts*.58} textAnchor="middle" dominantBaseline="middle" fontSize={ts*.62}>{def.icon}</text>}
            {def.label&&<text x={x*ts+ts*.5} y={y*ts+ts*.9} textAnchor="middle" fontSize="4" fill={def.col||"#888"} fontFamily="M PLUS Rounded 1c,sans-serif">{def.label}</text>}
          </g>);
        }))}
        <circle cx={pos.x*ts+ts*.5} cy={pos.y*ts+ts*.5} r={ts*.42} fill={gc} stroke="#fff" strokeWidth="2" style={{filter:`drop-shadow(0 0 5px ${gc})`}}/>
        <text x={pos.x*ts+ts*.5} y={pos.y*ts+ts*.58} textAnchor="middle" dominantBaseline="middle" fontSize={ts*.5}>{genre.e}</text>
      </svg>
    </div>

    {/* アクションプロンプト */}
    {prompt&&<div style={{margin:"0 4px 8px",padding:14,background:BG2,borderRadius:10,border:`1px solid ${prompt.def?.col||BD}`,animation:"su .2s ease"}}>
      <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:10}}>
        <span style={{fontSize:26}}>{prompt.def?.icon}</span>
        <span style={{color:prompt.def?.col,fontWeight:700,fontSize:14,fontFamily:"M PLUS Rounded 1c,sans-serif"}}>{prompt.def?.label}</span>
      </div>
      {prompt.type==="exit"&&<Btn onClick={onExit} col="#0a1428" tc="#80c0ff" full sx={{fontSize:12}}>🗺 全国MAPに戻る</Btn>}
      {(prompt.type==="club"||prompt.type==="club_adj")&&(
        <Btn disabled={char.energy<20} col="#280a0a" tc="#ff7070" onClick={()=>setView("club")} full sx={{fontSize:12,fontWeight:700}}>
          {char.energy<20?"⚡ エネルギー不足":"⚔️ クラブに入る！"}
        </Btn>
      )}
      {(prompt.type==="inn"||prompt.type==="inn_adj")&&<Btn col="#0a1f1f" tc="#00e5ff" onClick={()=>setView("inn")} full sx={{fontSize:12}}>🍺 溜まり場に入る</Btn>}
      {(prompt.type==="food"||prompt.type==="food_adj")&&(
        <div>
          <div style={{fontSize:10,color:"#ffd60a",marginBottom:8,fontFamily:"M PLUS Rounded 1c,sans-serif"}}>現地グルメを食べて体力回復！</div>
          {food.length===0&&<div style={{fontSize:11,color:TX3}}>このエリアのグルメ情報なし</div>}
          {food.map((f,i)=>{
            const can=char.coins>=f.p;
            return(<div key={i} style={{background:BG3,borderRadius:6,padding:"8px 10px",marginBottom:8}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                <div>
                  <div style={{fontWeight:700,fontSize:12,color:TX,fontFamily:"M PLUS Rounded 1c,sans-serif"}}>{f.n}</div>
                  <div style={{fontSize:9,color:TX3}}>{f.desc} · ⚡+{f.e} 🍚+{f.h}</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:11,color:can?"#b3ff00":"#ff5555",fontWeight:700}}>¥{f.p.toLocaleString()}</div>
                </div>
              </div>
              <Btn disabled={!can} col="#1f1808" tc="#ffd60a" onClick={()=>{
                if(char.coins<f.p){pushNotif("コインが足りない！","#ff5555");return;}
                const MAX=char.maxEnergy||50;
                setChar(c=>({...c,coins:c.coins-f.p,energy:Math.min(MAX,c.energy+f.e),hunger:Math.min(100,(c.hunger||0)+f.h),mood:Math.min(100,(c.mood||50)+8)}));
                pushNotif(`${f.n}食べた！⚡+${f.e} 気分UP！`,"#ffd60a");
                addLog(`🍜 ${f.n}を食べた @${wc?.name}`);
              }} full sx={{fontSize:11,border:"1px solid #4a3a08"}}>
                {can?`食べる（¥${f.p.toLocaleString()}）`:"コイン不足"}
              </Btn>
            </div>);
          })}
        </div>
      )}
      {(prompt.type==="npc"||prompt.type==="npc_adj")&&<div style={{fontSize:11,color:"#ce93d8",lineHeight:1.7,fontFamily:"M PLUS Rounded 1c,sans-serif"}}>「ここ{wc?.name||""}へようこそ！🎵クラブでバトルして🍺溜まり場で仲間を探せ。🍜グルメで体力を回復するのも忘れずに！」</div>}
    </div>}

    <div style={{textAlign:"center",fontSize:9,color:TX3,fontFamily:"M PLUS Rounded 1c,sans-serif",marginBottom:4}}>十字キーで移動 · 建物に近づいてAボタン</div>
    <DPad onMove={move}/>
    {prompt&&<AButton
      onPress={()=>{
        if(prompt.type==="exit")onExit();
        else if(prompt.type==="club")setView("club");
        else if(prompt.type==="inn")setView("inn");
      }}
      col={prompt.def?.col||gc}
      sub={prompt.def?.label||""}
      disabled={prompt.type==="club"&&char.energy<20}
    />}
  </div>);
}

/* ── ここからJapanWalkInn ── */
function MessageInbox({myName,onClose}){
  const[inbox,setInbox]=useState([]);
  const[thread,setThread]=useState(null); // {name, msgs}
  const[reply,setReply]=useState("");
  const[sending,setSending]=useState(false);
  const[loading,setLoading]=useState(true);

  useEffect(()=>{
    load();
    const t=setInterval(load,15000);
    return()=>clearInterval(t);
  },[]);

  async function load(){
    const msgs=await fetchInbox(myName);
    setInbox(msgs);setLoading(false);
  }

  async function openThread(name){
    await markRead(myName,name);
    const msgs=await fetchThread(myName,name);
    setThread({name,msgs});
    load();
  }

  async function doReply(){
    if(!reply.trim()||!thread)return;
    setSending(true);
    const res=await sendMsg(myName,thread.name,reply);
    const ok=res?.ok??res;
    if(ok){
      setReply("");
      const msgs=await fetchThread(myName,thread.name);
      setThread(t=>({...t,msgs}));
      load();
    }
    setSending(false);
  }

  // 会話ごとにグループ化
  const threads=[...new Set(inbox.map(m=>m.from_name))].map(name=>({
    name,
    latest:inbox.find(m=>m.from_name===name),
    unread:inbox.filter(m=>m.from_name===name&&!m.read).length,
  }));

  if(thread)return(
    <div style={{position:"fixed",inset:0,background:BG,zIndex:900,display:"flex",flexDirection:"column"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 14px",background:BG2,borderBottom:`1px solid ${BD}`}}>
        <button onClick={()=>setThread(null)} style={{color:TX3,background:"none",border:"none",fontSize:16,cursor:"pointer"}}>←</button>
        <span style={{fontWeight:700,color:TX,fontFamily:"M PLUS Rounded 1c,sans-serif"}}>{thread.name}</span>
        <div/>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:12,display:"flex",flexDirection:"column",gap:8}}>
        {thread.msgs.map((m,i)=>{
          const isMe=m.from_name===myName;
          return(<div key={i} style={{display:"flex",justifyContent:isMe?"flex-end":"flex-start"}}>
            <div style={{maxWidth:"75%",padding:"8px 12px",borderRadius:12,background:isMe?`${BD}`:"#0a1a2a",border:`1px solid ${isMe?"#4a4a7a":"#1a3a5a"}`}}>
              <div style={{fontSize:12,color:TX,fontFamily:"M PLUS Rounded 1c,sans-serif",lineHeight:1.5}}>{m.body}</div>
              <div style={{fontSize:9,color:TX3,marginTop:3,textAlign:isMe?"right":"left"}}>{new Date(m.created_at).toLocaleString("ja-JP",{month:"numeric",day:"numeric",hour:"2-digit",minute:"2-digit"})}</div>
            </div>
          </div>);
        })}
        {thread.msgs.length===0&&<div style={{textAlign:"center",color:TX3,fontSize:11,padding:20,fontFamily:"M PLUS Rounded 1c,sans-serif"}}>まだメッセージなし</div>}
      </div>
      <div style={{padding:"10px 12px",background:BG2,borderTop:`1px solid ${BD}`,display:"flex",gap:8}}>
        <input value={reply} onChange={e=>setReply(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();doReply();}}}
          placeholder="メッセージを入力..." style={{flex:1,padding:"10px 12px",borderRadius:20,background:BG3,border:`1px solid ${BD}`,color:TX,fontSize:13,outline:"none"}}/>
        <button onClick={doReply} disabled={!reply.trim()||sending} style={{padding:"10px 16px",borderRadius:20,background:"#3a3a8a",color:"#fff",border:"none",fontSize:13,cursor:"pointer",fontWeight:700}}>{sending?"...":"送信"}</button>
      </div>
    </div>
  );

  return(
    <div style={{position:"fixed",inset:0,background:BG,zIndex:900,display:"flex",flexDirection:"column"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 14px",background:BG2,borderBottom:`1px solid ${BD}`}}>
        <span style={{fontFamily:"'Press Start 2P',monospace",fontSize:9,color:"#ce93d8"}}>📬 メッセージ</span>
        <button onClick={onClose} style={{color:TX3,background:"none",border:"none",fontSize:20,cursor:"pointer"}}>✕</button>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:12}}>
        {loading&&<div style={{textAlign:"center",color:TX3,padding:20}}>⏳</div>}
        {!loading&&threads.length===0&&<div style={{textAlign:"center",color:TX3,fontSize:11,padding:30,fontFamily:"M PLUS Rounded 1c,sans-serif"}}>
          まだメッセージがない。<br/>溜まり場でダンサーにメッセージを送ろう！
        </div>}
        {threads.map((t,i)=>(
          <button key={i} onClick={()=>openThread(t.name)} style={{width:"100%",textAlign:"left",background:BG2,border:`1px solid ${t.unread>0?"#6060c0":BD}`,borderRadius:8,padding:"12px 14px",marginBottom:8,cursor:"pointer",display:"block"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontWeight:700,fontSize:13,color:t.unread>0?"#c0c0ff":TX,fontFamily:"M PLUS Rounded 1c,sans-serif"}}>{t.name}</span>
              {t.unread>0&&<span style={{background:"#5050c0",color:"#fff",borderRadius:10,padding:"2px 8px",fontSize:11,fontWeight:700}}>{t.unread}</span>}
            </div>
            <div style={{fontSize:11,color:TX3,marginTop:4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontFamily:"M PLUS Rounded 1c,sans-serif"}}>{t.latest?.body}</div>
            <div style={{fontSize:9,color:TX3,marginTop:3}}>{new Date(t.latest?.created_at).toLocaleString("ja-JP",{month:"numeric",day:"numeric",hour:"2-digit",minute:"2-digit"})}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── メッセージ送信ダイアログ ── */
function ComposeMsg({toName,fromName,onClose}){
  const[body,setBody]=useState("");
  const[status,setStatus]=useState("");
  const[errMsg,setErrMsg]=useState("");
  async function doSend(){
    if(!body.trim())return;
    setStatus("sending");setErrMsg("");
    const res=await sendMsg(fromName,toName,body);
    const ok=res?.ok??res;
    if(ok){setStatus("sent");setTimeout(onClose,1200);}
    else{setStatus("error");setErrMsg(res?.err||"送信できませんでした");}
  }
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.7)",zIndex:800,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
      <div style={{width:"100%",maxWidth:440,background:BG2,borderRadius:"16px 16px 0 0",padding:20,border:`1px solid ${BD}`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <span style={{fontWeight:700,color:TX,fontFamily:"M PLUS Rounded 1c,sans-serif"}}>💬 {toName} へ</span>
          <button onClick={onClose} style={{color:TX3,background:"none",border:"none",fontSize:20,cursor:"pointer"}}>✕</button>
        </div>
        <div style={{fontSize:9,color:TX3,marginBottom:8,fontFamily:"M PLUS Rounded 1c,sans-serif"}}>送信者: {fromName||"（名前未設定）"}</div>
        <textarea value={body} onChange={e=>setBody(e.target.value)} placeholder="メッセージを入力..." rows={3}
          style={{width:"100%",padding:"10px 12px",borderRadius:8,background:BG3,border:`1px solid ${BD}`,color:TX,fontSize:13,outline:"none",resize:"none",boxSizing:"border-box"}}/>
        {status==="sent"&&<div style={{color:"#60c080",fontSize:12,marginTop:6,fontFamily:"M PLUS Rounded 1c,sans-serif"}}>✅ 送信完了！</div>}
        {status==="error"&&<div style={{color:"#ff5555",fontSize:11,marginTop:6,fontFamily:"M PLUS Rounded 1c,sans-serif"}}>❌ {errMsg}</div>}
        <Btn onClick={doSend} disabled={!body.trim()||status==="sending"||status==="sent"} col="#3a3a8a" tc="#fff" full sx={{marginTop:10,fontSize:13,fontWeight:700}}>
          {status==="sending"?"送信中...":"📨 送信"}
        </Btn>
      </div>
    </div>
  );
}

function JapanWalkInn({cityId,char,setChar,genre,onBack,pushNotif}){
  const city=WALK_CITIES.find(c=>c.id===cityId)||{name:"?",e:"?"};
  const[players,setPlayers]=useState([]);
  const[loading,setLoading]=useState(false);
  const[compose,setCompose]=useState(null); // toName
  useEffect(()=>{
    if(!supabase)return;setLoading(true);
    supabase.from("dancers").select("name,genre,power,level").neq("name",char.name)
      .order("power",{ascending:false}).limit(12)
      .then(({data})=>{setPlayers(data||[]);setLoading(false);}).catch(()=>setLoading(false));
  },[]);
  return(<div style={{paddingBottom:80}}>
    {compose&&<ComposeMsg toName={compose} fromName={char.name} onClose={()=>setCompose(null)}/>}
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 12px",background:"#0a1f1f",borderBottom:"1px solid #1a4a4a",marginBottom:12}}>
      <span style={{color:"#00e5ff",fontWeight:700,fontFamily:"M PLUS Rounded 1c,sans-serif",fontSize:13}}>🍺 {city.name} 溜まり場</span>
      <button onClick={onBack} style={{fontSize:10,color:TX3,background:"none",border:`1px solid ${BD}`,borderRadius:4,padding:"4px 8px",cursor:"pointer"}}>← 戻る</button>
    </div>
    <div style={{textAlign:"center",padding:"16px",background:"#0a1a1a",borderRadius:10,margin:"0 4px 12px",border:"1px solid #1a3a3a"}}>
      <div style={{fontSize:40,marginBottom:8}}>🍺</div>
      <div style={{fontSize:11,color:TX2,marginBottom:12,fontFamily:"M PLUS Rounded 1c,sans-serif"}}>仲間がいる。メッセージを送ってみよう。</div>
      <Btn onClick={()=>{setChar(c=>({...c,mood:Math.min(100,c.mood+30),hunger:Math.min(100,c.hunger+20)}));pushNotif("🍺 溜まり場で休憩！気分UP！","#00e5ff");}} col="#0a1f1f" tc="#00e5ff" full sx={{fontSize:12,border:"1px solid #1a4a4a"}}>💤 休憩（気分+30 お腹+20）</Btn>
    </div>
    <div style={{margin:"0 4px"}}>
      <div style={{fontFamily:"'Press Start 2P',monospace",fontSize:7,color:TX3,marginBottom:10}}>最近来たダンサー</div>
      {loading&&<div style={{textAlign:"center",color:TX3,padding:16}}>⏳</div>}
      {!loading&&players.length===0&&<div style={{textAlign:"center",color:TX3,fontSize:11,padding:16,fontFamily:"M PLUS Rounded 1c,sans-serif"}}>まだ誰もいない！最初になろう。</div>}
      {players.map((p,i)=>(
        <div key={i} style={{background:BG2,border:`1px solid ${BD}`,borderRadius:7,padding:"10px 12px",marginBottom:8}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <div><div style={{fontWeight:700,fontSize:12,color:TX,fontFamily:"M PLUS Rounded 1c,sans-serif"}}>{GENRES[p.genre]?.e} {p.name}</div><div style={{fontSize:9,color:TX3}}>{GENRES[p.genre]?.jp} · Lv.{p.level} · POWER {p.power}</div></div>
            <span style={{fontSize:22}}>{GENRES[p.genre]?.e}</span>
          </div>
          <Btn onClick={()=>setCompose(p.name)} col="#1a1a3a" tc="#c0c0ff" full sx={{fontSize:11,border:"1px solid #3a3a6a"}}>💬 メッセージを送る</Btn>
        </div>
      ))}
    </div>
  </div>);
}

function JapanWalkClub({cityId,char,setChar,genre,onBack,pushNotif,addLog}){
  const city=J[cityId]||W[cityId]||SP[cityId];
  const wc=WALK_CITIES.find(c=>c.id===cityId);
  const[battle,setBattle]=useState(null);
  if(!city||!wc)return<div style={{padding:20,textAlign:"center",color:TX3}}><button onClick={onBack}>← 戻る</button></div>;
  const cleared=char.clearedCities||{};
  const isCl=!!cleared[cityId];
  const bosses=city.bosses||[{...city.ch,style:city.g,intro:city.desc}];

  async function doBattle(boss){
    if(char.energy<20){pushNotif("⚡ エネルギー不足！","#ff5555");return;}
    const btl=buildBattle(char,boss.style||city.g,boss.pw);
    setBattle({phase:"seq",...btl,oppName:boss.name,step:0});
    for(let i=0;i<8;i++){await new Promise(r=>setTimeout(r,_battleSpeed===2?380:1050));setBattle(b=>b?{...b,step:Math.min(b.step+1,7)}:null);}
    const bossKey=`${cityId}_${boss.name}`;
    const{won,flags}=btl;
    const eg=won?city.rw.exp:Math.floor(city.rw.exp*.5);
    const coins=won?city.rw.coins:Math.floor(city.rw.coins*.5);
    const gem=won&&!cleared[cityId]?3:0;
    // setChar内で最新stateを使って計算（stale closure回避）
    let gainedArts=[],prevMaxLv=99,newMaxLv=99,finalNt=null;
    setChar(c=>{
      try{
        const newBossDefeats={...(c.bossDefeats||{}),[bossKey]:true};
        const baseArts=c.artifacts||[];
        const newArtifacts=won?computeArtifacts({...c,bossDefeats:newBossDefeats},newBossDefeats,cityId):[...baseArts];
        const keyArt=ARTIFACTS.find(a=>a.id==="key");
        if(won&&keyArt&&!newArtifacts.includes("key")&&Math.random()<keyArt.dropRate)newArtifacts.push("key");
        gainedArts=newArtifacts.filter(a=>!baseArts.includes(a));
        prevMaxLv=getMaxLv(baseArts);
        newMaxLv=getMaxLv(newArtifacts);
        const nt=won&&city.rw.title&&!c.titles?.includes(city.rw.title)?city.rw.title:null;
        finalNt=nt;
        return{...c,exp:c.exp+eg,coins:c.coins+coins,gems:(c.gems||0)+gem,
          energy:Math.max(0,c.energy-20),
          mood:won?Math.min(100,c.mood+20):Math.max(0,c.mood-15),
          battlesWon:won?c.battlesWon+1:c.battlesWon,
          titles:nt?[...(c.titles||[]),nt]:c.titles||[],
          clearedCities:won?{...(c.clearedCities||{}),[cityId]:true}:c.clearedCities,
          bossDefeats:newBossDefeats,artifacts:newArtifacts};
      }catch(e){console.error("doBattle setChar error:",e);return c;}
    });
    setBattle({phase:"result",won,eg,coins,gems:gem,title:finalNt,flags,myP:btl.myP,thP:btl.thP});
    if(won)Sound.fanfare();else Sound.lose();
    // 秘宝獲得通知（少し遅らせて表示）
    gainedArts.forEach((artId,i)=>{
      const art=ARTIFACTS.find(a=>a.id===artId);
      if(art)setTimeout(()=>pushNotif(`✨ ${art.e} ${art.name} を獲得！`,"#ffd60a"),1000+i*800);
    });
    if(newMaxLv>prevMaxLv)setTimeout(()=>pushNotif(`🔓 Lv.${newMaxLv}まで解放！`,"#ff4da6"),gainedArts.length?2200:1000);
    addLog(`${won?"🏆":"💀"} vs ${boss.name} @${city.name} +${eg}EXP${gainedArts.length?` ✨秘宝×${gainedArts.length}`:""}`);
  }
  return(<div style={{paddingBottom:80}}>
    {battle&&<BattleOverlay state={battle} gc={genre.c} onClose={()=>setBattle(null)}/>}
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 12px",background:"#0f0a1a",borderBottom:"1px solid #3a1a4a",marginBottom:12}}>
      <span style={{color:"#ff4da6",fontWeight:700,fontFamily:"M PLUS Rounded 1c,sans-serif",fontSize:13}}>🎵 {city.name} CLUB</span>
      <button onClick={onBack} style={{fontSize:10,color:TX3,background:"none",border:`1px solid ${BD}`,borderRadius:4,padding:"4px 8px",cursor:"pointer"}}>← 戻る</button>
    </div>
    {isCl&&<div style={{textAlign:"center",fontSize:11,color:"#60c080",padding:"4px 0 10px",fontFamily:"M PLUS Rounded 1c,sans-serif"}}>✓ 制覇済み！リターンマッチ可</div>}
    {(()=>{const cb1=compatBonus(char.genre,city.g);const cb2=char.genre2?compatBonus(char.genre2,city.g):{bonus:0};const best=cb2.bonus>cb1.bonus?cb2:cb1;return best.label?<div style={{textAlign:"center",marginBottom:10,fontSize:11,color:best.col,fontWeight:700,fontFamily:"M PLUS Rounded 1c,sans-serif"}}>{best.label}</div>:null;})()}
    {bosses.map((boss,i)=>(
      <div key={i} style={{background:"#0f0a1a",borderRadius:10,margin:"0 4px 12px",border:`1px solid ${i===0?"#3a1a4a":"#2a1030"}`,padding:"18px 16px",textAlign:"center"}}>
        <div style={{fontSize:48,marginBottom:8}}>{boss.e}</div>
        <div style={{fontFamily:"'Press Start 2P',monospace",fontSize:8,color:"#ff4da6",marginBottom:4}}>{i===0?"CLUB BOSS":"CHALLENGER"}</div>
        <div style={{fontSize:18,color:TX,fontWeight:900,fontFamily:"M PLUS Rounded 1c,sans-serif",marginBottom:4}}>{boss.name}</div>
        <div style={{fontSize:10,color:TX3,marginBottom:6}}>{GENRES[boss.style||city.g]?.e}{GENRES[boss.style||city.g]?.jp} · POWER {boss.pw.toLocaleString()}</div>
        {boss.intro&&<div style={{fontSize:11,color:"#ff9ec4",marginBottom:12,fontFamily:"M PLUS Rounded 1c,sans-serif",fontStyle:"italic"}}>「{boss.intro}」</div>}
        <Btn disabled={char.energy<20} col="#280a0a" tc="#ff7070" onClick={()=>doBattle(boss)} full sx={{fontSize:12,padding:"12px",fontWeight:700,border:"1px solid #5a1818"}}>
          {char.energy<20?"⚡ エネルギー不足":"⚔️ バトル！ ⚡20"}
        </Btn>
      </div>
    ))}
  </div>);
}

function JapanWalkMode({char,setChar,genre,onExit,pushNotif,addLog}){
  const startC=WALK_CITIES.find(c=>c.id===char.currentCity)||WALK_CITIES[0];
  const[pos,setPos]=useState({x:startC.x,y:startC.y});
  const[steps,setSteps]=useState(0);
  const[enc,setEnc]=useState(null);
  const[cityAt,setCityAt]=useState(null);
  const[view,setView]=useState("walk");
  const[battle,setBattle]=useState(null);
  const[msg,setMsg]=useState("");

  const[cityMini,setCityMini]=useState(null);

  const camX=Math.max(0,Math.min(WK_W-VW,pos.x-Math.floor(VW/2)));
  const camY=Math.max(0,Math.min(WK_H-VH,pos.y-Math.floor(VH/2)));

  const gt=(x,y)=>{if(x<0||x>=WK_W||y<0||y>=WK_H)return'~';return WK_MAP[y]?.[x]||'~';};
  const gd=(t)=>WT[t]||WT['~'];
  const cityAt2=(x,y)=>WALK_CITIES.find(c=>c.x===x&&c.y===y)||null;
  const region=(y)=>y>65?"九州":y>55?"中国":y>42?"近畿":y>32?"中部":y>22?"関東":y>12?"東北":"北海道";

  function move(dir){
    if(enc||cityAt||cityMini)return;
    setPos(prev=>{
      let{x,y}=prev;let nx=x,ny=y;
      if(dir==="up")ny--;if(dir==="down")ny++;if(dir==="left")nx--;if(dir==="right")nx++;
      const t=gt(nx,ny);const d=gd(t);
      if(!d.pass)return prev;
      const city=cityAt2(nx,ny);
      if(city){
        setCityAt(city);
        setChar(c=>({...c,currentCity:city.id,energy:Math.max(0,c.energy-1)}));
        addLog(`📍 ${city.name}に到着！`);
        Sound.playRegion(city.id);
        setMsg(`🏙 ${city.name}に到着！タップして街に入ろう`);
        return{x:nx,y:ny};
      }
      if(d.enc&&Math.random()<d.rate){
        const opps=QOPPS.filter(o=>o.lv<=Math.max(3,getLv(char.exp)+2));
        const opp=opps[Math.floor(Math.random()*opps.length)]||QOPPS[0];
        Sound.battle();setEnc(opp);
        return{x:nx,y:ny};
      }
      setSteps(s=>s+1);
      return{x:nx,y:ny};
    });
  }

  async function fightEnc(){
    if(!enc)return;
    if(char.energy<3){pushNotif("⚡ エネルギー不足！","#ff5555");setEnc(null);return;}
    const btl=buildBattle(char,enc.style,enc.pw);
    setBattle({phase:"seq",...btl,oppName:enc.name,step:0});
    setEnc(null);
    for(let i=0;i<8;i++){await new Promise(r=>setTimeout(r,_battleSpeed===2?350:900));setBattle(b=>b?{...b,step:Math.min(b.step+1,7)}:null);}
    const{won,flags}=btl;const eg=won?enc.rw.exp:Math.floor(enc.rw.exp*.5);const coins=won?enc.rw.coins:Math.floor(enc.rw.coins*.5);
    setChar(c=>({...c,exp:c.exp+eg,coins:c.coins+coins,energy:Math.max(0,c.energy-3),mood:won?Math.min(100,c.mood+12):Math.max(0,c.mood-10),battlesWon:won?c.battlesWon+1:c.battlesWon}));
    setBattle({phase:"result",won,eg,coins,flags,myP:btl.myP,thP:btl.thP});
    if(won){
      Sound.clear();setMsg(`🏆 勝利！+${eg}EXP`);
      // 伝説の鍵のレアドロップ（強敵から）
      const keyArt=ARTIFACTS.find(a=>a.id==="key");
      if(keyArt&&!(char.artifacts||[]).includes("key")&&Math.random()<keyArt.dropRate){
        setChar(c=>({...c,artifacts:[...(c.artifacts||[]),"key"]}));
        setTimeout(()=>pushNotif("✨ 🔑 伝説の鍵 を入手！！","#ffd60a"),1500);
      }
    }else{Sound.lose();setMsg("💀 敗北...");}
    setTimeout(()=>setMsg(""),3000);
    addLog(`${won?"⚡":"💀"} vs ${enc.name} +${eg}EXP`);
  }

  useEffect(()=>{
    const h=e=>{const m={ArrowUp:"up",ArrowDown:"down",ArrowLeft:"left",ArrowRight:"right",w:"up",s:"down",a:"left",d:"right"};if(m[e.key]){e.preventDefault();move(m[e.key]);}};
    window.addEventListener("keydown",h);return()=>window.removeEventListener("keydown",h);
  },[pos,enc,cityAt,cityMini]);

  // ← useEffectの後ならconditional returnOK
  if(cityMini)return<CityMiniMap cityId={cityMini} char={char} setChar={setChar} genre={genre} onExit={()=>{setCityMini(null);setCityAt(null);}} pushNotif={pushNotif} addLog={addLog}/>;

  if(view==="club"&&cityAt)return<JapanWalkClub cityId={cityAt.id} char={char} setChar={setChar} genre={genre} onBack={()=>setView("walk")} pushNotif={pushNotif} addLog={addLog}/>;
  if(view==="inn"&&cityAt)return<JapanWalkInn cityId={cityAt.id} char={char} setChar={setChar} genre={genre} onBack={()=>setView("walk")} pushNotif={pushNotif}/>;

  const gc=genre.c;

  return(<div style={{background:BG,minHeight:"100vh",paddingBottom:180}}>
    {battle&&<BattleOverlay state={battle} gc={gc} onClose={()=>setBattle(null)}/>}
    {/* ヘッダー */}
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 14px",background:BG2,borderBottom:`2px solid ${gc}55`}}>
      <div><div style={{fontFamily:"'Press Start 2P',monospace",fontSize:8,color:gc,letterSpacing:1}}>🚶 WALK JAPAN</div>
        <div style={{fontSize:10,color:TX2,fontFamily:"M PLUS Rounded 1c,sans-serif",marginTop:2}}>{region(pos.y)} · {steps}歩</div></div>
      <button onClick={onExit} style={{fontSize:10,color:TX3,background:"none",border:`1px solid ${BD}`,borderRadius:4,padding:"5px 10px",cursor:"pointer"}}>🗺 マップへ</button>
    </div>

    {/* エンカウント */}
    {enc&&<div style={{position:"fixed",inset:0,background:"rgba(3,3,15,.92)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",zIndex:900,animation:"su .3s ease"}}>
      <div style={{fontSize:62,marginBottom:14,animation:"vi .4s ease"}}>{enc.e}</div>
      <div style={{fontFamily:"'Press Start 2P',monospace",fontSize:11,color:"#ff6b6b",marginBottom:8}}>⚡ ENCOUNTER!</div>
      <div style={{fontSize:15,color:TX,fontFamily:"M PLUS Rounded 1c,sans-serif",marginBottom:6,fontWeight:700}}>{enc.name}が現れた！</div>
      <div style={{fontSize:10,color:TX3,marginBottom:20}}>{GENRES[enc.style]?.e}{GENRES[enc.style]?.jp} · POWER {enc.pw}</div>
      <div style={{display:"flex",gap:12}}>
        <Btn disabled={char.energy<3} col="#280a0a" tc="#ff7070" onClick={fightEnc} sx={{fontSize:13,padding:"12px 28px",fontWeight:700}}>⚔️ バトル</Btn>
        <Btn col="#0a1828" tc="#00e5ff" onClick={()=>{setEnc(null);Sound.playRegion(char.currentCity);}} sx={{fontSize:13,padding:"12px 20px"}}>🏃 逃げる</Btn>
      </div>
    </div>}

    {/* タイルマップ */}
    <div style={{margin:"8px 4px",border:`1px solid ${BD}`,borderRadius:8,overflow:"hidden",position:"relative"}}>
      <svg viewBox={`0 0 ${VW*TS} ${VH*TS}`} width="100%" style={{display:"block"}}>
        <rect width={VW*TS} height={VH*TS} fill="#040a12"/>
        {Array.from({length:VH},(_,vy)=>Array.from({length:VW},(_,vx)=>{
          const mx=camX+vx,my=camY+vy;
          const t=gt(mx,my);const d=gd(t);
          const city=cityAt2(mx,my);
          const gc2=city?GENRES[city.g]?.c:null;
          return(<g key={`${vx}-${vy}`}>
            <rect x={vx*TS} y={vy*TS} width={TS} height={TS} fill={city?"#1a0a2e":d.bg} stroke="#030810" strokeWidth=".4"/>
            {t==='f'&&<text x={vx*TS+TS*.25} y={vy*TS+TS*.6} fontSize={TS*.4} opacity=".6">🌲</text>}
            {t==='^'&&<text x={vx*TS+TS*.5} y={vy*TS+TS*.62} textAnchor="middle" dominantBaseline="middle" fontSize={TS*.55}>⛰</text>}
            {t==='.'&&<rect x={vx*TS+TS*.25} y={vy*TS+TS*.4} width={TS*.5} height={TS*.2} fill="#2a3a1a" rx="1"/>}
            {city&&<g>
              <circle cx={vx*TS+TS*.5} cy={vy*TS+TS*.46} r={TS*.38} fill={`${gc2}44`} stroke={gc2} strokeWidth="1.4"/>
              <text x={vx*TS+TS*.5} y={vy*TS+TS*.52} textAnchor="middle" dominantBaseline="middle" fontSize={TS*.52}>{city.e}</text>
              <text x={vx*TS+TS*.5} y={vy*TS+TS*.9} textAnchor="middle" fontSize="4" fill={gc2} fontFamily="M PLUS Rounded 1c,sans-serif">{city.name}</text>
            </g>}
          </g>);
        }))}
        {/* プレイヤー */}
        {(()=>{const vx=pos.x-camX,vy=pos.y-camY;if(vx<0||vx>=VW||vy<0||vy>=VH)return null;return(<g><circle cx={vx*TS+TS*.5} cy={vy*TS+TS*.5} r={TS*.42} fill={gc} stroke="#fff" strokeWidth="2" style={{filter:`drop-shadow(0 0 5px ${gc})`}}/><text x={vx*TS+TS*.5} y={vy*TS+TS*.58} textAnchor="middle" dominantBaseline="middle" fontSize={TS*.52}>{genre.e}</text></g>);})()}
      </svg>
      {/* ミニマップ */}
      <div style={{position:"absolute",top:5,right:5,width:42,height:63,background:"rgba(0,0,0,.8)",borderRadius:4,border:"1px solid #2a2a4a",overflow:"hidden"}}>
        <svg viewBox={`0 0 ${WK_W} ${WK_H}`} width="42" height="63">
          {WALK_CITIES.map(c=>{const cl=char.clearedCities?.[c.id];return<circle key={c.id} cx={c.x} cy={c.y} r="1.8" fill={cl?"#60c080":GENRES[c.g]?.c||"#888"} opacity={cl?1:.6}/>;  })}
          <circle cx={pos.x} cy={pos.y} r="2.2" fill="#fff"/>
          <rect x={camX} y={camY} width={VW} height={VH} fill="none" stroke="#ffffff55" strokeWidth=".8"/>
        </svg>
      </div>
    </div>

    {/* メッセージ */}
    {msg&&<div style={{margin:"0 4px 6px",padding:"8px 12px",background:BG2,borderRadius:6,fontSize:11,color:TX2,fontFamily:"M PLUS Rounded 1c,sans-serif"}}>{msg}</div>}

    {/* 都市パネル */}
    {cityAt&&!enc&&<div style={{margin:"0 4px 8px",padding:14,background:BG2,borderRadius:10,border:`2px solid ${GENRES[cityAt.g]?.c||gc}66`,animation:"su .2s ease"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <div style={{display:"flex",gap:10,alignItems:"center"}}>
          <span style={{fontSize:32}}>{cityAt.e}</span>
          <div><div style={{fontWeight:700,fontSize:16,color:GENRES[cityAt.g]?.c||gc,fontFamily:"M PLUS Rounded 1c,sans-serif"}}>{cityAt.name}</div>
            <div style={{fontSize:10,color:TX3}}>{GENRES[cityAt.g]?.e}{GENRES[cityAt.g]?.jp}{char.clearedCities?.[cityAt.id]&&" ✓"}</div></div>
        </div>
        <button onClick={()=>setCityAt(null)} style={{color:TX3,fontSize:22,background:"none",border:"none",cursor:"pointer"}}>✕</button>
      </div>
      <Btn col={`${GENRES[cityAt.g]?.c||gc}22`} tc={GENRES[cityAt.g]?.c||gc} onClick={()=>setCityMini(cityAt.id)} full sx={{fontSize:13,border:`1px solid ${GENRES[cityAt.g]?.c||gc}66`,fontWeight:700,padding:"12px",marginBottom:8}}>
        🏙 {cityAt.name}の街に入る（クラブ・グルメ・溜まり場）
      </Btn>
    </div>}

    {!cityAt&&!enc&&<div style={{textAlign:"center",fontSize:9,color:TX3,fontFamily:"M PLUS Rounded 1c,sans-serif"}}>十字キーで移動 · 都市でAボタン · 🌲森でエンカウント！</div>}
    <DPad onMove={move}/>
    {cityAt&&!enc&&<AButton onPress={()=>setCityMini(cityAt.id)} col={GENRES[cityAt.g]?.c||gc} sub={`${cityAt.name}に入る`}/>}
    {enc&&<AButton onPress={fightEnc} col="#ff4da6" sub="バトル！" disabled={char.energy<3}/>}
    {!cityAt&&!enc&&<AButton onPress={()=>{}} col="#3a3a5a" disabled label="A"/>}
  </div>);
}


function MapTab({char,setChar,genre,pushNotif,addLog}){
  const[region,setRegion]=useState(()=>{if(SP[char.currentCity])return"space";if(W[char.currentCity])return"world";return"japan";});
  const[selected,setSelected]=useState(null);
  const[battle,setBattle]=useState(null);
  const[bStep,setBStep]=useState(0);
  const[traveling,setTraveling]=useState(null);
  const[walkJapan,setWalkJapan]=useState(false);
  const[walkUSA,setWalkUSA]=useState(false);
  const[walkASIA,setWalkASIA]=useState(false);
  const[walkEUR,setWalkEUR]=useState(false);
  const[walkIND,setWalkIND]=useState(false);
  const[walkSAM,setWalkSAM]=useState(false);
  const[walkAFR,setWalkAFR]=useState(false);
  const[walkMoon,setWalkMoon]=useState(false);
  const[walkSpace,setWalkSpace]=useState(false);
  const hasMichaelSet=["michael_glove","michael_loafer","michael_hat"].every(id=>(char.specialItems||[]).includes(id));
  const rocketParts=getRocketParts(char);
  const shipBuilt=hasSpaceship(char);
  const cleared=char.clearedCities||{};
  const wldOk=!!cleared["tokyo"]||!!W[char.hometown];
  const spaceOk=!!cleared["wf"];
  const hasAirplane=(char.specialItems||[]).includes("airplane");
  const hasFerry=(char.specialItems||[]).includes("ferry");

  if(walkJapan)return<JapanWalkMode char={char} setChar={setChar} genre={genre} onExit={()=>setWalkJapan(false)} pushNotif={pushNotif} addLog={addLog}/>;
  if(walkUSA)return<USAWalkMode char={char} setChar={setChar} genre={genre} onExit={()=>setWalkUSA(false)} pushNotif={pushNotif} addLog={addLog}/>;
  if(walkASIA)return<ASIAWalkMode char={char} setChar={setChar} genre={genre} onExit={()=>setWalkASIA(false)} pushNotif={pushNotif} addLog={addLog}/>;
  if(walkEUR)return<EUROPEWalkMode char={char} setChar={setChar} genre={genre} onExit={()=>setWalkEUR(false)} pushNotif={pushNotif} addLog={addLog}/>;
  if(walkIND)return<INDIAWalkMode char={char} setChar={setChar} genre={genre} onExit={()=>setWalkIND(false)} pushNotif={pushNotif} addLog={addLog}/>;
  if(walkSAM)return<SAMWalkMode char={char} setChar={setChar} genre={genre} onExit={()=>setWalkSAM(false)} pushNotif={pushNotif} addLog={addLog}/>;
  if(walkAFR)return<AFRICAWalkMode char={char} setChar={setChar} genre={genre} onExit={()=>setWalkAFR(false)} pushNotif={pushNotif} addLog={addLog}/>;
  if(walkMoon)return<MoonWalkMode char={char} setChar={setChar} genre={genre} onExit={()=>setWalkMoon(false)} pushNotif={pushNotif} addLog={addLog}/>;
  if(walkSpace)return<SpaceWalkMode char={char} setChar={setChar} genre={genre} onExit={()=>setWalkSpace(false)} pushNotif={pushNotif} addLog={addLog}/>;


  function travel(city){
    if(char.energy<5){pushNotif("エネルギー不足！","#ff5555");return;}
    const allCities=allC();
    const from=allCities[char.currentCity];
    const to=city;
    if(from&&to){
      // アニメーション開始
      setTraveling({fx:from.x,fy:from.y,tx:to.x,ty:to.y,prog:0,emoji:genre.e});
      let start=null;
      const dur=1800;
      const step=ts=>{
        if(!start)start=ts;
        const prog=Math.min((ts-start)/dur,1);
        setTraveling(t=>t?{...t,prog}:null);
        if(prog<1){requestAnimationFrame(step);}
        else{
          setTraveling(null);
          setChar(c=>({...c,currentCity:city.id,energy:Math.max(0,c.energy-5),lastEnergyTime:c.lastEnergyTime||(Date.now()-((50-Math.max(0,c.energy-5))*5*60*1000))}));
          pushNotif(`${city.name}に到着！`,GENRES[city.g].c);
          addLog(`📍 ${city.name}に移動`);
          setSelected(city);
        }
      };
      requestAnimationFrame(step);
    }else{
      setChar(c=>({...c,currentCity:city.id,energy:Math.max(0,c.energy-5)}));
      pushNotif(`${city.name}に移動！`,GENRES[city.g].c);
      addLog(`📍 ${city.name}に移動`);
      setSelected(city);
    }
  }

  async function startBattle(city){
    if(char.energy<20){pushNotif("エネルギー不足！","#ff5555");return;}
    const btl=buildBattle(char,city.g,city.ch.pw);
    setBattle({phase:"seq",...btl,step:0,oppName:city.ch.name});setBStep(0);
    // Animate moves
    for(let i=0;i<8;i++){
      await new Promise(r=>setTimeout(r,_battleSpeed===2?400:1200));
      setBattle(b=>b?{...b,step:Math.min(b.step+1,7)}:null);
    }
    // Finalize
    const{won,flags}=btl;
    const eg=won?city.rw.exp:Math.floor(city.rw.exp*.5),coins=won?city.rw.coins:Math.floor(city.rw.coins*.5);
    const nt=won&&city.rw.title&&!char.titles?.includes(city.rw.title)?city.rw.title:null;
    const gemReward=won&&!cleared[city.id]?3:0; // 初回クリアで💎3
    setChar(c=>({...c,exp:c.exp+eg,coins:c.coins+coins,gems:(c.gems||0)+gemReward,energy:Math.max(0,c.energy-20),
      mood:won?Math.min(100,c.mood+20):Math.max(0,c.mood-15),
      battlesWon:won?c.battlesWon+1:c.battlesWon,
      titles:nt?[...(c.titles||[]),nt]:c.titles||[],
      clearedCities:won?{...cleared,[city.id]:true}:cleared}));
    setBattle({phase:"result",won,eg,coins,gems:gemReward,title:nt,flags,myP:btl.myP,thP:btl.thP});
    if(won){if(nt)Sound.fanfare();else Sound.clear();}else Sound.lose();
    addLog(`${won?"🏆 CLEAR":"💀 敗北"} ${city.name} +${eg}EXP${gemReward?` 💎+${gemReward}`:""}`);
  }

  function eatFood(food,city){
    if(char.coins<food.p){pushNotif("コインが足りない！","#ff5555");return;}
    setChar(c=>({...c,coins:c.coins-food.p,
      energy:Math.min(c.maxEnergy||50,(c.energy||0)+food.e),
      hunger:Math.min(100,(c.hunger||0)+food.h),mood:Math.min(100,(c.mood||0)+10)}));
    pushNotif(`🍜 ${food.n} 食べた！ ⚡+${food.e}`,GENRES[city.g]?.c||"#80e080");
    addLog(`🍜 ${city.name}で${food.n}を食べた！ ⚡+${food.e}`);
  }

  const curCity=allC()[char.currentCity];
  return(<div>
    {battle&&<BattleOverlay state={battle} gc={genre.c} onClose={()=>setBattle(null)}/>}
    <div style={{display:"flex",gap:6,marginBottom:10}}>
      {[["japan","🇯🇵 日本",true],["world","🌍 WORLD",wldOk],["space","🚀 SPACE",spaceOk]].map(([r,label,ok])=>(
        <button key={r} onClick={()=>{if(ok){setRegion(r);setSelected(null);}else pushNotif(r==="space"?"WORLD FINALをクリアで解放！":"まず日本を制覇！","#ff5555");}} style={{flex:1,padding:"8px 4px",fontSize:9,fontFamily:"M PLUS Rounded 1c,sans-serif",fontWeight:700,background:region===r?`${genre.c}30`:ok?BG2:"#0c0c1a",color:region===r?genre.c:ok?TX2:"#303060",border:`1px solid ${region===r?genre.c+"88":ok?BD:"#1a1a38"}`,borderRadius:7,transition:"all .15s"}}>{ok?label:`🔒 ${r.toUpperCase()}`}</button>
      ))}
    </div>
    {/* ── 3セクション：JAPAN / WORLD / SPACE ── */}

    {/* 🗾 JAPAN セクション */}
    <div style={{marginBottom:14}}>
      <div style={{fontFamily:"'Press Start 2P',monospace",fontSize:7,color:genre.c,marginBottom:8,letterSpacing:1}}>🗾 WALK JAPAN</div>
      <Btn onClick={()=>setWalkJapan(true)} col={`${genre.c}22`} tc={genre.c} full sx={{fontSize:12,border:`1px solid ${genre.c}66`,fontWeight:700,padding:"12px"}}>
        🚶 鹿児島 → 札幌（15都市）
      </Btn>
    </div>

    {/* 🌍 WORLD セクション */}
    <div style={{marginBottom:14,background:"#0a0a14",borderRadius:10,padding:12,border:`1px solid ${hasFerry||hasAirplane?"#4a4a28":"#2a2a3a"}`}}>
      <div style={{fontFamily:"'Press Start 2P',monospace",fontSize:7,color:"#ffd60a",marginBottom:10,letterSpacing:1}}>🌍 WORLD MAP</div>

      {/* フェリー購入 */}
      {!hasFerry&&(()=>{
        const cleared2=char.clearedCities||{};
        const jpCount=Object.keys(allC()).filter(id=>cleared2[id]).length;
        const needJP=5;const ferryPrice=300000;const ferryGems=200;
        return(<div style={{background:"#001a00",borderRadius:8,padding:10,marginBottom:10,border:"1px solid #b3ff0033"}}>
          <div style={{fontSize:10,color:"#b3ff00",fontWeight:700,fontFamily:"M PLUS Rounded 1c,sans-serif",marginBottom:4}}>
            🚢 フェリーチケット → 🌏 ASIA解放
          </div>
          <div style={{fontSize:9,color:TX3,marginBottom:6,fontFamily:"M PLUS Rounded 1c,sans-serif"}}>
            日本{needJP}都市制覇（現在{jpCount}）+ ¥{ferryPrice.toLocaleString()}
          </div>
          {jpCount<needJP&&<div style={{fontSize:9,color:"#ff6b6b",marginBottom:4}}>⚠️ あと{needJP-jpCount}都市制覇が必要</div>}
          <div style={{display:"flex",gap:6}}>
            <Btn disabled={char.coins<ferryPrice||jpCount<needJP} col="#001a00" tc="#b3ff00" onClick={()=>{
              if(jpCount<needJP){pushNotif(`日本${needJP}都市制覇が必要！`,"#ff6b6b");return;}
              if(char.coins<ferryPrice){pushNotif(`¥${ferryPrice.toLocaleString()}必要！`,"#ff5555");return;}
              if(!window.confirm(`🚢 フェリーチケット購入？¥${ferryPrice.toLocaleString()}消費！`))return;
              setChar(c=>({...c,coins:c.coins-ferryPrice,specialItems:[...(c.specialItems||[]),"ferry"]}));
              pushNotif("🚢 フェリーチケット購入！ASIAが解放！","#b3ff00");
            }} sx={{flex:1,fontSize:10}}>💰 ¥{(300000).toLocaleString()}</Btn>
            <Btn disabled={(char.gems||0)<ferryGems||jpCount<needJP} col="#001a00" tc="#ce93d8" onClick={()=>{
              if(jpCount<needJP){pushNotif(`日本${needJP}都市制覇が必要！`,"#ff6b6b");return;}
              if((char.gems||0)<ferryGems){pushNotif(`💎${ferryGems}必要！`,"#ff5555");return;}
              if(!window.confirm(`🚢 フェリー購入？💎${ferryGems}消費！`))return;
              setChar(c=>({...c,gems:(c.gems||0)-ferryGems,specialItems:[...(c.specialItems||[]),"ferry"]}));
              pushNotif("🚢 フェリーチケット購入！ASIAが解放！","#b3ff00");
            }} sx={{flex:1,fontSize:10}}>💎 {500}</Btn>
          </div>
        </div>);
      })()}

      {/* 航空チケット購入 */}
      {hasFerry&&!hasAirplane&&(()=>{
        const cleared2=char.clearedCities||{};
        const jpCount=Object.keys(allC()).filter(id=>cleared2[id]).length;
        const needJP=10;const airPrice=800000;const airGems=500;
        return(<div style={{background:"#001428",borderRadius:8,padding:10,marginBottom:10,border:"1px solid #00e5ff33"}}>
          <div style={{fontSize:10,color:"#00e5ff",fontWeight:700,fontFamily:"M PLUS Rounded 1c,sans-serif",marginBottom:4}}>
            ✈️ 航空チケット → 世界全域解放！
          </div>
          <div style={{fontSize:9,color:TX3,marginBottom:6,fontFamily:"M PLUS Rounded 1c,sans-serif"}}>
            日本{needJP}都市制覇（現在{jpCount}）+ ¥{airPrice.toLocaleString()}
          </div>
          {jpCount<needJP&&<div style={{fontSize:9,color:"#ff6b6b",marginBottom:4}}>⚠️ あと{needJP-jpCount}都市制覇が必要</div>}
          <div style={{display:"flex",gap:6}}>
            <Btn disabled={char.coins<airPrice||jpCount<needJP} col="#001428" tc="#00e5ff" onClick={()=>{
              if(jpCount<needJP){pushNotif(`日本${needJP}都市制覇が必要！`,"#ff6b6b");return;}
              if(char.coins<airPrice){pushNotif(`¥${airPrice.toLocaleString()}必要！`,"#ff5555");return;}
              if(!window.confirm(`✈️ 航空チケット購入？¥${airPrice.toLocaleString()}消費！`))return;
              setChar(c=>({...c,coins:c.coins-airPrice,specialItems:[...(c.specialItems||[]),"airplane"]}));
              pushNotif("✈️ 航空チケット購入！世界が解放！","#00e5ff");
            }} sx={{flex:1,fontSize:10}}>💰 ¥{(3000000).toLocaleString()}</Btn>
            <Btn disabled={(char.gems||0)<airGems||jpCount<needJP} col="#001428" tc="#ce93d8" onClick={()=>{
              if(jpCount<needJP){pushNotif(`日本${needJP}都市制覇が必要！`,"#ff6b6b");return;}
              if((char.gems||0)<airGems){pushNotif(`💎${airGems}必要！`,"#ff5555");return;}
              if(!window.confirm(`✈️ 航空チケット購入？💎${airGems}消費！`))return;
              setChar(c=>({...c,gems:(c.gems||0)-airGems,specialItems:[...(c.specialItems||[]),"airplane"]}));
              pushNotif("✈️ 航空チケット購入！世界が解放！","#00e5ff");
            }} sx={{flex:1,fontSize:10}}>💎 {1500}</Btn>
          </div>
        </div>);
      })()}

      {/* ワールドMAPグリッド */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
        {hasFerry&&<Btn onClick={()=>setWalkASIA(true)} col="#001a00" tc="#b3ff00" sx={{fontSize:11,fontWeight:700,padding:"10px 6px"}}>🌏 ASIA</Btn>}
        {hasAirplane&&<Btn onClick={()=>setWalkUSA(true)} col="#001a33" tc="#00e5ff" sx={{fontSize:11,fontWeight:700,padding:"10px 6px"}}>🇺🇸 USA</Btn>}
        {hasAirplane&&<Btn onClick={()=>setWalkEUR(true)} col="#1a0a00" tc="#ffd60a" sx={{fontSize:11,fontWeight:700,padding:"10px 6px"}}>🌍 EUROPE</Btn>}
        {hasAirplane&&<Btn onClick={()=>setWalkIND(true)} col="#1a0a1a" tc="#ff9ec4" sx={{fontSize:11,fontWeight:700,padding:"10px 6px"}}>🇮🇳 INDIA</Btn>}
        {hasAirplane&&<Btn onClick={()=>setWalkSAM(true)} col="#1a1000" tc="#ffd60a" sx={{fontSize:11,fontWeight:700,padding:"10px 6px"}}>🌎 S.AMERICA</Btn>}
        {hasAirplane&&<Btn onClick={()=>setWalkAFR(true)} col="#1a0800" tc="#ff9900" sx={{fontSize:11,fontWeight:700,padding:"10px 6px"}}>🌍 AFRICA</Btn>}
        {!hasFerry&&<div style={{gridColumn:"1/-1",textAlign:"center",fontSize:9,color:"#3a3a5a",fontFamily:"M PLUS Rounded 1c,sans-serif",padding:8}}>🔒 フェリーを手に入れると世界へ！</div>}
      </div>

      {/* 隠しアイテム収集状況 */}
      {(char.foundItems||[]).length>0&&<div style={{marginTop:10,padding:"6px 10px",background:"#1a1a08",borderRadius:6,border:"1px solid #ffd60a33"}}>
        <span style={{fontSize:9,color:"#ffd60a",fontFamily:"M PLUS Rounded 1c,sans-serif"}}>
          ✨ 隠しアイテム {(char.foundItems||[]).length}/{HIDDEN_ITEMS.length}個発見
        </span>
      </div>}
    </div>

    {/* 🚀 SPACE セクション */}
    <div style={{marginBottom:14,background:"#020210",borderRadius:10,padding:12,border:`1px solid ${shipBuilt?"#4a4aff":"#2a2a5a"}`}}>
      <div style={{fontFamily:"'Press Start 2P',monospace",fontSize:7,color:"#c0c0ff",marginBottom:10,letterSpacing:1}}>🚀 SPACE</div>
      {[
        {key:"engine",e:"🔩",label:"エンジン",  hint:"東京BOSS（SAM）撃破"},
        {key:"fuel",  e:"⛽",label:"燃料",      hint:"札幌BOSS（NAOYA）撃破"},
        {key:"shield",e:"🛡",label:"シールド", hint:"マイケル3点セット所持"},
        {key:"nav",   e:"💡",label:"ナビ",     hint:"Lv.50以上で自動入手！"},
      ].map(p=>(
        <div key={p.key} style={{display:"flex",alignItems:"center",gap:8,marginBottom:5}}>
          <span style={{fontSize:14}}>{p.e}</span>
          <div style={{flex:1}}>
            <span style={{fontSize:10,color:rocketParts[p.key]?"#b3ff00":TX3,fontFamily:"M PLUS Rounded 1c,sans-serif"}}>
              {p.label}
            </span>
            {!rocketParts[p.key]&&<div style={{fontSize:8,color:"#3a3a6a",fontFamily:"M PLUS Rounded 1c,sans-serif"}}>{p.hint}</div>}
          </div>
          <span style={{fontSize:14}}>{rocketParts[p.key]?"✅":"⬜"}</span>
        </div>
      ))}
      {shipBuilt&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:10}}>
        <Btn onClick={()=>setWalkMoon(true)} col="#050518" tc="#c0c0ff" sx={{fontSize:11,fontWeight:700,padding:"10px 6px",border:"1px solid #4a4aff"}}>🌙 月</Btn>
        <Btn onClick={()=>setWalkSpace(true)} col="#020210" tc="#8080ff" sx={{fontSize:11,fontWeight:700,padding:"10px 6px",border:"1px solid #3a3aaa"}}>🚀 宇宙</Btn>
      </div>}
      {!shipBuilt&&<div style={{textAlign:"center",fontSize:9,color:"#3a3a6a",fontFamily:"M PLUS Rounded 1c,sans-serif",marginTop:6}}>
        🔒 全パーツを集めると宇宙へ行ける！
      </div>}
    </div>

        <div style={{border:`1px solid ${BD}`,borderRadius:10,overflow:"hidden",marginBottom:10}}>
      <MapSVG region={region} char={char} selected={selected} onSelect={setSelected} traveling={traveling}/>
    </div>
    {selected&&<CityPanel city={selected} char={char} region={region} cleared={cleared} gc2={genre.c} onClose={()=>setSelected(null)} onTravel={travel} onBattle={startBattle} onEatFood={(f)=>eatFood(f,selected)} pushNotif={pushNotif}/>}
    <OnlineArena char={char} setChar={setChar} genre={genre} pushNotif={pushNotif} addLog={addLog}/>
  </div>);
}

/* ── ONLINE ARENA ── */
function OnlineArena({char,setChar,genre,pushNotif,addLog}){
  const[open,setOpen]=useState(false);
  const[players,setPlayers]=useState([]);
  const[loading,setLoading]=useState(false);
  const[battle,setBattle]=useState(null);
  const[result,setResult]=useState(null);
  const myPow=calcPow({...char.stats,...eqBonus(char.equipped||{})});
  const myId=`${char.name}_${char.genre}`.replace(/\W/g,"_");

  async function reload(){
    setLoading(true);
    if(!supabase){
      pushNotif("⚠️ Supabase未接続。Vercelの環境変数を確認して","#ffcc02");
      setLoading(false);
      return;
    }
    try{
      // 古い自分のデータを削除してから新しく登録
      await supabase.from('dancers').delete().eq('name',char.name);
      await supabase.from('dancers').insert({
        name:char.name, genre:char.genre,
        power:myPow, level:getLv(char.exp), hometown:char.hometown||"",
        stats:char.stats, equipped:char.equipped||{}
      });
      // 他のプレイヤーを取得
      const{data,error}=await supabase.from('dancers')
        .select('name,genre,power,level,hometown')
        .neq('name',char.name)
        .order('power',{ascending:false})
        .limit(20);
      if(error)throw error;
      setPlayers(data||[]);
    }catch(e){
      console.error(e);
      pushNotif("通信エラー。しばらくして再試行","#ff5555");
    }
    setLoading(false);
  }

  async function fight(opp){
    if(char.energy<20){pushNotif("エネルギー不足！","#ff5555");return;}
    const btl=buildBattle(char,opp.genre,opp.power);
    setBattle({...btl,oppName:opp.name,step:0,phase:"seq"});
    for(let i=0;i<8;i++){await new Promise(r=>setTimeout(r,_battleSpeed===2?350:1000));setBattle(b=>b?{...b,step:Math.min(b.step+1,7)}:null);}
    const{won,flags}=btl;
    const prize=won?Math.floor(opp.power*14+800):0;
    const eg=won?Math.floor(opp.power*2.5+120):Math.floor(opp.power*.4+30);
    setChar(c=>({...c,exp:c.exp+eg,coins:c.coins+prize,energy:Math.max(0,c.energy-20),
      mood:won?Math.min(100,c.mood+20):Math.max(0,c.mood-15),
      battlesWon:won?c.battlesWon+1:c.battlesWon}));
    setBattle(null);setResult({won,eg,prize,flags,opp});
    if(won)Sound.fanfare();else Sound.lose();
    addLog(`🌐 ${won?"勝利":"敗北"} vs ${opp.name} +${eg}EXP${prize?` ${fc(prize)}`:""}`);
  }

  return(<div style={{marginTop:12,border:`1px solid ${BD}`,borderRadius:8,overflow:"hidden"}}>
    {battle&&<BattleOverlay state={battle} gc={genre.c} onClose={()=>setBattle(null)}/>}
    <button onClick={()=>{setOpen(o=>{if(!o)reload();return!o;});}} style={{width:"100%",padding:"12px 14px",display:"flex",justifyContent:"space-between",alignItems:"center",background:BG2,fontFamily:"M PLUS Rounded 1c,sans-serif",color:TX2,fontSize:12,fontWeight:700}}>
      <span>🌐 オンライン全国バトル（Supabase）</span><span style={{fontSize:10,color:TX3}}>{open?"▲":"▼"}</span>
    </button>
    {open&&(<div style={{padding:12,background:BG}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
        <div style={{fontSize:10,color:TX2,fontFamily:"M PLUS Rounded 1c,sans-serif"}}>
          MY POWER: <span style={{color:"#ffd60a",fontWeight:700}}>{myPow}</span>
          <span style={{color:TX3,fontSize:9}}> · {players.length}人参戦中</span>
        </div>
        <Btn onClick={reload} sx={{fontSize:9,padding:"5px 10px"}}>{loading?"⏳ 接続中":"🔄 更新"}</Btn>
      </div>
      {result&&(<div style={{background:result.won?"#0a2010":"#200a0a",border:`1px solid ${result.won?"#2a6030":"#602a2a"}`,borderRadius:8,padding:12,marginBottom:10}}>
        <div style={{fontFamily:"'Press Start 2P',monospace",fontSize:10,color:result.won?"#b3ff00":"#ff6b6b",marginBottom:6}}>{result.won?"🏆 WIN!":"💀 LOSE..."}</div>
        <div style={{display:"flex",justifyContent:"center",gap:6,marginBottom:8}}>{result.flags?.map((f,i)=><span key={i} style={{fontSize:18}}>{f==="blue"?"🔵":"🔴"}</span>)}</div>
        <div style={{display:"flex",gap:14}}>
          <span style={{color:"#ffd60a",fontSize:12}}>+{result.eg} EXP</span>
          {result.prize>0&&<span style={{color:"#b3ff00",fontSize:12,fontWeight:700}}>賞金 {fc(result.prize)}</span>}
        </div>
        <Btn onClick={()=>setResult(null)} sx={{marginTop:8,fontSize:10}}>閉じる</Btn>
      </div>)}
      {players.length===0&&!loading&&(
        <div style={{textAlign:"center",color:TX3,fontSize:11,padding:"20px 0",fontFamily:"M PLUS Rounded 1c,sans-serif"}}>
          まだ誰もいない！<br/>「更新」で参戦登録して最初のダンサーになろう！
        </div>
      )}
      {players.map((p,i)=>{
        const diff=p.power<myPow-80?"easy":p.power>myPow+80?"hard":"fair";
        const dc={easy:"#81c784",fair:"#ffcc02",hard:"#ff6b6b"}[diff];
        const prize=Math.floor(p.power*14+800);
        return(<div key={p.id||i} style={{background:BG2,border:`1px solid ${i===0?"#ffd60a44":BD}`,borderRadius:7,padding:"10px 12px",marginBottom:8}}>
          {i===0&&<div style={{fontFamily:"'Press Start 2P',monospace",fontSize:7,color:"#ffd60a",marginBottom:5}}>👑 RANK 1</div>}
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
            <div>
              <div style={{fontWeight:700,fontSize:12,color:TX,fontFamily:"M PLUS Rounded 1c,sans-serif"}}>{p.name}</div>
              <div style={{fontSize:9,color:TX3}}>{GENRES[p.genre]?.jp||p.genre} · Lv.{p.level}</div>
            </div>
            <span style={{fontSize:9,color:dc,background:`${dc}22`,padding:"2px 7px",borderRadius:3,alignSelf:"flex-start",border:`1px solid ${dc}44`}}>
              {diff==="easy"?"楽勝":diff==="fair"?"互角":"強敵"}
            </span>
          </div>
          <div style={{display:"flex",gap:12,marginBottom:8}}>
            <span style={{fontSize:10,color:"#ff7c3a"}}>POWER {p.power}</span>
            <span style={{fontSize:10,color:"#b3ff00",fontWeight:700}}>賞金 {fc(prize)}</span>
          </div>
          <Btn disabled={!!battle||char.energy<20} col="#200a0a" tc="#ff7070" onClick={()=>fight(p)} full sx={{fontSize:11,border:"1px solid #501818"}}>
            {char.energy<20?"⚡ エネルギー不足":"⚔️ 挑戦 ⚡20"}
          </Btn>
        </div>);
      })}
    </div>)}
  </div>);
}

/* ── QR BATTLE (ターン制コマンドバトル) ── */
function QRBattle({char,genre,pushNotif,addLog,setChar}){
  const[qrUrl,setQrUrl]=useState(null);
  const[scanning,setScanning]=useState(false);
  const[nameInput,setNameInput]=useState("");
  const[searching,setSearching]=useState(false);
  const[opp,setOpp]=useState(null); // {n,g,p,lv,e}
  const[battle,setBattle]=useState(null);
  const videoRef=useRef(null);
  const animRef=useRef(null);
  const streamRef=useRef(null);
  const myP=calcPow({...char.stats,...eqBonus(char.equipped||{})});
  const myMoves=MOVES[char.genre]||[];

  // QRコード生成
  useEffect(()=>{
    const d=JSON.stringify({n:char.name,g:char.genre,p:myP,lv:getLv(char.exp),e:GENRES[char.genre]?.e||"🕺"});
    QRCode.toDataURL(d,{width:220,margin:2,color:{dark:"#111111",light:"#ffffff"}})
      .then(url=>setQrUrl(url)).catch(()=>{});
    return()=>stopScan();
  },[]);

  // QRスキャン（jsQR：iOS Safari含む全ブラウザ対応）
  async function startScan(){
    try{
      const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:"environment",width:{ideal:1280},height:{ideal:720}}});
      streamRef.current=stream;
      if(videoRef.current){videoRef.current.srcObject=stream;videoRef.current.play();}
      setScanning(true);
      const canvas=document.createElement("canvas");
      const ctx=canvas.getContext("2d",{willReadFrequently:true});
      const check=()=>{
        if(!streamRef.current)return;
        const v=videoRef.current;
        if(v&&v.readyState===v.HAVE_ENOUGH_DATA&&v.videoWidth>0){
          canvas.width=v.videoWidth;canvas.height=v.videoHeight;
          ctx.drawImage(v,0,0,canvas.width,canvas.height);
          const img=ctx.getImageData(0,0,canvas.width,canvas.height);
          const code=jsQR(img.data,img.width,img.height,{inversionAttempts:"dontInvert"});
          if(code){
            try{
              const o=JSON.parse(code.data);
              stopScan();setOpp(o);
              pushNotif("✅ QR読み取り成功！","#b3ff00");
              return;
            }catch{/* QRだけどJSONじゃない、スキャン続行 */}
          }
        }
        animRef.current=requestAnimationFrame(check);
      };
      // 動画が再生開始してからスキャン開始
      videoRef.current.onloadedmetadata=()=>{animRef.current=requestAnimationFrame(check);};
    }catch(e){
      if(e.name==="NotAllowedError")pushNotif("📷 カメラの許可が必要です","#ff5555");
      else if(e.name==="NotFoundError")pushNotif("カメラが見つかりません","#ff5555");
      else pushNotif(`カメラエラー: ${e.message}`,"#ff5555");
      setScanning(false);
    }
  }
  function stopScan(){
    setScanning(false);
    if(animRef.current)cancelAnimationFrame(animRef.current);
    if(streamRef.current){streamRef.current.getTracks().forEach(t=>t.stop());streamRef.current=null;}
  }

  // 名前で検索（QRの代替）
  async function searchByName(){
    if(!nameInput.trim())return;
    setSearching(true);
    try{
      const{data}=await supabase.from("dancers").select("name,genre,power,level,hometown")
        .ilike("name",nameInput.trim()).limit(1).single();
      if(data){setOpp({n:data.name,g:data.genre,p:data.power,lv:data.level,e:GENRES[data.genre]?.e||"🕺"});}
      else pushNotif("見つからない。相手が「更新」を押してるか確認","#ff5555");
    }catch{pushNotif("検索失敗","#ff5555");}
    setSearching(false);
  }

  const[cursor,setCursor]=useState(0);

  function moveCursor(dir){
    const len=myMoves.length;
    setCursor(c=>{
      if(dir==="left")return Math.max(0,c-1);
      if(dir==="right")return Math.min(len-1,c+1);
      if(dir==="up")return Math.max(0,c-2);
      if(dir==="down")return Math.min(len-1,c+2);
      return c;
    });
  }
  function moveCursorOpp(dir){
    const len=oppMoves.length;
    setCursor(c=>{
      if(dir==="left")return Math.max(0,c-1);
      if(dir==="right")return Math.min(len-1,c+1);
      if(dir==="up")return Math.max(0,c-2);
      if(dir==="down")return Math.min(len-1,c+2);
      return c;
    });
  }

  // バトル開始
  function startBattle(){
    if(char.energy<7){pushNotif("⚡ エネルギー不足！","#ff5555");return;}
    setBattle({
      round:1,maxRounds:5,
      p1HP:100,p2HP:100,
      phase:"p1_pick", // p1_pick|bridge|p2_pick|resolve|done
      p1Move:null,p2Move:null,
      log:[],winner:null,
    });
  }

  // ターン制バトルのダメージ計算
  function calcDmg(move,stats){
    const base=Object.entries(move.g||{}).reduce((s,[k,v])=>(stats?s+(stats[k]||0)*v:s+v*3),0);
    return Math.max(8,Math.floor(base*1.5+move.exp*.3+Math.random()*20-10));
  }
  function calcOppDmg(move){
    const base=Object.values(move.g||{}).reduce((s,v)=>s+v*4,0);
    return Math.max(6,Math.floor(base*1.2+move.exp*.3+Math.random()*20-10));
  }

  function pickMove(move,isP1){
    setBattle(b=>{
      if(!b)return b;
      if(isP1&&b.phase==="p1_pick")return{...b,p1Move:move,phase:"bridge"};
      if(!isP1&&b.phase==="p2_pick")return{...b,p2Move:move,phase:"resolve"};
      return b;
    });
  }

  // resolve: 両手の技が決まったら結果計算
  useEffect(()=>{
    if(battle?.phase!=="resolve")return;
    const{p1Move,p2Move,p1HP,p2HP,round,maxRounds,log}=battle;
    const p1dmg=calcDmg(p1Move,char.stats);
    const p2dmg=calcOppDmg(p2Move);
    const newP1HP=Math.max(0,p1HP-p2dmg);
    const newP2HP=Math.max(0,p2HP-p1dmg);
    const newLog=[...log,{round,p1Move:p1Move.name,p2Move:p2Move.name,p1dmg,p2dmg}];
    const done=newP1HP===0||newP2HP===0||round>=maxRounds;
    const winner=done?(newP1HP>newP2HP?"p1":newP2HP>newP1HP?"p2":"draw"):null;
    setTimeout(()=>{
      setBattle(b=>({...b,p1HP:newP1HP,p2HP:newP2HP,log:newLog,
        round:round+1,phase:done?"done":"p1_pick",p1Move:null,p2Move:null,winner}));
      if(done){
        const won=winner==="p1";
        const eg=won?Math.floor(opp.p*2+100):Math.floor(opp.p*.3+20);
        const coins=won?Math.floor(opp.p*8+500):0;
        setChar(c=>({...c,exp:c.exp+eg,coins:c.coins+coins,energy:Math.max(0,c.energy-7),
          mood:won?Math.min(100,c.mood+15):Math.max(0,c.mood-10),
          battlesWon:won?c.battlesWon+1:c.battlesWon}));
        if(won)Sound.fanfare();else Sound.lose();
        addLog(`📱 QR対戦 ${won?"勝利":"敗北"} vs ${opp.n} +${eg}EXP`);
      }
    },1200);
  },[battle?.phase]);

  // ─── RENDER ───
  const oppMoves=MOVES[opp?.g||"house"]||[];

  // バトル画面
  if(battle){
    const{round,maxRounds,p1HP,p2HP,phase,p1Move,p2Move,log,winner}=battle;
    const p1Pct=p1HP;const p2Pct=p2HP;

    return(<div style={{paddingBottom:80}}>
      {/* HP バー */}
      <div style={{background:BG2,padding:"12px 14px",borderRadius:8,marginBottom:10,border:`1px solid ${BD}`}}>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:11,fontFamily:"M PLUS Rounded 1c,sans-serif",marginBottom:6}}>
          <span style={{color:genre.c,fontWeight:700}}>{char.name}</span>
          <span style={{color:TX3,fontSize:10}}>Round {Math.min(round,maxRounds)}/{maxRounds}</span>
          <span style={{color:"#ff6b6b",fontWeight:700}}>{opp.n}</span>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:4}}>
          <div style={{flex:1,height:12,background:BG3,borderRadius:6,overflow:"hidden"}}>
            <div style={{height:"100%",width:`${p1Pct}%`,background:genre.c,borderRadius:6,transition:"width .5s"}}/>
          </div>
          <span style={{fontSize:10,color:TX3,width:30,textAlign:"center"}}>{p1HP}</span>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <div style={{flex:1,height:12,background:BG3,borderRadius:6,overflow:"hidden"}}>
            <div style={{height:"100%",width:`${p2Pct}%`,background:"#ff6b6b",borderRadius:6,transition:"width .5s"}}/>
          </div>
          <span style={{fontSize:10,color:TX3,width:30,textAlign:"center"}}>{p2HP}</span>
        </div>
      </div>

      {/* バトルログ（最新） */}
      {log.length>0&&(()=>{const l=log[log.length-1];return(
        <div style={{background:"#0a0a1a",border:`1px solid ${BD}`,borderRadius:8,padding:"10px 12px",marginBottom:10,fontFamily:"M PLUS Rounded 1c,sans-serif"}}>
          <div style={{fontSize:11,color:genre.c,fontWeight:700,marginBottom:4}}>Round {l.round}</div>
          <div style={{fontSize:11,color:TX}}>{char.name}：<span style={{color:"#ffd60a",fontWeight:700}}>「{l.p1Move}！」</span> → -{l.p2dmg}ダメージ</div>
          <div style={{fontSize:11,color:TX}}>{opp.n}：<span style={{color:"#ff6b6b",fontWeight:700}}>「{l.p2Move}！」</span> → -{l.p1dmg}ダメージ</div>
        </div>
      );})()}

      {/* フェーズ別UI */}
      {phase==="done"&&(
        <div style={{textAlign:"center",padding:20,background:winner==="p1"?"#0a2010":winner==="p2"?"#200a0a":"#1a1a1a",borderRadius:10,border:`1px solid ${winner==="p1"?"#2a6030":winner==="p2"?"#602a2a":"#3a3a3a"}`}}>
          <div style={{fontSize:42,marginBottom:8}}>{winner==="p1"?"🏆":winner==="p2"?"💀":"🤝"}</div>
          <div style={{fontFamily:"'Press Start 2P',monospace",fontSize:12,color:winner==="p1"?"#b3ff00":winner==="p2"?"#ff6b6b":"#ffcc02",marginBottom:12}}>
            {winner==="p1"?"WINNER!":winner==="p2"?"LOSE...":"DRAW"}
          </div>
          <div style={{fontSize:11,color:TX2,fontFamily:"M PLUS Rounded 1c,sans-serif",marginBottom:16}}>
            {char.name} {p1HP}HP ／ {opp.n} {p2HP}HP
          </div>
          <Btn onClick={()=>{setBattle(null);setOpp(null);}} col="#1a1a30" tc={TX2} full sx={{fontSize:12}}>閉じる</Btn>
        </div>
      )}

      {phase==="p1_pick"&&(
        <div>
          <div style={{fontFamily:"'Press Start 2P',monospace",fontSize:8,color:genre.c,marginBottom:10,textAlign:"center"}}>{char.name}の番！技を選べ！</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            {myMoves.map((m,i)=>(
              <button key={m.id} onClick={()=>{setCursor(i);pickMove(m,true);}}
                style={{padding:"14px 8px",borderRadius:8,background:i===cursor?"#1a2a3a":"#0a1a2a",border:`1px solid ${i===cursor?genre.c:genre.c+"55"}`,cursor:"pointer",textAlign:"center",transform:i===cursor?"scale(1.04)":"scale(1)",transition:"all .15s"}}>
                <div style={{fontSize:13,color:genre.c,fontWeight:700,fontFamily:"M PLUS Rounded 1c,sans-serif",marginBottom:3}}>{m.name}</div>
                <div style={{fontSize:9,color:TX3}}>⚡{m.cost}</div>
              </button>
            ))}
          </div>
          <DPad onMove={moveCursor}/>
          <AButton onPress={()=>pickMove(myMoves[cursor],true)} col={genre.c} sub="決定"/>
        </div>
      )}

      {phase==="bridge"&&(
        <div style={{textAlign:"center",padding:"30px 16px"}}>
          <div style={{fontSize:36,marginBottom:16}}>📱</div>
          <div style={{fontSize:14,color:TX,fontFamily:"M PLUS Rounded 1c,sans-serif",fontWeight:700,marginBottom:8}}>{char.name}が選んだ！</div>
          <div style={{fontSize:12,color:"#ffd60a",marginBottom:8}}>「{p1Move?.name}！」</div>
          <div style={{fontSize:11,color:TX3,marginBottom:20,fontFamily:"M PLUS Rounded 1c,sans-serif"}}>画面を伏せて {opp.n} に渡してください</div>
          <Btn onClick={()=>{setCursor(0);setBattle(b=>({...b,phase:"p2_pick"}));}} col="#1a0a2a" tc="#ff4da6" full sx={{fontSize:12,fontWeight:700}}>渡した → {opp.n}の番へ</Btn>
        </div>
      )}

      {phase==="p2_pick"&&(
        <div>
          <div style={{fontFamily:"'Press Start 2P',monospace",fontSize:8,color:"#ff6b6b",marginBottom:10,textAlign:"center"}}>{opp.n}の番！技を選べ！</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            {oppMoves.map((m,i)=>(
              <button key={m.id} onClick={()=>{setCursor(i);pickMove(m,false);}}
                style={{padding:"14px 8px",borderRadius:8,background:i===cursor?"#2a0a0a":"#1a0a0a",border:`1px solid ${i===cursor?"#ff6b6b":"#ff6b6b55"}`,cursor:"pointer",textAlign:"center",transform:i===cursor?"scale(1.04)":"scale(1)",transition:"all .15s"}}>
                <div style={{fontSize:13,color:"#ff6b6b",fontWeight:700,fontFamily:"M PLUS Rounded 1c,sans-serif",marginBottom:3}}>{m.name}</div>
                <div style={{fontSize:9,color:TX3}}>⚡{m.cost}</div>
              </button>
            ))}
          </div>
          <DPad onMove={moveCursorOpp}/>
          <AButton onPress={()=>pickMove(oppMoves[cursor],false)} col="#ff6b6b" sub="決定"/>
        </div>
      )}

      {phase==="resolve"&&(
        <div style={{textAlign:"center",padding:"30px 16px"}}>
          <div style={{fontSize:30,marginBottom:10}}>⚔️</div>
          <div style={{fontSize:14,color:TX,fontFamily:"M PLUS Rounded 1c,sans-serif",fontWeight:700,marginBottom:4}}>計算中...</div>
          <div style={{display:"flex",gap:16,justifyContent:"center"}}>
            <span style={{fontSize:12,color:genre.c}}>「{p1Move?.name}！」</span>
            <span style={{color:TX3}}>VS</span>
            <span style={{fontSize:12,color:"#ff6b6b"}}>「{p2Move?.name}！」</span>
          </div>
        </div>
      )}
    </div>);
  }

  // セットアップ画面
  return(<div>
    {/* 自分のQR */}
    <div style={{textAlign:"center",marginBottom:14,padding:14,background:BG2,borderRadius:10,border:`1px solid ${BD}`}}>
      <div style={{fontFamily:"'Press Start 2P',monospace",fontSize:7,color:TX3,marginBottom:8}}>MY QR CODE</div>
      <div style={{fontSize:10,color:TX2,marginBottom:10,fontFamily:"M PLUS Rounded 1c,sans-serif"}}>相手に見せる 📱</div>
      {qrUrl?(
        <div style={{display:"inline-block",padding:10,background:"#fff",borderRadius:8,marginBottom:8}}>
          <img src={qrUrl} alt="QR" style={{display:"block",width:180,height:180}}/>
        </div>
      ):(
        <div style={{width:180,height:180,background:BG3,borderRadius:8,display:"inline-flex",alignItems:"center",justifyContent:"center",color:TX3}}>生成中...</div>
      )}
      <div style={{fontSize:12,color:genre.c,fontWeight:700,fontFamily:"M PLUS Rounded 1c,sans-serif"}}>{char.name} · POWER {myP}</div>
    </div>

    {/* 相手を読み込む */}
    {!opp?(
      <div style={{background:BG2,borderRadius:10,padding:14,border:`1px solid ${BD}`}}>
        <div style={{fontFamily:"'Press Start 2P',monospace",fontSize:7,color:TX3,marginBottom:10}}>相手のキャラを読み込む</div>
        {/* QRスキャン */}
        <video ref={videoRef} style={{width:"100%",borderRadius:8,display:scanning?"block":"none",marginBottom:8,maxHeight:220,objectFit:"cover"}} muted playsInline/>
        {scanning?(
          <div>
            <div style={{fontSize:11,color:"#b3ff00",textAlign:"center",marginBottom:8,fontFamily:"M PLUS Rounded 1c,sans-serif"}}>📷 QRに向けて！</div>
            <Btn onClick={stopScan} full sx={{fontSize:11,marginBottom:12}}>キャンセル</Btn>
          </div>
        ):(
          <Btn onClick={startScan} col="#0a1828" tc="#00e5ff" full sx={{fontSize:11,border:"1px solid #1a4870",marginBottom:12}}>📷 QRをスキャン</Btn>
        )}
        {/* 名前入力（代替）*/}
        <div style={{borderTop:`1px solid ${BD}`,paddingTop:12}}>
          <div style={{fontSize:10,color:TX3,marginBottom:6,fontFamily:"M PLUS Rounded 1c,sans-serif"}}>または相手のキャラ名で検索：</div>
          <div style={{display:"flex",gap:8}}>
            <input value={nameInput} onChange={e=>setNameInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&searchByName()} placeholder="キャラ名を入力..." style={{flex:1,padding:"10px",borderRadius:6,background:BG3,border:`1px solid ${BD}`,color:TX,fontSize:12,outline:"none"}}/>
            <Btn onClick={searchByName} disabled={!nameInput.trim()||searching} col="#0a2a0a" tc="#80e080" sx={{fontSize:11,padding:"0 12px",border:"1px solid #1a4a1a"}}>{searching?"...":"検索"}</Btn>
          </div>
          <div style={{fontSize:9,color:TX3,marginTop:4,fontFamily:"M PLUS Rounded 1c,sans-serif"}}>※相手が溜まり場/オンラインで「更新」していれば検索できます</div>
        </div>
      </div>
    ):(
      <div style={{background:BG2,borderRadius:10,padding:16,border:`1px solid ${genre.c}66`,textAlign:"center"}}>
        <div style={{fontSize:36,marginBottom:8}}>{opp.e}</div>
        <div style={{fontSize:16,color:TX,fontWeight:700,fontFamily:"M PLUS Rounded 1c,sans-serif",marginBottom:4}}>{opp.n}</div>
        <div style={{fontSize:11,color:TX3,marginBottom:4}}>{GENRES[opp.g]?.jp} · Lv.{opp.lv} · POWER {opp.p}</div>
        {(()=>{const cb1=compatBonus(char.genre,opp.g);const cb2=char.genre2?compatBonus(char.genre2,opp.g):{bonus:0};const best=cb2.bonus>cb1.bonus?cb2:cb1;return best.label?<div style={{fontSize:11,color:best.col,fontWeight:700,marginBottom:8}}>{best.label}</div>:null;})()}
        <div style={{fontSize:10,color:"#ffd60a",marginBottom:14,fontFamily:"M PLUS Rounded 1c,sans-serif"}}>ターン制コマンドバトル！5ラウンド制</div>
        <div style={{display:"flex",gap:8}}>
          <Btn onClick={()=>setOpp(null)} col={BG3} tc={TX3} sx={{flex:1,fontSize:11}}>キャンセル</Btn>
          <Btn disabled={char.energy<7} col="#280a0a" tc="#ff7070" onClick={startBattle} sx={{flex:2,fontSize:12,fontWeight:700}}>
            {char.energy<7?"⚡ 不足":"⚔️ バトル開始！"}
          </Btn>
        </div>
      </div>
    )}
  </div>);
}

function BattleTab({char,setChar,genre,pushNotif,addLog}){
  const[sub,setSub]=useState("battle");
  const[battle,setBattle]=useState(null);
  const[showAI,setShowAI]=useState({text:"",loading:false});
  const[recruit,setRecruit]=useState(null); // {opp} ラスボス勧誘ダイアログ
  const lv=getLv(char.exp);
  const mp=calcPow({...char.stats,...eqBonus(char.equipped||{})});

  const FINAL_BOSSES=["q9","q10"]; // 勧誘してくるボス

  async function fight(opp){
    if(char.energy<7){pushNotif("エネルギー不足！⚡7必要","#ff5555");return;}
    // 必須アイテムチェック
    if(opp.requireItems&&opp.requireItems.length>0){
      const missing=opp.requireItems.filter(id=>!(char.specialItems||[]).includes(id));
      if(missing.length>0){
        // 月の石だけ欠けてる場合は謎のヒントのみ
        const missingOnlyMoon=missing.length===1&&missing[0]==="moon_stone";
        const missingMichaelItems=missing.filter(id=>id!=="moon_stone");
        if(missingMichaelItems.length>0){
          const names={"michael_glove":"🧤手袋","michael_loafer":"👞ローファー","michael_hat":"🎩ハット"};
          pushNotif(`必要：${missingMichaelItems.map(id=>names[id]||id).join("・")}（ショップ→👑伝説）`,"#ffd60a");
        }else if(missingOnlyMoon||missing[0]==="moon_stone"){
          // 謎のヒント
          pushNotif(opp.requireHint||"何かが足りない..."  ,"#c0c0ff");
        }
        return;
      }
    }
    // ラスボスは勧誘ダイアログを先に出す
    if(FINAL_BOSSES.includes(opp.id)){
      setRecruit(opp);
      return;
    }
    await doBattle(opp);
  }

  async function doBattle(opp){
    const btl=buildBattle(char,opp.style,opp.pw);
    setBattle({phase:"seq",...btl,oppName:opp.name,step:0});
    for(let i=0;i<8;i++){await new Promise(r=>setTimeout(r,_battleSpeed===2?380:1100));setBattle(b=>b?{...b,step:Math.min(b.step+1,7)}:null);}
    const{won,flags}=btl;
    const eg=won?opp.rw.exp:Math.floor(opp.rw.exp*.5),coins=won?opp.rw.coins:Math.floor(opp.rw.coins*.5);
    const nt=won&&opp.rw.title&&!char.titles?.includes(opp.rw.title)?opp.rw.title:null;
    const gemBonus=won&&Math.random()<0.1?1:0; // 10%でジェム+1
    setChar(c=>({...c,exp:c.exp+eg,coins:c.coins+coins,gems:(c.gems||0)+gemBonus,energy:Math.max(0,c.energy-7),mood:won?Math.min(100,c.mood+18):Math.max(0,c.mood-12),battlesWon:won?c.battlesWon+1:c.battlesWon,titles:nt?[...(c.titles||[]),nt]:c.titles||[]}));
    setBattle({phase:"result",won,eg,coins,title:nt,flags,myP:btl.myP,thP:btl.thP});
    if(won)Sound.fanfare();else Sound.lose();
    if(gemBonus)pushNotif("💎 ジェム+1！","#ce93d8");
    addLog(`${won?"🏆 勝利":"💀 敗北"} vs ${opp.name} +${eg}EXP ${fc(coins)}`);
  }

  async function doShow(show){
    if(lv<show.lv){pushNotif(`Lv.${show.lv}が必要！`,"#ff5555");return;}
    if(char.energy<show.ec){pushNotif(`エネルギー不足！⚡${show.ec}必要`,"#ff5555");return;}
    setShowAI({text:"",loading:true});
    // 1日の回数制限チェック
    const today=new Date().toDateString();
    const showLog=char.showLog||{};
    const todayKey=`${show.id}_${today}`;
    const todayCount=showLog[todayKey]||0;
    const dailyMax=show.dailyMax||3;
    if(todayCount>=dailyMax){
      pushNotif(`今日の${show.name}は上限（${dailyMax}回）です！`,"#ff9900");
      return;
    }
    const eg=show.rw.exp+Math.floor(show.rw.exp*Math.random()*.2);
    const coins=show.rw.coins+Math.floor(show.rw.coins*Math.random()*.4);
    setShowAI({text:`${char.name}のパフォーマンスに会場が震えた！観客総立ちのスタンディングオベーション！最高の夜だった✨`,loading:false});
    setChar(c=>({...c,
      exp:c.exp+eg,coins:c.coins+coins,fame:c.fame+show.rw.fame,
      energy:Math.max(0,c.energy-show.ec),
      mood:Math.min(100,c.mood+30),
      showsDone:c.showsDone+1,
      showLog:{...(c.showLog||{}),[todayKey]:(c.showLog?.[todayKey]||0)+1},
    }));
    pushNotif(`🎭 ${show.name}完了！ +${eg}EXP ${fc(coins)}`,genre.c);
    addLog(`🎭「${show.name}」+${eg}EXP ${fc(coins)} +${show.rw.fame}FAME`);
  }

  return(<div>
    {battle&&<BattleOverlay state={battle} gc={genre.c} onClose={()=>setBattle(null)}/>}

    {/* 勧誘ダイアログ */}
    {recruit&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.92)",zIndex:910,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24}}>
      <div style={{maxWidth:360,width:"100%",textAlign:"center"}}>
        <div style={{fontSize:56,marginBottom:16,animation:"vi .5s ease"}}>{recruit.e}</div>
        <div style={{fontFamily:"'Press Start 2P',monospace",fontSize:8,color:"#9b59b6",marginBottom:16,letterSpacing:2}}>DARK INVITATION</div>
        <div style={{background:"#0a0a1a",border:"1px solid #9b59b633",borderRadius:12,padding:"20px 18px",marginBottom:20}}>
          <div style={{fontSize:13,color:"#d7bde2",fontFamily:"M PLUS Rounded 1c,sans-serif",lineHeight:2,fontStyle:"italic"}}>
            「お前のダンスは本物だ。<br/>
            だからこそ言う…<br/><br/>
            お前を仲間にしてやろう。<br/>
            一緒に<span style={{color:"#9b59b6",fontWeight:700}}>闇ダンス</span>の<br/>
            世界を作らないか？」
          </div>
          <div style={{marginTop:12,fontSize:10,color:"#7f8c8d",fontFamily:"M PLUS Rounded 1c,sans-serif"}}>— {recruit.name}</div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <Btn col="#280a0a" tc="#ff4da6" onClick={()=>{setRecruit(null);doBattle(recruit);}} full sx={{fontSize:13,fontWeight:700,padding:"14px",border:"1px solid #5a1818"}}>
            🔥 断る！闘って決める！
          </Btn>
          <Btn col="#0a0a0a" tc="#9b59b6" onClick={()=>{
            const lostCoins=Math.floor((char.coins||0)*0.5);
            setChar(c=>({...c,
              coins:Math.floor((c.coins||0)*0.5),
              mood:0,
              gems:Math.max(0,(c.gems||0)-100),
              titles:[...(c.titles||[]),"⚫ 闇堕ち"],
            }));
            setRecruit(null);
            pushNotif(`😈 闇に堕ちた…コイン半減・💎-100`,"#9b59b6");
            addLog(`⚫ ${recruit.name}の誘いに乗ってしまった…闇堕ち`);
          }} full sx={{fontSize:12,border:"1px solid #2a1a4a",opacity:.85}}>
            😶 は、はい…
          </Btn>
        </div>
      </div>
    </div>}
    <div style={{display:"flex",background:BG2,borderRadius:8,padding:3,gap:2,marginBottom:14}}>
      {[["battle","⚔️ バトル"],["qr","📱 QR対戦"],["show","🎭 ショー"]].map(([id,label])=>(
        <button key={id} onClick={()=>setSub(id)} style={{flex:1,padding:"9px 4px",fontSize:10,fontFamily:"M PLUS Rounded 1c,sans-serif",fontWeight:700,background:sub===id?genre.c+"33":"none",color:sub===id?genre.c:TX3,borderRadius:6,border:sub===id?`1px solid ${genre.c}66`:"1px solid transparent",transition:"all .15s"}}>{label}</button>
      ))}
    </div>
    {sub==="qr"&&<QRBattle char={char} genre={genre} pushNotif={pushNotif} addLog={addLog} setChar={setChar}/>}
    {sub==="battle"&&(<div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
        <div style={{fontFamily:"'Press Start 2P',monospace",fontSize:7,color:TX3}}>QUICK BATTLE ⚡15</div>
        <div style={{fontSize:11,color:"#ffd60a"}}>MY POWER <span style={{fontWeight:700}}>{mp}</span></div>
      </div>
      {/* 気分・お腹の状態ヒント */}
      <div style={{background:BG3,borderRadius:6,padding:"8px 12px",marginBottom:12,display:"flex",gap:12,flexWrap:"wrap"}}>
        <span style={{fontSize:10,fontFamily:"M PLUS Rounded 1c,sans-serif",color:char.mood>=75?"#b3ff00":char.mood>=50?"#ffcc02":"#ff5555"}}>
          気分 {char.mood>=90?"😄 最高！+18%":char.mood>=75?"😊 いい！+10%":char.mood>=50?"😐 普通":char.mood>=25?"😔 低い -12%":"😰 最悪 -25%"}
        </span>
        <span style={{fontSize:10,fontFamily:"M PLUS Rounded 1c,sans-serif",color:char.hunger>=80?"#b3ff00":char.hunger>=50?"#ffcc02":"#ff5555"}}>
          お腹 {char.hunger>=80?"🍜 満腹！+8%":char.hunger>=50?"🍱 普通":char.hunger>=30?"😤 空腹 -8%":"💀 超空腹 -22%"}
        </span>
      </div>
      {/* ジャンル表示 */}
      {char.genre2&&<div style={{background:BG3,borderRadius:6,padding:"6px 10px",marginBottom:8,fontSize:10,fontFamily:"M PLUS Rounded 1c,sans-serif",color:"#ce93d8"}}>
        {genre.e}{genre.jp}{char.genre2?` ＋ ${GENRES[char.genre2]?.e}${GENRES[char.genre2]?.jp}`:""}{char.genre3?` ＋ ${GENRES[char.genre3]?.e}${GENRES[char.genre3]?.jp}`:""} → 最有利ジャンルを自動選択！
      </div>}
      {QOPPS.map(opp=>{
        const diff=opp.pw<mp-100?"easy":opp.pw>mp+100?"hard":"fair";
        const dc={easy:"#81c784",fair:"#ffcc02",hard:"#ff6b6b"}[diff];
        const locked=lv<opp.lv;
        const cb1=compatBonus(char.genre,opp.style);
        const cb2=char.genre2?compatBonus(char.genre2,opp.style):{bonus:0,label:""};
        const bestCB=cb2.bonus>cb1.bonus?cb2:cb1;
        return(<div key={opp.id} style={{background:locked?"#0c0c18":BG2,border:`1px solid ${locked?"#1a1a28":bestCB.bonus>1?bestCB.col+"44":BD}`,borderRadius:9,padding:"12px 14px",marginBottom:10,opacity:locked?.5:1}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
            <div style={{display:"flex",gap:10,alignItems:"center"}}>
              <span style={{fontSize:28}}>{opp.e}</span>
              <div>
                <div style={{fontWeight:700,fontSize:13,color:locked?"#555":TX,fontFamily:"M PLUS Rounded 1c,sans-serif"}}>{opp.name}</div>
                <div style={{fontSize:10,color:TX3}}>{GENRES[opp.style]?.e}{GENRES[opp.style]?.jp||opp.style} · Lv.{opp.lv}+</div>
              </div>
            </div>
            <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:3}}>
              {locked?<span style={{fontSize:9,color:"#4050a0",background:"#14142a",padding:"4px 8px",borderRadius:4}}>🔒 Lv.{opp.lv}</span>:<span style={{fontSize:10,color:dc,background:`${dc}22`,padding:"3px 8px",borderRadius:4,border:`1px solid ${dc}44`}}>{diff==="easy"?"楽勝":diff==="fair"?"互角":"強敵"}</span>}
              {!locked&&bestCB.label&&<span style={{fontSize:9,color:bestCB.col,fontWeight:700}}>{bestCB.label}</span>}
            </div>
          </div>
          {!locked&&<div style={{display:"flex",gap:14,marginBottom:8}}><span style={{fontSize:10,color:"#ff7c3a"}}>POWER {opp.pw.toLocaleString()}</span><span style={{fontSize:10,color:"#ffd60a"}}>+{opp.rw.exp}EXP</span><span style={{fontSize:10,color:"#b3ff00",fontWeight:700}}>{fc(opp.rw.coins)}</span></div>}
          {!locked&&opp.rw.title&&<div style={{fontSize:10,color:"#ce93d8",marginBottom:8}}>🎖 {opp.rw.title}</div>}
          {!locked&&<Btn disabled={char.energy<7} col="#280a0a" tc="#ff7070" onClick={()=>fight(opp)} full sx={{fontSize:11,border:"1px solid #5a1818"}}>{char.energy<7?"⚡ エネルギー不足":"⚔️ バトル開始 ⚡15"}</Btn>}
        </div>);
      })}
    </div>)}
    {sub==="show"&&(<div>
      <div style={{fontFamily:"'Press Start 2P',monospace",fontSize:7,color:TX3,marginBottom:8}}>SHOW & 発表会</div>
      <AIB text={showAI.text} loading={showAI.loading}/>
      <div style={{marginTop:showAI.text?12:0}}>
        {SHOWS.map(show=>{
          const ok=lv>=show.lv;const can=ok&&char.energy>=show.ec;
          return(<div key={show.id} style={{background:ok?BG2:"#0c0c1c",border:`2px solid ${ok?(can?genre.c+"44":BD):"#1a1a30"}`,borderRadius:10,padding:"14px",marginBottom:12,opacity:ok?1:0.55}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
              <div style={{display:"flex",gap:10,alignItems:"center"}}>
                <span style={{fontSize:30}}>{show.e}</span>
                <div><div style={{fontWeight:700,fontSize:13,color:ok?TX:"#555",fontFamily:"M PLUS Rounded 1c,sans-serif"}}>{show.name}</div><div style={{fontSize:10,color:TX3}}>📍 {show.venue}</div></div>
              </div>
              {!ok&&<span style={{fontSize:10,color:"#4050a0",background:"#14142a",padding:"4px 8px",borderRadius:4}}>Lv.{show.lv}〜</span>}
            </div>
            <div style={{display:"flex",flexWrap:"wrap",gap:14,marginBottom:10,padding:"8px 12px",background:"#0a0a1c",borderRadius:6}}>
              <span style={{fontSize:11,color:"#ffd60a"}}>+{show.rw.exp}〜EXP</span>
              <span style={{fontSize:11,color:"#b3ff00",fontWeight:700}}>{fc(show.rw.coins)}〜 賞金</span>
              <span style={{fontSize:11,color:"#ff9ec4"}}>+{show.rw.fame} FAME</span>
              {(()=>{
                const today=new Date().toDateString();
                const cnt=(char.showLog||{})[`${show.id}_${today}`]||0;
                const max=show.dailyMax||3;
                const remaining=max-cnt;
                return<span style={{fontSize:10,color:remaining>0?"#80c0ff":"#ff5555",fontWeight:700}}>
                  {remaining>0?`残り${remaining}回`:`今日は終了`}
                </span>;
              })()}
              <span style={{fontSize:10,color:"#00e5ff"}}>⚡{show.ec}</span>
            </div>
            <Btn disabled={!can} col={can?"#0a200a":"#111"} tc={can?"#90e890":"#404060"} onClick={()=>doShow(show)} full sx={{fontSize:12,padding:"11px",border:can?"1px solid #2a5a2a":"1px solid #1a1a30",fontWeight:700}}>
              {!ok?`🔒 Lv.${show.lv}で解放`:!can?"⚡ エネルギー不足":`🎭 出演する ⚡${show.ec}`}
            </Btn>
          </div>);
        })}
      </div>
    </div>)}
  </div>);
}

/* ── HOME TAB ── */
function HomeTab({char,genre,log,onRest,onEat,onTrain,onUseHeart}){
  const curCity=allC()[char.currentCity];
  const eb=eqBonus(char.equipped||{});
  const bs=Object.entries(eb).map(([k,v])=>`${SM[k].jp}+${v}`).join(" · ");
  const[trainGenre,setTrainGenre]=useState(char.genre); // メイン or サブ
  const genre2=char.genre2;
  const genre3=char.genre3;
  const moves=[...(MOVES[trainGenre]||[]),...CMOVES];
  return(<div>
    <div style={{textAlign:"center",padding:"14px 0 10px",background:`radial-gradient(circle at 50% 60%,${genre.c}20,transparent 70%)`,borderRadius:12,marginBottom:12,border:`1px solid ${genre.c}30`}}>
      <div style={{display:"inline-block",animation:"fl 3.5s ease-in-out infinite"}}><DancerSVG genre={char.genre} mood={char.mood} energy={char.energy} equipped={char.equipped} size={112}/></div>
      <div style={{color:genre.c,fontSize:12,fontWeight:700,marginTop:4,fontFamily:"M PLUS Rounded 1c,sans-serif"}}>{char.name}</div>
      {curCity&&<div style={{fontSize:10,color:TX2,marginTop:2}}>{GENRES[curCity.g]?.e} {curCity.name}{char.clearedCities?.[char.currentCity]?" ✓":""}</div>}
      {bs&&<div style={{fontSize:9,color:genre.c,marginTop:4,opacity:.8}}>装備: {bs}</div>}
    </div>
    <div style={{background:BG2,borderRadius:8,padding:"12px 14px",marginBottom:10,border:`1px solid ${BD}`}}>
      <div style={{fontFamily:"'Press Start 2P',monospace",fontSize:7,color:TX3,marginBottom:10}}>VITALS</div>
      <VBar label="気分" val={char.mood} col="#ff9ec4"/>
      <VBar label="お腹" val={char.hunger} col="#ffd60a"/>
      <div style={{marginTop:8}}>
        <div style={{fontSize:9,color:TX3,marginBottom:5,fontFamily:"'Press Start 2P',monospace"}}>HEARTS</div>
        <HeartBar char={char} onUseHeart={onUseHeart}/>
      </div>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
      <Btn col="#0a1828" tc="#00e5ff" onClick={onRest} sx={{border:"1px solid #1a4870"}}>😴 休息（気分回復）</Btn>
      <Btn col="#1a0a2a" tc="#ff9ec4" onClick={onEat} sx={{border:"1px solid #4a1a6a"}}>🍱 食事（お腹回復）</Btn>
    </div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,marginTop:14}}>
      <div style={{fontFamily:"'Press Start 2P',monospace",fontSize:7,color:TX3}}>TRAINING ⚡{char.energy}</div>
      {(genre2||genre3)&&<div style={{display:"flex",gap:6}}>
        <button onClick={()=>setTrainGenre(char.genre)} style={{padding:"4px 10px",borderRadius:6,fontSize:10,fontFamily:"M PLUS Rounded 1c,sans-serif",fontWeight:700,background:trainGenre===char.genre?`${GENRES[char.genre]?.c}33`:"none",color:trainGenre===char.genre?GENRES[char.genre]?.c:TX3,border:`1px solid ${trainGenre===char.genre?GENRES[char.genre]?.c:BD}`,cursor:"pointer"}}>
          {GENRES[char.genre]?.e} メイン
        </button>
        {genre2&&<button onClick={()=>setTrainGenre(genre2)} style={{padding:"4px 10px",borderRadius:6,fontSize:10,fontFamily:"M PLUS Rounded 1c,sans-serif",fontWeight:700,background:trainGenre===genre2?`${GENRES[genre2]?.c}33`:"none",color:trainGenre===genre2?GENRES[genre2]?.c:TX3,border:`1px solid ${trainGenre===genre2?GENRES[genre2]?.c:BD}`,cursor:"pointer"}}>
          {GENRES[genre2]?.e} サブ1
        </button>}
        {genre3&&<button onClick={()=>setTrainGenre(genre3)} style={{padding:"4px 10px",borderRadius:6,fontSize:10,fontFamily:"M PLUS Rounded 1c,sans-serif",fontWeight:700,background:trainGenre===genre3?`${GENRES[genre3]?.c}33`:"none",color:trainGenre===genre3?GENRES[genre3]?.c:TX3,border:`1px solid ${trainGenre===genre3?GENRES[genre3]?.c:BD}`,cursor:"pointer"}}>
          {GENRES[genre3]?.e} サブ2
        </button>}
      </div>}
    </div>
    {moves.map(move=>{
      const can=char.energy>=move.cost;
      return(<div key={move.id} style={{background:BG2,border:`1px solid ${BD}`,borderRadius:8,padding:"11px 13px",marginBottom:9,opacity:can?1:.5}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
          <div style={{fontWeight:700,fontSize:13,color:TX,fontFamily:"M PLUS Rounded 1c,sans-serif"}}>{move.name}</div>
          <div style={{display:"flex",gap:10}}><span style={{fontSize:10,color:can?"#00e5ff":"#ff5555"}}>⚡{move.cost}</span><span style={{fontSize:10,color:"#ffd60a"}}>+{move.exp}EXP~</span></div>
        </div>
        <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:7}}>{Object.entries(move.g).map(([k,v])=><Tag key={k} col={SM[k].c}>{SM[k].jp}+{v}</Tag>)}</div>
        <Btn disabled={!can} col={can?genre.c:"#1a1a30"} tc={can?"#000":"#404060"} onClick={()=>onTrain(move)} full sx={{fontSize:11,padding:"8px"}}>練習する →</Btn>
      </div>);
    })}
    {log.length>0&&<div style={{background:BG2,borderRadius:8,padding:"12px 14px",border:`1px solid ${BD}`,marginTop:12}}><div style={{fontFamily:"'Press Start 2P',monospace",fontSize:7,color:TX3,marginBottom:8}}>LOG</div>{log.slice(0,6).map(e=><div key={e.id} style={{fontSize:11,color:TX3,borderBottom:"1px solid #1e1e38",padding:"5px 0",fontFamily:"M PLUS Rounded 1c,sans-serif"}}>{e.msg}</div>)}</div>}
  </div>);
}

/* ── SHOP TAB ── */
const GEM_PACKS=[
  {id:"pack_60",  gems:60,   price:120,  name:"💎 60ジェム",   bonus:"",        popular:false},
  {id:"pack_350", gems:350,  price:600,  name:"💎 350ジェム",  bonus:"+50お得",  popular:true},
  {id:"pack_1200",gems:1200, price:1800, name:"💎 1,200ジェム",bonus:"+200お得", popular:false},
  {id:"pack_2500",gems:2500, price:3500, name:"💎 2,500ジェム",bonus:"+500お得", popular:false},
];
function GemShop({char,genre,pushNotif}){
  const[buying,setBuying]=useState(null);
  const gc=genre.c;
  async function startCheckout(pack){
    setBuying(pack.id);
    try{
      const res=await fetch("/api/create-checkout",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({packId:pack.id,userId:char.uid||"guest"}),
      });
      const data=await res.json();
      if(data.url){window.location.href=data.url;}
      else{pushNotif("エラーが発生しました","#ff5555");}
    }catch(e){pushNotif("通信エラー。再度お試しください","#ff5555");}
    setBuying(null);
  }
  return(<div>
    <div style={{background:"linear-gradient(135deg,#0a0a20,#120a2a)",borderRadius:10,padding:"14px 16px",marginBottom:16,textAlign:"center",border:"1px solid #4444aa44"}}>
      <div style={{fontFamily:"'Press Start 2P',monospace",fontSize:8,color:"#88eeff",marginBottom:6}}>💎 現在のジェム</div>
      <div style={{fontSize:32,fontWeight:900,color:"#88eeff",fontFamily:"M PLUS Rounded 1c,sans-serif"}}>{char.gems||0}</div>
      <div style={{fontSize:10,color:TX3,marginTop:4,fontFamily:"M PLUS Rounded 1c,sans-serif"}}>ドリンク・伝説アイテムに使用できる</div>
    </div>
    <div style={{fontFamily:"'Press Start 2P',monospace",fontSize:7,color:TX3,marginBottom:12}}>-- CHOOSE YOUR PACK --</div>
    {GEM_PACKS.map(pack=>(
      <div key={pack.id} style={{background:pack.popular?"linear-gradient(135deg,#1a1040,#0d0820)":BG2,border:`1px solid ${pack.popular?"#9966ff88":BD}`,borderRadius:10,padding:"14px 16px",marginBottom:10,position:"relative"}}>
        {pack.popular&&<div style={{position:"absolute",top:-8,right:12,background:"#9966ff",color:"#fff",fontSize:9,padding:"3px 10px",borderRadius:10,fontWeight:700,fontFamily:"M PLUS Rounded 1c,sans-serif"}}>人気No.1</div>}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <div>
            <div style={{fontSize:16,fontWeight:900,color:pack.popular?"#bb99ff":TX,fontFamily:"M PLUS Rounded 1c,sans-serif"}}>{pack.name}</div>
            {pack.bonus&&<div style={{fontSize:10,color:"#88ff88",fontFamily:"M PLUS Rounded 1c,sans-serif",marginTop:2}}>{pack.bonus}</div>}
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:18,fontWeight:900,color:pack.popular?"#bb99ff":"#b3ff00",fontFamily:"M PLUS Rounded 1c,sans-serif"}}>¥{pack.price.toLocaleString()}</div>
            <div style={{fontSize:9,color:TX3,fontFamily:"M PLUS Rounded 1c,sans-serif"}}>税込</div>
          </div>
        </div>
        <Btn col={pack.popular?"#2d1060":"#0a1e2a"} tc={pack.popular?"#bb99ff":"#88eeff"} onClick={()=>startCheckout(pack)} full disabled={buying===pack.id} sx={{fontSize:12,border:`1px solid ${pack.popular?"#9966ff44":"#1a4870"}`}}>
          {buying===pack.id?"処理中...":"購入する →"}
        </Btn>
      </div>
    ))}
    <div style={{fontSize:10,color:TX3,textAlign:"center",marginTop:8,fontFamily:"M PLUS Rounded 1c,sans-serif",lineHeight:1.7,opacity:.7}}>
      ・購入後すぐにジェムが追加されます<br/>
      ・決済はStripeによる安全な処理<br/>
      ・返金についてはお問い合わせください
    </div>
  </div>);
}
function ShopTab({char,setChar,genre,pushNotif,onTokushou}){
  const[sub,setSub]=useState("costumes");
  const lv=getLv(char.exp);
  const items=SHOP[sub]||[];
  const hasMichael=(id)=>(char.specialItems||[]).includes(id);

  function buyLegend(item){
    const owned=hasMichael(item.id);
    if(owned){pushNotif("すでに所持中！","#ffcc02");return;}
    if(char.coins<item.p&&(char.gems||0)<item.pg){pushNotif(`コイン${item.p.toLocaleString()}またはジェム${item.pg}必要！`,"#ff5555");return;}
    const useGems=(char.coins<item.p)&&(char.gems||0)>=item.pg;
    setChar(c=>({...c,
      coins:useGems?c.coins:c.coins-item.p,
      gems:useGems?(c.gems||0)-item.pg:c.gems||0,
      specialItems:[...(c.specialItems||[]),item.id],
    }));
    pushNotif(`✨ ${item.n} を入手！`,  "#ffd60a");
  }

  function buyDrink(drink){
    if((char.gems||0)<drink.p){pushNotif(`💎 ジェムが足りない！${drink.p}💎必要`,"#ff5555");return;}
    const MAX=getMaxEnergy(lv);
    const ns={...char.stats};
    if(drink.bonus)Object.entries(drink.bonus).forEach(([k,v])=>{ns[k]=(ns[k]||0)+v;});
    setChar(c=>({...c,gems:(c.gems||0)-drink.p,energy:Math.min(MAX,c.energy+drink.energy),stats:ns}));
    pushNotif(`${drink.n}飲んだ！ ⚡+${drink.energy}`,genre.c);
  }
  function buy(item){
    if(item.lv&&lv<item.lv){pushNotif(`Lv.${item.lv}で解放！`,"#ff5555");return;}
    if(char.coins<item.p){pushNotif("コインが足りない！","#ff5555");return;}
    if(char.inventory?.includes(item.id)){pushNotif("すでに所持済み！","#ffcc02");return;}
    setChar(c=>({...c,coins:c.coins-item.p,inventory:[...(c.inventory||[]),item.id]}));
    pushNotif(`${item.n} 購入！`,genre.c);
  }
  function equip(item){
    if(sub==="costumes")setChar(c=>({...c,equipped:{...c.equipped,costume:c.equipped?.costume===item.id?null:item.id}}));
    else if(sub==="sneakers")setChar(c=>({...c,equipped:{...c.equipped,sneakers:c.equipped?.sneakers===item.id?null:item.id}}));
    else if(sub==="accessories")setChar(c=>({...c,equipped:{...c.equipped,accessories:togAcc(item.id,c.equipped?.accessories||[])}}));
    pushNotif("装備を更新！","#b3ff00");
  }
  function doWS(ws){
    if(lv<(ws.lv||0)){pushNotif("レベルが足りない！","#ff5555");return;}
    if(char.coins<ws.p){pushNotif("コインが足りない！","#ff5555");return;}
    if(char.energy<ws.ec){pushNotif("エネルギー不足！","#ff5555");return;}
    setChar(c=>({...c,coins:c.coins-ws.p,energy:Math.max(0,c.energy-ws.ec),stats:{...c.stats,[ws.stat]:(c.stats[ws.stat]||0)+ws.amt}}));
    pushNotif(`${ws.n}受講！ ${SM[ws.stat].jp}+${ws.amt}`,SM[ws.stat].c);
  }
  function isEq(item){if(sub==="costumes")return char.equipped?.costume===item.id;if(sub==="sneakers")return char.equipped?.sneakers===item.id;return(char.equipped?.accessories||[]).includes(item.id);}
  const slotL={neck:"首",face:"顔",forehead:"額",head:"頭",hand:"手"};
  return(<div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
      <div style={{fontFamily:"'Press Start 2P',monospace",fontSize:7,color:TX3}}>SHOP</div>
      <div style={{fontSize:13,color:"#b3ff00",fontWeight:700}}>{fc(char.coins)}</div>
    </div>
    <div style={{display:"flex",background:BG2,borderRadius:8,padding:3,gap:2,marginBottom:14,flexWrap:"wrap"}}>
      {[["gems","💎 購入"],["costumes","衣装"],["sneakers","靴"],["accessories","アクセ"],["drinks","ドリンク"],["workshops","WS"],["legend","👑伝説"]].map(([id,label])=>(
        <button key={id} onClick={()=>setSub(id)} style={{flex:1,minWidth:50,padding:"7px 2px",fontSize:9,fontFamily:"M PLUS Rounded 1c,sans-serif",fontWeight:700,background:sub===id?genre.c+"33":"none",color:sub===id?genre.c:TX3,borderRadius:6,border:sub===id?`1px solid ${genre.c}66`:"1px solid transparent",transition:"all .15s"}}>{label}</button>
      ))}
    </div>
    {/* 💎 ジェム購入 */}
    {sub==="gems"&&<GemShop char={char} genre={genre} pushNotif={pushNotif}/>}
    {/* DRINKS */}
    {sub==="drinks"&&(<div>
      <div style={{fontSize:11,color:TX2,marginBottom:14,fontFamily:"M PLUS Rounded 1c,sans-serif"}}>飲み物でエネルギー即回復！現地グルメはMAPの各都市でも食べられるよ。</div>
      {SHOP.drinks.map(d=>{
        const ok=lv>=(d.lv||0);const can=ok&&(char.gems||0)>=d.p;
        return(<div key={d.id} style={{background:BG2,border:`1px solid ${BD}`,borderRadius:8,padding:"12px 14px",marginBottom:10,opacity:ok?1:.55}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
            <div><div style={{fontWeight:700,fontSize:13,color:TX,fontFamily:"M PLUS Rounded 1c,sans-serif"}}>{d.n}</div><div style={{fontSize:10,color:TX3}}>{d.desc}</div></div>
            <div style={{textAlign:"right"}}><div style={{fontSize:12,color:can?"#88eeff":"#ff6060",fontWeight:700}}>💎{d.p}</div><div style={{fontSize:10,color:"#00e5ff"}}>⚡+{d.energy}</div></div>
          </div>
          <Btn disabled={!can} col="#0a1828" tc="#00e5ff" onClick={()=>buyDrink(d)} full sx={{fontSize:11,border:"1px solid #1a4870"}}>{!ok?`🔒 Lv.${d.lv}`:`飲む 💎${d.p}`}</Btn>
        </div>);
      })}
    </div>)}
    {/* WORKSHOPS */}
    {sub==="workshops"&&(<div>
      <div style={{fontSize:11,color:TX2,marginBottom:14,fontFamily:"M PLUS Rounded 1c,sans-serif"}}>WSを受けてスタッツを直接強化！お金とエネルギーが必要。</div>
      {WS.map(ws=>{
        const can=char.coins>=ws.p&&char.energy>=ws.ec;
        return(<div key={ws.id} style={{background:BG2,border:`1px solid ${BD}`,borderRadius:8,padding:"12px 14px",marginBottom:10}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
            <div style={{display:"flex",gap:10,alignItems:"center"}}>
              <span style={{fontSize:24}}>{ws.e}</span>
              <div><div style={{fontWeight:700,fontSize:13,color:TX,fontFamily:"M PLUS Rounded 1c,sans-serif"}}>{ws.n}</div><div style={{fontSize:10,color:TX3}}>{ws.desc}</div></div>
            </div>
            <div style={{textAlign:"right",flexShrink:0,marginLeft:8}}>
              <div style={{fontSize:11,color:"#b3ff00",fontWeight:700}}>{fc(ws.p)}</div>
              <div style={{fontSize:10,color:"#00e5ff"}}>⚡{ws.ec}</div>
            </div>
          </div>
          <div style={{marginBottom:8}}><Tag col={SM[ws.stat].c}>{SM[ws.stat].jp}+{ws.amt}</Tag></div>
          <Btn disabled={!can} col="#0a200a" tc="#80e080" onClick={()=>doWS(ws)} full sx={{fontSize:11,border:"1px solid #1a4a1a"}}>{!can?(char.coins<ws.p?"コイン不足":"⚡ エネルギー不足"):`受講する ${fc(ws.p)} ⚡${ws.ec}`}</Btn>
        </div>);
      })}
    </div>)}
    {/* COSTUMES / SNEAKERS / ACCESSORIES */}
    {["costumes","sneakers","accessories"].includes(sub)&&(<div>
      {sub==="accessories"&&(char.equipped?.accessories||[]).length>0&&<div style={{background:BG3,borderRadius:6,padding:"8px 12px",marginBottom:10,fontSize:10,color:TX2,fontFamily:"M PLUS Rounded 1c,sans-serif"}}>装備中: {(char.equipped?.accessories||[]).map(id=>SHOP.accessories.find(x=>x.id===id)?.n||id).join(" + ")}</div>}
      {items.map(item=>{
        const owned=char.inventory?.includes(item.id);const eq=isEq(item);const canBuy=char.coins>=item.p;const lvLk=item.lv&&lv<item.lv;
        return(<div key={item.id} style={{background:eq?`${genre.c}18`:lvLk?"#0c0c18":BG2,border:`1px solid ${eq?genre.c+"66":lvLk?"#1a1a30":BD}`,borderRadius:8,padding:"12px 14px",marginBottom:10,opacity:lvLk?.55:1}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
            <div style={{flex:1}}>
              {sub==="sneakers"&&!lvLk&&<div style={{display:"flex",gap:5,marginBottom:5}}><div style={{width:26,height:12,borderRadius:3,background:item.col,border:"1px solid #444"}}/><div style={{width:26,height:6,borderRadius:2,background:item.sol,border:"1px solid #444",marginTop:3}}/></div>}
              {sub==="accessories"&&item.slot&&<span style={{fontSize:9,color:TX3,background:BG3,padding:"2px 6px",borderRadius:3,marginBottom:4,display:"inline-block",border:`1px solid ${BD}`}}>{slotL[item.slot]}スロット</span>}
              <div style={{fontWeight:700,fontSize:13,color:eq?genre.c:lvLk?"#444":TX,fontFamily:"M PLUS Rounded 1c,sans-serif",marginTop:sub==="accessories"?4:0}}>{eq&&"✦ "}{item.n}</div>
              <div style={{fontSize:10,color:TX3,marginTop:2}}>{item.desc}</div>
            </div>
            <div style={{marginLeft:8,textAlign:"right"}}>{lvLk?<div style={{fontSize:11,color:"#4050a0",fontWeight:700,background:"#14142a",padding:"4px 8px",borderRadius:4}}>🔒 Lv.{item.lv}</div>:<div style={{fontSize:12,color:owned?"#60c080":canBuy?"#b3ff00":"#ff6060",fontWeight:700}}>{owned?"所持済み":fc(item.p)}</div>}</div>
          </div>
          {!lvLk&&<div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:8}}>{Object.entries(item.b).map(([k,v])=><Tag key={k} col={SM[k]?.c||"#888"}>{SM[k]?.jp}+{v}</Tag>)}</div>}
          {lvLk&&<div style={{fontSize:10,color:"#303060",fontFamily:"M PLUS Rounded 1c,sans-serif",marginBottom:8}}>Lv.{item.lv}で解放</div>}
          {!lvLk&&<div style={{display:"flex",gap:8}}>{!owned&&<Btn disabled={!canBuy} col="#0a1e0a" tc="#80e080" onClick={()=>buy(item)} sx={{flex:1,fontSize:11,border:"1px solid #1a4a1a"}}>購入 {fc(item.p)}</Btn>}{owned&&<Btn col={eq?"#200a0a":"#0a1a20"} tc={eq?"#ff8080":"#80d0f0"} onClick={()=>equip(item)} sx={{flex:1,fontSize:11,border:eq?"1px solid #4a1a1a":"1px solid #1a4a5a"}}>{eq?"外す":"装備する"}</Btn>}</div>}
        </div>);
      })}
    </div>)}

    {/* 伝説アイテム（マイケル3点セット） */}
    {sub==="legend"&&<div style={{padding:"0 4px"}}>
      <div style={{background:"#1a1000",border:"1px solid #ffd60a55",borderRadius:10,padding:"14px 12px",marginBottom:12,textAlign:"center"}}>
        <div style={{fontSize:24,marginBottom:6}}>🎩🧤👞</div>
        <div style={{fontFamily:"'Press Start 2P',monospace",fontSize:7,color:"#ffd60a",marginBottom:6}}>LEGEND ITEMS</div>
        <div style={{fontSize:10,color:TX3,fontFamily:"M PLUS Rounded 1c,sans-serif",lineHeight:1.7}}>
          マイケルの3点セットを揃えると<br/>宇宙ボス・世界大会に挑戦できる！
        </div>
      </div>
      {SHOP.legend.map(item=>{
        const owned=hasMichael(item.id);
        // requireアイテムを持ってない場合は非表示
        if(item.require&&!(char.specialItems||[]).includes(item.require))return null;
        const canBuyCoins=char.coins>=item.p;
        const canBuyGems=(char.gems||0)>=item.pg;
        return(<div key={item.id} style={{background:owned?"#1a1a00":"#0a0a00",border:`1px solid ${owned?"#ffd60a":"#3a3a00"}`,borderRadius:10,padding:"14px 12px",marginBottom:12}}>
          <div style={{display:"flex",gap:12,alignItems:"center",marginBottom:10}}>
            <span style={{fontSize:36}}>{item.e}</span>
            <div>
              <div style={{fontWeight:700,fontSize:14,color:"#ffd60a",fontFamily:"M PLUS Rounded 1c,sans-serif"}}>{item.n}</div>
              <div style={{fontSize:9,color:TX3,marginTop:2}}>{item.desc}</div>
              {owned&&<div style={{fontSize:10,color:"#b3ff00",marginTop:4,fontWeight:700}}>✓ 所持中</div>}
            </div>
          </div>
          {!owned&&<div>
            <div style={{fontSize:10,color:TX2,marginBottom:8,fontFamily:"M PLUS Rounded 1c,sans-serif"}}>
              {Object.entries(item.b).map(([k,v])=>`${SM[k]?.jp||k}+${v}`).join(" · ")}
            </div>
            <div style={{display:"flex",gap:8}}>
              <Btn disabled={!canBuyCoins} col="#1a1000" tc="#ffd60a" onClick={()=>buyLegend(item)} sx={{flex:1,fontSize:11,border:"1px solid #4a3a00"}}>
                💰 {item.p.toLocaleString()}コイン
              </Btn>
              <Btn disabled={!canBuyGems} col="#100020" tc="#ce93d8" onClick={()=>{
                if(owned)return;
                if((char.gems||0)<item.pg){pushNotif(`💎${item.pg}必要！`,"#ff5555");return;}
                setChar(c=>({...c,gems:(c.gems||0)-item.pg,specialItems:[...(c.specialItems||[]),item.id]}));
                pushNotif(`✨ ${item.n} を入手！`,"#ffd60a");
              }} sx={{flex:1,fontSize:11,border:"1px solid #3a1a5a"}}>
                💎 {item.pg}ジェム
              </Btn>
            </div>
          </div>}
        </div>);
      })}
    </div>}

    {/* 特定商取引法リンク */}
    <div style={{textAlign:"center",padding:"20px 0 8px"}}>
      <button onClick={onTokushou} style={{fontSize:10,color:TX3,opacity:.6,background:"none",border:"none",cursor:"pointer",textDecoration:"underline"}}>
        特定商取引法に基づく表記
      </button>
    </div>
  </div>);
}
function StatusTab({char,lv,rnk,genre,setChar,user,onAuthChange,lightMode,toggleLight}){
  const mapLabels={"japan":"🗾 日本","asia":"🌏 ASIA","usa":"🇺🇸 USA","europe":"🌍 EUROPE","india":"🇮🇳 INDIA","samerica":"🌎 南米","africa":"🌍 AFRICA"};
  const foundItems=char.foundItems||[];
  const[authMode,setAuthMode]=useState("register");
  const[email,setEmail]=useState("");
  const[pass,setPass]=useState("");
  const[authLoading,setAuthLoading]=useState(false);
  const[authErr,setAuthErr]=useState("");
  const[authMsg,setAuthMsg]=useState("");

  async function handleAuth(){
    if(!email||!pass){setAuthErr("入力してください");return;}
    setAuthLoading(true);setAuthErr("");setAuthMsg("");
    try{
      let u;
      if(authMode==="register"){
        u=await signUp(email,pass);
        // 現在のキャラをクラウドに保存（localStorageから直接読む）
        const raw=localStorage.getItem("dancer_save");
        const localChar=raw?JSON.parse(raw):char;
        if(localChar)await saveCharToCloud(u,localChar);
        setAuthMsg("登録完了！データをクラウドに保存しました！");
      }else{
        u=await signIn(email,pass);
        const cloudChar=await loadCharFromCloud(u);
        if(cloudChar){
          const merged=migrateChar(cloudChar);
          setChar(merged); // setCharRaw→setChar（スコープ内で使える）
          localStorage.setItem("dancer_save",JSON.stringify(merged));
          setAuthMsg("ログイン完了！クラウドのデータを読み込みました！");
        }else{
          const raw=localStorage.getItem("dancer_save");
          const localChar=raw?JSON.parse(raw):char;
          if(localChar)await saveCharToCloud(u,localChar);
          setAuthMsg("ログイン完了！データをクラウドに保存しました！");
        }
      }
      onAuthChange(u);
      setShowAuth(false);
    }catch(e){
      setAuthErr(e.message==="Invalid login credentials"?"メールかパスワードが違います":e.message);
    }
    setAuthLoading(false);
  }

  async function handleLogout(){
    if(!window.confirm("ログアウトしますか？"))return;
    await signOut();
    onAuthChange(null);
  }

  const eb=eqBonus(char.equipped||{});
  const ts={};Object.entries(char.stats).forEach(([k,v])=>{ts[k]=v+(eb[k]||0);});
  const p=calcPow(ts);const nr=RANKS.find(r=>r.lv>lv);
  const cc=Object.keys(char.clearedCities||{}).length;
  return(<div>
    {/* アカウントセクション */}
    <div style={{background:BG2,border:`1px solid ${user?"#40c06066":"#ffcc0266"}`,borderRadius:10,padding:14,marginBottom:14}}>
      <div style={{fontFamily:"'Press Start 2P',monospace",fontSize:7,color:TX3,marginBottom:10}}>ACCOUNT</div>
      {user?(
        <div>
          <div style={{fontSize:11,color:"#40c080",fontFamily:"M PLUS Rounded 1c,sans-serif",marginBottom:8}}>✅ ログイン中</div>
          <div style={{fontSize:10,color:TX3,marginBottom:10}}>{user.email}</div>
          <div style={{fontSize:10,color:TX2,marginBottom:10,fontFamily:"M PLUS Rounded 1c,sans-serif"}}>データはクラウドに自動保存中。どのデバイスからでも続きから遊べます！</div>
          <Btn onClick={handleLogout} col="#1a1a30" tc={TX3} full sx={{fontSize:10}}>ログアウト</Btn>
        </div>
      ):(
        <div>
          <div style={{fontSize:11,color:"#ffcc02",fontFamily:"M PLUS Rounded 1c,sans-serif",marginBottom:6}}>⚠️ ゲストモード</div>
          <div style={{fontSize:10,color:TX2,marginBottom:10,fontFamily:"M PLUS Rounded 1c,sans-serif"}}>登録すると今のデータをクラウドに保存！スマホを変えても続きから遊べる。</div>
          {!showAuth?(
            <Btn onClick={()=>setShowAuth(true)} col="#ffcc02" tc="#000" full sx={{fontSize:11,fontWeight:700}}>📧 アカウント登録 / ログイン</Btn>
          ):(
            <div style={{animation:"su .3s ease"}}>
              <div style={{display:"flex",background:BG3,borderRadius:6,padding:3,gap:2,marginBottom:10}}>
                {[["register","新規登録"],["login","ログイン"]].map(([m,l])=>(
                  <button key={m} onClick={()=>{setAuthMode(m);setAuthErr("");setAuthMsg("");}} style={{flex:1,padding:"6px",fontSize:10,fontWeight:700,background:authMode===m?"#ffcc02":"none",color:authMode===m?"#000":TX3,borderRadius:4,border:"none",cursor:"pointer"}}>{l}</button>
                ))}
              </div>
              <input value={email} onChange={e=>setEmail(e.target.value)} type="email" placeholder="メールアドレス" style={{width:"100%",padding:"10px",borderRadius:6,background:BG3,border:`1px solid ${BD}`,color:TX,fontSize:12,outline:"none",marginBottom:8}}/>
              <input value={pass} onChange={e=>setPass(e.target.value)} type="password" placeholder="パスワード（6文字以上）" style={{width:"100%",padding:"10px",borderRadius:6,background:BG3,border:`1px solid ${BD}`,color:TX,fontSize:12,outline:"none",marginBottom:8}}/>
              {authErr&&<div style={{fontSize:10,color:"#ff5555",marginBottom:8,padding:"6px 8px",background:"#200a0a",borderRadius:4}}>{authErr}</div>}
              {authMsg&&<div style={{fontSize:10,color:"#60c080",marginBottom:8,padding:"6px 8px",background:"#0a2010",borderRadius:4}}>{authMsg}</div>}
              <div style={{display:"flex",gap:8}}>
                <Btn onClick={()=>setShowAuth(false)} col={BG3} tc={TX3} sx={{flex:1,fontSize:10}}>キャンセル</Btn>
                <Btn onClick={handleAuth} disabled={authLoading} col="#ffcc02" tc="#000" sx={{flex:2,fontSize:11,fontWeight:700}}>{authLoading?"処理中...":authMode==="register"?"登録してデータを保存":"ログイン"}</Btn>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
    <div style={{background:BG2,border:`1px solid ${genre.c}40`,borderRadius:10,padding:14,marginBottom:14,textAlign:"center"}}>
      <div style={{display:"inline-block"}}><DancerSVG genre={char.genre} mood={char.mood} energy={char.energy} equipped={char.equipped} size={100}/></div>
      <div style={{fontWeight:900,fontSize:15,color:TX,marginTop:4,fontFamily:"M PLUS Rounded 1c,sans-serif"}}>{char.name}</div>
      <div style={{fontSize:10,color:rnk.c,fontWeight:700,marginTop:4}}>★ {rnk.jp} ★</div>
      <div style={{fontSize:10,color:TX2,marginTop:4}}>{genre.jp} · Lv.{lv} · POWER {p.toLocaleString()}</div>
      <div style={{fontSize:10,color:TX3,marginTop:2}}>FAME {char.fame} · {fc(char.coins)} · 制覇 {cc}/{Object.keys(allC()).length}都市</div>
      {nr&&<div style={{fontSize:9,color:TX3,marginTop:6}}>次のランク「{nr.jp}」→ Lv.{nr.lv}</div>}
    </div>
    <div style={{background:BG2,border:`1px solid ${BD}`,borderRadius:8,padding:"14px 16px",marginBottom:12}}>
      <div style={{fontFamily:"'Press Start 2P',monospace",fontSize:7,color:TX3,marginBottom:12}}>STATS</div>
      {Object.entries(char.stats).map(([k,v])=>{const b=eb[k]||0;return<SBar key={k} label={`${SM[k].jp}${b?` (+${b})`:""}`} val={v+b} col={SM[k].c} max={Math.max(40,v+b+5)}/>;  })}
    </div>
    {/* 秘宝コレクション */}
    <div style={{background:BG2,border:"1px solid #ffd60a44",borderRadius:10,padding:14,marginBottom:14}}>
      <div style={{fontFamily:"'Press Start 2P',monospace",fontSize:7,color:TX3,marginBottom:10}}>✨ 秘宝 – レベル上限解放</div>
      {(()=>{
        const arts=char.artifacts||[];
        const maxLv=getMaxLv(arts);
        const next=[1,3,5,7,9].find(n=>n>arts.length)||null;
        const nextHint=ARTIFACTS.find(a=>!arts.includes(a.id));
        return(<div>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
            <div><span style={{fontSize:20,color:"#ffd60a",fontWeight:700,fontFamily:"M PLUS Rounded 1c,sans-serif"}}>{arts.length}</span><span style={{fontSize:12,color:TX3,fontFamily:"M PLUS Rounded 1c,sans-serif"}}>/{ARTIFACTS.length}個</span></div>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:11,color:"#ff4da6",fontWeight:700,fontFamily:"M PLUS Rounded 1c,sans-serif"}}>上限 Lv.{maxLv}</div>
              {next&&<div style={{fontSize:9,color:TX3}}>次: {next}個で更に解放</div>}
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:6,marginBottom:8}}>
            {ARTIFACTS.map(a=>{
              const have=arts.includes(a.id);
              return(<div key={a.id} style={{textAlign:"center",padding:"8px 4px",borderRadius:8,background:have?"#1a1a08":"#0a0a1a",border:`1px solid ${have?"#ffd60a":"#1a1a2a"}`,opacity:have?1:.5}}>
                <div style={{fontSize:22}}>{a.e}</div>
                <div style={{fontSize:7,color:have?"#ffd60a":TX3,marginTop:2,fontFamily:"M PLUS Rounded 1c,sans-serif",lineHeight:1.2}}>{a.name}</div>
              </div>);
            })}
          </div>
          {nextHint&&<div style={{fontSize:9,color:TX3,fontFamily:"M PLUS Rounded 1c,sans-serif"}}>💡 ヒント: {nextHint.hint}</div>}
        </div>);
      })()}

      {/* 🗺 隠しアイテム大陸情報 */}
      <div style={{marginTop:16,padding:"12px 14px",background:"#0a0a08",borderRadius:10,border:"1px solid #3a3a0a"}}>
        <div style={{fontFamily:"'Press Start 2P',monospace",fontSize:7,color:"#ffd60a",marginBottom:10}}>🗺 隠しアイテム {foundItems.length}/{HIDDEN_ITEMS.length}</div>
        {HIDDEN_ITEMS.map(h=>{
          const found=foundItems.includes(h.id);
          return(<div key={h.id} style={{display:"flex",alignItems:"center",gap:10,marginBottom:6,opacity:found?1:.65}}>
            <span style={{fontSize:14}}>{found?h.name.split(" ")[0]:"❓"}</span>
            <div style={{flex:1}}>
              <span style={{fontSize:10,color:found?"#ffd60a":TX2,fontFamily:"M PLUS Rounded 1c,sans-serif",fontWeight:found?700:400}}>
                {found?h.name:"???"}
              </span>
              <span style={{fontSize:9,color:TX3,marginLeft:6}}>{mapLabels[h.mapId]||h.mapId}</span>
            </div>
            <span style={{fontSize:11}}>{found?"✅":"⬜"}</span>
          </div>);
        })}
        <div style={{fontSize:9,color:"#4a4a2a",marginTop:8,fontFamily:"M PLUS Rounded 1c,sans-serif"}}>
          各大陸のマップを歩いて探せ！
        </div>
      </div>
    </div>
    {/* テーマ切り替え */}
    <div style={{background:BG2,border:`1px solid ${BD}`,borderRadius:8,padding:"14px 16px",marginBottom:12}}>
      <div style={{fontFamily:"'Press Start 2P',monospace",fontSize:7,color:TX3,marginBottom:10}}>DISPLAY</div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <div style={{fontSize:12,color:TX,fontFamily:"M PLUS Rounded 1c,sans-serif",fontWeight:700}}>{lightMode?"☀️ ライトモード":"🌙 ダークモード"}</div>
          <div style={{fontSize:10,color:TX3,marginTop:2}}>タップで切り替え</div>
        </div>
        <button onClick={toggleLight} style={{width:52,height:28,borderRadius:14,background:lightMode?"#ffcc02":"#323258",border:"none",cursor:"pointer",position:"relative",transition:"background .3s"}}>
          <div style={{width:22,height:22,borderRadius:11,background:"#fff",position:"absolute",top:3,left:lightMode?27:3,transition:"left .3s",boxShadow:"0 2px 4px rgba(0,0,0,.3)"}}/>
        </button>
      </div>
    </div>
    <div style={{background:BG2,border:`1px solid ${BD}`,borderRadius:8,padding:"14px 16px",marginBottom:12}}>
      <div style={{fontFamily:"'Press Start 2P',monospace",fontSize:7,color:TX3,marginBottom:10}}>STYLE CHANGE ¥5,000</div>
      {/* 現在のジャンル表示 */}
      <div style={{display:"flex",gap:8,marginBottom:10,padding:"8px 10px",background:BG3,borderRadius:6}}>
        <div style={{textAlign:"center",flex:1}}>
          <div style={{fontSize:9,color:TX3,marginBottom:2}}>メイン</div>
          <span style={{fontSize:20}}>{GENRES[char.genre]?.e}</span>
          <div style={{fontSize:9,color:GENRES[char.genre]?.c,fontWeight:700}}>{GENRES[char.genre]?.jp}</div>
        </div>
        {char.genre2&&<div style={{textAlign:"center",flex:1,borderLeft:`1px solid ${BD}`,paddingLeft:8}}>
          <div style={{fontSize:9,color:TX3,marginBottom:2}}>サブ1</div>
          <span style={{fontSize:20}}>{GENRES[char.genre2]?.e}</span>
          <div style={{fontSize:9,color:GENRES[char.genre2]?.c,fontWeight:700}}>{GENRES[char.genre2]?.jp}</div>
          <button onClick={()=>{
            setChar(c=>({...c,genre:c.genre2,genre2:c.genre}));
            pushNotif(`🔄 ${GENRES[char.genre2]?.jp}をメインに！`,"#ffd60a");
          }} style={{fontSize:8,marginTop:4,padding:"3px 8px",background:"#1a1a0a",border:"1px solid #4a4a1a",borderRadius:4,color:"#ffd60a",cursor:"pointer",fontFamily:"M PLUS Rounded 1c,sans-serif"}}>
            ↑ メインに
          </button>
        </div>}
        {char.genre3&&<div style={{textAlign:"center",flex:1,borderLeft:`1px solid ${BD}`,paddingLeft:8}}>
          <div style={{fontSize:9,color:TX3,marginBottom:2}}>サブ2</div>
          <span style={{fontSize:20}}>{GENRES[char.genre3]?.e}</span>
          <div style={{fontSize:9,color:GENRES[char.genre3]?.c,fontWeight:700}}>{GENRES[char.genre3]?.jp}</div>
          <button onClick={()=>{
            setChar(c=>({...c,genre:c.genre3,genre3:c.genre}));
            pushNotif(`🔄 ${GENRES[char.genre3]?.jp}をメインに！`,"#ffd60a");
          }} style={{fontSize:8,marginTop:4,padding:"3px 8px",background:"#1a1a0a",border:"1px solid #4a4a1a",borderRadius:4,color:"#ffd60a",cursor:"pointer",fontFamily:"M PLUS Rounded 1c,sans-serif"}}>
            ↑ メインに
          </button>
        </div>}
      </div>
      <div style={{fontSize:10,color:TX2,marginBottom:10,fontFamily:"M PLUS Rounded 1c,sans-serif"}}>
        最大3ジャンル。バトルで3つから最も相性のいいジャンルを自動選択！
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
        {Object.entries(GENRES).filter(([k])=>k!==char.genre&&k!==char.genre2&&k!==char.genre3).map(([key,g])=>{
          const cb=compatBonus(key,char.genre);
          return(<button key={key} onClick={()=>{
            if(char.coins<5000){alert("コインが足りない！¥5,000必要");return;}
            const slots=[char.genre,char.genre2,char.genre3].filter(Boolean);
            const label=slots.length>=3?"3ジャンル目は旧サブが消えます。":"旧メインはサブへ移動。";
            if(!window.confirm(`${g.jp}をメインに変更？¥5,000消費。${label}`))return;
            const ns={};
            Object.entries(char.stats).forEach(([k,v])=>{ns[k]=Math.floor(v/2);});
            Object.entries(BASE[key]).forEach(([k,v])=>{ns[k]=(ns[k]||0)+v;});
            // ローリング：新→main, 旧main→genre2, 旧genre2→genre3, 旧genre3は消える
            setChar(c=>({...c,genre:key,genre2:c.genre,genre3:c.genre2||null,coins:c.coins-5000,stats:ns}));
          }} style={{padding:"8px 6px",borderRadius:7,background:BG3,border:`1px solid ${g.c}55`,cursor:"pointer",textAlign:"left"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <span style={{fontSize:16}}>{g.e}</span>
              {cb.label&&<span style={{fontSize:7,color:cb.col,background:`${cb.col}22`,padding:"1px 4px",borderRadius:3}}>{cb.bonus>1?"強":"弱"}</span>}
            </div>
            <div style={{fontSize:10,color:g.c,fontWeight:700,fontFamily:"M PLUS Rounded 1c,sans-serif"}}>{g.jp}</div>
          </button>);
        })}
      </div>
      {char.genre2&&<Btn onClick={()=>{if(!window.confirm("サブジャンルを削除しますか？"))return;setChar(c=>({...c,genre2:null}));}} col="#200a0a" tc="#ff7070" full sx={{marginTop:8,fontSize:10,border:"1px solid #4a1a1a"}}>サブジャンルを削除</Btn>}
    </div>
    {char.titles?.length>0&&<div style={{background:BG2,border:`1px solid ${BD}`,borderRadius:8,padding:"12px 14px"}}><div style={{fontFamily:"'Press Start 2P',monospace",fontSize:7,color:TX3,marginBottom:10}}>TITLES</div><div style={{display:"flex",flexWrap:"wrap",gap:7}}>{char.titles.map(t=><span key={t} style={{fontSize:11,padding:"5px 12px",borderRadius:20,background:"#1a0a2a",color:"#ce93d8",border:"1px solid #3a1a5a",fontFamily:"M PLUS Rounded 1c,sans-serif"}}>🎖 {t}</span>)}</div></div>}
  </div>);
}

/* ── 🧠 DANCING QUIZ データ（40問） ── */
const DANCE_QUIZ=[
  // ── バレエ ──
  {id:"q01",cat:"🩰 バレエ",diff:1,
   q:"バレエが生まれた国はどこ？",
   choices:["イタリア","フランス","ロシア","イギリス"],ans:0,
   exp:"バレエはルネサンス期のイタリアに起源を発する。宮廷の余興「バロ（Ballo）」が始まり。",
   rw:{exp:200,coins:500}},

  {id:"q02",cat:"🩰 バレエ",diff:1,
   q:"バレエをイタリアからフランスに持ち込んだ一族は？",
   choices:["メディチ家","ボルジア家","エステ家","ヴィスコンティ家"],ans:0,
   exp:"1533年、フィレンツェのメディチ家からカトリーヌ・ド・メディシスがフランス王室に嫁ぎバレエを伝えた。",
   rw:{exp:250,coins:600}},

  {id:"q03",cat:"🩰 バレエ",diff:2,
   q:"1661年に王立舞踏アカデミーを創立したフランス国王は？",
   choices:["ルイ14世","ルイ13世","ナポレオン","フランソワ1世"],ans:0,
   exp:"「太陽王」ルイ14世は15歳でバレエデビューし、1661年に王立舞踏アカデミーを創立してバレエを体系化した。",
   rw:{exp:300,coins:700}},

  {id:"q04",cat:"🩰 バレエ",diff:2,
   q:"チャイコフスキーの三大バレエに含まれないのは？",
   choices:["ドン・キホーテ","白鳥の湖","くるみ割り人形","眠れる森の美女"],ans:0,
   exp:"三大バレエは「眠れる森の美女」「くるみ割り人形」「白鳥の湖」。ドン・キホーテはミンクス作曲。",
   rw:{exp:350,coins:800}},

  {id:"q05",cat:"🩰 バレエ",diff:3,
   q:"「ラ・シルフィード」でポワント技法を確立した女性ダンサーは？",
   choices:["マリー・タリオーニ","アンナ・パブロワ","マリー・カマルゴ","エリアナ・パブロワ"],ans:0,
   exp:"1832年、マリー・タリオーニが「ラ・シルフィード」でポワントを本格的に披露しロマンティック・バレエを確立した。",
   rw:{exp:400,coins:1000,gems:1}},

  // ── タップ ──
  {id:"q06",cat:"👞 タップ",diff:1,
   q:"タップダンスのルーツとなった出来事は？",
   choices:["ドラムの禁止","バレエの普及","ジャズの誕生","映画の発展"],ans:0,
   exp:"1739年サウスカロライナ州でドラムが禁止され、代わりに足を踏み鳴らしたことがタップダンスの起源。",
   rw:{exp:200,coins:500}},

  {id:"q07",cat:"👞 タップ",diff:2,
   q:"毎年5月25日の「National Tap Dance Day」は誰の誕生日にちなむ？",
   choices:["ビル・ボージャングルス・ロビンソン","フレッド・アステア","ジーン・ケリー","グレゴリー・ハインズ"],ans:0,
   exp:"「タップの神様」ビル・ボージャングルス・ロビンソンの誕生日（5月25日）にちなみ制定された。",
   rw:{exp:300,coins:700}},

  // ── ソウル ──
  {id:"q08",cat:"🎙 ソウル",diff:1,
   q:"「ソウルのゴッドファーザー」と呼ばれたアーティストは？",
   choices:["James Brown","Ray Charles","Aretha Franklin","Sly Stone"],ans:0,
   exp:"James BrownはすべてのストリートダンスのルーツとなったFUNKの創始者。Breaking、Popping、Lockingすべてに影響を与えた。",
   rw:{exp:200,coins:500}},

  {id:"q09",cat:"🎙 ソウル",diff:1,
   q:"ソウルダンスを世界に広めたテレビ番組は？",
   choices:["SOUL TRAIN","American Bandstand","Soul!","The Ed Sullivan Show"],ans:0,
   exp:"1970年シカゴ発のSOUL TRAINがソウルダンスを全世界に広めた。プロデューサーはドン・コーネリアス。",
   rw:{exp:200,coins:500}},

  {id:"q10",cat:"🎙 ソウル",diff:2,
   q:"SOUL TRAINが開始した年は？",
   choices:["1970年","1965年","1975年","1980年"],ans:0,
   exp:"1970年にシカゴのWCIU-TVでスタート。1971年にLAへ移転し全米ネットへ拡大した。",
   rw:{exp:300,coins:700}},

  {id:"q11",cat:"🎙 ソウル",diff:2,
   q:"本場アメリカでは「ソウルダンス」を何と呼ぶ？",
   choices:["パーティーダンス","ストリートダンス","ファンクダンス","ブラックダンス"],ans:0,
   exp:"アメリカでは「ソウルダンス」という呼称は存在せず「パーティーダンス」「パーティーグルーヴ」と呼ばれる。「ソウルダンス」は日本独自の呼称。",
   rw:{exp:350,coins:800}},

  {id:"q12",cat:"🎙 ソウル",diff:3,
   q:"James Brownが1965年に発明したとされる音楽ジャンルは？",
   choices:["Funk","Soul","R&B","Disco"],ans:0,
   exp:"1965年「Papa's Got a Brand New Bag」でFunkを発明。リズムを核とした構造がすべてのストリートダンスに影響を与えた。",
   rw:{exp:400,coins:1000,gems:1}},

  // ── ブレイキング ──
  {id:"q13",cat:"🏙 ブレイク",diff:1,
   q:"Breakingが生まれたニューヨークの区は？",
   choices:["ブロンクス","ブルックリン","マンハッタン","クイーンズ"],ans:0,
   exp:"ブレイクダンスは1970年代にニューヨークのサウスブロンクス地区のアフリカ系・ラテン系の若者によって発展した。",
   rw:{exp:200,coins:500}},

  {id:"q14",cat:"🏙 ブレイク",diff:1,
   q:"B-BOYの「B」が意味するものは？",
   choices:["ブレイクビーツ","バッド","ブロンクス","ブラック"],ans:0,
   exp:"B-BOYとはBreak Beats（ブレイクビーツ）で踊る人のこと。Bad（不良）やBlack（黒人）の略ではない。",
   rw:{exp:200,coins:500}},

  {id:"q15",cat:"🏙 ブレイク",diff:2,
   q:"ブレイクビーツの手法を生み出したDJは？",
   choices:["DJ Kool Herc","Grandmaster Flash","Afrika Bambaataa","DJ Jazzy Jeff"],ans:0,
   exp:"DJクール・ハークがブレイクビーツの手法を生み出し、その後グランドマスター・フラッシュ、アフリカ・バンバータが発展させた。",
   rw:{exp:300,coins:700}},

  {id:"q16",cat:"🏙 ブレイク",diff:2,
   q:"ブレイクダンスの4要素に含まれないのは？",
   choices:["ロッキング","エントリー","フットワーク","フリーズ"],ans:0,
   exp:"ブレイクダンスの4要素はエントリー（トップロック）・フットワーク・パワームーブ・フリーズ。ロッキングは別ジャンル。",
   rw:{exp:350,coins:800}},

  {id:"q17",cat:"🏙 ブレイク",diff:3,
   q:"HIPHOPの4大要素に含まれないものは？",
   choices:["ポッピング","DJing","MCing（ラップ）","グラフィティ"],ans:0,
   exp:"HIPHOPの4大要素はDJing・MCing・ブレイクダンス・グラフィティ。ポッピングはオールドスクールだが4大要素には含まれない。",
   rw:{exp:400,coins:1000,gems:1}},

  // ── ポッピング ──
  {id:"q18",cat:"⚡ ポップ",diff:1,
   q:"ポッピングが生まれたアメリカの都市は？",
   choices:["フレズノ","ロサンゼルス","サンフランシスコ","オークランド"],ans:0,
   exp:"ポッピングは1977年にカリフォルニア州フレズノのBoogaloo Samによって創られた。Electric Boogaloosが世界に広めた。",
   rw:{exp:200,coins:500}},

  {id:"q19",cat:"⚡ ポップ",diff:2,
   q:"Electric Boogaloosを結成したのは誰？",
   choices:["Boogaloo Sam","Poppin Pete","Skeeter Rabbit","Mr. Wiggles"],ans:0,
   exp:"Boogaloo Sam（Sam Solomon）が1977年にカリフォルニア州フレズノでElectric Boogaloosを設立。弟Poppin Peteと共に活動。",
   rw:{exp:300,coins:700}},

  {id:"q20",cat:"⚡ ポップ",diff:3,
   q:"マイケル・ジャクソンに直接指導したポッピングのレジェンドは？",
   choices:["Boogaloo Sam","Toni Basil","Don Campbell","Shabba Doo"],ans:0,
   exp:"マイケル・ジャクソンの師匠はBoogaloo Sam。ムーンウォーク等のマイケルの動きにはポッピングの技法が取り入れられている。",
   rw:{exp:400,coins:1000,gems:1}},

  // ── ロック ──
  {id:"q21",cat:"🔒 ロック",diff:1,
   q:"ロックダンスを考案したダンサーは？",
   choices:["Don Campbell","Boogaloo Sam","Don Cornelius","James Brown"],ans:0,
   exp:"ドン・キャンベル（Don Campbell）が1969年にLAでロックダンスを偶然生み出した。滑らかに踊れなかったことが逆に新スタイルになった。",
   rw:{exp:200,coins:500}},

  {id:"q22",cat:"🔒 ロック",diff:2,
   q:"ロックダンスの「ポイント（指さし）」が生まれたきっかけは？",
   choices:["観客に笑われた","音楽に合わせた","テレビを見て","先輩に習った"],ans:0,
   exp:"ドン・キャンベルが観客から笑われたため、思わず観客に指をさしたのが「ポイント」の始まり。",
   rw:{exp:300,coins:700}},

  {id:"q23",cat:"🔒 ロック",diff:2,
   q:"The LockersがSOUL TRAINに起用された年は？",
   choices:["1972年","1969年","1975年","1980年"],ans:0,
   exp:"The Lockersは1972年にSoul Trainに起用され一躍全米で有名になった。先にSaturday Night Liveにも出演している。",
   rw:{exp:300,coins:700}},

  // ── ワッキング ──
  {id:"q24",cat:"💜 ワック",diff:1,
   q:"WAACKINGはどこで生まれたダンス？",
   choices:["LAのゲイクラブ","NYのクラブ","シカゴのバー","ロンドンのクラブ"],ans:0,
   exp:"WAACKは70年代初期にLAのゲイクラブで生まれたダンス。当時の女優やドラッグクイーンのポーズを真似たことが起源。",
   rw:{exp:200,coins:500}},

  {id:"q25",cat:"💜 ワック",diff:3,
   q:"WAACKINGとPUNKINGの違いは？",
   choices:["WAACKはより感情的でPUNKINGはより滑らか","WAACKは速くPUNKINGは遅い","WAACKは男性用でPUNKINGは女性用","違いはない"],ans:0,
   exp:"WAACKINGはより感情的。PUNKINGは滑らかで精度を高める方向。もともとストレートなダンサーが差別的に「PUNKING」と呼んでいたことが由来。",
   rw:{exp:400,coins:1000,gems:1}},

  // ── ヒップホップ ──
  {id:"q26",cat:"🎤 HipHop",diff:1,
   q:"HIPHOPが誕生した年月日は？",
   choices:["1973年8月11日","1975年12月25日","1970年1月1日","1979年9月16日"],ans:0,
   exp:"1973年8月11日、DJ Kool Hercが1520 Sedgwick Aveでプレイしたことからすべてが始まった。妹の洋服代を調達するためのパーティーだった。",
   rw:{exp:250,coins:600}},

  {id:"q27",cat:"🎤 HipHop",diff:2,
   q:"HIPHOPダンスのニュースクールの基礎を確立したブルックリン出身のダンサーは？",
   choices:["Buddha Stretch","DJ Kool Herc","Missy Elliott","MC Hammer"],ans:0,
   exp:"1980年代後半〜90年代前半、ブルックリン出身のBuddha StretchらMOPTOPメンバーがFreestyle Hip Hop Danceの基礎を確立した。",
   rw:{exp:350,coins:800}},

  {id:"q28",cat:"🎤 HipHop",diff:2,
   q:"日本でHIPHOPダンスを広めたTV番組で、TRFのSAMが出演したのは？",
   choices:["ダンスダンスダンス","DA DA LMD","SOULトレイン","夜のヒットスタジオ"],ans:0,
   exp:"フジTVの「ダンスダンスダンス」にTRFのSAMとCHIHARUがレギュラーダンサーとして出演し日本にHIPHOPダンスを広めた。",
   rw:{exp:350,coins:800}},

  // ── ハウス ──
  {id:"q29",cat:"🎛 ハウス",diff:1,
   q:"HOUSE MUSICが発祥した都市は？",
   choices:["シカゴ","ニューヨーク","デトロイト","ロサンゼルス"],ans:0,
   exp:"ハウスミュージックはシカゴのクラブ「ウェアハウス」から生まれた。フランキー・ナックルズのDJが起源。",
   rw:{exp:200,coins:500}},

  {id:"q30",cat:"🎛 ハウス",diff:2,
   q:"ハウスダンスが生まれたニューヨークの伝説的クラブは？",
   choices:["パラダイス・ガラージ","スタジオ54","コットンクラブ","ウェアハウス"],ans:0,
   exp:"1970年代末のNY・クラブ「パラダイス・ガラージ」でDJラリー・レヴァンがハウスの基本スタイルを生み出した。",
   rw:{exp:300,coins:700}},

  {id:"q31",cat:"🎛 ハウス",diff:2,
   q:"Madonnaが「Vogue」でVOGUINGを教わった人物は？",
   choices:["Willi Ninja","Vogueing Vino","Kevin JZ Prodigy","Javier Ninja"],ans:0,
   exp:"Willi Ninja（House of Ninjaの創設者）がMadonnaにヴォーギングを教えた。ドキュメンタリー映画「パリ、夜は眠らない」にも出演。",
   rw:{exp:350,coins:800}},

  {id:"q32",cat:"🎛 ハウス",diff:3,
   q:"日本のハウスダンスの第一人者で「ROOTS」を結成したのは？",
   choices:["KOJI","HIRO","SAM","Nada"],ans:0,
   exp:"日本のハウスダンス第一人者は元ZOOのKOJI氏。1993年頃に伝説のHouse DanceチームROOTSを結成した。",
   rw:{exp:400,coins:1000,gems:1}},

  // ── ジャズ ──
  {id:"q33",cat:"🎷 ジャズ",diff:1,
   q:"ジャズダンスの原型が生まれたアメリカの港町は？",
   choices:["ニューオーリンズ","ニューヨーク","シカゴ","メンフィス"],ans:0,
   exp:"ニューオーリンズでジャズミュージック文化が花開き、現代に通じるジャズダンスの原型が作られた。",
   rw:{exp:200,coins:500}},

  {id:"q34",cat:"🎷 ジャズ",diff:3,
   q:"黒人で初めてバレエカンパニーを創りブロードウェイに立ったジャズダンスのパイオニアは？",
   choices:["キャサリン・ダンハム","アイシャ・ダンカン","マーサ・グラハム","アグネス・デミル"],ans:0,
   exp:"Katherine Dunhamはジャズダンスのパイオニアで、黒人で初めてバレエカンパニーを創設しブロードウェイに立った。",
   rw:{exp:400,coins:1000,gems:1}},

  // ── コンテンポラリー ──
  {id:"q35",cat:"🌀 コンテンポラリー",diff:2,
   q:"コンテンポラリー・ダンスの芸術運動が発祥した国は？",
   choices:["フランス","ドイツ","アメリカ","日本"],ans:0,
   exp:"コンテンポラリー・ダンスの舞踊芸術運動の発祥地は1980年代前半のフランス。国策として文化の地方化が進められた。",
   rw:{exp:300,coins:700}},

  {id:"q36",cat:"🌀 コンテンポラリー",diff:3,
   q:"「コンテンポラリー・ダンスの母」と呼ばれるダンサーは？",
   choices:["カロリン・カールソン","イサドラ・ダンカン","マーサ・グラハム","ピナ・バウシュ"],ans:0,
   exp:"フィンランド系アメリカ人ダンサーのCarolyn Carlsonがパリ・オペラ座に招聘されコンテンポラリーダンスの母と呼ばれた。",
   rw:{exp:400,coins:1000,gems:1}},

  // ── ダンスの起源 ──
  {id:"q37",cat:"🌍 起源",diff:1,
   q:"旧石器時代の洞窟壁画に踊る人が描かれているのはどこ？",
   choices:["アルタミラ洞窟","ラスコー洞窟","ショーヴェ洞窟","マルボル洞窟"],ans:0,
   exp:"スペインのアルタミラ洞窟の壁画に人々が踊る様子が描かれており、ダンスの歴史の古さを示している。",
   rw:{exp:200,coins:500}},

  {id:"q38",cat:"🌍 起源",diff:2,
   q:"古代ギリシアでダンスを教育として推奨した哲学者は？",
   choices:["プラトンとアリストテレス","ソクラテスとプラトン","アリストテレスとソクラテス","ピタゴラスとプラトン"],ans:0,
   exp:"プラトンとアリストテレスは身体的にも精神的にも健康な人間を育む教育の方法としてダンスを推奨した。",
   rw:{exp:300,coins:700}},

  {id:"q39",cat:"🌍 起源",diff:3,
   q:"日本の古事記で、踊って天照大神を天岩戸から引き出した神は？",
   choices:["天宇受売命（アメノウズメ）","天照大神","須佐之男命","天手力男神"],ans:0,
   exp:"アメノウズメが力強くエロティックに踊り、八百万の神々を笑わせ、天照大神が気になって戸を開けたところを天手力男神が引き出した。",
   rw:{exp:400,coins:1000,gems:1}},

  {id:"q40",cat:"🌍 起源",diff:1,
   q:"ソウルミュージックのルーツとなった宗教音楽は？",
   choices:["ゴスペル","讃美歌","グレゴリオ聖歌","スピリチュアル"],ans:0,
   exp:"ソウルダンス・ソウルミュージックはゴスペルにルーツを持つ。奴隷制後の黒人たちが教会でアフリカ系のリズムで歌い踊ったことが始まり。",
   rw:{exp:200,coins:500}},

  // ── MOPTOP / ELITE FORCE / MISFITS ──
  {id:"q41",cat:"🎤 HipHop",diff:2,
   q:"MOPTOPのオリジナルメンバーは何人？",
   choices:["4人","6人","3人","8人"],ans:0,
   exp:"MOPTOPのオリジナルメンバーはLink（リンク）、Caleaf（カリーフ）、Ejoe（イージョー）、Buddha Stretch（ブッダ・ストレッチ）の4人。1991年に共同で正式に結成。",
   rw:{exp:300,coins:700}},

  {id:"q42",cat:"🎤 HipHop",diff:3,
   q:"MOPTOPのオリジナル4人に含まれないのは？",
   choices:["Peter Paul","Link","Caleaf","Ejoe"],ans:0,
   exp:"MOPTOPオリジナルはLink・Caleaf・Ejoe・Buddha Stretch。Peter Paulは拡張メンバー。Loose Joint、Casper、Ade、Ramier、Toneらも後に加入。",
   rw:{exp:400,coins:1000,gems:1}},

  {id:"q43",cat:"🎤 HipHop",diff:3,
   q:"ELITE FORCEが1992年に最初に結成されたのは誰のMV撮影のため？",
   choices:["マイケル・ジャクソン","Mariah Carey","Will Smith","TLC"],ans:0,
   exp:"ELITE FORCEは1992年にMICHAEL JACKSONのMV「REMEMBER THE TIME」撮影のために結成された。その後Mariah Carey、Will Smith、TLCなどのMVにも参加。",
   rw:{exp:400,coins:1000,gems:1}},

  {id:"q44",cat:"🎤 HipHop",diff:3,
   q:"現役ELITE FORCEのメンバーは何人？",
   choices:["6人","4人","8人","5人"],ans:0,
   exp:"現役ELITE FORCEはBuddha Stretch・Henry Link・Brooklyn Terry・Bobby Mileage・Twelve Ejoe・Loose Jointの6人。",
   rw:{exp:400,coins:1000,gems:1}},

  {id:"q45",cat:"🎤 HipHop",diff:3,
   q:"MYSTIDIOUS MISFITS（ミスフィッツ）のメンバーに含まれないのは？",
   choices:["Ejoe","Marquest","Rubberband","Kito"],ans:0,
   exp:"MISTIDIOUSMISFITSのメンバーはMarquest・Rubberband・Peekaboo・Kito・Prancerの5人。Ejoeはモプトップ/エリートフォース側。",
   rw:{exp:400,coins:1000,gems:1}},

  {id:"q46",cat:"🎤 HipHop",diff:2,
   q:"MOPTOPの別名（略語）が意味するのは？",
   choices:["MOTIVATED ON PRECISION TOWARD OUTSTANDING PERFORMANCE","Masters Of Precision Technique Of Performance","Movement Of Popping Technique Of Perfection","Masters Of Party Talent On Performance"],ans:0,
   exp:"MOPTOPはMotivated On Precision Toward Outstanding Performanceの頭文字。精度への情熱と卓越したパフォーマンスを目指す姿勢を表している。",
   rw:{exp:350,coins:800}},

  {id:"q47",cat:"🎤 HipHop",diff:2,
   q:"HIPHOPダンスシーンの革命となったドキュメンタリー番組「Wreckin' Shop Live from Brooklyn」が放送されたのは？",
   choices:["1992年","1988年","1995年","1985年"],ans:0,
   exp:"1992年に放送された「Wreckin' Shop Live from Brooklyn（通称ALIVE TV）」はMOPTOP/ELITE FORCEが出演し、日本をはじめ全世界に多大な影響を与えた。",
   rw:{exp:350,coins:800}},

  // ── DANCE FUSION ──
  {id:"q48",cat:"🎛 ハウス",diff:2,
   q:"世界的ハウスダンスチーム「DANCE FUSION」が結成された年は？",
   choices:["1997年","1993年","2001年","1989年"],ans:0,
   exp:"DANCE FUSIONは1997年ころにCaleaf・Justice・Tony Sekouの3人で結成。世界中へハウスダンスの普及に努めた伝説的チーム。",
   rw:{exp:300,coins:700}},

  {id:"q49",cat:"🎛 ハウス",diff:3,
   q:"DANCE FUSIONのオリジナルメンバーの中で唯一の女性は？",
   choices:["Marjory","Shan.S","Shar","NORICO"],ans:0,
   exp:"DANCE FUSIONオリジナルメンバーはCaleaf・Shan.S・Tony Sekou・MIKEU4RIA・Tony Magregor・Shar・Marjoryの7人。Marjoryが唯一の女性メンバー。",
   rw:{exp:400,coins:1000,gems:1}},

  {id:"q50",cat:"🎛 ハウス",diff:3,
   q:"DANCE FUSIONに加わった日本人ハウスダンサーは？",
   choices:["HIROとNORICO","KOJIとHIRO","SAMとNORICO","KOJIとNORICO"],ans:0,
   exp:"DANCE FUSIONにはHIROとNORICOという日本人ハウスダンサーも加わっている。世界チームに日本人が参加した歴史的な出来事。",
   rw:{exp:400,coins:1000,gems:1}},

  // ── ロック追加 ──
  {id:"q51",cat:"🔒 ロック",diff:3,
   q:"The Lockersの唯一の女性メンバーで、バレエとロッキングを組み合わせたスタイルで知られるのは？",
   choices:["Toni Basil","Damita Jo Freeman","Shabba Doo","Fluky Luke"],ans:0,
   exp:"Toni Basil（ミッキー）はThe Lockers唯一の女性ダンサーでトップバレリーナ兼コリオグラファー。1982年「Hey Mickey」をヒットさせ、マネージャーとしてThe Lockersを商業的成功に導いた。",
   rw:{exp:400,coins:1000,gems:1}},

  {id:"q52",cat:"🔒 ロック",diff:3,
   q:"ロッキングを日本に持ち込んだThe Lockersのオリジネーターは？",
   choices:["Tony Go-Go Lewis","Don Campbell","Shabba Doo","Greg Campbellock Jr."],ans:0,
   exp:"Tony 'Go-Go' Lewisは1980年代に日本へロッキングを持ち込み、日本独自のスタイルを開発・発展させた。GoGo Brothersを結成し今も息子たちと活動。",
   rw:{exp:400,coins:1000,gems:1}},

  // ── ソウルダンス ステップ ──
  {id:"q54",cat:"🎙 ソウル",diff:2,
   q:"James Brownが1969年に3曲連続リリースして広めたステップは？",
   choices:["ポップコーン","ハッスル","バスストップ","ファンキーチキン"],ans:0,
   exp:"JBは1969年「The Popcorn」「Mother Popcorn」「Lowdown Popcorn」と3連続ヒットを出してポップコーンステップを爆発的に普及させた。",
   rw:{exp:300,coins:700}},

  {id:"q55",cat:"🎙 ソウル",diff:2,
   q:"「ウォーターゲート（Watergate）」ダンスが名前の由来にしたのは？",
   choices:["政治スキャンダル","映画","水の動き","ホテルの名前"],ans:0,
   exp:"1972〜73年のウォーターゲート政治スキャンダルにちなんで命名されたソウルダンスのステップ。ロッキングのルーツの一つとされる。",
   rw:{exp:300,coins:700}},

  {id:"q56",cat:"🎙 ソウル",diff:1,
   q:"ハッスル（The Hustle）を世界的ヒットにしたアーティストは？",
   choices:["Van McCoy","James Brown","Rufus Thomas","Chic"],ans:0,
   exp:"Van McCoy & The Soul City Symphonyの1975年ヒット「The Hustle」でハッスルダンスが爆発的に普及。映画「サタデー・ナイト・フィーバー」でも有名に。",
   rw:{exp:200,coins:500}},

  {id:"q57",cat:"🎙 ソウル",diff:2,
   q:"バスストップ（Bus Stop）の元の名前は？",
   choices:["LAハッスル","カリフォルニアハッスル","ディスコライン","ウェストコーストステップ"],ans:0,
   exp:"バスストップは1974年頃LAで生まれた「LAハッスル」（別名カリフォルニアハッスル）がNYに伝わって改名したライン・ダンス。",
   rw:{exp:300,coins:700}},

  {id:"q58",cat:"🎙 ソウル",diff:1,
   q:"バンプ（The Bump）の最大の特徴は？",
   choices:["パートナーとヒップをぶつけ合う","腕をジャークさせる","足でポップコーンを踊る","回転する"],ans:0,
   exp:"バンプは1970年代前半の超シンプルなダンス。隣のパートナーとビートに合わせてヒップをぶつけ合うだけ。シンプルゆえ誰でも踊れた。",
   rw:{exp:200,coins:500}},

  {id:"q59",cat:"🎙 ソウル",diff:2,
   q:"「ファンキーチキン（Funky Chicken）」を「Do the Funky Chicken」という曲で1969年に広めたアーティストは？",
   choices:["Rufus Thomas","James Brown","The Temptations","Marvin Gaye"],ans:0,
   exp:"Rufus Thomasの1969年ヒット「Do the Funky Chicken」でファンキーチキンが広まった。鶏が羽ばたくような肘の動きが特徴。The Temptationsも披露した。",
   rw:{exp:300,coins:700}},

  {id:"q60",cat:"🎙 ソウル",diff:2,
   q:"「フリーク（Freak）」を大ヒット「Le Freak」で広めたバンドは？",
   choices:["Chic","Earth Wind & Fire","Kool & the Gang","The Isley Brothers"],ans:0,
   exp:"Chicの1978年大ヒット「Le Freak」から「フリーク」ダンスが広まった。「Freak out!」の掛け声と共に世界のダンスフロアを席巻した。",
   rw:{exp:300,coins:700}},

  {id:"q61",cat:"🎙 ソウル",diff:3,
   q:"「ジャーク（The Jerk）」というダンスを1964年に最初にヒットさせたバンドは？",
   choices:["The Larks","The Miracles","The Temptations","The Capitols"],ans:0,
   exp:"1964年にThe Larksの「The Jerk」がヒット。同年にThe MiraclesとSmokey Robinsonが「Come on Do the Jerk」を制作。腕を様々なポジションにジャークさせる動きが特徴。",
   rw:{exp:400,coins:1000,gems:1}},

  {id:"q62",cat:"🎙 ソウル",diff:1,
   q:"「セックスマシーン（Sex Machine）」はJames Brownが何年にリリースしたファンクの名曲？",
   choices:["1970年","1965年","1975年","1968年"],ans:0,
   exp:"1970年リリースのJB史上最大のファンクヒット。ベーシストBootsy CollinsがバスでJBと即興で生み出した。ファンクダンスの基礎となるフットワークを持つ。",
   rw:{exp:200,coins:500}},

  // ── HIPHOPステップ ──
  {id:"q64",cat:"🎤 HipHop",diff:1,
   q:"ランニングマン（Running Man）を広めたといわれる有名アーティストは？",
   choices:["MC Hammer","James Brown","Bobby Brown","Janet Jackson"],ans:0,
   exp:"MC HammerがOaklandで発展させたという説が有力。Janet Jacksonの「Rhythm Nation」（1989）、Bobby Brown、Vanilla Iceも披露した。",
   rw:{exp:200,coins:500}},

  {id:"q65",cat:"🎤 HipHop",diff:2,
   q:"キャベッジパッチ（Cabbage Patch）の名前の由来は？",
   choices:["人形のキャベッジパッチキッズ","野菜のキャベツ畑","学校の名前","ダンサーのニックネーム"],ans:0,
   exp:"1980年代に大流行した人形「キャベッジパッチキッズ（Cabbage Patch Kids）」から命名。Gucci Crew IIが1986年に「The Cabbage Patch」という同名曲をリリースして普及した。",
   rw:{exp:300,coins:700}},

  {id:"q66",cat:"🎤 HipHop",diff:2,
   q:"ロボコップ（Robocop）ダンスの名前の由来は？",
   choices:["1987年の映画","1970年代のロボットダンス","ロックのロボット動作","テレビゲーム"],ans:0,
   exp:"1987年公開の映画「RoboCop」にちなんで命名。サイボーグ警官の硬いロボット的な動きをダンス化した。ポッピングのロボットダンス（1950年代映画由来）とは別物。",
   rw:{exp:300,coins:700}},

  {id:"q67",cat:"🎤 HipHop",diff:2,
   q:"スティーブマーティン（Steve Martin）ダンスを創作したダンサー/ラッパーは？",
   choices:["Stezo","MC Hammer","Buddha Stretch","Bobby Brown"],ans:0,
   exp:"コネチカット出身のラッパー/ダンサーStezoが1980年代後半に創作。EPMDの「You Gots to Chill」（1988）MVで世界にデビューした。",
   rw:{exp:350,coins:800}},

  {id:"q68",cat:"🎤 HipHop",diff:1,
   q:"フィラ（Fila）とリーボック（Reebok）のダンス名の共通した由来は？",
   choices:["スニーカーブランド","映画の主人公","ラッパーのニックネーム","街の名前"],ans:0,
   exp:"フィラもリーボックも1980年代にHIPHOPシーンで大人気だったスニーカーブランドから命名。他にもグッチ（Gucci）、トゥループ（Troop）など当時流行のブランド名がステップ名になった。",
   rw:{exp:200,coins:500}},

  {id:"q69",cat:"🎤 HipHop",diff:3,
   q:"ELITE FORCEが制作し世界のHIPHOPダンサーの教科書となった動画シリーズは？",
   choices:["OLD SCHOOL DICTIONARY","Hip Hop Bible","Party Dance Guide","New School Moves"],ans:0,
   exp:"ELITE FORCE（Buddha Stretch・Henry Link・Ejoeら）が制作した「OLD SCHOOL DICTIONARY」ビデオ。ランニングマン・キャベッジパッチ・スティーブマーティン・フィラ・ランボーなど多数のステップを体系的にまとめた永遠の名作。",
   rw:{exp:400,coins:1000,gems:1}},

  {id:"q70",cat:"🎤 HipHop",diff:2,
   q:"バートシンプソン（Bart Simpson）ダンスが特に流行した地域は？",
   choices:["アトランタ","ニューヨーク","ロサンゼルス","シカゴ"],ans:0,
   exp:"バートシンプソンはアトランタで特に人気。NYではスティーブマーティンやBiz Markieが人気で、地域によって流行ステップが異なった。TLCの「Creep」MVでも使用。",
   rw:{exp:300,coins:700}},

  // ── ハウスダンス フットワーク ──
  {id:"q72",cat:"🎛 ハウス",diff:1,
   q:"ハウスダンスの3大要素に含まれないのは？",
   choices:["ビートボックス","フットワーク","ジャッキング","ロフティング"],ans:0,
   exp:"ハウスダンスの3大要素はフットワーク・ジャッキング・ロフティング。ジャッキングはシカゴ発、ロフティングはNYのロフトパーティー（David Mancusoの「The Loft」）から。",
   rw:{exp:200,coins:500}},

  {id:"q73",cat:"🎛 ハウス",diff:2,
   q:"ハウスダンスの「パドブレ（Pas de Bourrée）」は何のダンスから取り込んだ技法？",
   choices:["バレエ","ブレイクダンス","タップダンス","サルサ"],ans:0,
   exp:"パドブレはバレエ由来の3ステップの足の動き。ハウスダンスはバレエ・タップ・サルサ・アフリカンダンスなど多様なダンス文化を吸収した。",
   rw:{exp:300,coins:700}},

  {id:"q74",cat:"🎛 ハウス",diff:2,
   q:"ハウスダンスのヒール/トウステップに影響を与えたジャマイカのダンスは？",
   choices:["スカンキング（Skanking）","ダンスホール","レゲエステップ","スカダンス"],ans:0,
   exp:"ジャマイカ系アメリカ人Monteが「ラスタがやっていたスカンキングがハウスの足使いの基礎になった」と証言している。",
   rw:{exp:350,coins:800}},

  {id:"q75",cat:"🎛 ハウス",diff:1,
   q:"ハウスダンスの「ルースレッグ（Loose Leg）」を体系化したのはどの都市のダンサーたち？",
   choices:["ニューヨーク","シカゴ","デトロイト","フィラデルフィア"],ans:0,
   exp:"ルースレッグ・トレイン・スケートなどはニューヨークのハウスダンサーたちが体系化した。ジャッキングの基礎はシカゴ発だが、フットワークはNYで発展した。",
   rw:{exp:200,coins:500}},

  {id:"q76",cat:"🎛 ハウス",diff:3,
   q:"「ドルフィンダイブ（Dolphin Dive）」はどんな動きのハウスダンスフロアワーク？",
   choices:["床に倒れて足を上下させる","空中で回転する","床を手で叩く","スライドして転がる"],ans:0,
   exp:"ドルフィンダイブは床に倒れてイルカのように足を上下させるフロアワーク。ハンドスプリングの半回転・全回転などのバリエーションもある。",
   rw:{exp:400,coins:1000,gems:1}},

  {id:"q77",cat:"🎛 ハウス",diff:2,
   q:"ハウスダンスの「トレイン（Train）」ステップはどの動きと組み合わせたもの？",
   choices:["ヒール/トウ＋スケーティング","シャッフル＋ジャンプ","ルースレッグ＋ドロップ","パドブレ＋ターン"],ans:0,
   exp:"トレインはヒール/トウ（かかと・つま先の動き）とスケーティングを組み合わせたステップ。電車が走るようにリズミカルに動く。",
   rw:{exp:300,coins:700}},

  // ── タップダンスレジェンド ──
  {id:"q79",cat:"👞 タップ",diff:2,
   q:"1985年映画「ホワイトナイツ（白夜）」でグレゴリー・ハインズと共演したバレエダンサーは？",
   choices:["ミハイル・バリシニコフ","ルドルフ・ヌレエフ","マリウス・プティパ","ニジンスキー"],ans:0,
   exp:"タップの神グレゴリー・ハインズとバレエの神バリシニコフが共演した「ホワイトナイツ（白夜）」は、ジャンルを超えたダンスの普遍性を証明した歴史的映画。",
   rw:{exp:350,coins:800}},

  {id:"q80",cat:"👞 タップ",diff:2,
   q:"「リズムタップの父」と呼ばれ、ガーシュウィンの「ポーギーとベス」に出演したタップレジェンドは？",
   choices:["ジョン・バブルス","ビル・ロビンソン","グレゴリー・ハインズ","サンドマン・シムズ"],ans:0,
   exp:"John Bubbles（ジョン・バブルス）がリズムタップの父。ヒールを使った複雑なリズムで現代タップの基礎を作り、ガーシュウィンの「ポーギーとベス」初演でSportin' Lifeを演じた。",
   rw:{exp:350,coins:800}},

  {id:"q81",cat:"👞 タップ",diff:2,
   q:"「Jumping Jive」での階段を使った伝説パフォーマンスをフレッド・アステアが「世界最高」と称賛したデュオは？",
   choices:["ニコラス・ブラザーズ","リベラシ","コンドス・ブラザーズ","チャック・グリーン"],ans:0,
   exp:"ファヤード＆ハロルドのニコラス・ブラザーズ。1943年映画「Stormy Weather」での階段タップはFred Astaire自らが「見た中で最高のダンスナンバー」と絶賛した。",
   rw:{exp:400,coins:1000,gems:1}},

  {id:"q82",cat:"👞 タップ",diff:2,
   q:"「スライド」の名人として知られ、ジミーという名で知られるタップレジェンドは？",
   choices:["ジミー・スライド","ジミー・ケリー","ジミー・タップ","ジミー・ブラウン"],ans:0,
   exp:"Jimmy Slyde（ジミー・スライド）。床を氷のように滑るスライド技法の達人。グレゴリー・ハインズの師匠でもある。晩年もパリのクラブで踊り続けた。",
   rw:{exp:300,coins:700}},

  {id:"q83",cat:"👞 タップ",diff:3,
   q:"アポロシアターで「フック（不評なアクトを引っ込める役）」を長年務め、砂の上で踊るサンドダンスで知られるのは？",
   choices:["サンドマン・シムズ","ジョン・バブルス","サミー・デイビスJr.","ビル・ロビンソン"],ans:0,
   exp:"Sandman Sims（サンドマン・シムズ）。コットンクラブ出身、砂を蒔いた舞台でのサンドダンスと、アポロシアターの「フック」係として有名な伝説のタップダンサー。",
   rw:{exp:400,coins:1000,gems:1}},

  {id:"q84",cat:"👞 タップ",diff:1,
   q:"「彼女はアステアがやることをすべて後ろ向きで、ハイヒールでやった」と言われた女性ダンサーは？",
   choices:["ジンジャー・ロジャース","シャーリー・テンプル","エレノア・パウエル","アン・ミラー"],ans:0,
   exp:"Ginger Rogersについての有名な言葉。Fred Astaire & Ginger Rogersは1930〜40年代に10本の映画で共演した黄金コンビ。",
   rw:{exp:200,coins:500}},

  {id:"q85",cat:"👞 タップ",diff:1,
   q:"「世界最高のエンターテイナー」と称され、タップ・歌・演技を融合させたラット・パックの一員は？",
   choices:["サミー・デイビスJr.","グレゴリー・ハインズ","ビル・ロビンソン","ジョン・バブルス"],ans:0,
   exp:"Sammy Davis Jr.はフランク・シナトラ率いるラット・パックの一員。タップ・歌・演技・物まねすべてをこなすトータルエンターテイナーとして世界的な人気を誇った。",
   rw:{exp:200,coins:500}},
];

/* ── 🧠 DANCING QUIZ TAB ── */
function QuizTab({char,setChar,genre,pushNotif,addLog}){
  const[phase,setPhase]=useState("menu"); // menu|playing|result
  const[qs,setQs]=useState([]); // current quiz set (10問)
  const[idx,setIdx]=useState(0);
  const[selected,setSelected]=useState(null);
  const[answered,setAnswered]=useState(false);
  const[score,setScore]=useState(0);
  const[streak,setStreak]=useState(0);
  const[results,setResults]=useState([]); // {correct,q}
  const[totalCorrect,setTotalCorrect]=useState(char.quizTotalCorrect||0);
  const[filter,setFilter]=useState("all"); // all|easy|hard|genre

  const gc=genre.c;

  const DIFF_LABEL={1:"⭐ かんたん",2:"⭐⭐ ふつう",3:"⭐⭐⭐ むずかしい"};
  const DIFF_COL={1:"#b3ff00",2:"#ffd60a",3:"#ff4da6"};

  function startQuiz(mode){
    let pool=[...DANCE_QUIZ];
    if(mode==="easy") pool=pool.filter(q=>q.diff===1);
    else if(mode==="hard") pool=pool.filter(q=>q.diff===3);
    else if(mode==="genre"){
      const CAT_MAP={hiphop:"HipHop",ballet:"バレエ",jazz:"ジャズ",house:"ハウス",
        breaking:"ブレイク",popping:"ポップ",locking:"ロック",waacking:"ワック",
        contemporary:"コンテンポラリー",soul:"ソウル"};
      const key=CAT_MAP[char.genre]||GENRES[char.genre]?.jp||"";
      pool=pool.filter(q=>q.cat.includes(key));
      if(pool.length<3) pool=[...DANCE_QUIZ].sort(()=>Math.random()-.5);
    }
    // shuffle & take 10, then shuffle each question's choices
    pool=pool.sort(()=>Math.random()-.5).slice(0,Math.min(10,pool.length));
    pool=pool.map(q=>{
      const correct=q.choices[q.ans]; // 正解を保存
      const shuffled=[...q.choices].sort(()=>Math.random()-.5); // 選択肢をシャッフル
      return{...q,choices:shuffled,ans:shuffled.indexOf(correct)}; // 正解の新しいインデックスを設定
    });
    setQs(pool);setIdx(0);setSelected(null);setAnswered(false);
    setScore(0);setStreak(0);setResults([]);setPhase("playing");
  }

  function answer(choiceIdx){
    if(answered)return;
    setSelected(choiceIdx);setAnswered(true);
    const q=qs[idx];
    const correct=choiceIdx===q.ans;
    const newStreak=correct?streak+1:0;
    setStreak(newStreak);
    if(correct){
      setScore(s=>s+1);
      const bonus=newStreak>=3?2:1;
      const expGain=(q.rw.exp||200)*bonus;
      const coinGain=(q.rw.coins||500)*bonus;
      const gemGain=q.rw.gems||0;
      setChar(c=>({...c,
        exp:c.exp+expGain,
        coins:c.coins+coinGain,
        gems:(c.gems||0)+gemGain,
        quizTotalCorrect:(c.quizTotalCorrect||0)+1,
      }));
      setTotalCorrect(t=>t+1);
      pushNotif(`✅ 正解！${newStreak>=3?`🔥×${newStreak}コンボ！`:""} +${expGain}EXP +${coinGain}コイン${gemGain?` +${gemGain}💎`:""}`,newStreak>=3?"#ffd60a":"#b3ff00");
      addLog(`🧠 クイズ正解「${q.q.slice(0,20)}...」+${expGain}EXP`);
    }else{
      pushNotif("❌ 不正解...","#ff5555");
    }
    setResults(r=>[...r,{correct,q}]);
  }

  function next(){
    if(idx+1>=qs.length){setPhase("result");return;}
    setIdx(i=>i+1);setSelected(null);setAnswered(false);
  }

  // ── MENU ──
  if(phase==="menu") return(
    <div style={{padding:"0 4px 100px"}}>
      {/* ヘッダー */}
      <div style={{background:`linear-gradient(135deg,${gc}22,${gc}11)`,borderRadius:12,padding:"20px 18px",marginBottom:16,border:`1px solid ${gc}44`,textAlign:"center"}}>
        <div style={{fontFamily:"'Press Start 2P',monospace",fontSize:10,color:gc,marginBottom:8,letterSpacing:2}}>🧠 DANCING QUIZ</div>
        <div style={{fontSize:12,color:TX2,fontFamily:"M PLUS Rounded 1c,sans-serif",marginBottom:12}}>
          ダンスの歴史を学びながら報酬ゲット！
        </div>
        <div style={{display:"flex",justifyContent:"center",gap:16}}>
          <div style={{textAlign:"center"}}>
            <div style={{fontSize:22,fontWeight:900,color:gc,fontFamily:"M PLUS Rounded 1c,sans-serif"}}>{char.quizTotalCorrect||0}</div>
            <div style={{fontSize:9,color:TX3}}>累計正解</div>
          </div>
          <div style={{textAlign:"center"}}>
            <div style={{fontSize:22,fontWeight:900,color:"#ffd60a",fontFamily:"M PLUS Rounded 1c,sans-serif"}}>{DANCE_QUIZ.length}</div>
            <div style={{fontSize:9,color:TX3}}>総問題数</div>
          </div>
        </div>
      </div>

      {/* モード選択 */}
      <div style={{fontFamily:"'Press Start 2P',monospace",fontSize:7,color:TX3,marginBottom:12}}>-- QUIZ MODE --</div>

      {[
        {mode:"all",    label:"🎲 ランダム10問",  sub:"全ジャンルMIX！",            col:gc},
        {mode:"easy",   label:"⭐ かんたん",       sub:"1年生でも解ける基礎問題",     col:"#b3ff00"},
        {mode:"hard",   label:"⭐⭐⭐ むずかしい",   sub:"ダンス通だけが解ける難問",    col:"#ff4da6"},
        {mode:"genre",  label:`${GENRES[char.genre]?.e} ${GENRES[char.genre]?.jp}専門`, sub:`メインジャンル特化クイズ（${(()=>{const CAT_MAP={hiphop:"HipHop",ballet:"バレエ",jazz:"ジャズ",house:"ハウス",breaking:"ブレイク",popping:"ポップ",locking:"ロック",waacking:"ワック",contemporary:"コンテンポラリー",soul:"ソウル"};const k=CAT_MAP[char.genre]||"";return DANCE_QUIZ.filter(q=>q.cat.includes(k)).length;})()}問）`, col:gc},
      ].map(m=>(
        <div key={m.mode} onClick={()=>startQuiz(m.mode)}
          style={{background:BG2,border:`1px solid ${m.col}44`,borderRadius:10,padding:"14px 16px",marginBottom:10,cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center"}}
        >
          <div>
            <div style={{fontSize:13,fontWeight:700,color:m.col,fontFamily:"M PLUS Rounded 1c,sans-serif",marginBottom:3}}>{m.label}</div>
            <div style={{fontSize:10,color:TX3,fontFamily:"M PLUS Rounded 1c,sans-serif"}}>{m.sub}</div>
          </div>
          <span style={{fontSize:20,color:m.col}}>▶</span>
        </div>
      ))}

      {/* 報酬説明 */}
      <div style={{background:BG2,borderRadius:10,padding:"12px 14px",marginTop:16,border:`1px solid ${BD}`}}>
        <div style={{fontFamily:"'Press Start 2P',monospace",fontSize:7,color:TX3,marginBottom:10}}>💰 正解で報酬！</div>
        <div style={{fontSize:11,color:TX2,fontFamily:"M PLUS Rounded 1c,sans-serif",lineHeight:1.8}}>
          ⭐ かんたん → EXP+200 / コイン+500<br/>
          ⭐⭐ ふつう → EXP+300 / コイン+700<br/>
          ⭐⭐⭐ むずかしい → EXP+400 / コイン+1000 / 💎+1<br/>
          🔥 3連続正解 → 報酬2倍ボーナス！
        </div>
      </div>
    </div>
  );

  // ── PLAYING ──
  if(phase==="playing"){
    const q=qs[idx];
    if(!q)return null;
    return(
      <div style={{padding:"0 4px 100px"}}>
        {/* プログレス */}
        <div style={{marginBottom:14}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
            <span style={{fontSize:10,color:TX3,fontFamily:"M PLUS Rounded 1c,sans-serif"}}>{idx+1}/{qs.length}問目 {q.cat}</span>
            <div style={{display:"flex",gap:8}}>
              <span style={{fontSize:10,color:"#b3ff00",fontFamily:"M PLUS Rounded 1c,sans-serif"}}>✅ {score}正解</span>
              {streak>=2&&<span style={{fontSize:10,color:"#ffd60a",fontFamily:"M PLUS Rounded 1c,sans-serif"}}>🔥×{streak}</span>}
            </div>
          </div>
          <div style={{height:6,background:BD,borderRadius:3,overflow:"hidden"}}>
            <div style={{height:"100%",width:`${((idx)/qs.length)*100}%`,background:gc,borderRadius:3,transition:"width .4s"}}/>
          </div>
        </div>

        {/* 難易度 */}
        <div style={{textAlign:"center",marginBottom:8}}>
          <span style={{fontSize:10,color:DIFF_COL[q.diff],fontFamily:"M PLUS Rounded 1c,sans-serif"}}>{DIFF_LABEL[q.diff]}</span>
        </div>

        {/* 問題 */}
        <div style={{background:BG2,borderRadius:12,padding:"24px 18px",marginBottom:16,border:`1px solid ${BD}`,textAlign:"center",minHeight:100,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <p style={{fontSize:15,fontWeight:700,color:TX,fontFamily:"M PLUS Rounded 1c,sans-serif",lineHeight:1.7,margin:0}}>
            ❓ {q.q}
          </p>
        </div>

        {/* 選択肢 */}
        <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:16}}>
          {q.choices.map((c,i)=>{
            let bg=BG2,border=`1px solid ${BD}`,col=TX;
            if(answered){
              if(i===q.ans){bg="#0a2a0a";border="2px solid #b3ff00";col="#b3ff00";}
              else if(i===selected&&i!==q.ans){bg="#2a0a0a";border="2px solid #ff5555";col="#ff5555";}
            }else if(selected===i){bg=`${gc}22`;border=`2px solid ${gc}`;}
            return(
              <div key={i} onClick={()=>!answered&&answer(i)}
                style={{background:bg,border,borderRadius:10,padding:"14px 16px",cursor:answered?"default":"pointer",
                  display:"flex",alignItems:"center",gap:12,transition:"all .2s"}}
              >
                <span style={{fontSize:14,fontWeight:700,color:answered&&i===q.ans?"#b3ff00":answered&&i===selected&&i!==q.ans?"#ff5555":TX3,fontFamily:"M PLUS Rounded 1c,sans-serif",width:24,flexShrink:0}}>
                  {["A","B","C","D"][i]}
                </span>
                <span style={{fontSize:13,fontWeight:700,color:col,fontFamily:"M PLUS Rounded 1c,sans-serif",lineHeight:1.5}}>{c}</span>
                {answered&&i===q.ans&&<span style={{marginLeft:"auto",fontSize:18}}>✅</span>}
                {answered&&i===selected&&i!==q.ans&&<span style={{marginLeft:"auto",fontSize:18}}>❌</span>}
              </div>
            );
          })}
        </div>

        {/* 解説 */}
        {answered&&(
          <div style={{background:selected===q.ans?"#0a1a0a":"#1a0a0a",borderRadius:10,padding:"14px 16px",marginBottom:14,border:`1px solid ${selected===q.ans?"#b3ff0044":"#ff555544"}`}}>
            <div style={{fontSize:10,color:selected===q.ans?"#b3ff00":"#ff5555",fontFamily:"'Press Start 2P',monospace",marginBottom:6}}>
              {selected===q.ans?"✅ CORRECT!":"❌ WRONG..."}
            </div>
            <p style={{fontSize:12,color:TX2,fontFamily:"M PLUS Rounded 1c,sans-serif",lineHeight:1.7,margin:0}}>{q.exp}</p>
          </div>
        )}

        {/* NEXTボタン */}
        {answered&&(
          <div onClick={next} style={{background:gc,borderRadius:10,padding:"14px",textAlign:"center",cursor:"pointer",fontWeight:700,fontSize:14,color:"#000",fontFamily:"M PLUS Rounded 1c,sans-serif"}}>
            {idx+1>=qs.length?"🏆 結果を見る":"次の問題 ▶"}
          </div>
        )}
      </div>
    );
  }

  // ── RESULT ──
  if(phase==="result"){
    const pct=Math.round((score/qs.length)*100);
    const rank=pct>=90?"S":pct>=70?"A":pct>=50?"B":pct>=30?"C":"D";
    const rankCol={"S":"#ffd60a","A":"#b3ff00","B":"#00e5ff","C":"#ff9900","D":"#ff5555"}[rank];
    return(
      <div style={{padding:"0 4px 100px"}}>
        <div style={{background:BG2,borderRadius:14,padding:"28px 18px",marginBottom:16,textAlign:"center",border:`1px solid ${rankCol}66`}}>
          <div style={{fontFamily:"'Press Start 2P',monospace",fontSize:9,color:rankCol,marginBottom:16,letterSpacing:2}}>QUIZ RESULT</div>
          <div style={{fontSize:72,fontWeight:900,color:rankCol,fontFamily:"M PLUS Rounded 1c,sans-serif",lineHeight:1,marginBottom:8}}>{rank}</div>
          <div style={{fontSize:18,color:TX,fontWeight:700,fontFamily:"M PLUS Rounded 1c,sans-serif",marginBottom:4}}>{score}/{qs.length}問正解</div>
          <div style={{fontSize:13,color:TX3,fontFamily:"M PLUS Rounded 1c,sans-serif"}}>{pct}%正解率</div>
        </div>

        {/* 各問題の結果 */}
        <div style={{marginBottom:14}}>
          {results.map((r,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",background:BG2,borderRadius:6,marginBottom:6,border:`1px solid ${r.correct?"#b3ff0022":"#ff555522"}`}}>
              <span style={{fontSize:14}}>{r.correct?"✅":"❌"}</span>
              <span style={{fontSize:11,color:TX2,fontFamily:"M PLUS Rounded 1c,sans-serif",flex:1,lineHeight:1.4}}>{r.q.q.slice(0,30)}...</span>
              <span style={{fontSize:9,color:DIFF_COL[r.q.diff]}}>{DIFF_LABEL[r.q.diff]}</span>
            </div>
          ))}
        </div>

        <div onClick={()=>setPhase("menu")} style={{background:gc,borderRadius:10,padding:"14px",textAlign:"center",cursor:"pointer",fontWeight:700,fontSize:14,color:"#000",fontFamily:"M PLUS Rounded 1c,sans-serif"}}>
          🧠 もう一度チャレンジ
        </div>
      </div>
    );
  }
  return null;
}

/* ── 📚 図鑑データ ── */
const ZUKAN_STEPS={
  soul:{label:"🎙 ソウルダンス",color:"#ff9900",steps:[
    {n:"ポップコーン",d:"JBが1969年に3連続リリースで普及。軽快なステップと弾む動き"},
    {n:"セックスマシーン",d:"1970年JBの名曲。バスで即興誕生。素早いフットワーク"},
    {n:"ホットパンツ",d:"1971年JBの同名曲から。強烈なリズムと腰の動き"},
    {n:"ファンキーチキン",d:"Rufus Thomas 1969年。鶏が羽ばたく肘の動き"},
    {n:"モンキー",d:"1960年代「Monkey Time」から。膝を曲げ両腕を前に振る"},
    {n:"ペンギン",d:"The Temptationsが披露。体を左右に傾けて歩く"},
    {n:"ハッスル",d:"Van McCoy 1975年大ヒット。マンボ＋サルサ系パートナーダンス"},
    {n:"バンプ",d:"1970年代前半。パートナーとヒップをぶつけ合うシンプルダンス"},
    {n:"ウォーターゲート",d:"1972年政治スキャンダルにちなんで命名"},
    {n:"フリーク",d:"Chic「Le Freak」1978年。世界のフロアを席巻"},
    {n:"バスストップ",d:"1974年LAハッスルがNYでBus Stopに改名したラインダンス"},
    {n:"ジャーク",d:"The Larks 1964年。腕を様々なポジションへジャーク"},
    {n:"ゴーゴー",d:"1960年代ゴーゴーダンス。台上で自由に踊る"},
    {n:"ファンキーブロードウェイ",d:"1966年Dyke and the Blazersの曲から"},
    {n:"グランドファーザー",d:"老人の歩き方をファンキーに踊るコミカルステップ"},
    {n:"ブレイクダウン",d:"曲のブレイクセクションに合わせた即興スタイル"},
    {n:"ポップコーンセブン",d:"ポップコーンの7カウントバリエーション"},
    {n:"ソウルステップ",d:"ソウルダンスの基本重心移動ステップ"},
    {n:"フォーコーナー",d:"4つのコーナーを使うラインダンス"},
    {n:"チョコレートシェイク",d:"ミルクシェイクを混ぜる腕の動きを取り込む"},
  ]},
  hiphop:{label:"🎤 ヒップホップ",color:"#00e5ff",steps:[
    {n:"ランニングマン",d:"MC Hammerが発展（1980年代中頃）。その場で走る動き"},
    {n:"ロジャーラビット",d:"1988年映画から命名。後ろにスキップしながら腕をパタパタ"},
    {n:"キャベッジパッチ",d:"1980年代の人形から命名。Gucci Crew II 1986年の曲で普及"},
    {n:"ロボコップ",d:"1987年映画から命名。肘ごとこぶしを左右に打ちつける"},
    {n:"バートシンプソン",d:"アニメから命名。左右スライドと逆方向の腕。アトランタで人気"},
    {n:"スティーブマーティン",d:"Stezoが1988年に創作。EPMD「You Gots to Chill」MVでデビュー"},
    {n:"フィラ（Fila）",d:"スニーカーブランドから命名。Buddha Stretchが多用"},
    {n:"リーボック",d:"スニーカーブランドから命名。キャベッジパッチと同時期のブーム"},
    {n:"ランボー",d:"映画から命名。フィラとセットで踊られることが多い"},
    {n:"ブルックリン",d:"Buddha Stretchら確立。ブルックリンのダンスシーンから生まれた基本ステップ"},
    {n:"パーティマシン",d:"左右ステップ＋大きな上半身の動き。Buddha Stretchが得意"},
    {n:"チキンヘッド",d:"鶏のように首と頭を前後にコクコク動かす"},
    {n:"ジャーク（Jerkin'）",d:"カリフォルニア発「Jerkin'」の基本。後ろにスキップするように見える"},
    {n:"ニュージャックスイング",d:"Bobby Brown・BBD・Guyらの音楽に合わせたダンス。日本に1989年上陸"},
    {n:"ストンプ",d:"足を力強く踏み鳴らす。リズムを強調する迫力ある動き"},
    {n:"マイクタイソン",d:"ボクサーにちなみパンチングの動きをダンス化"},
    {n:"チキンヌードルスープ",d:"2006年DJ Webstar feat. Bigg Nicckの曲から"},
    {n:"スポンジボム",d:"パーティマシンのバリエーション。スポンジのように弾む"},
    {n:"モネストリー",d:"ELITE FORCEのOld School Dictionaryに収録"},
    {n:"ブルックリンバウンス",d:"ブルックリンスタイルに弾む要素を加えたバリエーション"},
  ]},
  house:{label:"🎛 ハウスダンス",color:"#ce93d8",steps:[
    {n:"ルースレッグ",d:"NYのハウスダンサーが体系化した最重要基本動作。足を緩く振り出す"},
    {n:"パドブレ",d:"バレエ由来の3ステップ動作。ドラッグ・ターン・ヒールドロップなど多彩なバリエーション"},
    {n:"トレイン",d:"ヒール/トウ＋スケーティングを組み合わせ。ジャマイカのスカンキングが影響"},
    {n:"シャッフル",d:"ハウスの最基本ステップ。床を滑るように左右にシャッフル"},
    {n:"クロスヒールアンドトゥ",d:"かかととつま先を交互にクロスさせる。タップダンスの影響大"},
    {n:"スネーク",d:"蛇のように体をくねらせながらフットワーク"},
    {n:"シザーズ",d:"ハサミのように足を交差させる素早い動き"},
    {n:"トライアングル",d:"三角形の軌跡を描くように足を動かす"},
    {n:"スウォル（Swirl）",d:"後ろに回転しながら移動するスケーティング系"},
    {n:"スケート",d:"アイスのように床を滑るステップ。グライドする動き"},
    {n:"ロータス",d:"蓮の花のように展開するスケーティングのバリエーション"},
    {n:"クリスクロス",d:"足をクロスさせる動き"},
    {n:"ドロップ",d:"床にストンと落ちる動作"},
    {n:"ジャックインザボックス",d:"しゃがんだ状態からバネのように跳び上がる"},
    {n:"ギャロップ",d:"馬のギャロップのような軽快な移動ステップ"},
    {n:"サルサ",d:"ラテンのサルサをハウスのリズムで。プエルトリコ系が多く踊ったため融合"},
    {n:"ダイアモンド",d:"ひし形を描くように4方向へ足を動かす"},
    {n:"ロンデジャン（ウィング）",d:"バレエのロン・ド・ジャンブを応用。足が弧を描く"},
    {n:"ドルフィン/ダイブ",d:"床に倒れてイルカのように足を上下させるフロアワーク"},
    {n:"ピーターポール",d:"DANCE FUSIONのPeter Paulから命名。Crystal Waters MVで有名"},
  ]},
  tap:{label:"👞 タップダンス",color:"#ffd60a",steps:[
    {n:"ボールタッチ",d:"つま先の球（ボール）部分で床をタッチする基本動作"},
    {n:"ヒールドロップ",d:"かかとを落としてリズムを刻む"},
    {n:"シャッフル",d:"前→後ろとつま先を素早く2回床に当てる動き"},
    {n:"フラップ",d:"シャッフルに体重移動を加えた動き"},
    {n:"スタンプ",d:"足全体を強く床に踏み下ろす（音あり）"},
    {n:"ストンプ",d:"スタンプの強化版。力強く踏み鳴らす"},
    {n:"ウィング",d:"片足を上げて外に開きながら床をタップ"},
    {n:"タイムステップ",d:"タップダンスの代表的な練習ステップ。リズムパターンを刻む"},
    {n:"プルバック",d:"後ろに引きながら床をタップするステップ"},
    {n:"クランプロール",d:"かかとを使った連続音を出すステップ"},
    {n:"チャグ",d:"前進しながらリズムを刻むステップ"},
  ]},
};

const ZUKAN_PERSONS={
  ballet:{label:"🩰 バレエ",color:"#ff9ec4",persons:[
    {n:"マリー・タリオーニ",e:"Marie Taglioni (1804-1884)",d:"ロマンティック・バレエを確立。「ラ・シルフィード」でポワントを本格確立した女神"},
    {n:"アンナ・パブロワ",e:"Anna Pavlova (1881-1931)",d:"「瀕死の白鳥」の代名詞。1922年の日本公演で西洋舞踏を広めた。50歳で手術を拒否して逝去"},
    {n:"エリアナ・パブロワ",e:"Eliana Pavlova (1897-1941)",d:"日本バレエの母。1927年鎌倉に日本初のバレエ稽古場を設立。南京で戦病死"},
    {n:"オリガ・サファイア",e:"Olga Saffire (1907-1981)",d:"日本名・清水みどり。ロシア=ソビエトバレエを日本に伝えた最初の人物"},
    {n:"ミハイル・バリシニコフ",e:"Mikhail Baryshnikov (1948-)",d:"20世紀最大のバレエダンサー。1974年ソ連から亡命。映画「ホワイトナイツ」でハインズと共演"},
  ]},
  tap:{label:"👞 タップ",color:"#ffd60a",persons:[
    {n:"ビル・ボージャングルス・ロビンソン",e:"Bill Robinson (1878-1949)",d:"タップの王。黒人初のブロードウェイ単独主演スター。5月25日はNational Tap Dance Day"},
    {n:"ジョン・バブルス",e:"John Bubbles (1902-1986)",d:"リズムタップの父。ヒールを使う複雑なリズムで現代タップの基礎を作った"},
    {n:"ニコラス・ブラザーズ",e:"Nicholas Brothers Fayard&Harold",d:"階段パフォーマンスをFred Astaire自らが「世界最高のダンスナンバー」と絶賛"},
    {n:"サミー・デイビスJr.",e:"Sammy Davis Jr. (1925-1990)",d:"世界最高のエンターテイナー。タップ・歌・演技を融合。ラット・パックの一員"},
    {n:"グレゴリー・ハインズ",e:"Gregory Hines (1946-2003)",d:"タップ界最後の偉人。映画「ホワイトナイツ」でバリシニコフと共演。トニー賞受賞"},
    {n:"ジミー・スライド",e:"Jimmy Slyde (1927-2008)",d:"スライドの名人。グレゴリー・ハインズの師匠。晩年もパリのクラブで踊り続けた"},
    {n:"サンドマン・シムズ",e:"Sandman Sims (1917-2003)",d:"コットンクラブのサンドダンスの巨匠。アポロシアターの「フック」係としても有名"},
  ]},
  soul:{label:"🎙 ソウル",color:"#ff9900",persons:[
    {n:"ジェームス・ブラウン",e:"James Brown (1933-2006)",d:"ソウルのゴッドファーザー。1965年にFUNKを発明。すべてのストリートダンスの源流"},
    {n:"ドン・コーネリアス",e:"Don Cornelius (1936-2012)",d:"SOUL TRAINの創設者。「Love, peace, and soul!」1970〜2006年、約35年の歴史"},
  ]},
  breaking:{label:"🏙 ブレイク",color:"#4fc3f7",persons:[
    {n:"DJ クール・ハーク",e:"DJ Kool Herc",d:"1973年8月11日にブロンクスでブレイクビーツを発明。HIPHOPの誕生日を作った人"},
    {n:"アフリカ・バンバータ",e:"Afrika Bambaataa",d:"ギャングの抗争をダンスバトルへ。Universal Zulu Nation設立でHIPHOPを平和的文化に"},
  ]},
  popping:{label:"⚡ ポッピング",color:"#ffd60a",persons:[
    {n:"ブガルー・サム",e:"Boogaloo Sam (Sam Solomon)",d:"Electric Boogaloos創設者。1977年フレズノでポッピングを発明。マイケル・ジャクソンの師匠"},
    {n:"ポッピン・ピート",e:"Poppin' Pete",d:"ブガルー・サムの弟。Soul Trainを見ながらロボットムーブを練習し兄からポッピングを学んだ"},
  ]},
  locking:{label:"🔒 ロック",color:"#b3ff00",persons:[
    {n:"ドン・キャンベル",e:"Don Campbell",d:"1969年LAでロックダンスを偶然発明。Funky Chickenを滑らかにできなかったことが逆にスタイルになった"},
    {n:"グレッグ・キャンベルロックJr.",e:"Greg Campbellock Jr.",d:"「踊る場所に着いたら環境を把握してから踊れ」の名言を残したThe Lockersの要"},
    {n:"トニー・バジル",e:"Toni Basil",d:"The Lockers唯一の女性。バレリーナ兼コリオグラファー。1982年「Hey Mickey」をヒット"},
    {n:"シャバドゥ",e:"Shabba Doo",d:"映画「ブレイクダンス」(1984)のオゾーン役で有名。スムーズ＆スピーディなスタイル"},
    {n:"トニー・ゴーゴー・ルイス",e:"Tony Go-Go Lewis",d:"1980年代に日本へロッキングを持ち込んだ。世界初のシンクロロッキンググループGoGo Brothersを結成"},
  ]},
  hiphop:{label:"🎤 ヒップホップ",color:"#00e5ff",persons:[
    {n:"ブッダ・ストレッチ",e:"Buddha Stretch",d:"MOPTOP・ELITE FORCE創設者。ニュースクールHIPHOPダンスの父。OLD SCHOOL DICTIONARYを制作"},
    {n:"ヘンリー・リンク",e:"Henry Link",d:"ELITE FORCE現役メンバー。ブルックリン育ち"},
    {n:"Stezo",e:"Stezo",d:"スティーブマーティンダンスの創作者。EPMD「You Gots to Chill」(1988)MVでデビュー"},
  ]},
  house:{label:"🎛 ハウス",color:"#ce93d8",persons:[
    {n:"フランキー・ナックルズ",e:"Frankie Knuckles",d:"シカゴ「ウェアハウス」の主力DJ。ハウスミュージックの生みの親の一人"},
    {n:"ラリー・レヴァン",e:"Larry Levan",d:"NY「パラダイス・ガラージ」の伝説的DJ。ニューヨークガラージュスタイルの生みの親"},
    {n:"カリーフ",e:"Caleaf Sellers",d:"DANCE FUSION創設者の一人。日本人に大きな影響を与えた伝説的ハウスダンサー"},
    {n:"KOJI",e:"KOJI",d:"日本ハウスダンスの第一人者。元ZOOのメンバー。1993年頃にROOTSを結成"},
  ]},
};

const ZUKAN_CREWS=[
  {n:"Electric Boogaloos",e:"⚡",g:"ポッピング",y:"1977年 フレズノ",
   m:["Boogaloo Sam（創設者）","Poppin' Pete（弟）","Skeeter Rabbit","Sugapop","Poppin' Taco","Boogaloo Shrimp","Mr. Wiggles"],
   d:"ポッピングを世界に広めた伝説のクルー。マイケル・ジャクソンの師匠も輩出"},
  {n:"The Lockers",e:"🔒",g:"ロック",y:"1971年 LA",
   m:["Don Campbell（創設者）","Greg Campbellock Jr.","Fred Mr. Penguin Berry","Bill Slim the Robot Williams","Leo Fluky Luke Williamson","Toni Mickey Basil（唯一の女性）","Shabba Doo","Jimmy Scoo B Doo Foster","Tony Go-Go Lewis Foster"],
   d:"ロックダンスを確立した伝説的チーム。Soul Trainで全米を席巻。1972年出演"},
  {n:"MOPTOP",e:"🎤",g:"ヒップホップ",y:"1991年",
   m:["Link","Caleaf","Ejoe","Buddha Stretch（オリジナル4人）","Peter Paul","Ramier","Tone","Casper","Ade","Loose Joint"],
   d:"Motivated On Precision Toward Outstanding Performance。ニュースクールHIPHOPの礎"},
  {n:"ELITE FORCE",e:"⚡",g:"ヒップホップ",y:"1992年",
   m:["Buddha Stretch","Henry Link","Brooklyn Terry","Bobby Mileage","Twelve Ejoe","Loose Joint（現役6人）"],
   d:"マイケル・ジャクソン「Remember the Time」MV撮影のために結成。OLD SCHOOL DICTIONARYを制作"},
  {n:"MYSTIDIOUS MISFITS",e:"🔥",g:"ヒップホップ",y:"1990年代初頭",
   m:["Marquest","Rubberband","Peekaboo","Kito","Prancer"],
   d:"1992年「Wreckin' Shop Live from Brooklyn（ALIVE TV）」で全世界に多大な影響を与えた"},
  {n:"DANCE FUSION",e:"🎛",g:"ハウス",y:"1997年",
   m:["Caleaf","Justice","Tony Sekou（創設3人）","Shan.S","MIKEU4RIA","Tony Magregor","Shar","Marjory（唯一の女性）","HIRO（日本）","NORICO（日本）"],
   d:"世界中へハウスダンスの普及を担った伝説チーム"},
  {n:"ROOTS",e:"🇯🇵",g:"ハウス",y:"1993年頃 日本",
   m:["KOJI","Hyrosshi","Nada","Kango","Shimura","Yan","KAIE","MA"],
   d:"日本初の本格ハウスダンスチーム。第一人者KOJIが元ZOOのメンバー"},
  {n:"ALMA",e:"💫",g:"ハウス",y:"2001年 日本",
   m:["KOJI","HyROSSI","HIRO","PInOSHIGe"],
   d:"HIROが創ったとされる「フローティング（Floating）」スタイルを持つハウスダンスチーム"},
  {n:"ZOO",e:"🦁",g:"ヒップホップ（日本）",y:"1989年頃 日本",
   m:["Taco","Naoya","Mark","Satsuki","ルーク","Hiro（後のEXILE HIRO）","Cap","Hisami","Sae"],
   d:"TV朝日「DA DA LMD」から誕生。日本HIPHOPダンスシーンの先駆者"},
];

/* ── 📚 図鑑タブ ── */
function ZukanTab({genre}){
  const[cat,setCat]=useState("steps");
  const[stepGenre,setStepGenre]=useState("soul");
  const[personGenre,setPersonGenre]=useState("ballet");
  const gc=genre.c;

  return(<div style={{padding:"0 4px 100px"}}>
    {/* カテゴリ選択 */}
    <div style={{fontFamily:"'Press Start 2P',monospace",fontSize:8,color:gc,marginBottom:10,textAlign:"center"}}>📚 ダンス大図鑑</div>
    <div style={{fontSize:10,color:TX2,fontFamily:"M PLUS Rounded 1c,sans-serif",textAlign:"center",marginBottom:14}}>
      ダンスの歴史・ステップ・人物・クルーを学ぼう！
    </div>

    {/* 歴史の本ボタン */}
    <div onClick={()=>window.open('/dance_history_encyclopedia.html','_blank')}
      style={{background:"linear-gradient(135deg,#2a1500,#1a0c00)",
        border:"1px solid #c49a3c88",borderRadius:12,padding:"14px 16px",
        marginBottom:16,cursor:"pointer",display:"flex",alignItems:"center",gap:14}}>
      <span style={{fontSize:34}}>📖</span>
      <div style={{flex:1}}>
        <div style={{fontFamily:"'Press Start 2P',monospace",fontSize:7,color:"#c49a3c",marginBottom:5}}>DANCE HISTORY BOOK</div>
        <div style={{fontSize:11,color:"#e8c97e",fontFamily:"M PLUS Rounded 1c,sans-serif",lineHeight:1.6}}>
          ダンスの歴史 大百科を読む<br/>
          <span style={{fontSize:10,color:"#8a7050"}}>バレエ・タップ・ソウル・HipHop・House 全ジャンル収録</span>
        </div>
      </div>
      <span style={{fontSize:18,color:"#c49a3c"}}>↗</span>
    </div>
    <div style={{display:"flex",background:BG2,borderRadius:8,padding:3,gap:3,marginBottom:16}}>
      {[["steps","🦶 ステップ"],["persons","👤 人物"],["crews","👥 クルー"]].map(([id,label])=>(
        <button key={id} onClick={()=>setCat(id)} style={{flex:1,padding:"8px 2px",fontSize:10,fontFamily:"M PLUS Rounded 1c,sans-serif",fontWeight:700,background:cat===id?gc+"33":"none",color:cat===id?gc:TX3,borderRadius:6,border:cat===id?`1px solid ${gc}66`:"1px solid transparent"}}>
          {label}
        </button>
      ))}
    </div>

    {/* ステップ図鑑 */}
    {cat==="steps"&&<div>
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:14}}>
        {Object.entries(ZUKAN_STEPS).map(([k,v])=>(
          <button key={k} onClick={()=>setStepGenre(k)} style={{fontSize:10,padding:"5px 10px",borderRadius:20,background:stepGenre===k?v.color+"33":BG2,color:stepGenre===k?v.color:TX3,border:`1px solid ${stepGenre===k?v.color+"66":BD}`,fontFamily:"M PLUS Rounded 1c,sans-serif",fontWeight:700,cursor:"pointer"}}>
            {v.label}
          </button>
        ))}
      </div>
      {(()=>{
        const g=ZUKAN_STEPS[stepGenre];
        return(<div>
          <div style={{fontFamily:"'Press Start 2P',monospace",fontSize:7,color:g.color,marginBottom:12}}>{g.label} ステップ一覧</div>
          {g.steps.map((s,i)=>(
            <div key={i} style={{background:BG2,borderRadius:8,padding:"10px 14px",marginBottom:8,border:`1px solid ${g.color}22`}}>
              <div style={{fontSize:13,fontWeight:700,color:g.color,fontFamily:"M PLUS Rounded 1c,sans-serif",marginBottom:3}}>{s.n}</div>
              <div style={{fontSize:11,color:TX2,fontFamily:"M PLUS Rounded 1c,sans-serif",lineHeight:1.6}}>{s.d}</div>
            </div>
          ))}
        </div>);
      })()}
    </div>}

    {/* 人物図鑑 */}
    {cat==="persons"&&<div>
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:14}}>
        {Object.entries(ZUKAN_PERSONS).map(([k,v])=>(
          <button key={k} onClick={()=>setPersonGenre(k)} style={{fontSize:10,padding:"5px 10px",borderRadius:20,background:personGenre===k?v.color+"33":BG2,color:personGenre===k?v.color:TX3,border:`1px solid ${personGenre===k?v.color+"66":BD}`,fontFamily:"M PLUS Rounded 1c,sans-serif",fontWeight:700,cursor:"pointer"}}>
            {v.label}
          </button>
        ))}
      </div>
      {(()=>{
        const g=ZUKAN_PERSONS[personGenre];
        return(<div>
          <div style={{fontFamily:"'Press Start 2P',monospace",fontSize:7,color:g.color,marginBottom:12}}>{g.label} 人物図鑑</div>
          {g.persons.map((p,i)=>(
            <div key={i} style={{background:BG2,borderRadius:10,padding:"14px 16px",marginBottom:10,borderLeft:`4px solid ${g.color}`}}>
              <div style={{fontSize:13,fontWeight:700,color:g.color,fontFamily:"M PLUS Rounded 1c,sans-serif",marginBottom:2}}>{p.n}</div>
              <div style={{fontSize:10,color:TX3,marginBottom:6,fontFamily:"M PLUS Rounded 1c,sans-serif",fontStyle:"italic"}}>{p.e}</div>
              <div style={{fontSize:11.5,color:TX2,fontFamily:"M PLUS Rounded 1c,sans-serif",lineHeight:1.7}}>{p.d}</div>
            </div>
          ))}
        </div>);
      })()}
    </div>}

    {/* クルー図鑑 */}
    {cat==="crews"&&<div>
      <div style={{fontFamily:"'Press Start 2P',monospace",fontSize:7,color:TX3,marginBottom:12}}>伝説のクルー・チーム一覧</div>
      {ZUKAN_CREWS.map((c,i)=>(
        <div key={i} style={{background:BG2,borderRadius:10,padding:"16px 14px",marginBottom:12,border:`1px solid ${BD}`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
            <div>
              <div style={{fontSize:14,fontWeight:900,color:TX,fontFamily:"M PLUS Rounded 1c,sans-serif"}}>{c.e} {c.n}</div>
              <div style={{fontSize:10,color:gc,fontFamily:"M PLUS Rounded 1c,sans-serif"}}>{c.g} | {c.y}</div>
            </div>
          </div>
          <div style={{fontSize:11,color:TX2,fontFamily:"M PLUS Rounded 1c,sans-serif",marginBottom:8,lineHeight:1.65}}>{c.d}</div>
          <div style={{fontSize:10,color:TX3,fontFamily:"M PLUS Rounded 1c,sans-serif",fontWeight:700,marginBottom:4}}>メンバー：</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
            {c.m.map((m,j)=>(
              <span key={j} style={{fontSize:10,background:BG3,padding:"3px 8px",borderRadius:12,color:TX2,fontFamily:"M PLUS Rounded 1c,sans-serif",border:`1px solid ${BD}`}}>{m}</span>
            ))}
          </div>
        </div>
      ))}
    </div>}
  </div>);
}

/* ── GAME SCREEN ── */
function Game({char,setChar,onTitle,user,onLogout,onAuthChange,manualSave,saveStatus,lightMode,toggleLight,onTokushou}){
  const[tab,setTab]=useState("home");
  const[notif,setNotif]=useState(null);
  const[log,setLog]=useState([]);
  const[muted,setMuted]=useState(false);
  const[unread,setUnread]=useState(0);
  const[showInbox,setShowInbox]=useState(false);
  const genre=GENRES[char.genre];
  const lv=getLvCapped(char.exp,char.artifacts);
  const rawLv=getLv(char.exp);
  const maxLv=getMaxLv(char.artifacts||[]);
  const rnk=rnkOf(lv);
  const xpC=char.exp-xpL(lv),xpN=xpL(lv+1)-xpL(lv),xpP=Math.min(100,Math.round((xpC/xpN)*100));

  // 未読メッセージ数を30秒ごとにチェック
  useEffect(()=>{
    if(!char.name)return;
    const check=()=>countUnread(char.name).then(n=>setUnread(n)).catch(()=>{});
    check();
    const t=setInterval(check,30000);
    return()=>clearInterval(t);
  },[char.name]);

  // BGM制御（エリア別）
  useEffect(()=>{
    if(tab==="battle")Sound.battle();
    else Sound.playRegion(char.currentCity);
  },[tab,char.currentCity]);

  useEffect(()=>{Sound.playRegion(char.currentCity);return()=>Sound.stop();},[]);
  // 💎 購入完了通知
  useEffect(()=>{
    const pending=localStorage.getItem("pending_gem_notify");
    if(pending){
      localStorage.removeItem("pending_gem_notify");
      const gems=parseInt(pending||"0");
      if(gems>0){
        setTimeout(()=>notif2(`🎉 💎${gems}ジェム購入完了！ありがとう！`,"#bb99ff"),800);
      }
    }
  },[]);
  useEffect(()=>{
    const REGEN_MS=5*60*1000;
    const check=()=>setChar(c=>{
      if(!c)return c;
      const lv=getLvCapped(c.exp,c.artifacts);
      const MAX=getMaxEnergy(lv);
      if(c.energy>=MAX)return c;
      const now=Date.now();const last=c.lastEnergyTime||now;const gained=Math.floor((now-last)/REGEN_MS);
      if(gained===0)return c;
      return{...c,energy:Math.min(MAX,c.energy+gained),lastEnergyTime:last+(gained*REGEN_MS)};
    });
    check();const t=setInterval(check,30000);return()=>clearInterval(t);
  },[]);

  // Heart time-based regen
  useEffect(()=>{
    const REGEN_MS=4*60*60*1000;
    const check=()=>setChar(c=>{
      if(!c)return c;const MAX=c.maxHearts||6;if((c.hearts||0)>=MAX)return c;
      const now=Date.now();const last=c.lastHeartTime||now;const gained=Math.floor((now-last)/REGEN_MS);
      if(gained===0)return c;
      return{...c,hearts:Math.min(MAX,(c.hearts||0)+gained),lastHeartTime:last+(gained*REGEN_MS)};
    });
    check();const t=setInterval(check,60000);return()=>clearInterval(t);
  },[]);

  // Vitals decay
  useEffect(()=>{
    const t=setInterval(()=>setChar(c=>({...c,hunger:Math.max(0,c.hunger-2),mood:c.hunger<15?Math.max(0,c.mood-2):Math.min(100,c.mood+1)})),12000);
    return()=>clearInterval(t);
  },[]);

  function notif2(msg,col="#b3ff00"){setNotif({msg,col});setTimeout(()=>setNotif(null),2800);}
  function addLog(msg){setLog(l=>[{msg,id:Date.now()},...l.slice(0,12)]);}

  function useHeart(){
    if((char.hearts||0)<=0){
      // ハートなし → ジェムで即回復
      if((char.gems||0)<3){notif2("ハートもジェムも足りない！💎3必要","#ff5555");return;}
      if(!window.confirm("💎3を使ってエネルギー全回復しますか？"))return;
      const MAX=char.maxEnergy||50;
      setChar(c=>({...c,gems:(c.gems||0)-3,energy:MAX,lastEnergyTime:Date.now()}));
      notif2("💎3→⚡ エネルギー全回復！","#88eeff");addLog("💎3を使ってエネルギー全回復！");
      return;
    }
    const MAX=char.maxEnergy||50;
    setChar(c=>({...c,hearts:Math.max(0,(c.hearts||0)-1),energy:MAX,lastEnergyTime:Date.now()}));
    notif2("❤️→⚡ エネルギー全回復！","#ff9ec4");addLog("❤️を使ってエネルギー全回復！");
  }

  async function doTrain(move){
    if(char.energy<move.cost){notif2("エネルギー不足！","#ff5555");return;}
    const eg=move.exp+Math.floor(Math.random()*12);
    const ns={...char.stats};Object.entries(move.g).forEach(([k,v])=>{ns[k]=(ns[k]||0)+v;});
    setChar(c=>({...c,exp:c.exp+eg,energy:Math.max(0,c.energy-move.cost),lastEnergyTime:c.lastEnergyTime||Date.now(),stats:ns,mood:Math.min(100,c.mood+8)}));
    notif2(`+${eg} EXP！ ${move.name} 成功！`,"#b3ff00");addLog(`「${move.name}」練習 +${eg}EXP`);
  }
  function doRest(){setChar(c=>({...c,mood:Math.min(100,c.mood+20)}));notif2("休息した。気分回復！","#00e5ff");addLog("休息した。");}
  function doEat(){setChar(c=>({...c,hunger:Math.min(100,c.hunger+55),mood:Math.min(100,c.mood+10)}));notif2("おいしかった！🍱","#ff9ec4");addLog("食事した。");}

  const TABS=[{id:"home",l:"ホーム",e:"🏠"},{id:"battle",l:"バトル",e:"⚔️"},{id:"map",l:"MAP",e:"🗺"},{id:"quiz",l:"クイズ",e:"🧠"},{id:"zukan",l:"図鑑",e:"📚"},{id:"shop",l:"ショップ",e:"🛍"},{id:"status",l:"ステータス",e:"📊"}];
  return(<div style={{minHeight:"100vh",background:BG,fontFamily:"M PLUS Rounded 1c,sans-serif",paddingBottom:80}}>
    {showInbox&&<MessageInbox myName={char.name} onClose={()=>{setShowInbox(false);countUnread(char.name).then(n=>setUnread(n));}}/>}
    {notif&&<div style={{position:"fixed",top:14,left:"50%",transform:"translateX(-50%)",zIndex:999,background:"#0e0e22",border:`2px solid ${notif.col}`,color:notif.col,padding:"9px 18px",borderRadius:6,fontSize:12,fontWeight:700,animation:"su .25s ease",whiteSpace:"nowrap",maxWidth:"90vw",pointerEvents:"none"}}>{notif.msg}</div>}
    <div style={{padding:"10px 16px",background:BG2,borderBottom:`2px solid ${genre.c}55`}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:26}}>{genre.e}</span>
          <div><div style={{fontFamily:"'Press Start 2P',monospace",fontSize:8,color:genre.c,letterSpacing:1}}>{genre.name}</div><div style={{fontSize:16,fontWeight:900,color:TX}}>{char.name}</div></div>
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{fontSize:10,color:rnk.c,fontWeight:700}}>
            Lv.{lv} {rnk.jp}
            {lv>=maxLv&&rawLv>=maxLv&&<span style={{fontSize:8,color:"#ffd60a",marginLeft:4}}>🔒MAX</span>}
          </div>
          <div style={{display:"flex",gap:8}}>
            <span style={{fontSize:10,color:"#b3ff00",fontWeight:700}}>{fc(char.coins)}</span>
            <span title="💎入手方法：ログイン毎日+1 / 都市初クリア+3 / バトル10%で+1 / 隠しアイテム" style={{fontSize:10,color:"#88eeff",fontWeight:700,cursor:"pointer"}} onClick={()=>pushNotif("💎入手：ログイン+1/都市クリア+3/バトル10%/隠しアイテム","#88eeff")}>💎{char.gems||0}</span>
          </div>
          <div style={{width:90,height:5,background:BG3,borderRadius:3,marginTop:3}}><div style={{height:"100%",width:`${xpP}%`,background:genre.c,borderRadius:3,transition:"width .5s"}}/></div>
          <div style={{display:"flex",justifyContent:"space-between",marginTop:2}}>
            <button onClick={manualSave} style={{fontSize:9,color:saveStatus==="saved"?"#40c060":saveStatus==="saving"?"#ffcc02":saveStatus==="error"?"#ff5555":saveStatus==="local"?"#888":"#6060a0",background:"none",border:"none",cursor:"pointer",padding:0}}>
              {saveStatus==="saving"?"⏳保存中...":saveStatus==="saved"?"☁️保存済み✓":saveStatus==="error"?"❌保存失敗":saveStatus==="local"?"💾ローカルのみ":"☁️セーブ"}
              {saveStatus==="saving"?"⏳ 保存中":saveStatus==="saved"?"✅ 保存済":saveStatus==="error"?"❌ エラー":user?"☁️ セーブ":"💾 セーブ"}
            </button>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <div style={{position:"relative",display:"inline-block"}}>
                <button onClick={()=>setShowInbox(true)} style={{fontSize:14,background:"none",padding:"0 2px",opacity:.9}}>📬</button>
                {unread>0&&<span style={{position:"absolute",top:-4,right:-4,background:"#5050c0",color:"#fff",borderRadius:8,fontSize:9,padding:"1px 4px",fontWeight:700,minWidth:14,textAlign:"center"}}>{unread}</span>}
              </div>
              <button onClick={()=>{const m=Sound.toggle();setMuted(m);}} style={{fontSize:14,background:"none",padding:"0 2px",opacity:.8}}>{muted?"🔇":"🔊"}</button>
              <span style={{fontSize:9,color:TX3,cursor:"pointer"}} onClick={onTitle}>タイトルへ</span>
            </div>
          </div>
        </div>
      </div>
      <EnergyBar char={char}/>
    </div>
    <div style={{padding:"14px 16px 0"}}>
      {tab==="home"&&<HomeTab char={char} genre={genre} log={log} onRest={doRest} onEat={doEat} onTrain={doTrain} onUseHeart={useHeart}/>}
      {tab==="battle"&&<BattleTab char={char} setChar={setChar} genre={genre} pushNotif={notif2} addLog={addLog}/>}
      {tab==="map"&&<MapTab char={char} setChar={setChar} genre={genre} pushNotif={notif2} addLog={addLog}/>}
      {tab==="quiz"&&<QuizTab char={char} setChar={setChar} genre={genre} pushNotif={notif2} addLog={addLog}/>}
      {tab==="zukan"&&<ZukanTab genre={genre}/>}
      {tab==="shop"&&<ShopTab char={char} setChar={setChar} genre={genre} pushNotif={notif2} onTokushou={onTokushou}/>}
      {tab==="status"&&<StatusTab char={char} lv={lv} rnk={rnk} genre={genre} setChar={setChar} user={user} onAuthChange={u=>{onAuthChange&&onAuthChange(u);}} lightMode={lightMode} toggleLight={toggleLight}/>}
    </div>
    <div style={{position:"fixed",bottom:0,left:0,right:0,background:"#0e0e20",borderTop:`2px solid ${BD}`,display:"flex",zIndex:100}}>
      {TABS.map(t=><button key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,padding:"9px 0",display:"flex",flexDirection:"column",alignItems:"center",gap:2,background:tab===t.id?`${genre.c}22`:"none",borderTop:tab===t.id?`3px solid ${genre.c}`:"3px solid transparent",transition:"all .15s"}}><span style={{fontSize:17}}>{t.e}</span><span style={{fontSize:8,color:tab===t.id?genre.c:TX3,fontFamily:"M PLUS Rounded 1c,sans-serif"}}>{t.l}</span></button>)}
    </div>
  </div>);
}

/* ── LOGIN SCREEN ── */
function LoginScreen({onLogin,onGuest,onTokushou}){
  const[mode,setMode]=useState("login"); // login | register
  const[email,setEmail]=useState("");
  const[pass,setPass]=useState("");
  const[loading,setLoading]=useState(false);
  const[err,setErr]=useState("");
  const[msg,setMsg]=useState("");

  async function submit(){
    if(!email||!pass){setErr("メールとパスワードを入力してください");return;}
    setLoading(true);setErr("");setMsg("");
    try{
      if(mode==="login"){
        const user=await signIn(email,pass);
        const char=await loadCharFromCloud(user);
        onLogin(user,char); // この後コンポーネントがアンマウントされる可能性あり
        return; // setLoadingを呼ばない！
      }else{
        await signUp(email,pass);
        setMsg("登録完了！同じメールとパスワードでログインしてください。");
        setMode("login");
      }
    }catch(e){
      const msg=e.message||"";
      if(msg.includes("Invalid login credentials"))setErr("メールかパスワードが違います");
      else if(msg.includes("Email not confirmed"))setErr("メールの確認が完了していません");
      else if(msg.includes("User already registered"))setErr("このメールはすでに登録済みです");
      else if(msg.includes("Password should be"))setErr("パスワードは6文字以上必要です");
      else setErr(`エラー: ${msg}`);
    }
    setLoading(false);
  }

  return(
    <div style={{minHeight:"100vh",background:BG,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24,fontFamily:"M PLUS Rounded 1c,sans-serif"}}>
      <div style={{fontSize:52,marginBottom:16}}>🎤</div>
      <div style={{fontFamily:"'Press Start 2P',monospace",fontSize:11,color:"#ff4da6",letterSpacing:3,marginBottom:24}}>DANCING QUEST</div>

      <div style={{width:"100%",maxWidth:340,background:BG2,borderRadius:12,padding:24,border:`1px solid ${BD}`}}>
        <div style={{display:"flex",marginBottom:20,background:BG3,borderRadius:8,padding:3,gap:2}}>
          {[["login","ログイン"],["register","新規登録"]].map(([m,l])=>(
            <button key={m} onClick={()=>{setMode(m);setErr("");setMsg("");}} style={{flex:1,padding:"8px",fontSize:11,fontWeight:700,background:mode===m?"#ff4da6":"none",color:mode===m?"#fff":TX3,borderRadius:6,border:"none",cursor:"pointer"}}>{l}</button>
          ))}
        </div>

        <div style={{marginBottom:12}}>
          <div style={{fontSize:10,color:TX3,marginBottom:4}}>メールアドレス</div>
          <input value={email} onChange={e=>setEmail(e.target.value)} type="email" placeholder="email@example.com" style={{width:"100%",padding:"11px",borderRadius:6,background:BG3,border:`1px solid ${BD}`,color:TX,fontSize:13,outline:"none"}}/>
        </div>
        <div style={{marginBottom:16}}>
          <div style={{fontSize:10,color:TX3,marginBottom:4}}>パスワード（6文字以上）</div>
          <input value={pass} onChange={e=>setPass(e.target.value)} type="password" placeholder="••••••" style={{width:"100%",padding:"11px",borderRadius:6,background:BG3,border:`1px solid ${BD}`,color:TX,fontSize:13,outline:"none"}}/>
        </div>

        {err&&<div style={{fontSize:11,color:"#ff5555",marginBottom:12,padding:"8px",background:"#200a0a",borderRadius:6}}>{err}</div>}
        {msg&&<div style={{fontSize:11,color:"#60c080",marginBottom:12,padding:"8px",background:"#0a2010",borderRadius:6}}>{msg}</div>}

        <Btn onClick={submit} disabled={loading} col="#ff4da6" tc="#fff" full sx={{fontSize:13,padding:"12px",fontWeight:700}}>
          {loading?"処理中...":mode==="login"?"ログイン →":"アカウント作成 →"}
        </Btn>

        <div style={{textAlign:"center",marginTop:16,display:"flex",flexDirection:"column",gap:8,alignItems:"center"}}>
          <button onClick={onGuest} style={{fontSize:11,color:TX3,background:"none",border:"none",cursor:"pointer",textDecoration:"underline"}}>
            ゲストとして遊ぶ（セーブはこの端末のみ）
          </button>
          <button onClick={onTokushou} style={{fontSize:10,color:TX3,opacity:.6,background:"none",border:"none",cursor:"pointer",textDecoration:"underline"}}>
            特定商取引法に基づく表記
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── TITLE ── */
function Title({onStart,savedChar,onContinue,onDelete}){
  return(<div style={{minHeight:"100vh",background:BG,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24,textAlign:"center",fontFamily:"M PLUS Rounded 1c,sans-serif"}}>
    <div style={{fontSize:64,animation:"fl 3s ease-in-out infinite",marginBottom:16}}>🎤</div>
    <div style={{fontFamily:"'Press Start 2P',monospace",fontSize:11,color:"#ff4da6",letterSpacing:4,lineHeight:2.2,marginBottom:6}}>DANCING<br/><span style={{color:"#00e5ff"}}>QUEST</span></div>
    <div style={{color:TX3,fontSize:11,marginBottom:4}}>全国制覇 RPG v5.0</div>
    <div style={{color:"#202040",fontSize:9,marginBottom:36}}>日本 → WORLD → 🚀 SPACE</div>
    {savedChar&&(<div style={{width:"100%",maxWidth:300,marginBottom:16}}>
      <div style={{background:BG2,border:`2px solid ${GENRES[savedChar.genre]?.c||"#888"}55`,borderRadius:10,padding:"14px 16px",marginBottom:10}}>
        <div style={{fontSize:9,color:TX3,fontFamily:"'Press Start 2P',monospace",marginBottom:8}}>SAVE DATA</div>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
          <span style={{fontSize:24}}>{GENRES[savedChar.genre]?.e}</span>
          <div style={{textAlign:"left"}}><div style={{fontSize:14,fontWeight:700,color:TX}}>{savedChar.name}</div><div style={{fontSize:10,color:TX3}}>{GENRES[savedChar.genre]?.jp} · Lv.{getLv(savedChar.exp)} · {fc(savedChar.coins)}</div></div>
        </div>
        <button onClick={onContinue} style={{width:"100%",padding:"12px",borderRadius:8,fontSize:13,fontFamily:"M PLUS Rounded 1c,sans-serif",fontWeight:700,background:GENRES[savedChar.genre]?.c||"#888",color:"#000",border:"none",cursor:"pointer",marginBottom:8}}>▶ 続きから</button>
        <button onClick={onDelete} style={{width:"100%",padding:"7px",borderRadius:6,fontSize:10,fontFamily:"M PLUS Rounded 1c,sans-serif",background:"none",color:TX3,border:`1px solid ${BD}`,cursor:"pointer"}}>🗑 データを消して最初から</button>
      </div>
    </div>)}
    {!savedChar&&<button onClick={onStart} style={{padding:"14px 52px",borderRadius:8,fontSize:14,fontFamily:"M PLUS Rounded 1c,sans-serif",fontWeight:700,background:"#ff4da6",color:"#fff",border:"2px solid #ff4da6",cursor:"pointer",letterSpacing:1,marginBottom:12}}>▶ スタート</button>}
    {savedChar&&<button onClick={onStart} style={{padding:"10px 32px",borderRadius:8,fontSize:12,fontFamily:"M PLUS Rounded 1c,sans-serif",fontWeight:700,background:"none",color:TX3,border:`1px solid ${BD}`,cursor:"pointer"}}>＋ 新しく始める</button>}
    <div style={{marginTop:36,color:"#1a1a30",fontSize:9,lineHeight:2.5}}><div>BALLET · HOUSE · POPPING · LOCK</div><div>BREAKING · WAACKING · JAZZ · CONTEMPORARY</div><div style={{color:"#101025",marginTop:4}}>日本→WORLD 13カ国→🚀 宇宙まで！</div></div>
  </div>);
}

/* ── CREATE ── */
function Create({onStart}){
  const[step,setStep]=useState(0);const[name,setName]=useState("");const[genre,setGenre]=useState(null);const[ht,setHt]=useState(null);
  const gc=genre?GENRES[genre].c:"#ff4da6";
  return(<div style={{minHeight:"100vh",background:BG,fontFamily:"M PLUS Rounded 1c,sans-serif",padding:"24px 16px"}}>
    <div style={{display:"flex",gap:4,marginBottom:22}}>{["名前","ジャンル","出身地"].map((s,i)=><div key={i} style={{flex:1,textAlign:"center"}}><div style={{height:3,borderRadius:2,background:i<=step?gc:"#1e1e3a",marginBottom:4}}/><div style={{fontSize:9,color:i===step?gc:i<step?TX2:TX3}}>{s}</div></div>)}</div>
    {step===0&&(<div style={{animation:"su .3s ease"}}>
      <div style={{fontFamily:"'Press Start 2P',monospace",fontSize:8,color:"#ff4da6",marginBottom:20}}>STEP 1: ダンサー名</div>
      <input value={name} onChange={e=>setName(e.target.value)} maxLength={12} placeholder="名前を入力..." style={{width:"100%",padding:"14px",borderRadius:6,background:BG3,border:`1px solid ${BD}`,color:TX,fontSize:16,outline:"none",marginBottom:24}}/>
      <Btn disabled={!name.trim()} col="#ff4da6" tc="#fff" onClick={()=>setStep(1)} full sx={{fontSize:13,padding:"13px"}}>次へ →</Btn>
    </div>)}
    {step===1&&(<div style={{animation:"su .3s ease"}}>
      <div style={{fontFamily:"'Press Start 2P',monospace",fontSize:8,color:"#ff4da6",marginBottom:16}}>STEP 2: ジャンル</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:20}}>{Object.entries(GENRES).map(([key,g])=>{const sel=genre===key;return(<button key={key} onClick={()=>setGenre(key)} style={{padding:"12px 10px",borderRadius:8,textAlign:"left",background:sel?`${g.c}28`:BG2,border:`2px solid ${sel?g.c:BD}`,cursor:"pointer",transition:"all .15s",animation:sel?"pi .2s ease":"none"}}><div style={{fontSize:24,marginBottom:4}}>{g.e}</div><div style={{color:sel?g.c:TX,fontSize:11,fontWeight:700}}>{g.jp}</div><div style={{color:TX3,fontSize:9,marginTop:2}}>{g.name}</div></button>);})}</div>
      {genre&&<div style={{padding:"10px 14px",background:`${GENRES[genre].c}18`,border:`1px solid ${GENRES[genre].c}55`,borderRadius:6,marginBottom:16,fontSize:10,color:TX2,lineHeight:1.8}}>{Object.entries(BASE[genre]).map(([k,v])=><span key={k} style={{color:SM[k].c,marginRight:10}}>{SM[k].jp}:{v}</span>)}</div>}
      <div style={{display:"flex",gap:8}}><Btn col={BG3} tc={TX2} onClick={()=>setStep(0)} sx={{flex:1,fontSize:11}}>← 戻る</Btn><Btn disabled={!genre} col={genre?gc:"#333"} tc={genre?"#000":TX3} onClick={()=>setStep(2)} sx={{flex:2,fontSize:12}}>次へ →</Btn></div>
    </div>)}
    {step===2&&(<div style={{animation:"su .3s ease"}}>
      <div style={{fontFamily:"'Press Start 2P',monospace",fontSize:8,color:"#ff4da6",marginBottom:8}}>STEP 3: 出身地</div>
      <div style={{fontSize:10,color:TX3,marginBottom:16}}>出身地からMAPをスタート！地元ジャンルのボーナスあり。</div>
      <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:20}}>{HT.map(h=>{const sel=ht===h.id;const bg=h.bonus?GENRES[h.bonus]:null;return(<button key={h.id} onClick={()=>setHt(h.id)} style={{padding:"11px 14px",borderRadius:8,textAlign:"left",background:sel?`${gc}22`:BG2,border:`2px solid ${sel?gc:BD}`,cursor:"pointer",transition:"all .15s",display:"flex",alignItems:"center",gap:12}}><span style={{fontSize:26,flexShrink:0}}>{h.e}</span><div style={{flex:1}}><div style={{fontWeight:700,fontSize:13,color:sel?gc:TX}}>{h.label}</div><div style={{fontSize:10,color:TX3,marginTop:1}}>{h.region} · {h.desc}</div>{bg&&<div style={{fontSize:9,color:bg.c,marginTop:2}}>{bg.jp}ボーナス↑</div>}</div></button>);})}</div>
      <div style={{display:"flex",gap:8}}><Btn col={BG3} tc={TX2} onClick={()=>setStep(1)} sx={{flex:1,fontSize:11}}>← 戻る</Btn><Btn disabled={!ht} col={gc} tc="#000" onClick={()=>onStart(name,genre,ht)} sx={{flex:2,fontSize:12,padding:"13px",fontWeight:700}}>{name}の旅を始める！</Btn></div>
    </div>)}
  </div>);
}

/* ── ROOT ── */
function TokushouhouPage({onClose}){
  return(<div style={{minHeight:"100vh",background:BG,fontFamily:"M PLUS Rounded 1c,sans-serif",paddingBottom:60}}>
    <div style={{display:"flex",alignItems:"center",gap:12,padding:"14px 16px",background:BG2,borderBottom:`1px solid ${BD}`,position:"sticky",top:0,zIndex:10}}>
      <button onClick={onClose} style={{background:"none",border:`1px solid ${BD}`,color:TX3,borderRadius:6,padding:"5px 10px",cursor:"pointer",fontSize:12}}>← 戻る</button>
      <span style={{fontWeight:700,color:TX,fontSize:14}}>特定商取引法に基づく表記</span>
    </div>
    <div style={{padding:"24px 20px",maxWidth:600,margin:"0 auto"}}>
      {[
        ["販売事業者","佐藤 真二"],
        ["運営責任者","佐藤 真二"],
        ["メールアドレス","s.three_a_dancer@me.com"],
        ["販売価格","各商品ページに記載"],
        ["商品代金以外の必要料金","インターネット接続料金等はお客様負担となります。"],
        ["支払方法","クレジットカード、Apple Pay、Google Pay 等"],
        ["支払時期","購入時に即時決済"],
        ["商品の引渡時期","決済完了後、直ちに利用可能"],
        ["返品・キャンセル","デジタル商品の性質上、購入後の返品・返金には対応しておりません。"],
      ].map(([label,value])=>(
        <div key={label} style={{borderBottom:`1px solid ${BD}`,padding:"16px 0",display:"flex",flexDirection:"column",gap:6}}>
          <div style={{fontSize:11,color:TX3,fontWeight:700}}>{label}</div>
          <div style={{fontSize:13,color:TX,lineHeight:1.7}}>{value}</div>
        </div>
      ))}
      <div style={{marginTop:24,fontSize:11,color:TX3,lineHeight:1.8}}>
        ※ 本サービス「DANCING QUEST」はデジタルコンテンツ（ゲーム内通貨）を販売します。<br/>
        ※ お問い合わせはメールにてご連絡ください。
      </div>
    </div>
  </div>);
}

export default function DancingQuest(){
  const[screen,setScreen]=useState("login");
  const[tokushou,setTokushou]=useState(false);
  const[lightMode,setLightMode]=useState(()=>{
    try{return localStorage.getItem("dl_light")==="1";}catch{return false;}
  });
  function toggleLight(){
    setLightMode(m=>{
      const next=!m;
      try{localStorage.setItem("dl_light",next?"1":"0");}catch{}
      return next;
    });
  }
  const[user,setUser]=useState(null);

  const[char,setCharRaw]=useState(()=>{
    try{const s=localStorage.getItem("dancer_save");return s?migrateChar(JSON.parse(s)):null;}catch{return null;}
  });
  const[saveStatus,setSaveStatus]=useState(""); // "" | "saving" | "saved" | "error"

  // setChar: ローカル保存（クラウドはuseEffectで行う）
  function setChar(fn){
    setCharRaw(prev=>{
      const next=typeof fn==="function"?fn(prev):fn;
      if(next)localStorage.setItem("dancer_save",JSON.stringify(next));
      return next;
    });
  }

  // クラウド自動保存（charが変わるたびに）
  useEffect(()=>{
    if(!char||!user)return;
    const timer=setTimeout(()=>{
      setSaveStatus("saving");
      saveCharToCloud(user,char)
        .then(()=>setSaveStatus("saved"))
        .catch(()=>setSaveStatus("error"));
    },2000); // 2秒後に保存（連続変更をまとめる）
    return()=>clearTimeout(timer);
  },[char,user]);

  // 手動セーブ
  async function manualSave(){
    if(!char)return;
    localStorage.setItem("dancer_save",JSON.stringify(char));
    if(user){
      setSaveStatus("saving");
      try{
        const ok=await saveCharToCloud(user,char);
        setSaveStatus(ok?"saved":"error");
        if(!ok)console.error("manualSave: cloud save returned false");
      }catch(e){
        setSaveStatus("error");
        console.error("manualSave error:",e);
      }
    }else{
      // ゲスト：ローカルのみ
      setSaveStatus("local");
    }
    setTimeout(()=>setSaveStatus(""),4000);
  }

  // 💎 Stripe支払い完了後の処理（URLパラメータ）
  useEffect(()=>{
    const params=new URLSearchParams(window.location.search);
    const payment=params.get("payment");
    const gems=parseInt(params.get("gems")||"0");
    if(payment==="success"&&gems>0){
      // URLパラメータをクリア
      window.history.replaceState({},"",window.location.pathname);
      // ジェムを付与（少し遅延させてゲーム画面に入ってから）
      setTimeout(()=>{
        setChar(c=>{
          if(!c)return c;
          const updated={...c,gems:(c.gems||0)+gems};
          localStorage.setItem("dancer_save",JSON.stringify(updated));
          return updated;
        });
        // 成功通知は別途ゲーム画面で表示
        localStorage.setItem("pending_gem_notify",String(gems));
      },1500);
    }else if(payment==="cancel"){
      window.history.replaceState({},"",window.location.pathname);
    }
  },[]);

  // 起動時にログイン状態確認
  useEffect(()=>{
    const fallback=()=>setScreen(char?"title":"login");
    getUser().then(u=>{
      if(u){
        setUser(u);
        loadCharFromCloud(u)
          .then(cloudChar=>{
            if(cloudChar){
              const merged=migrateChar(cloudChar);
              setCharRaw(merged);
              localStorage.setItem("dancer_save",JSON.stringify(merged));
              setScreen("game");
            }else if(char){
              setScreen("game");
            }else{
              setScreen("title");
            }
          })
          .catch(()=>{setScreen(char?"game":"title");});
      }else{
        fallback();
      }
    }).catch(()=>fallback());
  },[]);

  // ログインボーナス
  useEffect(()=>{
    if(!char)return;
    const today=new Date().toDateString();
    if(char.lastLoginDate===today)return;
    setChar(c=>({...c,gems:(c.gems||0)+1,lastLoginDate:today}));
  },[char?.name]);

  async function handleLogin(u,cloudChar){
    setUser(u);

    // 1. クラウドにデータあり
    if(cloudChar){
      const merged=migrateChar(cloudChar);
      setCharRaw(merged);
      localStorage.setItem("dancer_save",JSON.stringify(merged));
      setScreen("game");
      return;
    }

    // 2. ローカルをチェック
    try{
      const localRaw=localStorage.getItem("dancer_save");
      const localChar=localRaw?migrateChar(JSON.parse(localRaw)):null;
      if(localChar){
        setCharRaw(localChar);  // awaitの前にcharをセット！
        setScreen("game");
        saveCharToCloud(u,localChar).catch(e=>console.error("cloud save:",e)); // fire & forget
        return;
      }
    }catch(e){console.error("local save read error:",e);}

    // 3. データなし → タイトルへ
    setScreen("title");
  }

  function handleGuest(){
    setScreen(char?"title":"create");
  }

  function start(name,genre,hometown){
    const h=HT.find(x=>x.id===hometown);
    const stats={...BASE[genre]};
    if(h?.bonus){const bg=BASE[h.bonus];Object.entries(bg).forEach(([k,v])=>{stats[k]=(stats[k]||0)+Math.round(v*.3);});}
    const newChar={name,genre,hometown,currentCity:hometown,clearedCities:{[hometown]:true},
      exp:0,coins:500,gems:5,fame:0,
      energy:50,maxEnergy:50,lastEnergyTime:Date.now(),
      hearts:6,maxHearts:6,lastHeartTime:Date.now(),
      mood:80,hunger:70,stats,inventory:[],equipped:{accessories:[]},
      titles:[],battlesWon:0,showsDone:0,lastLoginDate:new Date().toDateString()};
    setChar(newChar);setScreen("game");
  }

  async function handleLogout(){
    await signOut();
    setUser(null);
    setScreen("login");
  }

  function deleteSave(){
    if(!window.confirm("セーブデータを削除しますか？"))return;
    localStorage.removeItem("dancer_save");
    setCharRaw(null);
    setScreen("title");
  }

  if(tokushou)return<TokushouhouPage onClose={()=>setTokushou(false)}/>;
  if(screen==="login")return <LoginScreen onLogin={handleLogin} onGuest={handleGuest} onTokushou={()=>setTokushou(true)}/>;
  return(<div style={{background:BG,minHeight:"100vh",width:"100%",maxWidth:"100%",overflowX:"hidden",filter:lightMode?"invert(0.92) hue-rotate(180deg) saturate(0.85)":"none",transition:"filter .3s"}}>
    {screen==="title"&&<Title onStart={()=>setScreen("create")} savedChar={char} onContinue={()=>setScreen("game")} onDelete={deleteSave}/>}
    {screen==="create"&&<Create onStart={start}/>}
    {screen==="game"&&char&&<Game char={char} setChar={setChar} onTitle={()=>setScreen("title")} user={user} onLogout={handleLogout} onAuthChange={u=>{setUser(u);if(u)saveCharToCloud(u,char).catch(()=>{});}} manualSave={manualSave} saveStatus={saveStatus} lightMode={lightMode} toggleLight={toggleLight} onTokushou={()=>setTokushou(true)}/>}
  </div>);
}

/* ── セーブデータ移行 ── */
function migrateChar(raw){
  if(!raw)return null;
  const defaults={
    gems:5, coins:500, fame:0,
    energy:50, maxEnergy:50, lastEnergyTime:Date.now(),
    hearts:6, maxHearts:6, lastHeartTime:Date.now(),
    mood:80, hunger:70,
    inventory:[], equipped:{accessories:[]},
    titles:[], battlesWon:0, showsDone:0,
    clearedCities:{}, lastLoginDate:"",
    genre2: null,
    genre3: null,
    artifacts:[],
    bossDefeats:{},
    specialItems:[],
    showLog:{},
    foundItems:[],
    ufoFoundParts:[],
    clearedPlanets:[],
  };
  return{
    ...defaults,
    ...raw,
    equipped:{accessories:[],...(raw.equipped||{})},
    titles:raw.titles||[],
    inventory:raw.inventory||[],
    clearedCities:raw.clearedCities||{},
    gems:raw.gems??5,
    hearts:raw.hearts??6,
    maxHearts:raw.maxHearts??6,
    lastHeartTime:raw.lastHeartTime??Date.now(),
    energy:raw.energy??50,
    maxEnergy:raw.maxEnergy??50,
    lastEnergyTime:raw.lastEnergyTime??Date.now(),
  };
}


