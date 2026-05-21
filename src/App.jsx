import { useState, useEffect } from "react";

/* ── FONTS + CSS ── */
(function(){
  if(document.getElementById("dl-v4"))return;
  const l=document.createElement("link");l.rel="stylesheet";
  l.href="https://fonts.googleapis.com/css2?family=Press+Start+2P&family=M+PLUS+Rounded+1c:wght@400;700;900&display=swap";
  document.head.appendChild(l);
  const s=document.createElement("style");s.id="dl-v4";
  s.textContent=`
    @keyframes fl{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
    @keyframes pi{0%{transform:scale(.4);opacity:0}70%{transform:scale(1.1)}100%{transform:scale(1);opacity:1}}
    @keyframes su{from{transform:translateY(22px);opacity:0}to{transform:translateY(0);opacity:1}}
    @keyframes pu{0%,100%{opacity:.9}50%{opacity:.15}}
    @keyframes bt{0%,100%{transform:translateX(0)}25%{transform:translateX(-20px) rotate(-7deg)}75%{transform:translateX(20px) rotate(7deg)}}
    @keyframes vi{0%{transform:scale(1)}33%{transform:scale(1.4) rotate(-8deg)}66%{transform:scale(1.4) rotate(8deg)}100%{transform:scale(1)}}
    @keyframes sh{0%,100%{transform:translateX(0)}25%,75%{transform:translateX(-6px)}50%{transform:translateX(6px)}}
    *{box-sizing:border-box;margin:0;padding:0}
    ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:#2a2a50;border-radius:2px}
    button{cursor:pointer;border:none;background:none;font-family:inherit}input{font-family:inherit}
  `;
  document.head.appendChild(s);
})();

/* ── COLORS ── */
const BG="#0c0c18",BG2="#161630",BG3="#1e1e3a",BD="#323258";
const TX="#e8e8f8",TX2="#9090c0",TX3="#5a5a8a";

/* ── GENRES ── */
const GENRES={
  ballet:      {name:"Ballet",      jp:"バレエ",          e:"🩰",c:"#ff9ec4"},
  contemporary:{name:"Contemporary",jp:"コンテンポラリー",e:"🌊",c:"#c77dff"},
  house:       {name:"House",       jp:"ハウス",          e:"🕺",c:"#00e5ff"},
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
  lock:{technique:2,rhythm:3,style:2,stamina:2,charisma:6},
  popping:{technique:6,rhythm:2,style:4,stamina:2,charisma:1},
  breaking:{technique:3,rhythm:2,style:2,stamina:6,charisma:2},
  waacking:{technique:2,rhythm:3,style:3,stamina:2,charisma:5},
  jazz:{technique:2,rhythm:4,style:3,stamina:2,charisma:4},
};
const MOVES={
  ballet:[{id:"pl",name:"プリエ",cost:8,g:{technique:2,stamina:1},exp:14},{id:"ar",name:"アラベスク",cost:14,g:{technique:3,style:2},exp:28},{id:"pi",name:"ピルエット",cost:18,g:{technique:2,rhythm:2},exp:36},{id:"gj",name:"グランジュテ",cost:24,g:{stamina:2,charisma:2,style:2},exp:52}],
  contemporary:[{id:"fl",name:"フロアワーク",cost:9,g:{style:2,technique:1},exp:15},{id:"im",name:"インプロ",cost:11,g:{style:3,charisma:1},exp:23},{id:"re",name:"リリース",cost:18,g:{stamina:2,style:2,technique:1},exp:38},{id:"co",name:"コンタクト",cost:22,g:{charisma:3,style:2},exp:50}],
  house:[{id:"pa",name:"パドルステップ",cost:8,g:{rhythm:2,stamina:1},exp:14},{id:"ja",name:"ジャック",cost:11,g:{rhythm:3,stamina:1},exp:21},{id:"fw",name:"フットワーク",cost:18,g:{rhythm:2,technique:2,stamina:1},exp:38},{id:"lo",name:"ロフティング",cost:22,g:{charisma:2,style:2,rhythm:1},exp:46}],
  lock:[{id:"lk",name:"ロック",cost:8,g:{charisma:2,rhythm:1},exp:14},{id:"pt",name:"ポイント",cost:9,g:{charisma:2,style:1},exp:17},{id:"sc",name:"スクービードゥー",cost:18,g:{charisma:3,rhythm:2},exp:38},{id:"wr",name:"リストトワール",cost:13,g:{style:2,technique:2},exp:28}],
  popping:[{id:"fx",name:"フレックス",cost:8,g:{technique:2,style:1},exp:14},{id:"wv",name:"ウェーブ",cost:13,g:{technique:2,style:2},exp:28},{id:"tt",name:"タット",cost:18,g:{technique:3,style:2},exp:40},{id:"gl",name:"グライド",cost:16,g:{style:3,charisma:1,technique:1},exp:34}],
  breaking:[{id:"tr",name:"トップロック",cost:8,g:{stamina:2,charisma:1},exp:14},{id:"ss",name:"6ステップ",cost:13,g:{stamina:2,technique:2},exp:28},{id:"fr",name:"フリーズ",cost:22,g:{technique:3,stamina:2},exp:48},{id:"wm",name:"ウィンドミル",cost:28,g:{stamina:3,technique:2,charisma:1},exp:58}],
  waacking:[{id:"sw",name:"アームスウィング",cost:8,g:{charisma:2,style:1},exp:14},{id:"po",name:"ポーズ",cost:9,g:{charisma:2,style:2},exp:19},{id:"wh",name:"ワック",cost:18,g:{charisma:3,rhythm:2},exp:38},{id:"cw",name:"キャットウォーク",cost:13,g:{style:3,charisma:1},exp:28}],
  jazz:[{id:"js",name:"ジャズスクエア",cost:8,g:{rhythm:2,style:1},exp:14},{id:"jr",name:"ジャズラン",cost:18,g:{rhythm:2,charisma:2,stamina:1},exp:38},{id:"sl",name:"スプリットリープ",cost:22,g:{stamina:2,style:2,charisma:1},exp:48},{id:"pj",name:"ピルエット",cost:13,g:{technique:2,style:2},exp:28}],
};
const CMOVES=[
  {id:"st",name:"ストレッチ",cost:4,g:{stamina:1,style:1},exp:8},
  {id:"im2",name:"イメトレ",cost:3,g:{technique:1},exp:6},
  {id:"vd",name:"ビデオ研究",cost:2,g:{style:1,charisma:1},exp:7},
  {id:"me",name:"メンタルトレーニング",cost:4,g:{charisma:2},exp:9},
];
const SM={technique:{jp:"テクニック",c:"#4fc3f7"},rhythm:{jp:"リズム",c:"#b3ff00"},style:{jp:"スタイル",c:"#ff9ec4"},stamina:{jp:"スタミナ",c:"#ff7c3a"},charisma:{jp:"カリスマ",c:"#ffd60a"}};
const RANKS=[{n:"Rookie",jp:"ルーキー",lv:1,c:"#9090b0"},{n:"Amateur",jp:"アマチュア",lv:5,c:"#4fc3f7"},{n:"Pro",jp:"プロ",lv:12,c:"#81c784"},{n:"Expert",jp:"エキスパート",lv:22,c:"#ce93d8"},{n:"Master",jp:"マスター",lv:38,c:"#ffcc02"},{n:"Legend",jp:"レジェンド",lv:55,c:"#ff6b6b"}];
const AG={chain:"neck",sunglass:"face",bandana:"forehead",cap:"head",beanie:"head",fan:"hand"};
const SHOP={
  costumes:[
    {id:"street", n:"ストリートウェア",        lv:1, p:500,  b:{style:2},           col:"#4a4a7a",desc:"定番ストリートスタイル"},
    {id:"hip",    n:"ヒップホップパンツ",       lv:1, p:700,  b:{rhythm:2,stamina:1}, col:"#2a4a2a",desc:"バギーパンツ"},
    {id:"leo",    n:"ダンスレオタード",         lv:5, p:600,  b:{technique:2,style:1},col:"#4a0a6a",desc:"クラシック用タイトウェア"},
    {id:"battle", n:"バトルジャケット",         lv:8, p:900,  b:{stamina:2,charisma:1},col:"#3a0a0a",desc:"バトル向けジャケット"},
    {id:"stussy", n:"Stüssy クルーネック",      lv:10,p:1500, b:{style:2,charisma:1}, col:"#1a2a3a",desc:"ストリートの定番"},
    {id:"palace", n:"Palace トラックスーツ",    lv:14,p:2000, b:{rhythm:2,style:2},   col:"#1a0a2a",desc:"スケーターの聖典"},
    {id:"supreme",n:"Supreme ボックスロゴ",     lv:18,p:4000, b:{charisma:3,style:2}, col:"#2a0000",desc:"ストリートカルチャーの王"},
    {id:"stage",  n:"ステージスーツ",           lv:20,p:2500, b:{charisma:3,style:2}, col:"#0a0a4a",desc:"ステージ映え豪華スーツ"},
    {id:"wtaps",  n:"WTAPS カレッジジャケット",  lv:25,p:5000, b:{style:3,charisma:2}, col:"#0a1a0a",desc:"日本ストリートの頂点"},
    {id:"cdg",    n:"Comme des Garçons",        lv:35,p:8000, b:{style:5,charisma:3}, col:"#111111",desc:"前衛ファッションの極み"},
    {id:"offwhite",n:"Off-White コレクション",  lv:40,p:10000,b:{charisma:4,style:4}, col:"#e8e0c8",desc:"ヴァージルの遺産"},
    {id:"gold",   n:"ゴールドコスチューム",      lv:50,p:20000,b:{charisma:6,style:5}, col:"#3a2200",desc:"レジェンド専用黄金衣装"},
  ],
  sneakers:[
    {id:"chuck",   n:"Chuck Taylor All Star",  lv:1, p:550,  b:{charisma:1,style:1},          col:"#cc2222",sol:"#ffffff",desc:"永遠のオールスター"},
    {id:"cortez",  n:"Nike Cortez",            lv:3, p:600,  b:{rhythm:1,stamina:1},           col:"#f8f0e0",sol:"#4444cc",desc:"クラシックランナー"},
    {id:"samba",   n:"Adidas Samba OG",        lv:5, p:900,  b:{rhythm:2,style:2},             col:"#111111",sol:"#eeeeee",desc:"ハウスダンサーの定番！"},
    {id:"blazer",  n:"Nike Blazer Mid",        lv:5, p:750,  b:{style:2},                      col:"#e8c880",sol:"#c8a860",desc:"ビンテージな佇まい"},
    {id:"puma",    n:"Puma Suede Classic",     lv:6, p:720,  b:{rhythm:2,charisma:1},           col:"#333399",sol:"#cccccc",desc:"ブレイキンの定番"},
    {id:"af1",     n:"Air Force 1 Low",        lv:7, p:900,  b:{rhythm:2,style:1},             col:"#f8f8f8",sol:"#dddddd",desc:"ハウスの定番・白AF1"},
    {id:"vans",    n:"Vans Old Skool",         lv:8, p:680,  b:{style:2,rhythm:1},             col:"#222222",sol:"#eeeeee",desc:"スケーターの魂"},
    {id:"reebok",  n:"Reebok Classic Leather", lv:8, p:700,  b:{technique:1,rhythm:1},          col:"#ffffff",sol:"#cccccc",desc:"クリーンなクラシック"},
    {id:"nb574",   n:"New Balance 574",        lv:10,p:950,  b:{stamina:2,style:1},            col:"#888888",sol:"#cccccc",desc:"バランス最強のNB"},
    {id:"hp",      n:"Hush Puppies Loafer",    lv:10,p:900,  b:{style:2,stamina:1},            col:"#c8a870",sol:"#8a6a40",desc:"スムースレザーの優雅さ"},
    {id:"timb",    n:"Timberland 6inch Boot",  lv:12,p:1100, b:{stamina:3},                    col:"#c8860a",sol:"#8a5a00",desc:"ストリートの王道ブーツ"},
    {id:"nb990",   n:"New Balance 990v6",      lv:15,p:1800, b:{stamina:2,technique:2},         col:"#666666",sol:"#aaaaaa",desc:"USA製フラッグシップ"},
    {id:"sambawht",n:"Adidas Samba White",     lv:15,p:1200, b:{rhythm:3,style:2},             col:"#f8f8f8",sol:"#cccccc",desc:"白いSamba・デザイン特化"},
    {id:"aj1",     n:"Air Jordan 1 Retro Hi",  lv:18,p:2200, b:{stamina:3,rhythm:2},           col:"#dd2222",sol:"#111111",desc:"バスケとストリートの融合"},
    {id:"yeezy",   n:"Yeezy Boost 350 V2",     lv:28,p:4500, b:{charisma:3,style:3},           col:"#ccbb99",sol:"#ddccaa",desc:"カニエのレガシー"},
    {id:"jordan4", n:"Air Jordan 4 Retro",     lv:35,p:6000, b:{stamina:3,charisma:2,style:2}, col:"#111111",sol:"#cccccc",desc:"マイケルの遺産"},
    {id:"ltds",    n:"限定コラボスニーカー",   lv:50,p:20000,b:{charisma:5,style:4,rhythm:3},  col:"#ffd700",sol:"#888888",desc:"世界100足のレア限定品"},
  ],
  accessories:[
    {id:"chain",  n:"ゴールドチェーン",       slot:"neck",    lv:1, p:400,  b:{charisma:2},        desc:"ゴールドが輝く存在感"},
    {id:"sunglass",n:"サングラス",            slot:"face",    lv:1, p:350,  b:{charisma:1,style:1}, desc:"クールな一枚"},
    {id:"bandana",n:"バンダナ",               slot:"forehead",lv:1, p:200,  b:{style:1},            desc:"額に巻いてスタイルアップ"},
    {id:"cap",    n:"スナップバックキャップ",  slot:"head",    lv:3, p:450,  b:{charisma:1,rhythm:1},desc:"かぶって気合い入れろ"},
    {id:"beanie", n:"ビーニー",               slot:"head",    lv:3, p:300,  b:{style:1,stamina:1},  desc:"どんな時も全力で"},
    {id:"durag",  n:"デュラグ",               slot:"head",    lv:8, p:800,  b:{charisma:2,style:2}, desc:"ウェーブカルチャーの象徴"},
    {id:"fan",    n:"ゴールドファン",           slot:"hand",    lv:15,p:1500, b:{charisma:3,style:2}, desc:"ワッキングの女王専用"},
    {id:"goldring",n:"ゴールドリング",         slot:"hand",    lv:20,p:2000, b:{charisma:4},         desc:"存在感抜群のゴールドリング"},
  ],
};

/* ── MAP DATA ── */
const J={
  kagoshima:{id:"kagoshima",name:"鹿児島",x:152,y:408,g:"house",lv:1,cn:["kumamoto","miyazaki"],ch:{name:"溶岩ハウサー・ケン",e:"🌋",pw:120},rw:{exp:160,coins:400,title:"鹿児島の王"},desc:"火山の島から生まれたHOUSEの聖地"},
  miyazaki:{id:"miyazaki",name:"宮崎",x:200,y:365,g:"breaking",lv:3,cn:["kagoshima","kumamoto","oita"],ch:{name:"サーファーBreaker・Ryo",e:"🏄",pw:250},rw:{exp:220,coins:600,title:"宮崎ライダー"},desc:"南国の太陽の下のBREAKINGスタイル"},
  nagasaki:{id:"nagasaki",name:"長崎",x:86,y:316,g:"waacking",lv:5,cn:["kumamoto","hakata"],ch:{name:"海の女神・マリア",e:"⛵",pw:380},rw:{exp:300,coins:800,title:"長崎ソウルクイーン"},desc:"港町の哀愁を纏うSOUL & WAACKING"},
  kumamoto:{id:"kumamoto",name:"熊本",x:148,y:330,g:"lock",lv:5,cn:["kagoshima","miyazaki","oita","nagasaki","hakata"],ch:{name:"熊本城ロッカー・Tomo",e:"🏯",pw:360},rw:{exp:290,coins:750,title:"熊本ロックダウン"},desc:"お城の麓で炸裂するLOCK"},
  oita:{id:"oita",name:"大分",x:200,y:298,g:"jazz",lv:7,cn:["miyazaki","kumamoto","kokura"],ch:{name:"温泉ジャズマン・Hiro",e:"♨",pw:480},rw:{exp:360,coins:900,title:"大分スウィング"},desc:"湯けむりの中に流れるJAZZ"},
  hakata:{id:"hakata",name:"博多",x:136,y:296,g:"lock",lv:8,cn:["nagasaki","kumamoto","kokura"],ch:{name:"屋台ロックキング・Shin",e:"🍜",pw:580},rw:{exp:400,coins:1100,title:"博多の王者"},desc:"熱い男たちのLOCKが博多の夜を揺らす"},
  kokura:{id:"kokura",name:"小倉",x:166,y:284,g:"house",lv:9,cn:["hakata","oita","hiroshima"],ch:{name:"鉄の街ハウサー・Masa",e:"🏭",pw:700},rw:{exp:450,coins:1300,title:"小倉HouseChamp"},desc:"鉄の街のHOUSEスタイル"},
  hiroshima:{id:"hiroshima",name:"広島",x:148,y:252,g:"contemporary",lv:11,cn:["kokura","kobe"],ch:{name:"平和の踊り子・Nana",e:"🕊",pw:900},rw:{exp:520,coins:1600,title:"広島コンテポラリー"},desc:"平和への祈りを込めたCONTEMPORARY"},
  kobe:{id:"kobe",name:"神戸",x:184,y:226,g:"waacking",lv:12,cn:["hiroshima","osaka"],ch:{name:"港の女王・Yuki",e:"⚓",pw:1100},rw:{exp:580,coins:1800,title:"神戸ディスコクイーン"},desc:"異国情緒の港町のWAACKING"},
  osaka:{id:"osaka",name:"大阪",x:208,y:224,g:"popping",lv:13,cn:["kobe","kyoto"],ch:{name:"難波POPPINキング・Taka",e:"🐡",pw:1350},rw:{exp:600,coins:2000,title:"大阪の帝王"},desc:"ど派手なPOPPINGが大阪を沸かせる！"},
  kyoto:{id:"kyoto",name:"京都",x:194,y:210,g:"ballet",lv:14,cn:["osaka","nagoya"],ch:{name:"舞妓バレリーナ・Kei",e:"🏮",pw:1600},rw:{exp:650,coins:2200,title:"京都の雅"},desc:"千年の都の和と洋の融合バレエ"},
  nagoya:{id:"nagoya",name:"名古屋",x:228,y:202,g:"breaking",lv:16,cn:["kyoto","tokyo","yokohama"],ch:{name:"モーニングBreaker・Jun",e:"☕",pw:2000},rw:{exp:720,coins:2600,title:"名古屋城の破壊者"},desc:"味噌の街のBREAKINGパワー"},
  yokohama:{id:"yokohama",name:"横浜",x:280,y:190,g:"breaking",lv:18,cn:["nagoya","tokyo"],ch:{name:"港ブレイカー・Daisuke",e:"🛳",pw:2500},rw:{exp:800,coins:3000,title:"横浜レジェンド"},desc:"関東最強の横浜ブレイキン"},
  tokyo:{id:"tokyo",name:"東京",x:294,y:172,g:"popping",lv:22,cn:["yokohama","sendai"],ch:{name:"東京ゴッド・ZERO",e:"🏙",pw:3500},rw:{exp:1000,coins:5000,title:"東京の覇者"},desc:"全スタイルが集結する日本の聖地"},
  sendai:{id:"sendai",name:"仙台",x:290,y:122,g:"lock",lv:26,cn:["tokyo","sapporo"],ch:{name:"七夕LOCKer・Tanaka",e:"🎋",pw:4500},rw:{exp:1100,coins:6000,title:"東北のLOCK王"},desc:"七夕のリズムに乗るLOCK"},
  sapporo:{id:"sapporo",name:"札幌",x:272,y:50,g:"jazz",lv:30,cn:["sendai"],ch:{name:"雪のジャズダンサー・Miku",e:"❄",pw:6000},rw:{exp:1300,coins:8000,title:"北の王者"},desc:"雪と氷の中に咲くJAZZ"},
};
const JE=[["sapporo","sendai"],["sendai","tokyo"],["tokyo","yokohama"],["tokyo","nagoya"],["yokohama","nagoya"],["nagoya","kyoto"],["kyoto","osaka"],["osaka","kobe"],["kobe","hiroshima"],["hiroshima","kokura"],["kokura","hakata"],["kokura","oita"],["hakata","nagasaki"],["hakata","kumamoto"],["oita","kumamoto"],["oita","miyazaki"],["kumamoto","nagasaki"],["kumamoto","miyazaki"],["miyazaki","kagoshima"],["kumamoto","kagoshima"]];

const U={
  seattle:{id:"seattle",name:"Seattle",x:50,y:55,g:"contemporary",lv:28,cn:["chicago","la"],ch:{name:"Grunge Dancer Rex",e:"🎸",pw:582},rw:{exp:1400,coins:10000,title:"Seattle Wonder"},desc:"ロック魂とCONTEMPORARYの融合"},
  la:{id:"la",name:"L.A.",x:55,y:178,g:"popping",lv:30,cn:["seattle","chicago","atl"],ch:{name:"Hollywood Popper KING",e:"🎬",pw:655},rw:{exp:1600,coins:15000,title:"Hollywood King"},desc:"LAストリートのPOPPINGの聖地"},
  chicago:{id:"chicago",name:"Chicago",x:195,y:96,g:"house",lv:30,cn:["seattle","la","ny","atl"],ch:{name:"House God - Marcus",e:"🏠",pw:705},rw:{exp:1700,coins:15000,title:"Chicago House God"},desc:"HOUSEの生みの親・シカゴ！"},
  ny:{id:"ny",name:"NEW YORK",x:312,y:82,g:"breaking",lv:35,cn:["chicago","atl"],ch:{name:"B-Boy Zeus",e:"🗽",pw:805},rw:{exp:2000,coins:25000,title:"NYC LEGEND"},desc:"BREAKINGの原点、NYサウスブロンクス！"},
  atl:{id:"atl",name:"Atlanta",x:245,y:182,g:"breaking",lv:32,cn:["la","chicago","ny","miami"],ch:{name:"Trap Breaker - Jaylen",e:"🍑",pw:725},rw:{exp:1800,coins:18000,title:"ATL Champion"},desc:"ヒップホップとブレイキンが爆発するATL"},
  miami:{id:"miami",name:"Miami",x:282,y:232,g:"waacking",lv:33,cn:["atl"],ch:{name:"Miami Queen - Alicia",e:"🌴",pw:682},rw:{exp:1700,coins:16000,title:"Miami Vibe Queen"},desc:"ラテンビートのWAACKING女王"},
};
const UE=[["seattle","chicago"],["seattle","la"],["la","chicago"],["la","atl"],["chicago","ny"],["chicago","atl"],["ny","atl"],["atl","miami"]];

const W={
  london:{id:"london",name:"LONDON",x:92,y:58,g:"breaking",lv:40,cn:["paris","wf"],ch:{name:"GRIME King Akira",e:"🏰",pw:855},rw:{exp:2500,coins:40000,title:"London Legend"},desc:"UKグライムとBREAKING最強スタイル"},
  paris:{id:"paris",name:"PARIS",x:122,y:95,g:"ballet",lv:40,cn:["london","wf"],ch:{name:"Ballet Dieu Celestine",e:"🗼",pw:882},rw:{exp:2600,coins:42000,title:"Paris Royale"},desc:"バレエの本場パリ。技術の極致へ"},
  seoul:{id:"seoul",name:"SEOUL",x:285,y:62,g:"popping",lv:42,cn:["wf"],ch:{name:"K-POP GOD Hyun",e:"🇰🇷",pw:925},rw:{exp:2800,coins:48000,title:"Seoul Champion"},desc:"K-POPとPOPPING世界最速スタイル"},
  rio:{id:"rio",name:"RIO",x:202,y:178,g:"waacking",lv:42,cn:["wf"],ch:{name:"Carnival Queen Isabela",e:"🌺",pw:905},rw:{exp:2700,coins:45000,title:"Rio Carnival Queen"},desc:"カーニバルのWAACKING覇者"},
  wf:{id:"wf",name:"WORLD FINAL",x:192,y:112,g:"contemporary",lv:47,cn:["london","paris","seoul","rio"],ch:{name:"WORLD GOD INFINITY",e:"🌍",pw:1200},rw:{exp:5000,coins:200000,title:"🏆 WORLD CHAMPION"},desc:"最終決戦！優勝賞金¥200,000！"},
};
const WE=[["london","paris"],["london","wf"],["paris","wf"],["seoul","wf"],["rio","wf"]];

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

const QOPPS=[
  {id:"q1",name:"ルーキーのレン",style:"Popping",e:"🤖",lv:2,pw:80,rw:{exp:60,coins:150}},
  {id:"q2",name:"ハウスのハナ",style:"House",e:"💃",lv:5,pw:200,rw:{exp:120,coins:300,title:"バトルデビュー！"}},
  {id:"q3",name:"ファンクのRika",style:"Lock",e:"🔥",lv:8,pw:380,rw:{exp:200,coins:500}},
  {id:"q4",name:"ロックキングLeo",style:"Lock",e:"🦁",lv:12,pw:600,rw:{exp:300,coins:800,title:"ローカルチャンピオン"}},
  {id:"q5",name:"テクニシャンMai",style:"Ballet",e:"🩰",lv:18,pw:950,rw:{exp:500,coins:1400}},
  {id:"q6",name:"バレエの女王Bea",style:"Ballet",e:"👸",lv:22,pw:1400,rw:{exp:700,coins:2000,title:"テクニシャン"}},
  {id:"q7",name:"ストリート王者Shin",style:"Breaking",e:"⚡",lv:32,pw:2200,rw:{exp:1200,coins:4000,title:"ストリートの王者"}},
  {id:"q8",name:"ワールドスターYuki",style:"Contemporary",e:"🌟",lv:48,pw:3500,rw:{exp:2000,coins:8000,title:"ワールドクラス"}},
  {id:"q9",name:"レジェンド・GOAT",style:"ALL",e:"👑",lv:60,pw:6000,rw:{exp:4000,coins:20000,title:"GOAT"}},
];

const SHOWS=[
  {id:"s1",name:"地区センター発表会",venue:"地元",e:"🏫",lv:1,ec:15,rw:{exp:80,coins:300,fame:15},desc:"まずは地元で名を上げろ！"},
  {id:"s2",name:"渋谷ストリートイベント",venue:"東京",e:"🗼",lv:5,ec:15,rw:{exp:180,coins:800,fame:60},desc:"東京のストリートで輝け"},
  {id:"s3",name:"全国ダンスコンペティション",venue:"全国",e:"🏆",lv:12,ec:20,rw:{exp:450,coins:2500,fame:250},desc:"全国の猛者と競え！優勝賞金あり"},
  {id:"s4",name:"アジアダンスフェスティバル",venue:"アジア",e:"🌏",lv:25,ec:20,rw:{exp:900,coins:8000,fame:700},desc:"アジアの頂点を目指せ"},
  {id:"s5",name:"ワールドダンスショー",venue:"全世界",e:"🌍",lv:42,ec:25,rw:{exp:2200,coins:30000,fame:2500},desc:"全世界が注目する最高峰の舞台"},
];

/* ── HELPERS ── */
const xpL=lv=>lv<=1?0:Math.floor(Math.pow(lv-1,1.75)*130);
function getLv(xp){let lv=1;while(xpL(lv+1)<=xp)lv++;return Math.min(lv,99);}
function pow(s){return Object.values(s).reduce((a,b)=>a+b,0)*3;}
function rank(lv){let r=RANKS[0];RANKS.forEach(k=>{if(lv>=k.lv)r=k;});return r;}
function face(mood,energy){if(energy<10)return"dizzy";if(mood>75)return"happy";if(mood>45)return"ok";if(mood>20)return"sad";return"cry";}
const fc=n=>"¥"+n.toLocaleString();
function allC(){return{...J,...U,...W};}
function rc(r){return r==="japan"?J:r==="usa"?U:W;}
function re(r){return r==="japan"?JE:r==="usa"?UE:WE;}
function bonus(eq){
  const b={};
  const add=o=>Object.entries(o).forEach(([k,v])=>{b[k]=(b[k]||0)+v;});
  if(eq?.costume){const c=SHOP.costumes.find(x=>x.id===eq.costume);if(c)add(c.b);}
  if(eq?.sneakers){const s=SHOP.sneakers.find(x=>x.id===eq.sneakers);if(s)add(s.b);}
  (eq?.accessories||[]).forEach(id=>{const a=SHOP.accessories.find(x=>x.id===id);if(a)add(a.b);});
  return b;
}
function togAcc(id,accs){
  const acc=SHOP.accessories.find(a=>a.id===id);
  if(!acc)return accs;
  if(accs.includes(id))return accs.filter(a=>a!==id);
  return[...accs.filter(a=>AG[a]!==acc.slot),id];
}
function canVisit(id,char,region){
  const all=allC();const city=all[id];if(!city)return false;
  const lv=getLv(char.exp);if(lv<city.lv)return false;
  const cl=char.clearedCities||{};
  if(cl[id])return true;
  // USA: need tokyo cleared OR USA hometown
  if(region==="usa"){
    if(!cl["tokyo"]&&!U[char.hometown])return false;
    if(["la","chicago"].includes(id))return true;
  }
  // World: need ny cleared OR World hometown
  if(region==="world"){
    if(!cl["ny"]&&!W[char.hometown])return false;
    if(["london","paris","seoul","rio"].includes(id))return true;
  }
  // Japan: overseas hometown → kagoshima always accessible
  if(region==="japan"&&!J[char.hometown]&&id==="kagoshima")return true;
  return city.cn.some(a=>cl[a]);
}

/* ── AI ── */
async function ai(prompt){
  try{
    const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:110,
        system:"あなたはダンスRPGの熱血ナレーターです。2〜3文で短くドラマチックに日本語で描写。絵文字を1〜2個使用。",
        messages:[{role:"user",content:prompt}]})});
    const d=await r.json();return d.content?.[0]?.text||"";
  }catch{return"";}
}

/* ── SVG CHARACTER  (全部 <g> で囲む — <> 禁止) ── */
function DancerSVG({genre:gn,mood,energy,equipped,size=120}){
  const g=GENRES[gn]||GENRES.house;
  const fs=face(mood,energy);
  const cos=equipped?.costume?SHOP.costumes.find(c=>c.id===equipped.costume):null;
  const sne=equipped?.sneakers?SHOP.sneakers.find(s=>s.id===equipped.sneakers):null;
  const accs=equipped?.accessories||[];
  const cid=cos?.id||"street";
  const bc=cos?cos.col:g.c+"66";
  const gc=g.c;
  const sc=sne?.col||"#ccc";const sl=sne?.sol||"#aaa";
  const skin="#ffdbbd";
  const isHip=cid==="hip";
  const AL={ballet:"-60",contemporary:"-50",waacking:"-80",lock:"10",house:"-20",popping:"-10",breaking:"-5",jazz:"-30"};
  const AR={ballet:"60",contemporary:"50",waacking:"80",lock:"-10",house:"20",popping:"10",breaking:"5",jazz:"30"};
  const al=AL[gn]||"-20",ar=AR[gn]||"20";

  return(
    <svg viewBox="0 0 100 158" width={size} height={Math.round(size*1.58)} style={{display:"block",overflow:"visible"}}>
      {/* shadow */}
      <ellipse cx="50" cy="155" rx="22" ry="5" fill="rgba(0,0,0,.3)"/>

      {/* SHOES */}
      {sne?.id==="timb"?(
        <g>
          <rect x="20" y="128" width="28" height="22" rx="5" fill={sc}/>
          <rect x="52" y="128" width="28" height="22" rx="5" fill={sc}/>
          <rect x="19" y="148" width="30" height="6" rx="3" fill={sl}/>
          <rect x="51" y="148" width="30" height="6" rx="3" fill={sl}/>
          <line x1="23" y1="131" x2="44" y2="131" stroke="#fff" strokeWidth="1.2" opacity=".3"/>
          <line x1="23" y1="135" x2="44" y2="135" stroke="#fff" strokeWidth="1.2" opacity=".3"/>
          <line x1="55" y1="131" x2="77" y2="131" stroke="#fff" strokeWidth="1.2" opacity=".3"/>
          <line x1="55" y1="135" x2="77" y2="135" stroke="#fff" strokeWidth="1.2" opacity=".3"/>
        </g>
      ):(
        <g>
          <path d="M18 138 Q20 131 36 131 Q50 131 50 138 L50 146 L18 146 Z" fill={sc}/>
          <rect x="17" y="145" width="34" height="5" rx="2" fill={sl}/>
          <ellipse cx="20" cy="139" rx="5" ry="4" fill={sc} opacity=".7"/>
          <path d="M82 138 Q80 131 64 131 Q50 131 50 138 L50 146 L82 146 Z" fill={sc}/>
          <rect x="49" y="145" width="34" height="5" rx="2" fill={sl}/>
          <ellipse cx="80" cy="139" rx="5" ry="4" fill={sc} opacity=".7"/>
          {["af1","aj1","cortez","blazer","vans"].includes(sne?.id)&&(
            <g>
              <path d="M24 140 Q31 136 42 138" stroke={sne?.id==="aj1"?"#dd4444":"#c8a860"} strokeWidth="1.8" fill="none" opacity=".9"/>
              <path d="M76 140 Q69 136 58 138" stroke={sne?.id==="aj1"?"#dd4444":"#c8a860"} strokeWidth="1.8" fill="none" opacity=".9"/>
            </g>
          )}
        </g>
      )}

      {/* LEGS */}
      <rect x={isHip?18:30} y="102" width={isHip?22:15} height={isHip?46:44} rx={isHip?8:6} fill={bc} stroke={gc} strokeWidth=".7"/>
      <rect x={isHip?60:55} y="102" width={isHip?22:15} height={isHip?46:44} rx={isHip?8:6} fill={bc} stroke={gc} strokeWidth=".7"/>

      {/* BODY */}
      {cid==="battle"?(
        <g>
          <rect x="24" y="56" width="52" height="50" rx="12" fill={bc} stroke={gc} strokeWidth="1"/>
          <path d="M38 58 L50 72 L62 58" stroke={gc} strokeWidth="2.5" fill={bc}/>
          <line x1="50" y1="72" x2="50" y2="106" stroke={gc+"88"} strokeWidth="2.5" strokeDasharray="4,2"/>
        </g>
      ):cid==="stage"?(
        <g>
          <rect x="24" y="56" width="52" height="50" rx="12" fill={bc} stroke={gc} strokeWidth="1"/>
          <path d="M44 56 L50 68 L56 56 L50 62 Z" fill={gc+"66"}/>
          <path d="M48 67 L52 67 L54 90 L50 96 L46 90 Z" fill={gc+"cc"}/>
          <ellipse cx="50" cy="67" rx="4" ry="3" fill={gc}/>
        </g>
      ):cid==="leo"?(
        <g>
          <rect x="28" y="58" width="44" height="48" rx="14" fill={bc} stroke={gc} strokeWidth="1"/>
          <rect x="36" y="50" width="8" height="18" rx="4" fill={bc} stroke={gc} strokeWidth=".7"/>
          <rect x="56" y="50" width="8" height="18" rx="4" fill={bc} stroke={gc} strokeWidth=".7"/>
        </g>
      ):cid==="gold"?(
        <g>
          <rect x="24" y="56" width="52" height="50" rx="12" fill={bc} stroke="#ffd60a" strokeWidth="2.5"/>
          <rect x="27" y="59" width="46" height="44" rx="10" fill="none" stroke="#ffd60a55" strokeWidth="2"/>
          <text x="50" y="83" textAnchor="middle" fontSize="18" dominantBaseline="middle">⭐</text>
        </g>
      ):(
        <g>
          <rect x="24" y="56" width="52" height="50" rx="13" fill={bc} stroke={gc} strokeWidth="1"/>
          {isHip?(
            <line x1="44" y1="60" x2="56" y2="60" stroke={gc+"88"} strokeWidth="2" strokeLinecap="round"/>
          ):(
            <g>
              <rect x="32" y="82" width="36" height="16" rx="6" fill="none" stroke={gc+"66"} strokeWidth="1.2"/>
              <line x1="50" y1="82" x2="50" y2="98" stroke={gc+"44"} strokeWidth="1"/>
            </g>
          )}
        </g>
      )}

      {/* genre detail */}
      {gn==="popping"&&<text x="50" y="84" textAnchor="middle" fontSize="12" dominantBaseline="middle">⚡</text>}
      {gn==="jazz"&&<text x="50" y="84" textAnchor="middle" fontSize="11" dominantBaseline="middle">♪</text>}
      {gn==="breaking"&&cid!=="battle"&&<rect x="35" y="64" width="30" height="7" rx="3" fill={gc} opacity=".5"/>}

      {/* ARMS — long */}
      <rect x="-4" y="60" width="32" height="11" rx="5.5" fill={bc} stroke={gc} strokeWidth=".8" style={{transformOrigin:"24px 65px",transform:`rotate(${al}deg)`}}/>
      <rect x="72" y="60" width="32" height="11" rx="5.5" fill={bc} stroke={gc} strokeWidth=".8" style={{transformOrigin:"76px 65px",transform:`rotate(${ar}deg)`}}/>
      {gn==="waacking"&&<rect x="-4" y="40" width="32" height="11" rx="5.5" fill={bc} stroke={gc} strokeWidth=".8" style={{transformOrigin:"24px 45px",transform:"rotate(-90deg)"}}/>}

      {/* NECK + HEAD */}
      <rect x="43" y="46" width="14" height="14" rx="5" fill={skin}/>
      <ellipse cx="50" cy="31" rx="22" ry="24" fill={skin} stroke="#e8c9a0" strokeWidth=".6"/>

      {/* HAIR */}
      {gn==="ballet"&&<g><ellipse cx="50" cy="11" rx="20" ry="9" fill={gc}/><circle cx="50" cy="5" r="4" fill={gc}/></g>}
      {gn==="house"&&<g><ellipse cx="50" cy="12" rx="18" ry="9" fill="#222"/><rect x="22" y="20" width="7" height="18" rx="4" fill={gc}/><rect x="71" y="20" width="7" height="18" rx="4" fill={gc}/><path d="M25 22 Q50 6 75 22" stroke={gc} strokeWidth="4" fill="none"/></g>}
      {["popping","breaking","lock","waacking"].includes(gn)&&<g><ellipse cx="50" cy="12" rx="19" ry="9" fill={gc}/><ellipse cx="50" cy="9" rx="16" ry="6" fill={gc} opacity=".9"/></g>}
      {gn==="contemporary"&&<g><ellipse cx="50" cy="10" rx="21" ry="10" fill={gc} opacity=".9"/><path d="M30 14 Q50 1 70 14" stroke={gc} strokeWidth="4" fill="none"/></g>}
      {gn==="jazz"&&<g><ellipse cx="50" cy="11" rx="19" ry="10" fill={gc}/><ellipse cx="50" cy="8" rx="14" ry="5" fill={gc}/></g>}

      {/* FACE */}
      {fs==="dizzy"?(
        <g>
          <text x="40" y="33" fontSize="10" fill="#555" textAnchor="middle" dominantBaseline="middle">×</text>
          <text x="60" y="33" fontSize="10" fill="#555" textAnchor="middle" dominantBaseline="middle">×</text>
        </g>
      ):(
        <g>
          <ellipse cx="41" cy="32" rx="3.5" ry={fs==="happy"?3:3.5} fill="#222"/>
          <ellipse cx="59" cy="32" rx="3.5" ry={fs==="happy"?3:3.5} fill="#222"/>
          <circle cx="42.5" cy="30.5" r="1.2" fill="white"/>
          <circle cx="60.5" cy="30.5" r="1.2" fill="white"/>
        </g>
      )}
      {fs==="happy"&&<path d="M41 42 Q50 51 59 42" stroke="#cc4444" strokeWidth="2" fill="none" strokeLinecap="round"/>}
      {fs==="ok"&&<line x1="43" y1="44" x2="57" y2="44" stroke="#cc4444" strokeWidth="1.8" strokeLinecap="round"/>}
      {fs==="sad"&&<path d="M41 49 Q50 43 59 49" stroke="#cc4444" strokeWidth="2" fill="none" strokeLinecap="round"/>}
      {fs==="cry"&&<g><path d="M41 50 Q50 44 59 50" stroke="#cc4444" strokeWidth="2" fill="none"/><ellipse cx="38" cy="44" rx="2" ry="4" fill="#4af" opacity=".7"/><ellipse cx="62" cy="44" rx="2" ry="4" fill="#4af" opacity=".7"/></g>}
      {(fs==="happy"||fs==="ok")&&<g><ellipse cx="35" cy="40" rx="4.5" ry="2.5" fill="#ff9ec4" opacity=".6"/><ellipse cx="65" cy="40" rx="4.5" ry="2.5" fill="#ff9ec4" opacity=".6"/></g>}

      {/* ACCESSORIES */}
      {accs.includes("chain")&&<g><path d="M34 68 Q50 77 66 68" stroke="#ffd60a" strokeWidth="2.5" fill="none" strokeLinecap="round"/><circle cx="50" cy="75" r="3.5" fill="#ffd60a"/></g>}
      {accs.includes("fan")&&<g><path d="M68 60 Q84 40 94 52 Q82 60 68 72 Z" fill="#ffd60a" opacity=".85"/><line x1="68" y1="66" x2="86" y2="48" stroke="#ffd60a" strokeWidth=".8" opacity=".6"/></g>}
      {accs.includes("bandana")&&!accs.includes("cap")&&!accs.includes("beanie")&&<path d="M30 22 Q50 10 70 22 L68 32 Q50 22 32 32 Z" fill="#ff006e" opacity=".9"/>}
      {accs.includes("bandana")&&(accs.includes("cap")||accs.includes("beanie"))&&<path d="M30 28 Q50 18 70 28 L68 34 Q50 26 32 34 Z" fill="#ff006e" opacity=".8"/>}
      {accs.includes("cap")&&<g><ellipse cx="50" cy="12" rx="24" ry="7" fill={gc}/><rect x="26" y="12" width="48" height="9" rx="4" fill={gc}/><rect x="50" y="5" width="24" height="11" rx="2" fill={gc} opacity=".8"/></g>}
      {accs.includes("beanie")&&!accs.includes("cap")&&<ellipse cx="50" cy="11" rx="22" ry="10" fill={gc} opacity=".9"/>}
      {accs.includes("sunglass")&&<g><rect x="31" y="28" width="14" height="9" rx="3" fill="#111" opacity=".92"/><rect x="55" y="28" width="14" height="9" rx="3" fill="#111" opacity=".92"/><line x1="45" y1="32" x2="55" y2="32" stroke="#555" strokeWidth="1.5"/><line x1="31" y1="28" x2="44" y2="28" stroke="#444" strokeWidth="1.5"/><line x1="56" y1="28" x2="69" y2="28" stroke="#444" strokeWidth="1.5"/></g>}
    </svg>
  );
}

/* ── UI PRIMITIVES ── */
function SBar({label,val,col,max=35}){
  return(<div style={{marginBottom:6}}>
    <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}><span style={{fontSize:10,color:TX3,fontFamily:"M PLUS Rounded 1c,sans-serif"}}>{label}</span><span style={{fontSize:10,color:col,fontWeight:700}}>{val}</span></div>
    <div style={{height:5,background:BG3,borderRadius:3}}><div style={{height:"100%",width:`${Math.min(100,(val/max)*100)}%`,background:col,borderRadius:3,transition:"width .5s"}}/></div>
  </div>);
}
function VBar({label,val,col}){
  const p=Math.max(0,Math.min(100,val));
  return(<div style={{display:"flex",alignItems:"center",gap:8,marginBottom:5}}>
    <span style={{fontSize:10,color:TX3,width:52,flexShrink:0,fontFamily:"M PLUS Rounded 1c,sans-serif"}}>{label}</span>
    <div style={{flex:1,height:8,background:BG3,borderRadius:4}}><div style={{height:"100%",width:`${p}%`,background:p>50?col:p>25?"#ffcc02":"#ff5555",borderRadius:4,transition:"width .5s"}}/></div>
    <span style={{fontSize:10,color:TX3,width:22,textAlign:"right"}}>{val}</span>
  </div>);
}
function Btn({children,onClick,col=BG3,tc=TX,disabled,full,sx={}}){
  return(<button onClick={disabled?undefined:onClick} style={{padding:"9px 14px",borderRadius:6,fontSize:12,fontFamily:"M PLUS Rounded 1c,sans-serif",fontWeight:700,background:disabled?"#141428":col,color:disabled?"#404060":tc,border:`1px solid ${disabled?"#252545":col}`,cursor:disabled?"not-allowed":"pointer",transition:"all .15s",width:full?"100%":undefined,...sx}}>{children}</button>);
}
function AIB({text,loading}){
  if(!text&&!loading)return null;
  return(<div style={{margin:"10px 0",padding:"10px 12px",background:"#0e0e22",border:"1px solid #3a3a60",borderRadius:6,fontSize:12,fontFamily:"M PLUS Rounded 1c,sans-serif",color:TX2,lineHeight:1.65,animation:"su .3s ease"}}>
    {loading?<span style={{animation:"pu 1s infinite",color:TX3}}>✦ AI 実況生成中...</span>:text}
  </div>);
}
function Tag({children,col}){return(<span style={{fontSize:10,padding:"2px 8px",borderRadius:10,background:`${col}33`,color:col,border:`1px solid ${col}55`,fontFamily:"M PLUS Rounded 1c,sans-serif"}}>{children}</span>);}

/* ── BATTLE OVERLAY ── */
function BOvl({state,gc,onClose}){
  const px={fontFamily:"'Press Start 2P',monospace"};
  const base={position:"fixed",inset:0,background:"rgba(5,5,18,.95)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",zIndex:900,padding:24,textAlign:"center"};
  if(state.phase==="fighting")return(
    <div style={base}>
      <div style={{...px,fontSize:10,color:"#ff6b6b",letterSpacing:3,marginBottom:20}}>⚔️ BATTLE ⚔️</div>
      <div style={{fontSize:52,animation:"bt .8s ease-in-out infinite"}}>💃 VS 🕺</div>
      <div style={{color:TX3,fontSize:12,marginTop:16,fontFamily:"M PLUS Rounded 1c,sans-serif"}}>vs {state.opp}</div>
      <div style={{maxWidth:300,marginTop:16}}><AIB text={state.ait} loading={state.ail}/></div>
    </div>
  );
  if(state.phase==="result"){const{won,eg,coins,title,narr,mp,tp,opp}=state;
    return(<div style={base}>
      <div style={{fontSize:58,animation:won?"vi .5s ease":"sh .5s ease",marginBottom:14}}>{won?"🏆":"💀"}</div>
      <div style={{...px,fontSize:14,color:won?"#b3ff00":"#ff5555",letterSpacing:3,marginBottom:12}}>{won?"WIN!":"LOSE..."}</div>
      <div style={{fontSize:11,color:TX3,marginBottom:8,fontFamily:"M PLUS Rounded 1c,sans-serif"}}>{opp} · {mp} vs {tp}</div>
      <div style={{display:"flex",gap:16,justifyContent:"center",marginBottom:8}}>
        <span style={{fontSize:13,color:"#ffd60a"}}>+{eg} EXP</span>
        {coins>0&&<span style={{fontSize:13,color:"#b3ff00",fontWeight:700}}>{fc(coins)}</span>}
      </div>
      {title&&<div style={{fontSize:12,color:"#ce93d8",marginBottom:10}}>🎖 「{title}」獲得！</div>}
      {narr&&<div style={{maxWidth:300,marginBottom:16}}><AIB text={narr} loading={false}/></div>}
      <Btn col={gc} tc="#000" onClick={onClose} sx={{fontSize:12,padding:"10px 36px"}}>続ける</Btn>
    </div>);
  }
  return null;
}

/* ── MAP SVG (全部 <g>) ── */
function MapSVG({region,char,selected,onSelect}){
  const cities=rc(region);const edges=re(region);
  const vb=region==="japan"?"0 0 340 440":region==="usa"?"0 0 360 265":"0 0 360 222";
  const cl=char.clearedCities||{};
  function cs(id){if(cl[id])return"cleared";if(canVisit(id,char,region))return"avail";return"locked";}
  const areas=region==="japan"?[
    {x:64,y:268,w:162,h:172,rx:12,f:"#1a1428",s:"#3a2a6a",t:"九州",tx:72,ty:282},
    {x:162,y:198,w:76,h:60,rx:8,f:"#0e1a20",s:"#1a4055",t:"関西",tx:167,ty:212},
    {x:254,y:154,w:78,h:50,rx:8,f:"#12141e",s:"#2a2a55",t:"関東",tx:259,ty:168},
    {x:260,y:96,w:60,h:52,rx:8,f:"#0e1618",s:"#1a3045",t:"東北",tx:265,ty:110},
    {x:244,y:22,w:70,h:50,rx:8,f:"#101820",s:"#1a3055",t:"北海道",tx:248,ty:36},
  ]:[];
  return(
    <svg viewBox={vb} width="100%" style={{display:"block"}}>
      <rect width="100%" height="100%" fill="#080818"/>
      {areas.map((a,i)=>(
        <g key={i}>
          <rect x={a.x} y={a.y} width={a.w} height={a.h} rx={a.rx} fill={a.f} stroke={a.s} strokeWidth="1.5"/>
          <text x={a.tx} y={a.ty} fill={a.s} fontSize="10" fontFamily="M PLUS Rounded 1c,sans-serif" fontWeight="700">{a.t}</text>
        </g>
      ))}
      {edges.map(([a,b])=>{
        const ca=cities[a],cb=cities[b];if(!ca||!cb)return null;
        const sa=cs(a),sb=cs(b);const both=sa==="locked"&&sb==="locked";
        return<line key={`${a}-${b}`} x1={ca.x} y1={ca.y} x2={cb.x} y2={cb.y} stroke={both?"#181830":"#505090"} strokeWidth={both?1:2} strokeDasharray={both?"4,4":"none"}/>;
      })}
      {Object.values(cities).map(city=>{
        const st=cs(city.id);
        const isCur=city.id===char.currentCity;
        const isSel=selected?.id===city.id;
        const gc2=GENRES[city.g]?.c||"#888";
        const lk=st==="locked";const cl2=st==="cleared";const av=st==="avail";
        const r=isCur?13:lk?7:10;
        return(
          <g key={city.id} onClick={()=>!lk&&onSelect(city)} style={{cursor:lk?"default":"pointer"}}>
            {isCur&&<circle cx={city.x} cy={city.y} r="22" fill="none" stroke={gc2} strokeWidth="2.5" style={{animation:"pu 2s ease-in-out infinite"}} opacity=".5"/>}
            {isSel&&!isCur&&<circle cx={city.x} cy={city.y} r="16" fill="none" stroke={gc2} strokeWidth="2" opacity=".8"/>}
            {av&&!isCur&&<circle cx={city.x} cy={city.y} r="14" fill={gc2} opacity=".12"/>}
            <circle cx={city.x} cy={city.y} r={r} fill={lk?"#0e0e1e":cl2?gc2+"44":isCur?gc2+"cc":gc2+"88"} stroke={lk?"#252545":cl2?gc2+"88":gc2} strokeWidth={isCur?2.5:av?2:1}/>
            {lk&&<text x={city.x} y={city.y} textAnchor="middle" dominantBaseline="middle" fontSize="7" fill="#303060">🔒</text>}
            {cl2&&!isCur&&<text x={city.x} y={city.y} textAnchor="middle" dominantBaseline="middle" fontSize="9" fill={gc2}>✓</text>}
            {(av||isCur)&&<text x={city.x} y={city.y} textAnchor="middle" dominantBaseline="middle" fontSize={isCur?12:10}>{GENRES[city.g]?.e}</text>}
            {city.id===char.hometown&&<text x={city.x+12} y={city.y-10} fontSize="10">🏠</text>}
            <text x={city.x} y={city.y+(isCur?22:17)} textAnchor="middle" fontSize={isCur?9.5:lk?7.5:8.5} fill={lk?"#2a2a50":cl2?gc2+"cc":isCur?gc2:TX} fontFamily="M PLUS Rounded 1c,sans-serif" fontWeight={isCur?"700":"400"}>{city.name}</text>
            {lk&&(
              <g>
                <rect x={city.x-15} y={city.y+17} width="30" height="11" rx="3" fill="#12122a" stroke="#2a2a48" strokeWidth=".8"/>
                <text x={city.x} y={city.y+25} textAnchor="middle" fontSize="7" fill="#5050a0" fontFamily="M PLUS Rounded 1c,sans-serif">Lv.{city.lv}</text>
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/* ── CITY PANEL ── */
function CityPanel({city,char,region,cleared,gColor,onClose,onTravel,onBattle}){
  const isAvail=canVisit(city.id,char,region);
  const isCl=!!cleared[city.id];
  const isCur=city.id===char.currentCity;
  const gc2=GENRES[city.g]?.c||"#888";
  return(
    <div style={{background:BG2,border:`2px solid ${gc2}66`,borderRadius:10,padding:14,marginBottom:10,animation:"su .25s ease"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
        <div style={{display:"flex",gap:10,alignItems:"center"}}>
          <span style={{fontSize:30}}>{city.ch.e}</span>
          <div>
            <div style={{fontWeight:700,fontSize:14,color:gc2,fontFamily:"M PLUS Rounded 1c,sans-serif"}}>{city.name}</div>
            <div style={{fontSize:10,color:TX3}}>{GENRES[city.g]?.e} {GENRES[city.g]?.jp} · Lv.{city.lv}+</div>
          </div>
        </div>
        <button onClick={onClose} style={{color:TX3,fontSize:20,padding:"0 6px",lineHeight:1}}>✕</button>
      </div>
      <div style={{fontSize:11,color:TX2,lineHeight:1.7,marginBottom:10,fontFamily:"M PLUS Rounded 1c,sans-serif"}}>{city.desc}</div>
      <div style={{background:"#0a0a1c",border:"1px solid #2a2a50",borderRadius:6,padding:"8px 12px",marginBottom:10}}>
        <div style={{fontSize:11,fontFamily:"M PLUS Rounded 1c,sans-serif",marginBottom:4}}>
          <span style={{color:"#ff6b6b",fontWeight:700}}>⚔️ BOSS: {city.ch.name}</span>
          <span style={{color:TX3,marginLeft:10,fontSize:10}}>POWER {city.ch.pw}</span>
        </div>
        <div style={{display:"flex",flexWrap:"wrap",gap:12}}>
          <span style={{fontSize:10,color:"#ffd60a"}}>+{city.rw.exp} EXP</span>
          <span style={{fontSize:10,color:"#b3ff00",fontWeight:700}}>{fc(city.rw.coins)} 賞金</span>
          {city.rw.title&&<span style={{fontSize:10,color:"#ce93d8"}}>🎖 {city.rw.title}</span>}
        </div>
      </div>
      {isCl?<div style={{fontSize:12,color:"#60c080",textAlign:"center",padding:"8px",fontFamily:"M PLUS Rounded 1c,sans-serif",fontWeight:700}}>✓ クリア済み！</div>:(
        <div style={{display:"flex",gap:8}}>
          {!isCur&&<Btn disabled={!isAvail||char.energy<5} col="#0a1828" tc="#00e5ff" onClick={()=>onTravel(city)} sx={{flex:1,fontSize:11,border:"1px solid #1a4870"}}>{isAvail?"📍 移動 ⚡5":"🔒 未開通"}</Btn>}
          {isCur&&<Btn disabled={char.energy<20} col="#280a0a" tc="#ff7070" onClick={()=>onBattle(city)} sx={{flex:2,fontSize:12,padding:"11px",border:"1px solid #5a1818",fontWeight:700}}>{char.energy<20?"⚡ エネルギー不足(20必要)":"⚔️ ボスに挑む！"}</Btn>}
        </div>
      )}
    </div>
  );
}

/* ── MAP TAB ── */
function MapTab({char,setChar,genre,pushNotif,addLog}){
  const[region,setRegion]=useState(()=>{if(U[char.currentCity])return"usa";if(W[char.currentCity])return"world";return"japan";});
  const[selected,setSelected]=useState(null);
  const[battle,setBattle]=useState(null);
  const cleared=char.clearedCities||{};
  const usaOk=!!cleared["tokyo"]||!!U[char.hometown];
  const wldOk=!!cleared["ny"]||!!W[char.hometown];

  function travel(city){
    if(char.energy<5){pushNotif("エネルギー不足！","#ff5555");return;}
    setChar(c=>({...c,currentCity:city.id,energy:Math.max(0,c.energy-5)}));
    pushNotif(`${city.name}に移動！`,GENRES[city.g].c);
    addLog(`📍 ${city.name}に移動`);setSelected(city);
  }
  async function startBattle(city){
    if(char.energy<20){pushNotif("エネルギー不足！","#ff5555");return;}
    const eb=bonus(char.equipped||{});const ts={};
    Object.entries(char.stats).forEach(([k,v])=>{ts[k]=v+(eb[k]||0);});
    const mp=pow(ts)+Math.floor(Math.random()*40),tp=city.ch.pw+Math.floor(Math.random()*30);
    const won=mp>=tp;
    setBattle({phase:"fighting",opp:city.ch.name,ait:"",ail:true});
    const narr=await ai(`ダンスバトル：${char.name}（${genre.name}）vs ${city.ch.name}（${city.name}）。${won?"劇的な勝利":"惜しい敗北"}！2〜3文で実況。`);
    const eg=won?city.rw.exp:Math.floor(city.rw.exp*.2),coins=won?city.rw.coins:Math.floor(city.rw.coins*.05);
    const nt=won&&city.rw.title&&!char.titles?.includes(city.rw.title)?city.rw.title:null;
    setChar(c=>({...c,exp:c.exp+eg,coins:c.coins+coins,energy:Math.max(0,c.energy-20),
      mood:won?Math.min(100,c.mood+20):Math.max(0,c.mood-15),
      battlesWon:won?c.battlesWon+1:c.battlesWon,
      titles:nt?[...(c.titles||[]),nt]:c.titles||[],
      clearedCities:won?{...cleared,[city.id]:true}:cleared}));
    setBattle({phase:"result",won,eg,coins,title:nt,narr,mp,tp,opp:city.ch.name});
    addLog(`${won?"🏆 CLEAR":"💀 敗北"} ${city.name} +${eg}EXP`);
  }
  const curCity=allC()[char.currentCity];
  return(
    <div>
      {battle&&<BOvl state={battle} gc={genre.c} onClose={()=>setBattle(null)}/>}
      <div style={{display:"flex",gap:6,marginBottom:10}}>
        {[["japan","🇯🇵 日本",true],["usa","🇺🇸 USA",usaOk],["world","🌍 WORLD",wldOk]].map(([r,label,ok])=>(
          <button key={r} onClick={()=>{if(ok){setRegion(r);setSelected(null);}else pushNotif("まず前のエリアを制覇！","#ff5555");}}
            style={{flex:1,padding:"8px 4px",fontSize:9,fontFamily:"M PLUS Rounded 1c,sans-serif",fontWeight:700,
              background:region===r?`${genre.c}30`:ok?BG2:"#0c0c1a",color:region===r?genre.c:ok?TX2:"#303060",
              border:`1px solid ${region===r?genre.c+"88":ok?BD:"#1a1a38"}`,borderRadius:7,transition:"all .15s"}}>
            {ok?label:`🔒 ${r.toUpperCase()}`}
          </button>
        ))}
      </div>
      {curCity&&<div style={{fontSize:10,color:TX2,marginBottom:8,textAlign:"center",fontFamily:"M PLUS Rounded 1c,sans-serif"}}>現在地: <span style={{color:GENRES[curCity.g]?.c,fontWeight:700}}>{GENRES[curCity.g]?.e} {curCity.name}</span>{cleared[char.currentCity]&&<span style={{color:TX3}}> ✓</span>}</div>}
      <div style={{border:`1px solid ${BD}`,borderRadius:10,overflow:"hidden",marginBottom:10}}>
        <MapSVG region={region} char={char} selected={selected} onSelect={setSelected}/>
      </div>
      {selected&&<CityPanel city={selected} char={char} region={region} cleared={cleared} gColor={genre.c} onClose={()=>setSelected(null)} onTravel={travel} onBattle={startBattle}/>}
      <OnlineArena char={char} setChar={setChar} genre={genre} pushNotif={pushNotif} addLog={addLog}/>
    </div>
  );
}

/* ── ONLINE ARENA ── */
function OnlineArena({char,setChar,genre,pushNotif,addLog}){
  const[open,setOpen]=useState(false);
  const[players,setPlayers]=useState([]);
  const[loading,setLoading]=useState(false);
  const[fighting,setFighting]=useState(null);
  const[result,setResult]=useState(null);
  const[ait,setAit]=useState("");const[ail,setAil]=useState(false);
  const mp=pow({...char.stats,...bonus(char.equipped||{})});
  const pk=`dancer:${(char.name+char.genre).replace(/\W/g,"_")}`;
  const hasStorage=typeof window!=="undefined"&&window.storage;

  async function reload(){
    if(!hasStorage)return;
    setLoading(true);
    try{
      await window.storage.set(pk,JSON.stringify({name:char.name,genre:char.genre,hometown:char.hometown,power:mp,lv:getLv(char.exp),fame:char.fame,t:Date.now()}),true);
      const res=await window.storage.list("dancer:",true);
      const keys=(res?.keys)||[];
      const others=keys.filter(k=>k!==pk).slice(0,16);
      const data=[];
      for(const k of others){try{const r=await window.storage.get(k,true);if(r){const p=JSON.parse(r.value);if(Date.now()-p.t<7*24*3600*1000)data.push(p);}}catch{}}
      setPlayers(data.sort((a,b)=>b.power-a.power));
    }catch(e){console.error(e);}
    setLoading(false);
  }

  async function fight(opp){
    if(char.energy<20){pushNotif("エネルギー不足！","#ff5555");return;}
    setFighting(opp.name);setResult(null);setAit("");setAil(true);
    const myP=mp+Math.floor(Math.random()*50),thP=opp.power+Math.floor(Math.random()*40);
    const won=myP>=thP;
    const prize=won?Math.floor(opp.power*14+800):Math.floor(opp.power*1.5);
    const eg=won?Math.floor(opp.power*2.5+120):Math.floor(opp.power*.4+30);
    const narr=await ai(`全国オンラインダンスバトル！${char.name}（${GENRES[char.genre]?.jp}）vs ${opp.name}（${GENRES[opp.genre]?.jp||opp.genre}）。${won?"劇的な勝利":"惜しい敗北"}！`);
    setAit(narr);setAil(false);
    setChar(c=>({...c,exp:c.exp+eg,coins:c.coins+prize,energy:Math.max(0,c.energy-20),mood:won?Math.min(100,c.mood+20):Math.max(0,c.mood-15),battlesWon:won?c.battlesWon+1:c.battlesWon}));
    setFighting(null);setResult({won,eg,prize,opp,narr,myP,thP});
    addLog(`🌐 ${won?"勝利":"敗北"} vs ${opp.name} +${eg}EXP ${fc(prize)}`);
  }
  return(
    <div style={{marginTop:12,border:`1px solid ${BD}`,borderRadius:8,overflow:"hidden"}}>
      <button onClick={()=>{setOpen(o=>{if(!o)reload();return!o;});}} style={{width:"100%",padding:"12px 14px",display:"flex",justifyContent:"space-between",alignItems:"center",background:BG2,fontFamily:"M PLUS Rounded 1c,sans-serif",color:TX2,fontSize:12,fontWeight:700}}>
        <span>🌐 オンライン全国バトル（賞金制）</span><span style={{fontSize:10,color:TX3}}>{open?"▲":"▼"}</span>
      </button>
      {open&&(
        <div style={{padding:12,background:BG}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <div style={{fontSize:10,color:TX2,fontFamily:"M PLUS Rounded 1c,sans-serif"}}>POWER: <span style={{color:"#ffd60a",fontWeight:700}}>{mp}</span><span style={{color:TX3,fontSize:9}}> · {players.length}人参戦中</span></div>
            <Btn onClick={reload} sx={{fontSize:9,padding:"5px 10px"}}>{loading?"⏳":"🔄 更新"}</Btn>
          </div>
          {fighting&&<AIB text={ait} loading={ail}/>}
          {result&&(
            <div style={{background:result.won?"#0a2010":"#200a0a",border:`1px solid ${result.won?"#2a6030":"#602a2a"}`,borderRadius:8,padding:12,marginBottom:10}}>
              <div style={{fontFamily:"'Press Start 2P',monospace",fontSize:10,color:result.won?"#b3ff00":"#ff6b6b",marginBottom:6}}>{result.won?"🏆 WIN!":"💀 LOSE..."}</div>
              <div style={{fontSize:11,color:TX2,marginBottom:4,fontFamily:"M PLUS Rounded 1c,sans-serif"}}>vs {result.opp.name} · {result.myP} vs {result.thP}</div>
              {result.narr&&<div style={{fontSize:11,color:TX2,lineHeight:1.6,marginBottom:6,fontFamily:"M PLUS Rounded 1c,sans-serif"}}>{result.narr}</div>}
              <div style={{display:"flex",gap:14}}><span style={{color:"#ffd60a",fontSize:12}}>+{result.eg} EXP</span><span style={{color:"#b3ff00",fontSize:12,fontWeight:700}}>賞金 {fc(result.prize)}</span></div>
              <Btn onClick={()=>setResult(null)} sx={{marginTop:8,fontSize:10}}>閉じる</Btn>
            </div>
          )}
          {players.length===0&&!loading&&(
            <div style={{textAlign:"center",color:TX3,fontSize:11,padding:"20px 0",fontFamily:"M PLUS Rounded 1c,sans-serif"}}>
              参戦者なし。登録して最初のダンサーになろう！<br/>
              <Btn onClick={reload} sx={{marginTop:8,fontSize:10}}>参戦登録</Btn>
            </div>
          )}
          {players.map((p,i)=>{
            const diff=p.power<mp-60?"easy":p.power>mp+60?"hard":"fair";
            const dc={easy:"#81c784",fair:"#ffcc02",hard:"#ff6b6b"}[diff];
            const prize=Math.floor(p.power*14+800);
            return(
              <div key={i} style={{background:BG2,border:`1px solid ${i===0?"#ffd60a44":BD}`,borderRadius:7,padding:"10px 12px",marginBottom:8}}>
                {i===0&&<div style={{fontFamily:"'Press Start 2P',monospace",fontSize:7,color:"#ffd60a",marginBottom:5}}>👑 RANK 1</div>}
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <div><div style={{fontWeight:700,fontSize:12,color:TX,fontFamily:"M PLUS Rounded 1c,sans-serif"}}>{p.name}</div><div style={{fontSize:9,color:TX3}}>{GENRES[p.genre]?.jp||p.genre}{p.hometown?` · ${allC()[p.hometown]?.name||p.hometown}出身`:""} · Lv.{p.lv}</div></div>
                  <span style={{fontSize:9,color:dc,background:`${dc}22`,padding:"2px 7px",borderRadius:3,alignSelf:"flex-start",border:`1px solid ${dc}44`}}>{diff==="easy"?"楽勝":diff==="fair"?"互角":"強敵"}</span>
                </div>
                <div style={{display:"flex",gap:12,marginBottom:8}}><span style={{fontSize:10,color:"#ff7c3a"}}>POWER {p.power}</span><span style={{fontSize:10,color:"#b3ff00",fontWeight:700}}>賞金 {fc(prize)}</span></div>
                <Btn disabled={!!fighting||char.energy<20} col="#200a0a" tc="#ff7070" onClick={()=>fight(p)} full sx={{fontSize:11,border:"1px solid #501818"}}>{fighting===p.name?"⚔️ バトル中...":"⚔️ 挑戦 ⚡20"}</Btn>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── BATTLE TAB ── */
function BattleTab({char,setChar,genre,pushNotif,addLog}){
  const[sub,setSub]=useState("battle");
  const[battle,setBattle]=useState(null);
  const[showAI,setShowAI]=useState({text:"",loading:false});
  const lv=getLv(char.exp);
  const mp=pow({...char.stats,...bonus(char.equipped||{})});

  async function fight(opp){
    if(char.energy<15){pushNotif("エネルギー不足！⚡15必要","#ff5555");return;}
    const eb=bonus(char.equipped||{});const ts={};
    Object.entries(char.stats).forEach(([k,v])=>{ts[k]=v+(eb[k]||0);});
    const myP=pow(ts)+Math.floor(Math.random()*40),thP=opp.pw+Math.floor(Math.random()*30);
    const won=myP>=thP;
    setBattle({phase:"fighting",opp:opp.name,ait:"",ail:true});
    const narr=await ai(`ダンスバトル：${char.name}（${genre.name}）vs ${opp.name}（${opp.style}）。${won?"劇的な勝利":"惜しい敗北"}！2〜3文で実況。`);
    const eg=won?opp.rw.exp:Math.floor(opp.rw.exp*.25),coins=won?opp.rw.coins:Math.floor(opp.rw.coins*.1);
    const nt=won&&opp.rw.title&&!char.titles?.includes(opp.rw.title)?opp.rw.title:null;
    setChar(c=>({...c,exp:c.exp+eg,coins:c.coins+coins,energy:Math.max(0,c.energy-15),
      mood:won?Math.min(100,c.mood+18):Math.max(0,c.mood-12),
      battlesWon:won?c.battlesWon+1:c.battlesWon,
      titles:nt?[...(c.titles||[]),nt]:c.titles||[]}));
    setBattle({phase:"result",won,eg,coins,title:nt,narr,mp:myP,tp:thP,opp:opp.name});
    addLog(`${won?"🏆 勝利":"💀 敗北"} vs ${opp.name} +${eg}EXP ${fc(coins)}`);
  }

  async function doShow(show){
    if(lv<show.lv){pushNotif(`Lv.${show.lv}が必要！`,"#ff5555");return;}
    if(char.energy<show.ec){pushNotif(`エネルギー不足！⚡${show.ec}必要`,"#ff5555");return;}
    setShowAI({text:"",loading:true});
    const eg=show.rw.exp+Math.floor(show.rw.exp*Math.random()*.35);
    const coins=show.rw.coins+Math.floor(show.rw.coins*Math.random()*.4);
    const narr=await ai(`ダンサー${char.name}（${genre.name}）が「${show.name}」（${show.venue}）で公演！観客が熱狂する感動のステージを2〜3文で描写。`);
    setShowAI({text:narr,loading:false});
    setChar(c=>({...c,exp:c.exp+eg,coins:c.coins+coins,fame:c.fame+show.rw.fame,energy:Math.max(0,c.energy-show.ec),mood:Math.min(100,c.mood+30),showsDone:c.showsDone+1}));
    pushNotif(`🎭 ${show.name}完了！ +${eg}EXP ${fc(coins)}`,genre.c);
    addLog(`🎭「${show.name}」+${eg}EXP ${fc(coins)} +${show.rw.fame}FAME`);
  }

  return(
    <div>
      {battle&&<BOvl state={battle} gc={genre.c} onClose={()=>setBattle(null)}/>}
      <div style={{display:"flex",background:BG2,borderRadius:8,padding:3,gap:2,marginBottom:14}}>
        {[["battle","⚔️ バトル"],["show","🎭 ショー・発表会"]].map(([id,label])=>(
          <button key={id} onClick={()=>setSub(id)} style={{flex:1,padding:"9px 4px",fontSize:11,fontFamily:"M PLUS Rounded 1c,sans-serif",fontWeight:700,background:sub===id?genre.c+"33":"none",color:sub===id?genre.c:TX3,borderRadius:6,border:sub===id?`1px solid ${genre.c}66`:"1px solid transparent",transition:"all .15s"}}>{label}</button>
        ))}
      </div>

      {sub==="battle"&&(
        <div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <div style={{fontFamily:"'Press Start 2P',monospace",fontSize:7,color:TX3}}>QUICK BATTLE ⚡15</div>
            <div style={{fontSize:11,color:"#ffd60a"}}>MY POWER <span style={{fontWeight:700}}>{mp}</span></div>
          </div>
          {QOPPS.map(opp=>{
            const diff=opp.pw<mp-60?"easy":opp.pw>mp+60?"hard":"fair";
            const dc={easy:"#81c784",fair:"#ffcc02",hard:"#ff6b6b"}[diff];
            return(
              <div key={opp.id} style={{background:BG2,border:`1px solid ${BD}`,borderRadius:9,padding:"12px 14px",marginBottom:10}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                  <div style={{display:"flex",gap:10,alignItems:"center"}}>
                    <span style={{fontSize:28}}>{opp.e}</span>
                    <div><div style={{fontWeight:700,fontSize:13,color:TX,fontFamily:"M PLUS Rounded 1c,sans-serif"}}>{opp.name}</div><div style={{fontSize:10,color:TX3}}>{opp.style} · Lv.{opp.lv}</div></div>
                  </div>
                  <span style={{fontSize:10,color:dc,background:`${dc}22`,padding:"3px 8px",borderRadius:4,border:`1px solid ${dc}44`}}>{diff==="easy"?"楽勝":diff==="fair"?"互角":"強敵"}</span>
                </div>
                <div style={{display:"flex",gap:14,marginBottom:8}}>
                  <span style={{fontSize:10,color:"#ff7c3a"}}>POWER {opp.pw}</span>
                  <span style={{fontSize:10,color:"#ffd60a"}}>+{opp.rw.exp}EXP</span>
                  <span style={{fontSize:10,color:"#b3ff00",fontWeight:700}}>{fc(opp.rw.coins)}</span>
                </div>
                {opp.rw.title&&<div style={{fontSize:10,color:"#ce93d8",marginBottom:8}}>🎖 {opp.rw.title}</div>}
                <Btn disabled={char.energy<15} col="#280a0a" tc="#ff7070" onClick={()=>fight(opp)} full sx={{fontSize:11,border:"1px solid #5a1818"}}>{char.energy<15?"⚡ エネルギー不足":"⚔️ バトル開始 ⚡15"}</Btn>
              </div>
            );
          })}
        </div>
      )}

      {sub==="show"&&(
        <div>
          <div style={{fontFamily:"'Press Start 2P',monospace",fontSize:7,color:TX3,marginBottom:8}}>SHOW & 発表会</div>
          <div style={{fontSize:11,color:TX2,marginBottom:14,lineHeight:1.6,fontFamily:"M PLUS Rounded 1c,sans-serif"}}>出演してEXP・賞金・FAMEを稼ごう！レベルが上がると大きな舞台へ。</div>
          <AIB text={showAI.text} loading={showAI.loading}/>
          <div style={{marginTop:showAI.text||showAI.loading?12:0}}>
            {SHOWS.map(show=>{
              const ok=lv>=show.lv;const can=ok&&char.energy>=show.ec;
              return(
                <div key={show.id} style={{background:ok?BG2:"#0c0c1c",border:`2px solid ${ok?(can?genre.c+"44":BD):"#1a1a30"}`,borderRadius:10,padding:"14px",marginBottom:12,opacity:ok?1:0.55}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                    <div style={{display:"flex",gap:10,alignItems:"center"}}>
                      <span style={{fontSize:30}}>{show.e}</span>
                      <div><div style={{fontWeight:700,fontSize:13,color:ok?TX:"#555",fontFamily:"M PLUS Rounded 1c,sans-serif"}}>{show.name}</div><div style={{fontSize:10,color:TX3}}>📍 {show.venue}</div></div>
                    </div>
                    {!ok&&<span style={{fontSize:10,color:"#4050a0",background:"#14142a",padding:"4px 8px",borderRadius:4}}>Lv.{show.lv}〜</span>}
                  </div>
                  <div style={{fontSize:11,color:TX3,marginBottom:10,fontFamily:"M PLUS Rounded 1c,sans-serif"}}>{show.desc}</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:14,marginBottom:10,padding:"8px 12px",background:"#0a0a1c",borderRadius:6}}>
                    <span style={{fontSize:11,color:"#ffd60a"}}>+{show.rw.exp}〜EXP</span>
                    <span style={{fontSize:11,color:"#b3ff00",fontWeight:700}}>{fc(show.rw.coins)}〜 賞金</span>
                    <span style={{fontSize:11,color:"#ff9ec4"}}>+{show.rw.fame} FAME</span>
                    <span style={{fontSize:10,color:"#00e5ff"}}>⚡{show.ec}</span>
                  </div>
                  <Btn disabled={!can} col={can?"#0a200a":"#111"} tc={can?"#90e890":"#404060"} onClick={()=>doShow(show)} full sx={{fontSize:12,padding:"11px",border:can?"1px solid #2a5a2a":"1px solid #1a1a30",fontWeight:700}}>
                    {!ok?`🔒 Lv.${show.lv}で解放`:!can?"⚡ エネルギー不足":`🎭 出演する ⚡${show.ec}`}
                  </Btn>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── HOME TAB ── */
function HomeTab({char,genre,log,onRest,onEat,onTrain,aiText,aiLoading}){
  const curCity=allC()[char.currentCity];
  const eb=bonus(char.equipped||{});
  const bs=Object.entries(eb).map(([k,v])=>`${SM[k].jp}+${v}`).join(" · ");
  const moves=[...(MOVES[char.genre]||[]),...CMOVES];
  return(
    <div>
      <div style={{textAlign:"center",padding:"14px 0 10px",background:`radial-gradient(circle at 50% 60%,${genre.c}20,transparent 70%)`,borderRadius:12,marginBottom:12,border:`1px solid ${genre.c}30`}}>
        <div style={{display:"inline-block",animation:"fl 3.5s ease-in-out infinite"}}><DancerSVG genre={char.genre} mood={char.mood} energy={char.energy} equipped={char.equipped} size={112}/></div>
        <div style={{color:genre.c,fontSize:12,fontWeight:700,marginTop:4,fontFamily:"M PLUS Rounded 1c,sans-serif"}}>{char.name}</div>
        {curCity&&<div style={{fontSize:10,color:TX2,marginTop:2}}>{GENRES[curCity.g]?.e} {curCity.name}{char.clearedCities?.[char.currentCity]?" ✓":""}</div>}
        {bs&&<div style={{fontSize:9,color:genre.c,marginTop:4,opacity:.8}}>装備ボーナス: {bs}</div>}
      </div>
      <div style={{background:BG2,borderRadius:8,padding:"12px 14px",marginBottom:10,border:`1px solid ${BD}`}}>
        <div style={{fontFamily:"'Press Start 2P',monospace",fontSize:7,color:TX3,marginBottom:10}}>VITALS</div>
        <VBar label="エネルギー" val={char.energy} col="#00e5ff"/>
        <VBar label="気分" val={char.mood} col="#ff9ec4"/>
        <VBar label="お腹" val={char.hunger} col="#ffd60a"/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
        <Btn col="#0a1828" tc="#00e5ff" onClick={onRest} sx={{border:"1px solid #1a4870"}}>💤 休息</Btn>
        <Btn col="#1a0a2a" tc="#ff9ec4" onClick={onEat} sx={{border:"1px solid #4a1a6a"}}>🍱 食事</Btn>
      </div>
      <AIB text={aiText} loading={aiLoading}/>
      <div style={{fontFamily:"'Press Start 2P',monospace",fontSize:7,color:TX3,marginBottom:10,marginTop:14}}>TRAINING ⚡{char.energy}</div>
      {moves.map(move=>{
        const can=char.energy>=move.cost;
        return(
          <div key={move.id} style={{background:BG2,border:`1px solid ${BD}`,borderRadius:8,padding:"11px 13px",marginBottom:9,opacity:can?1:.5}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
              <div style={{fontWeight:700,fontSize:13,color:TX,fontFamily:"M PLUS Rounded 1c,sans-serif"}}>{move.name}</div>
              <div style={{display:"flex",gap:10}}><span style={{fontSize:10,color:can?"#00e5ff":"#ff5555"}}>⚡{move.cost}</span><span style={{fontSize:10,color:"#ffd60a"}}>+{move.exp}EXP~</span></div>
            </div>
            <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:7}}>
              {Object.entries(move.g).map(([k,v])=><Tag key={k} col={SM[k].c}>{SM[k].jp}+{v}</Tag>)}
            </div>
            <Btn disabled={!can} col={can?genre.c:"#1a1a30"} tc={can?"#000":"#404060"} onClick={()=>onTrain(move)} full sx={{fontSize:11,padding:"8px"}}>練習する →</Btn>
          </div>
        );
      })}
      {log.length>0&&(
        <div style={{background:BG2,borderRadius:8,padding:"12px 14px",border:`1px solid ${BD}`,marginTop:12}}>
          <div style={{fontFamily:"'Press Start 2P',monospace",fontSize:7,color:TX3,marginBottom:8}}>LOG</div>
          {log.slice(0,6).map(e=><div key={e.id} style={{fontSize:11,color:TX3,borderBottom:"1px solid #1e1e38",padding:"5px 0",fontFamily:"M PLUS Rounded 1c,sans-serif"}}>{e.msg}</div>)}
        </div>
      )}
    </div>
  );
}

/* ── SHOP TAB ── */
function ShopTab({char,setChar,genre,pushNotif}){
  const[sub,setSub]=useState("costumes");
  const items=SHOP[sub]||[];
  function buy(item){
    const lv=getLv(char.exp);
    if(item.lv&&lv<item.lv){pushNotif(`Lv.${item.lv}で解放！（現在Lv.${lv}）`,"#ff5555");return;}
    if(char.coins<item.p){pushNotif("コインが足りない！","#ff5555");return;}
    if(char.inventory?.includes(item.id)){pushNotif("すでに所持済み！","#ffcc02");return;}
    setChar(c=>({...c,coins:c.coins-item.p,inventory:[...(c.inventory||[]),item.id]}));
    pushNotif(`${item.n} 購入！`,genre.c);
  }
  function equip(item){
    if(sub==="costumes")setChar(c=>({...c,equipped:{...c.equipped,costume:c.equipped?.costume===item.id?null:item.id}}));
    else if(sub==="sneakers")setChar(c=>({...c,equipped:{...c.equipped,sneakers:c.equipped?.sneakers===item.id?null:item.id}}));
    else setChar(c=>({...c,equipped:{...c.equipped,accessories:togAcc(item.id,c.equipped?.accessories||[])}}));
    pushNotif("装備を更新！","#b3ff00");
  }
  function isEq(item){
    if(sub==="costumes")return char.equipped?.costume===item.id;
    if(sub==="sneakers")return char.equipped?.sneakers===item.id;
    return(char.equipped?.accessories||[]).includes(item.id);
  }
  const slotLabel={neck:"首",face:"顔",forehead:"額",head:"頭",hand:"手"};
  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
        <div style={{fontFamily:"'Press Start 2P',monospace",fontSize:7,color:TX3}}>SHOP</div>
        <div style={{fontSize:13,color:"#b3ff00",fontWeight:700}}>{fc(char.coins)}</div>
      </div>
      <div style={{display:"flex",background:BG2,borderRadius:8,padding:3,gap:2,marginBottom:14}}>
        {[["costumes","衣装"],["sneakers","スニーカー"],["accessories","アクセサリー"]].map(([id,label])=>(
          <button key={id} onClick={()=>setSub(id)} style={{flex:1,padding:"7px 2px",fontSize:9,fontFamily:"M PLUS Rounded 1c,sans-serif",fontWeight:700,background:sub===id?genre.c+"33":"none",color:sub===id?genre.c:TX3,borderRadius:6,border:sub===id?`1px solid ${genre.c}66`:"1px solid transparent",transition:"all .15s"}}>{label}</button>
        ))}
      </div>
      {sub==="accessories"&&(char.equipped?.accessories||[]).length>0&&(
        <div style={{background:BG3,borderRadius:6,padding:"8px 12px",marginBottom:10,fontSize:10,color:TX2,fontFamily:"M PLUS Rounded 1c,sans-serif"}}>
          装備中: {(char.equipped?.accessories||[]).map(id=>SHOP.accessories.find(x=>x.id===id)?.n||id).join(" + ")}
        </div>
      )}
      {items.map(item=>{
        const owned=char.inventory?.includes(item.id);const eq=isEq(item);const canBuy=char.coins>=item.p;
        const lv=getLv(char.exp);
        const lvLocked=item.lv&&lv<item.lv;
        return(
          <div key={item.id} style={{background:eq?`${genre.c}18`:lvLocked?"#0c0c18":BG2,border:`1px solid ${eq?genre.c+"66":lvLocked?"#1a1a30":BD}`,borderRadius:8,padding:"12px 14px",marginBottom:10,opacity:lvLocked?0.55:1}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
              <div style={{flex:1}}>
                {sub==="sneakers"&&!lvLocked&&<div style={{display:"flex",gap:5,marginBottom:5}}><div style={{width:26,height:12,borderRadius:3,background:item.col,border:"1px solid #444"}}/><div style={{width:26,height:6,borderRadius:2,background:item.sol,border:"1px solid #444",marginTop:3}}/></div>}
                {sub==="accessories"&&item.slot&&<span style={{fontSize:9,color:TX3,background:BG3,padding:"2px 6px",borderRadius:3,marginBottom:4,display:"inline-block",border:`1px solid ${BD}`}}>{slotLabel[item.slot]}スロット</span>}
                <div style={{fontWeight:700,fontSize:13,color:eq?genre.c:lvLocked?"#444":TX,fontFamily:"M PLUS Rounded 1c,sans-serif",marginTop:sub==="accessories"?4:0}}>{eq&&"✦ "}{item.n}</div>
                <div style={{fontSize:10,color:TX3,marginTop:2}}>{item.desc}</div>
              </div>
              <div style={{marginLeft:8,textAlign:"right"}}>
                {lvLocked?(
                  <div style={{fontSize:11,color:"#4050a0",fontWeight:700,background:"#14142a",padding:"4px 8px",borderRadius:4,border:"1px solid #2a2a50"}}>🔒 Lv.{item.lv}</div>
                ):(
                  <div style={{fontSize:12,color:owned?"#60c080":canBuy?"#b3ff00":"#ff6060",fontWeight:700}}>{owned?"所持済み":fc(item.p)}</div>
                )}
              </div>
            </div>
            {!lvLocked&&<div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:8}}>{Object.entries(item.b).map(([k,v])=><Tag key={k} col={SM[k]?.c||"#888"}>{SM[k]?.jp}+{v}</Tag>)}</div>}
            {lvLocked&&<div style={{fontSize:10,color:"#303060",fontFamily:"M PLUS Rounded 1c,sans-serif",marginBottom:8}}>Lv.{item.lv}に到達すると解放！ステータス+{Object.entries(item.b).map(([k,v])=>`${SM[k]?.jp}${v}`).join("/")}</div>}
            {!lvLocked&&(
              <div style={{display:"flex",gap:8}}>
                {!owned&&<Btn disabled={!canBuy} col="#0a1e0a" tc="#80e080" onClick={()=>buy(item)} sx={{flex:1,fontSize:11,border:"1px solid #1a4a1a"}}>購入 {fc(item.p)}</Btn>}
                {owned&&<Btn col={eq?"#200a0a":"#0a1a20"} tc={eq?"#ff8080":"#80d0f0"} onClick={()=>equip(item)} sx={{flex:1,fontSize:11,border:eq?"1px solid #4a1a1a":"1px solid #1a4a5a"}}>{eq?"外す":"装備する"}</Btn>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── STATUS TAB ── */
function StatusTab({char,lv,rnk,genre,setChar}){
  const eb=bonus(char.equipped||{});
  const ts={};Object.entries(char.stats).forEach(([k,v])=>{ts[k]=v+(eb[k]||0);});
  const p=pow(ts);const nr=RANKS.find(r=>r.lv>lv);
  const cc=Object.keys(char.clearedCities||{}).length;
  return(
    <div>
      <div style={{background:BG2,border:`1px solid ${genre.c}40`,borderRadius:10,padding:14,marginBottom:14,textAlign:"center"}}>
        <div style={{display:"inline-block"}}><DancerSVG genre={char.genre} mood={char.mood} energy={char.energy} equipped={char.equipped} size={100}/></div>
        <div style={{fontWeight:900,fontSize:15,color:TX,marginTop:4,fontFamily:"M PLUS Rounded 1c,sans-serif"}}>{char.name}</div>
        <div style={{fontSize:10,color:rnk.c,fontWeight:700,marginTop:4}}>★ {rnk.jp} ★</div>
        <div style={{fontSize:10,color:TX2,marginTop:4}}>{genre.jp} · Lv.{lv} · POWER {p}</div>
        <div style={{fontSize:10,color:TX3,marginTop:2}}>FAME {char.fame} · {fc(char.coins)} · 制覇 {cc}/{Object.keys(allC()).length}都市</div>
        {nr&&<div style={{fontSize:9,color:TX3,marginTop:6}}>次のランク「{nr.jp}」→ Lv.{nr.lv}</div>}
      </div>

      {/* ジャンル変更 */}
      <div style={{background:BG2,border:`1px solid ${BD}`,borderRadius:8,padding:"14px 16px",marginBottom:12}}>
        <div style={{fontFamily:"'Press Start 2P',monospace",fontSize:7,color:TX3,marginBottom:10}}>STYLE CHANGE</div>
        <div style={{fontSize:11,color:TX2,marginBottom:10,fontFamily:"M PLUS Rounded 1c,sans-serif"}}>
          ジャンルを変更できる。費用: <span style={{color:"#b3ff00",fontWeight:700}}>{fc(5000)}</span> · スタッツは半分引き継ぎ
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
          {Object.entries(GENRES).filter(([k])=>k!==char.genre).map(([key,g])=>(
            <button key={key} onClick={()=>{
              if(char.coins<5000){alert("コインが足りない！¥5,000必要");return;}
              if(!window.confirm(`${g.jp}に変更しますか？¥5,000消費します`))return;
              const newStats={};
              Object.entries(char.stats).forEach(([k,v])=>{newStats[k]=Math.floor(v/2);});
              Object.entries(BASE[key]).forEach(([k,v])=>{newStats[k]=(newStats[k]||0)+v;});
              setChar(c=>({...c,genre:key,coins:c.coins-5000,stats:newStats}));
            }} style={{padding:"8px 6px",borderRadius:7,background:BG3,border:`1px solid ${g.c}55`,cursor:"pointer",textAlign:"left"}}>
              <span style={{fontSize:16}}>{g.e}</span>
              <div style={{fontSize:10,color:g.c,fontWeight:700,fontFamily:"M PLUS Rounded 1c,sans-serif"}}>{g.jp}</div>
            </button>
          ))}
        </div>
      </div>
      <div style={{background:BG2,border:`1px solid ${BD}`,borderRadius:8,padding:"14px 16px",marginBottom:12}}>
        <div style={{fontFamily:"'Press Start 2P',monospace",fontSize:7,color:TX3,marginBottom:12}}>STATS</div>
        {Object.entries(char.stats).map(([k,v])=>{const b=eb[k]||0;return<SBar key={k} label={`${SM[k].jp}${b?` (+${b})`:""}`} val={v+b} col={SM[k].c} max={Math.max(40,v+b+5)}/>;  })}
      </div>
      {char.titles?.length>0&&(
        <div style={{background:BG2,border:`1px solid ${BD}`,borderRadius:8,padding:"12px 14px"}}>
          <div style={{fontFamily:"'Press Start 2P',monospace",fontSize:7,color:TX3,marginBottom:10}}>TITLES</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:7}}>{char.titles.map(t=><span key={t} style={{fontSize:11,padding:"5px 12px",borderRadius:20,background:"#1a0a2a",color:"#ce93d8",border:"1px solid #3a1a5a",fontFamily:"M PLUS Rounded 1c,sans-serif"}}>🎖 {t}</span>)}</div>
        </div>
      )}
    </div>
  );
}

/* ── ENERGY BAR ── */
function EnergyBar({char}){
  const[tick,setTick]=useState(0);
  useEffect(()=>{const t=setInterval(()=>setTick(n=>n+1),10000);return()=>clearInterval(t);},[]);
  const MAX=char.maxEnergy||50;
  const cur=char.energy;
  const REGEN_MS=5*60*1000;
  const now=Date.now();
  const last=char.lastEnergyTime||now;
  const elapsed=(now-last)%REGEN_MS;
  const nextMs=cur<MAX?Math.max(0,REGEN_MS-elapsed):0;
  const nextMins=Math.floor(nextMs/60000);
  const nextSecs=Math.floor((nextMs%60000)/1000);
  const fullMs=cur<MAX?(MAX-cur-1)*REGEN_MS+nextMs:0;
  const fullH=Math.floor(fullMs/3600000);
  const fullM=Math.floor((fullMs%3600000)/60000);
  const segs=10;
  const isEmpty=cur===0;
  return(
    <div style={{padding:"8px 0 2px"}}>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <span style={{fontSize:11,color:isEmpty?"#ff5555":"#00e5ff",fontFamily:"'Press Start 2P',monospace",flexShrink:0}}>⚡</span>
        <div style={{display:"flex",gap:2,flex:1}}>
          {Array.from({length:segs}).map((_,i)=>{
            const segMin=i*(MAX/segs),segMax=(i+1)*(MAX/segs);
            const filled=cur>=segMax;const partial=!filled&&cur>segMin;
            const pct=partial?((cur-segMin)/(MAX/segs))*100:0;
            return(<div key={i} style={{flex:1,height:10,borderRadius:2,background:"#1a1a2e",position:"relative",overflow:"hidden"}}>
              {filled&&<div style={{position:"absolute",inset:0,background:"#00e5ff"}}/>}
              {partial&&<div style={{position:"absolute",left:0,top:0,height:"100%",width:`${pct}%`,background:"#00e5ff"}}/>}
            </div>);
          })}
        </div>
        <span style={{fontSize:10,color:isEmpty?"#ff5555":"#00e5ff",fontWeight:700,flexShrink:0}}>{cur}/{MAX}</span>
      </div>
      <div style={{display:"flex",justifyContent:"space-between",marginTop:3}}>
        <span style={{fontSize:9,color:TX3,fontFamily:"M PLUS Rounded 1c,sans-serif"}}>
          {cur>=MAX?"⚡ FULL！":"⏱ 5分で+1エネルギー回復"}
        </span>
        {cur<MAX&&<span style={{fontSize:9,color:TX3}}>
          FULL まで {fullH>0?`${fullH}時間`:`${fullM}分`}
        </span>}
      </div>
      {isEmpty&&<div style={{fontSize:10,color:"#ff5555",textAlign:"center",marginTop:4,fontFamily:"M PLUS Rounded 1c,sans-serif",animation:"pu 1.5s infinite"}}>⚡ エネルギー0 — バトル・移動・練習できません</div>}
    </div>
  );
}

/* ── GAME SCREEN ── */
function Game({char,setChar,onTitle}){
  const[tab,setTab]=useState("home");
  const[notif,setNotif]=useState(null);
  const[log,setLog]=useState([]);
  const[ait,setAit]=useState("");const[ail,setAil]=useState(false);
  const genre=GENRES[char.genre];const lv=getLv(char.exp);const rnk=rank(lv);
  const xpC=char.exp-xpL(lv),xpN=xpL(lv+1)-xpL(lv),xpP=Math.min(100,Math.round((xpC/xpN)*100));

  // エネルギー: 時間ベース回復（5分で+1、50満タンまで約4時間）
  // 休憩ではエネルギーは回復しない
  useEffect(()=>{
    const REGEN_MS = 5 * 60 * 1000; // 5分で+1
    const check=()=>{
      setChar(c=>{
        if(!c)return c;
        const MAX=c.maxEnergy||50;
        if(c.energy>=MAX)return c;
        const now=Date.now();
        const last=c.lastEnergyTime||now;
        const gained=Math.floor((now-last)/REGEN_MS);
        if(gained===0)return c;
        return{...c,
          energy:Math.min(MAX,c.energy+gained),
          lastEnergyTime:last+(gained*REGEN_MS),
        };
      });
    };
    check();
    const t=setInterval(check,30000);
    return()=>clearInterval(t);
  },[]);

  // 気分・空腹の自然減少（エネルギーは触らない）
  useEffect(()=>{
    const t=setInterval(()=>{
      setChar(c=>({...c,
        hunger:Math.max(0,c.hunger-2),
        mood:c.hunger<15?Math.max(0,c.mood-2):Math.min(100,c.mood+1),
      }));
    },12000);
    return()=>clearInterval(t);
  },[]);

  function notif2(msg,col="#b3ff00"){setNotif({msg,col});setTimeout(()=>setNotif(null),2800);}
  function addLog(msg){setLog(l=>[{msg,id:Date.now()},...l.slice(0,12)]);}

  async function doTrain(move){
    if(char.energy<move.cost){notif2("エネルギー不足！","#ff5555");return;}
    const eg=move.exp+Math.floor(Math.random()*12);
    const ns={...char.stats};Object.entries(move.g).forEach(([k,v])=>{ns[k]=(ns[k]||0)+v;});
    setChar(c=>({...c,exp:c.exp+eg,energy:Math.max(0,c.energy-move.cost),stats:ns,mood:Math.min(100,c.mood+8)}));
    notif2(`+${eg} EXP！ ${move.name} 成功！`,"#b3ff00");addLog(`「${move.name}」練習 +${eg}EXP`);
    setAit("");setAil(true);
    const t=await ai(`ダンサー${char.name}（${genre.name}）が「${move.name}」を練習。2〜3文でドラマチックに描写。`);
    setAit(t);setAil(false);
  }
  function doRest(){
    setChar(c=>({...c,mood:Math.min(100,c.mood+20)}));
    notif2("休息した。気分回復！（エネルギーは時間で回復）","#00e5ff");
    addLog("休息した。");
  }
  function doEat(){
    setChar(c=>({...c,hunger:Math.min(100,c.hunger+55),mood:Math.min(100,c.mood+10)}));
    notif2("おいしかった！🍱","#ff9ec4");
    addLog("食事した。");
  }

  const TABS=[{id:"home",l:"ホーム",e:"🏠"},{id:"battle",l:"バトル",e:"⚔️"},{id:"map",l:"MAP",e:"🗺"},{id:"shop",l:"ショップ",e:"🛍"},{id:"status",l:"ステータス",e:"📊"}];
  return(
    <div style={{minHeight:"100vh",background:BG,fontFamily:"M PLUS Rounded 1c,sans-serif",paddingBottom:80}}>
      {notif&&<div style={{position:"fixed",top:14,left:"50%",transform:"translateX(-50%)",zIndex:999,background:"#0e0e22",border:`2px solid ${notif.col}`,color:notif.col,padding:"9px 18px",borderRadius:6,fontSize:12,fontWeight:700,animation:"su .25s ease",whiteSpace:"nowrap",maxWidth:"90vw"}}>{notif.msg}</div>}
      {/* header */}
      <div style={{padding:"10px 16px",background:BG2,borderBottom:`2px solid ${genre.c}55`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:26}}>{genre.e}</span>
            <div><div style={{fontFamily:"'Press Start 2P',monospace",fontSize:8,color:genre.c,letterSpacing:1}}>{genre.name}</div><div style={{fontSize:16,fontWeight:900,color:TX}}>{char.name}</div></div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:10,color:rnk.c,fontWeight:700}}>Lv.{lv} {rnk.jp}</div>
            <div style={{fontSize:10,color:"#b3ff00",fontWeight:700}}>{fc(char.coins)}</div>
            <div style={{width:90,height:5,background:BG3,borderRadius:3,marginTop:3}}>
              <div style={{height:"100%",width:`${xpP}%`,background:genre.c,borderRadius:3,transition:"width .5s"}}/>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",marginTop:2}}>
              <span style={{fontSize:8,color:"#40c060"}}>💾 オートセーブ</span>
              <span style={{fontSize:9,color:TX3,cursor:"pointer"}} onClick={onTitle}>タイトルへ</span>
            </div>
          </div>
        </div>
        {/* エネルギーゲージ */}
        <EnergyBar char={char}/>
      </div>
      {/* content */}
      <div style={{padding:"14px 16px 0"}}>
        {tab==="home"&&<HomeTab char={char} genre={genre} log={log} onRest={doRest} onEat={doEat} onTrain={doTrain} aiText={ait} aiLoading={ail}/>}
        {tab==="battle"&&<BattleTab char={char} setChar={setChar} genre={genre} pushNotif={notif2} addLog={addLog}/>}
        {tab==="map"&&<MapTab char={char} setChar={setChar} genre={genre} pushNotif={notif2} addLog={addLog}/>}
        {tab==="shop"&&<ShopTab char={char} setChar={setChar} genre={genre} pushNotif={notif2}/>}
        {tab==="status"&&<StatusTab char={char} lv={lv} rnk={rnk} genre={genre} setChar={setChar}/>}
      </div>
      {/* nav */}
      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:520,background:"#0e0e20",borderTop:`2px solid ${BD}`,display:"flex"}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,padding:"9px 0",display:"flex",flexDirection:"column",alignItems:"center",gap:2,background:tab===t.id?`${genre.c}22`:"none",borderTop:tab===t.id?`3px solid ${genre.c}`:"3px solid transparent",transition:"all .15s"}}>
            <span style={{fontSize:17}}>{t.e}</span>
            <span style={{fontSize:8,color:tab===t.id?genre.c:TX3,fontFamily:"M PLUS Rounded 1c,sans-serif"}}>{t.l}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── TITLE ── */
function Title({onStart,savedChar,onContinue,onDelete}){
  return(
    <div style={{minHeight:"100vh",background:BG,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24,textAlign:"center",fontFamily:"M PLUS Rounded 1c,sans-serif"}}>
      <div style={{fontSize:64,animation:"fl 3s ease-in-out infinite",marginBottom:16}}>🎤</div>
      <div style={{fontFamily:"'Press Start 2P',monospace",fontSize:12,color:"#ff4da6",letterSpacing:4,lineHeight:2.2,marginBottom:6}}>DANCER<br/><span style={{color:"#00e5ff"}}>LEGEND</span></div>
      <div style={{color:TX3,fontSize:11,marginBottom:4}}>全国制覇 RPG</div>
      <div style={{color:"#202040",fontSize:9,marginBottom:40}}>日本 → USA → 世界へ</div>

      {/* セーブデータあり → 続きから */}
      {savedChar&&(
        <div style={{width:"100%",maxWidth:300,marginBottom:16}}>
          <div style={{background:BG2,border:`2px solid ${GENRES[savedChar.genre]?.c||"#888"}55`,borderRadius:10,padding:"14px 16px",marginBottom:10}}>
            <div style={{fontSize:9,color:TX3,fontFamily:"'Press Start 2P',monospace",marginBottom:8}}>SAVE DATA</div>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
              <span style={{fontSize:24}}>{GENRES[savedChar.genre]?.e}</span>
              <div style={{textAlign:"left"}}>
                <div style={{fontSize:14,fontWeight:700,color:TX}}>{savedChar.name}</div>
                <div style={{fontSize:10,color:TX3}}>{GENRES[savedChar.genre]?.jp} · Lv.{getLv(savedChar.exp)} · {fc(savedChar.coins)}</div>
              </div>
            </div>
            <button onClick={onContinue} style={{width:"100%",padding:"12px",borderRadius:8,fontSize:13,fontFamily:"M PLUS Rounded 1c,sans-serif",fontWeight:700,background:GENRES[savedChar.genre]?.c||"#888",color:"#000",border:"none",cursor:"pointer",marginBottom:8}}>
              ▶ 続きから
            </button>
            <button onClick={onDelete} style={{width:"100%",padding:"7px",borderRadius:6,fontSize:10,fontFamily:"M PLUS Rounded 1c,sans-serif",background:"none",color:TX3,border:`1px solid ${BD}`,cursor:"pointer"}}>
              🗑 データを消して最初から
            </button>
          </div>
        </div>
      )}

      {/* 新規スタート */}
      {!savedChar&&(
        <button onClick={onStart} style={{padding:"14px 52px",borderRadius:8,fontSize:14,fontFamily:"M PLUS Rounded 1c,sans-serif",fontWeight:700,background:"#ff4da6",color:"#fff",border:"2px solid #ff4da6",cursor:"pointer",letterSpacing:1}}>▶ スタート</button>
      )}
      {savedChar&&(
        <button onClick={onStart} style={{padding:"10px 32px",borderRadius:8,fontSize:12,fontFamily:"M PLUS Rounded 1c,sans-serif",fontWeight:700,background:"none",color:TX3,border:`1px solid ${BD}`,cursor:"pointer"}}>＋ 新しく始める</button>
      )}

      <div style={{marginTop:40,color:"#1a1a30",fontSize:9,lineHeight:2.5}}>
        <div>BALLET · HOUSE · POPPING · LOCK</div>
        <div>BREAKING · WAACKING · JAZZ · CONTEMPORARY</div>
      </div>
    </div>
  );
}

/* ── CREATE ── */
function Create({onStart}){
  const[step,setStep]=useState(0);
  const[name,setName]=useState("");
  const[genre,setGenre]=useState(null);
  const[ht,setHt]=useState(null);
  const gc=genre?GENRES[genre].c:"#ff4da6";
  return(
    <div style={{minHeight:"100vh",background:BG,fontFamily:"M PLUS Rounded 1c,sans-serif",padding:"24px 16px"}}>
      <div style={{display:"flex",gap:4,marginBottom:22}}>
        {["名前","ジャンル","出身地"].map((s,i)=>(
          <div key={i} style={{flex:1,textAlign:"center"}}>
            <div style={{height:3,borderRadius:2,background:i<=step?gc:"#1e1e3a",marginBottom:4}}/>
            <div style={{fontSize:9,color:i===step?gc:i<step?TX2:TX3}}>{s}</div>
          </div>
        ))}
      </div>
      {step===0&&(
        <div style={{animation:"su .3s ease"}}>
          <div style={{fontFamily:"'Press Start 2P',monospace",fontSize:8,color:"#ff4da6",marginBottom:20}}>STEP 1: ダンサー名</div>
          <input value={name} onChange={e=>setName(e.target.value)} maxLength={12} placeholder="名前を入力..." style={{width:"100%",padding:"14px",borderRadius:6,background:BG3,border:`1px solid ${BD}`,color:TX,fontSize:16,outline:"none",marginBottom:24}}/>
          <Btn disabled={!name.trim()} col="#ff4da6" tc="#fff" onClick={()=>setStep(1)} full sx={{fontSize:13,padding:"13px"}}>次へ →</Btn>
        </div>
      )}
      {step===1&&(
        <div style={{animation:"su .3s ease"}}>
          <div style={{fontFamily:"'Press Start 2P',monospace",fontSize:8,color:"#ff4da6",marginBottom:16}}>STEP 2: ジャンル</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:20}}>
            {Object.entries(GENRES).map(([key,g])=>{
              const sel=genre===key;
              return(
                <button key={key} onClick={()=>setGenre(key)} style={{padding:"12px 10px",borderRadius:8,textAlign:"left",background:sel?`${g.c}28`:BG2,border:`2px solid ${sel?g.c:BD}`,cursor:"pointer",transition:"all .15s",animation:sel?"pi .2s ease":"none"}}>
                  <div style={{fontSize:24,marginBottom:4}}>{g.e}</div>
                  <div style={{color:sel?g.c:TX,fontSize:11,fontWeight:700}}>{g.jp}</div>
                  <div style={{color:TX3,fontSize:9,marginTop:2}}>{g.name}</div>
                </button>
              );
            })}
          </div>
          {genre&&<div style={{padding:"10px 14px",background:`${GENRES[genre].c}18`,border:`1px solid ${GENRES[genre].c}55`,borderRadius:6,marginBottom:16,fontSize:10,color:TX2,lineHeight:1.8}}>
            {Object.entries(BASE[genre]).map(([k,v])=><span key={k} style={{color:SM[k].c,marginRight:10}}>{SM[k].jp}:{v}</span>)}
          </div>}
          <div style={{display:"flex",gap:8}}>
            <Btn col={BG3} tc={TX2} onClick={()=>setStep(0)} sx={{flex:1,fontSize:11}}>← 戻る</Btn>
            <Btn disabled={!genre} col={genre?gc:"#333"} tc={genre?"#000":TX3} onClick={()=>setStep(2)} sx={{flex:2,fontSize:12}}>次へ →</Btn>
          </div>
        </div>
      )}
      {step===2&&(
        <div style={{animation:"su .3s ease"}}>
          <div style={{fontFamily:"'Press Start 2P',monospace",fontSize:8,color:"#ff4da6",marginBottom:8}}>STEP 3: 出身地</div>
          <div style={{fontSize:10,color:TX3,marginBottom:16}}>出身地からMAPをスタート！地元ジャンルのボーナスあり。</div>
          <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:20}}>
            {HT.map(h=>{
              const sel=ht===h.id;const bg=h.bonus?GENRES[h.bonus]:null;
              return(
                <button key={h.id} onClick={()=>setHt(h.id)} style={{padding:"11px 14px",borderRadius:8,textAlign:"left",background:sel?`${gc}22`:BG2,border:`2px solid ${sel?gc:BD}`,cursor:"pointer",transition:"all .15s",display:"flex",alignItems:"center",gap:12}}>
                  <span style={{fontSize:26,flexShrink:0}}>{h.e}</span>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:700,fontSize:13,color:sel?gc:TX}}>{h.label}</div>
                    <div style={{fontSize:10,color:TX3,marginTop:1}}>{h.region} · {h.desc}</div>
                    {bg&&<div style={{fontSize:9,color:bg.c,marginTop:2}}>{bg.jp}ボーナス↑</div>}
                  </div>
                </button>
              );
            })}
          </div>
          <div style={{display:"flex",gap:8}}>
            <Btn col={BG3} tc={TX2} onClick={()=>setStep(1)} sx={{flex:1,fontSize:11}}>← 戻る</Btn>
            <Btn disabled={!ht} col={gc} tc="#000" onClick={()=>onStart(name,genre,ht)} sx={{flex:2,fontSize:12,padding:"13px",fontWeight:700}}>
              {name}の旅を始める！
            </Btn>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── ROOT ── */
export default function DancerLegend(){
  const[screen,setScreen]=useState("title");

  // 起動時にセーブデータを読み込む
  const[char,setChar]=useState(()=>{
    try{
      const s=localStorage.getItem("dancer_save");
      return s?JSON.parse(s):null;
    }catch{return null;}
  });

  // charが変わるたびに自動セーブ
  useEffect(()=>{
    if(char){
      localStorage.setItem("dancer_save",JSON.stringify(char));
    }
  },[char]);

  function start(name,genre,hometown){
    const h=HT.find(x=>x.id===hometown);
    const stats={...BASE[genre]};
    if(h?.bonus){const bg=BASE[h.bonus];Object.entries(bg).forEach(([k,v])=>{stats[k]=(stats[k]||0)+Math.round(v*.3);});}
    const newChar={name,genre,hometown,currentCity:hometown,clearedCities:{[hometown]:true},
      exp:0,coins:500,fame:0,energy:50,maxEnergy:50,mood:80,hunger:70,
      lastEnergyTime:Date.now(),stats,
      inventory:[],equipped:{accessories:[]},titles:[],battlesWon:0,showsDone:0};
    setChar(newChar);
    setScreen("game");
  }

  function deleteSave(){
    if(!window.confirm("セーブデータを削除しますか？"))return;
    localStorage.removeItem("dancer_save");
    setChar(null);
    setScreen("title");
  }

  return(
    <div style={{background:BG,minHeight:"100vh",maxWidth:520,margin:"0 auto"}}>
      {screen==="title"&&<Title onStart={()=>setScreen("create")} savedChar={char} onContinue={()=>setScreen("game")} onDelete={deleteSave}/>}
      {screen==="create"&&<Create onStart={start}/>}
      {screen==="game"&&char&&<Game char={char} setChar={setChar} onTitle={()=>setScreen("title")}/>}
    </div>
  );
}
