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
  {id:"q10",name:"宇宙人ダンサー",  style:"breaking", e:"👽",lv:70, pw:25000, rw:{exp:12000,coins:80000,title:"GALAXY DANCER"}, requireItems:["michael_glove","michael_loafer","michael_hat"]},
];

/* ── SHOWS ── */
const SHOWS=[
  {id:"s1",name:"地区センター発表会",venue:"地元",e:"🏫",lv:1, ec:15,rw:{exp:80,coins:300,fame:15},desc:"まずは地元で名を上げろ！"},
  {id:"s2",name:"渋谷ストリートイベント",venue:"東京",e:"🗼",lv:5, ec:15,rw:{exp:180,coins:800,fame:60},desc:"東京のストリートで輝け"},
  {id:"s3",name:"全国ダンスコンペティション",venue:"全国",e:"🏆",lv:12,ec:20,rw:{exp:450,coins:2500,fame:250},desc:"全国の猛者と競え！優勝賞金あり"},
  {id:"s4",name:"アジアダンスフェスティバル",venue:"アジア",e:"🌏",lv:25,ec:20,rw:{exp:900,coins:8000,fame:700},desc:"アジアの頂点を目指せ"},
  {id:"s5",name:"ワールドダンスショー",venue:"全世界",e:"🌍",lv:42,ec:25,rw:{exp:2200,coins:30000,fame:2500},desc:"全世界が注目する最高峰の舞台"},
  {id:"s6",name:"宇宙ステーション公演",venue:"宇宙",e:"🚀",lv:62,ec:30,rw:{exp:8000,coins:100000,fame:10000},desc:"人類初の宇宙ダンスショー！"},
];

/* ── JAPAN MAP ── */
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
function getLv(xp){let lv=1;while(xpL(lv+1)<=xp)lv++;return Math.min(lv,99);}
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
  const useGenre2=char.genre2&&cb2.bonus>cb1.bonus;
  const usedGenre=useGenre2?char.genre2:char.genre;
  const compat=useGenre2?cb2:cb1;
  myP=Math.floor(myP*compat.bonus);

  myP+=Math.floor(Math.random()*50);
  const thP=oppPow+Math.floor(Math.random()*40);
  const won=myP>=thP;
  const pComments=BC[usedGenre]||BC.jazz;
  const oComments=OBC[oppStyle]||OBC.house;

  // 2ジャンルの場合はサブジャンルの台詞も混ぜる
  const p2Comments=char.genre2&&useGenre2?BC[char.genre2]:null;
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
  return{moves,flags,won,myP,thP,playerGenre:usedGenre,usedGenre,compat,useGenre2};
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

/* ── 都市ミニマップ（ご飯屋・クラブ・溜まり場） ── */
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
    const eg=won?city.rw.exp:Math.floor(city.rw.exp*.2);
    const coins=won?city.rw.coins:0;
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
    const{won,flags}=btl;const eg=won?enc.rw.exp:Math.floor(enc.rw.exp*.2);const coins=won?enc.rw.coins:0;
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
  const cleared=char.clearedCities||{};
  const wldOk=!!cleared["tokyo"]||!!W[char.hometown];
  const spaceOk=!!cleared["wf"];

  if(walkJapan)return<JapanWalkMode char={char} setChar={setChar} genre={genre} onExit={()=>setWalkJapan(false)} pushNotif={pushNotif} addLog={addLog}/>;


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
    const eg=won?city.rw.exp:Math.floor(city.rw.exp*.2),coins=won?city.rw.coins:Math.floor(city.rw.coins*.05);
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
    {/* WALK JAPAN ボタン */}
    <Btn onClick={()=>setWalkJapan(true)} col={`${genre.c}22`} tc={genre.c} full sx={{fontSize:12,border:`1px solid ${genre.c}66`,fontWeight:700,marginBottom:10,padding:"12px"}}>🚶 WALK JAPAN（鹿児島から札幌まで歩く）</Btn>
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
        const names={"michael_glove":"🧤手袋","michael_loafer":"👞ローファー","michael_hat":"🎩ハット"};
        pushNotif(`必要：${missing.map(id=>names[id]||id).join("・")}（ショップ→👑伝説）`,"#ffd60a");
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
    const eg=won?opp.rw.exp:Math.floor(opp.rw.exp*.25),coins=won?opp.rw.coins:Math.floor(opp.rw.coins*.1);
    const nt=won&&opp.rw.title&&!char.titles?.includes(opp.rw.title)?opp.rw.title:null;
    setChar(c=>({...c,exp:c.exp+eg,coins:c.coins+coins,energy:Math.max(0,c.energy-7),mood:won?Math.min(100,c.mood+18):Math.max(0,c.mood-12),battlesWon:won?c.battlesWon+1:c.battlesWon,titles:nt?[...(c.titles||[]),nt]:c.titles||[]}));
    setBattle({phase:"result",won,eg,coins,title:nt,flags,myP:btl.myP,thP:btl.thP});
    if(won)Sound.fanfare();else Sound.lose();
    addLog(`${won?"🏆 勝利":"💀 敗北"} vs ${opp.name} +${eg}EXP ${fc(coins)}`);
  }

  async function doShow(show){
    if(lv<show.lv){pushNotif(`Lv.${show.lv}が必要！`,"#ff5555");return;}
    if(char.energy<show.ec){pushNotif(`エネルギー不足！⚡${show.ec}必要`,"#ff5555");return;}
    setShowAI({text:"",loading:true});
    const eg=show.rw.exp+Math.floor(show.rw.exp*Math.random()*.35);
    const coins=show.rw.coins+Math.floor(show.rw.coins*Math.random()*.4);
    setShowAI({text:`${char.name}のパフォーマンスに会場が震えた！観客総立ちのスタンディングオベーション！最高の夜だった✨`,loading:false});
    setChar(c=>({...c,exp:c.exp+eg,coins:c.coins+coins,fame:c.fame+show.rw.fame,energy:Math.max(0,c.energy-show.ec),mood:Math.min(100,c.mood+30),showsDone:c.showsDone+1}));
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
        {genre.e}{genre.jp} ＋ {GENRES[char.genre2]?.e}{GENRES[char.genre2]?.jp} → 相性有利な方を自動選択！
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
  const moves=[...(MOVES[char.genre]||[]),...CMOVES];
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
    <div style={{fontFamily:"'Press Start 2P',monospace",fontSize:7,color:TX3,marginBottom:10,marginTop:14}}>TRAINING ⚡{char.energy}</div>
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
    const MAX=char.maxEnergy||50;
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
      {[["costumes","衣装"],["sneakers","靴"],["accessories","アクセ"],["drinks","ドリンク"],["workshops","WS"],["legend","👑伝説"]].map(([id,label])=>(
        <button key={id} onClick={()=>setSub(id)} style={{flex:1,minWidth:55,padding:"7px 2px",fontSize:9,fontFamily:"M PLUS Rounded 1c,sans-serif",fontWeight:700,background:sub===id?genre.c+"33":"none",color:sub===id?genre.c:TX3,borderRadius:6,border:sub===id?`1px solid ${genre.c}66`:"1px solid transparent",transition:"all .15s"}}>{label}</button>
      ))}
    </div>
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
  const[showAuth,setShowAuth]=useState(false);
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
          <div style={{fontSize:9,color:TX3,marginBottom:2}}>サブ</div>
          <span style={{fontSize:20}}>{GENRES[char.genre2]?.e}</span>
          <div style={{fontSize:9,color:GENRES[char.genre2]?.c,fontWeight:700}}>{GENRES[char.genre2]?.jp}</div>
        </div>}
      </div>
      <div style={{fontSize:10,color:TX2,marginBottom:10,fontFamily:"M PLUS Rounded 1c,sans-serif"}}>
        選択したジャンルがメインに。旧メインはサブへ移動（最大2ジャンル）。相性有利でバトル+20%！
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
        {Object.entries(GENRES).filter(([k])=>k!==char.genre&&k!==char.genre2).map(([key,g])=>{
          const cb=compatBonus(key,char.genre);
          return(<button key={key} onClick={()=>{
            if(char.coins<5000){alert("コインが足りない！¥5,000必要");return;}
            if(!window.confirm(`${g.jp}をメインに変更？¥5,000消費。旧メインはサブへ。`))return;
            const ns={};
            Object.entries(char.stats).forEach(([k,v])=>{ns[k]=Math.floor(v/2);});
            Object.entries(BASE[key]).forEach(([k,v])=>{ns[k]=(ns[k]||0)+v;});
            setChar(c=>({...c,genre:key,genre2:c.genre,coins:c.coins-5000,stats:ns}));
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

/* ── GAME SCREEN ── */
function Game({char,setChar,onTitle,user,onLogout,onAuthChange,manualSave,saveStatus,lightMode,toggleLight,onTokushou}){
  const[tab,setTab]=useState("home");
  const[notif,setNotif]=useState(null);
  const[log,setLog]=useState([]);
  const[muted,setMuted]=useState(false);
  const[unread,setUnread]=useState(0);
  const[showInbox,setShowInbox]=useState(false);
  const genre=GENRES[char.genre];const lv=getLv(char.exp);const rnk=rnkOf(lv);
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
  useEffect(()=>{
    const REGEN_MS=5*60*1000;
    const check=()=>setChar(c=>{
      if(!c)return c;const MAX=c.maxEnergy||50;if(c.energy>=MAX)return c;
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

  const TABS=[{id:"home",l:"ホーム",e:"🏠"},{id:"battle",l:"バトル",e:"⚔️"},{id:"map",l:"MAP",e:"🗺"},{id:"shop",l:"ショップ",e:"🛍"},{id:"status",l:"ステータス",e:"📊"}];
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
          <div style={{fontSize:10,color:rnk.c,fontWeight:700}}>Lv.{lv} {rnk.jp}</div>
          <div style={{display:"flex",gap:8}}>
            <span style={{fontSize:10,color:"#b3ff00",fontWeight:700}}>{fc(char.coins)}</span>
            <span style={{fontSize:10,color:"#88eeff",fontWeight:700}}>💎{char.gems||0}</span>
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
    artifacts:[],
    bossDefeats:{},
    specialItems:[],
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


