import { useState, useEffect, useRef } from "react";

const SUPABASE_URL = "https://nbxiydhjlhjvuaggaxve.supabase.co";
const SUPABASE_KEY = "sb_publishable_Re31HJlpQz46zZxTc6l_VA_IxTCCfoa";
const ONESIGNAL_APP_ID = "65de1f8b-1d6e-46f6-be4e-36b5f6c7f631";
const ONESIGNAL_API_KEY = import.meta.env.VITE_ONESIGNAL_API_KEY;

// ── DB ──────────────────────────────────────────────────────
async function dbGet(){
  const r=await fetch(`${SUPABASE_URL}/rest/v1/fc_state?id=eq.main`,{headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${SUPABASE_KEY}`}});
  const d=await r.json();return d[0]||null;
}
async function dbSet(patch){
  await fetch(`${SUPABASE_URL}/rest/v1/fc_state?id=eq.main`,{method:"PATCH",headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${SUPABASE_KEY}`,"Content-Type":"application/json",Prefer:"return=minimal"},body:JSON.stringify({...patch,updated_at:new Date().toISOString()})});
}

// ── PHOTOS ──────────────────────────────────────────────────
async function compressImage(file){
  return new Promise(resolve=>{
    const img=new Image();
    const url=URL.createObjectURL(file);
    img.onload=()=>{
      const canvas=document.createElement("canvas");
      const max=1024;let w=img.width,h=img.height;
      if(w>h){if(w>max){h=h*(max/w);w=max;}}else{if(h>max){w=w*(max/h);h=max;}}
      canvas.width=w;canvas.height=h;
      canvas.getContext("2d").drawImage(img,0,0,w,h);
      canvas.toBlob(blob=>resolve(new File([blob],file.name,{type:"image/jpeg"})),"image/jpeg",0.7);
      URL.revokeObjectURL(url);
    };
    img.src=url;
  });
}

// Upload : retourne {url, path} ou null
async function photoUpload(file,taskKey){
  try{
    const compressed=await compressImage(file);
    const safe=taskKey.replace(/[|]/g,'_').replace(/\s+/g,'_').replace(/[^a-zA-Z0-9_.-]/g,'_');
    const path=`${safe}_${Date.now()}.jpg`;
    const res=await fetch(`${SUPABASE_URL}/storage/v1/object/task-photos/${path}`,{
      method:"POST",
      headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${SUPABASE_KEY}`,"Content-Type":"image/jpeg"},
      body:compressed
    });
    if(!res.ok){console.error("upload failed",await res.text());return null;}
    return{url:`${SUPABASE_URL}/storage/v1/object/public/task-photos/${path}`,path};
  }catch(e){console.error(e);return null;}
}

// Delete : supprime le fichier Storage
async function photoDelete(path){
  try{
    await fetch(`${SUPABASE_URL}/storage/v1/object/task-photos/${path}`,{
      method:"DELETE",
      headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${SUPABASE_KEY}`}
    });
  }catch(e){console.error(e);}
}

// ── NOTIFICATIONS ────────────────────────────────────────────
async function sendPushNotification(title,message){
  try{
    await fetch("https://onesignal.com/api/v1/notifications",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Key ${ONESIGNAL_API_KEY}`},body:JSON.stringify({app_id:ONESIGNAL_APP_ID,included_segments:["All"],headings:{fr:title,en:title},contents:{fr:message,en:message},url:"https://levasseur-schubert-family-chores.vercel.app"})});
  }catch(e){console.error(e);}
}

// ── CONSTANTS ────────────────────────────────────────────────
const DOUBLE_POINTS_TASKS=["Enlever les crottes de Tabby"];
const SHARED_DAILY=["Remplir le lave-vaisselle","Vider le lave-vaisselle","Sortir les poubelles","Mettre la table","Débarrasser la table","Donner à manger et à boire à Tabby","Enlever les crottes de Tabby"];
const COUPLE_POOL=["Passer l'aspirateur","Passer le mop","Faire une machine à laver","Etendre le linge","Plier le linge"];
const PERSONAL_TASKS={
  Michel:["Ranger sa chambre","Passer l'aspirateur dans sa chambre","Passer le mop dans sa chambre","Ranger ses vêtements","Ramasser ses affaires et les ranger dans sa chambre","Nettoyer sa salle de bain"],
  Gabrielle:["Ranger sa chambre","Passer l'aspirateur dans sa chambre","Passer le mop dans sa chambre","Ranger ses vêtements","Ramasser ses affaires et les ranger dans sa chambre","Nettoyer sa salle de bain"],
  Maman:["Ranger ses vêtements"],Papou:["Ranger ses vêtements"],
};
const KIDS=["Michel","Gabrielle"];
const COUPLE=["Maman","Papou"];
const INITIATIVE_TASKS=["Passer l'aspirateur","Plier le linge","Ranger une pièce","Autre (décrire)"];
const ROOMS=["Salon","Cuisine","Toilette du bas","Toilette du haut","Balcon"];
const DEFAULT_PROFILES={Maman:{color:"#e879a0",emoji:"👩",pin:"0000"},Papou:{color:"#7C6AF7",emoji:"👨",pin:"0000"},Michel:{color:"#F97316",emoji:"🧒",pin:"0000"},Gabrielle:{color:"#06B6D4",emoji:"👧",pin:"0000"}};
const DEFAULT_REWARDS={Michel:"🍬 Bonbons au choix",Gabrielle:"🍰 Gâteau au choix"};
const EMOJI_OPTIONS=["👩","👨","🧒","👧","🧑","👦","👴","👵","🦸","🧙","🐱","🐶","🦊","🐼","🦁","⭐","🌈","🎮","🎨","🏆"];
const COLOR_OPTIONS=["#e879a0","#7C6AF7","#F97316","#06B6D4","#10B981","#F59E0B","#EF4444","#8B5CF6","#EC4899","#14B8A6","#6366F1","#84CC16"];
const RULES=[
  {emoji:"🏠",title:"Tâches hebdomadaires Michel & Gabrielle",desc:"Remplir/vider le lave-vaisselle, sortir les poubelles, mettre/débarrasser la table, s'occuper de Tabby. Tout le monde peut les faire !"},
  {emoji:"👫",title:"Tâches Maman & Papou",desc:"Aspirateur, mop, machine à laver, linge… Ces tâches sont réservées à Maman et Papou."},
  {emoji:"🛏️",title:"Tâches personnelles",desc:"Chaque membre a ses propres tâches (chambre, vêtements…). Chacun coche les siennes."},
  {emoji:"⭐",title:"Initiatives",desc:"Tout le monde peut poster une tâche bonus et la réaliser pour gagner 2 points !"},
  {emoji:"🏆",title:"Challenges Michel & Gabrielle",desc:"Terminez toutes vos tâches perso dans la semaine pour débloquer votre récompense !"},
  {emoji:"⚔️",title:"Compétition",desc:"Celui qui fait le plus de tâches hebdomadaires dans la semaine gagne une récompense !"},
  {emoji:"📸",title:"Photos de preuves",desc:"Pour chaque tâche, tu peux ajouter une photo. Tu peux aussi la supprimer et en reprendre une nouvelle !"},
  {emoji:"💬",title:"Messagerie",desc:"Envoyez des messages à toute la famille depuis l'onglet Messages."},
  {emoji:"✏️",title:"Mon profil",desc:"Appuie sur ✏️ en haut à droite pour changer ton emoji, ta couleur et ton PIN."},
  {emoji:"😬",title:"Gages",desc:"Si Maman ou Papou fait une tâche hebdomadaire à votre place, Michel et Gabrielle ont un gage !"},
];

function dayKey(d=new Date()){return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;}
function weekKey(d=new Date()){const s=new Date(d.getFullYear(),0,0);return `${d.getFullYear()}-W${Math.floor((d-s)/(7*24*60*60*1000))}`;}
function yesterdayKey(){const d=new Date();d.setDate(d.getDate()-1);return dayKey(d);}
function msUntilMidnight(){const n=new Date(),m=new Date(n);m.setHours(24,0,0,0);return m-n;}
const Tick=()=><svg width="14" height="14" viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3" stroke="#fff" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const Plus=({color})=><svg width="10" height="10" viewBox="0 0 10 10"><line x1="2" y1="5" x2="8" y2="5" stroke={color} strokeWidth="2" strokeLinecap="round"/><line x1="5" y1="2" x2="5" y2="8" stroke={color} strokeWidth="2" strokeLinecap="round"/></svg>;

export default function App(){
  const [profiles,setProfiles]=useState(DEFAULT_PROFILES);
  const [done,setDone]=useState({});
  const [history,setHistory]=useState([]);
  const [points,setPoints]=useState({});
  const [rewards,setRewards]=useState(DEFAULT_REWARDS);
  // photos = { taskKey: {url, path} }
  const [photos,setPhotos]=useState({});
  const [today,setToday]=useState(dayKey());
  const [unlockedShown,setUnlockedShown]=useState({});
  const [gageAlert,setGageAlert]=useState(null);
  const [endWeekModal,setEndWeekModal]=useState(false);
  const [lateMembers,setLateMembers]=useState([]);
  const [tableRota,setTableRota]=useState({});
  const [screen,setScreen]=useState("home");
  const [selectedMember,setSelectedMember]=useState(null);
  const [pin,setPin]=useState("");
  const [pinError,setPinError]=useState(false);
  const [page,setPage]=useState("tasks");
  const [histFilter,setHistFilter]=useState("today");
  const [editingProfile,setEditingProfile]=useState(false);
  const [editEmoji,setEditEmoji]=useState("");
  const [editColor,setEditColor]=useState("");
  const [editPin,setEditPin]=useState("");
  const [editReward,setEditReward]=useState("");
  const [firstLogin,setFirstLogin]=useState(false);
  const [rulesPage,setRulesPage]=useState(0);
  const [initiative,setInitiative]=useState(null);
  const [showInitiativeForm,setShowInitiativeForm]=useState(false);
  const [initTask,setInitTask]=useState(INITIATIVE_TASKS[0]);
  const [initRoom,setInitRoom]=useState(ROOMS[0]);
  const [initCustom,setInitCustom]=useState("");
  const [messages,setMessages]=useState([]);
  const [newMsg,setNewMsg]=useState("");
  const [loading,setLoading]=useState(true);
  const [photoViewer,setPhotoViewer]=useState(null); // {url, path, taskKey}
  const [uploadingKey,setUploadingKey]=useState(null);
  const msgEnd=useRef(null);
  const timer=useRef(null);
  const pollTimer=useRef(null);

  function scheduleMidnight(){clearTimeout(timer.current);timer.current=setTimeout(()=>{setToday(dayKey());scheduleMidnight();},msUntilMidnight()+500);}

  // Normalise les photos depuis DB (ancien format string ou nouveau {url,path})
  function normalizePhotos(raw){
    if(!raw)return{};
    const out={};
    Object.entries(raw).forEach(([k,v])=>{
      if(typeof v==="string"){
        // ancien format : juste une URL, on reconstitue le path depuis l'URL
        const path=v.split('/task-photos/')[1]||"";
        out[k]={url:v,path};
      }else if(v&&v.url){
        out[k]=v;
      }
    });
    return out;
  }

  async function loadFromDB(){
    try{
      const d=await dbGet();
      if(d){
        if(d.profiles&&Object.keys(d.profiles).length>0)setProfiles(d.profiles);
        setDone(d.done||{});
        setHistory(d.history||[]);
        setPoints(d.points||{});
        if(d.rewards&&Object.keys(d.rewards).length>0)setRewards(d.rewards);
        setTableRota(d.table_rota||{});
        setInitiative(d.initiative||null);
        setMessages(d.messages||[]);
        setUnlockedShown(d.unlocked||{});
        setPhotos(normalizePhotos(d.photos));
      }
    }catch(e){console.error(e);}
    setLoading(false);
  }

  useEffect(()=>{
    scheduleMidnight();
    loadFromDB();
    pollTimer.current=setInterval(loadFromDB,5000);
    const lastWelcome=localStorage.getItem("fc_welcome_day");
    if(lastWelcome!==dayKey()){
      localStorage.setItem("fc_welcome_day",dayKey());
      setTimeout(()=>sendPushNotification("🏠 FamilyChores","Les challenges commencent aujourd'hui ! Bonne chance 💪"),3000);
    }
    return()=>{clearTimeout(timer.current);clearInterval(pollTimer.current);}
  },[]);

  useEffect(()=>{
    if(screen==="app"&&selectedMember){
      const seen=JSON.parse(localStorage.getItem("fc_seen")||"[]");
      if(!seen.includes(selectedMember)){setFirstLogin(true);setRulesPage(0);}
    }
  },[screen,selectedMember]);

  useEffect(()=>{if(page==="messages")msgEnd.current?.scrollIntoView({behavior:"smooth"});},[messages,page]);

  function pc(m){return(profiles[m]||DEFAULT_PROFILES[m]||{color:"#888"}).color;}
  function pe(m){return(profiles[m]||DEFAULT_PROFILES[m]||{emoji:"👤"}).emoji;}
  function addHist(entry){return[entry,...history].slice(0,300);}
  function selectMember(m){setSelectedMember(m);setPin("");setPinError(false);setScreen("pin");}
  function logout(){setScreen("home");setSelectedMember(null);setPin("");}
  function dismissRules(){
    const seen=JSON.parse(localStorage.getItem("fc_seen")||"[]");
    if(!seen.includes(selectedMember)){seen.push(selectedMember);localStorage.setItem("fc_seen",JSON.stringify(seen));}
    setFirstLogin(false);setRulesPage(0);
  }

  // ── PHOTO HANDLERS ──
  async function handlePhotoUpload(e,taskKey){
    const file=e.target.files[0];if(!file)return;
    setUploadingKey(taskKey);
    const result=await photoUpload(file,taskKey);
    if(result){
      // Met à jour localement ET en DB
      const np={...photos,[taskKey]:result};
      setPhotos(np);
      // Sauvegarde en DB (sérialise correctement)
      const dbPhotos={};
      Object.entries(np).forEach(([k,v])=>{dbPhotos[k]=v;});
      await dbSet({photos:dbPhotos});
    }
    setUploadingKey(null);
  }

  async function handlePhotoDelete(taskKey,path){
    // 1. Supprime le fichier Storage
    await photoDelete(path);
    // 2. Met à jour localement
    const np={...photos};
    delete np[taskKey];
    setPhotos(np);
    // 3. Met à jour en DB
    const dbPhotos={};
    Object.entries(np).forEach(([k,v])=>{dbPhotos[k]=v;});
    await dbSet({photos:dbPhotos});
    // 4. Ferme le viewer
    setPhotoViewer(null);
  }

  // Composant bouton photo
  function PhotoBtn({taskKey}){
    const p=photos[taskKey];
    return(
      <div style={{display:"flex",alignItems:"center",gap:4}} onClick={e=>e.stopPropagation()}>
        {p&&<button onClick={()=>setPhotoViewer({url:p.url,path:p.path,taskKey})} style={{width:28,height:28,borderRadius:8,border:"none",background:"#f0f0f5",cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center"}}>📸</button>}
        <label style={{width:28,height:28,borderRadius:8,background:"#f0f0f5",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:14}}>
          {uploadingKey===taskKey?"⏳":"📷"}
          <input type="file" accept="image/*" capture="environment" onChange={e=>handlePhotoUpload(e,taskKey)} style={{display:"none"}}/>
        </label>
      </div>
    );
  }

  const wk=weekKey();
  function getTableSetter(){return tableRota[wk]||null;}
  function whoSetsTableToday(){
    const s=getTableSetter();if(!s)return null;
    const d=new Date().getDay();const dm=(d===0?6:d-1);
    return["Michel","Gabrielle"][(["Michel","Gabrielle"].indexOf(s)+dm)%2];
  }
  function whoClearsTableToday(){const s=whoSetsTableToday();return s?(s==="Michel"?"Gabrielle":"Michel"):null;}
  function kidsCommonCount(){
    const c={Michel:0,Gabrielle:0};
    history.filter(h=>h.weekKey===wk&&h.type==="commune"&&KIDS.includes(h.member)).forEach(h=>{c[h.member]=(c[h.member]||0)+1;});
    return c;
  }

  function claimShared(task){
    const setter=whoSetsTableToday();const clearer=whoClearsTableToday();
    if(task==="Mettre la table"&&setter&&selectedMember!==setter){alert(`C'est ${setter} qui met la table aujourd'hui !`);return;}
    if(task==="Débarrasser la table"&&clearer&&selectedMember!==clearer){alert(`C'est ${clearer} qui débarrasse aujourd'hui !`);return;}
    const member=selectedMember;
    const pts=DOUBLE_POINTS_TASKS.includes(task)?2:1;
    if(task==="Mettre la table"&&KIDS.includes(member)&&new Date().getDay()===1&&!tableRota[wk]){
      const nr={...tableRota,[wk]:member};setTableRota(nr);dbSet({table_rota:nr});
    }
    const np={...points,[member]:(points[member]||0)+pts};
    const nh=addHist({member,task,date:new Date().toLocaleDateString("fr-FR"),dayKey:today,weekKey:wk,type:"commune",pts});
    setPoints(np);setHistory(nh);dbSet({points:np,history:nh});
    if(COUPLE.includes(member))setGageAlert({member,task});
    sendPushNotification(`${pe(member)} ${member} a fait une tâche !`,`${task}${pts===2?" (+2 pts)":""}`);
  }
  function claimCouple(task){
    if(!COUPLE.includes(selectedMember))return;
    const member=selectedMember;
    const np={...points,[member]:(points[member]||0)+1};
    const nh=addHist({member,task,date:new Date().toLocaleDateString("fr-FR"),dayKey:today,weekKey:wk,type:"couple"});
    setPoints(np);setHistory(nh);dbSet({points:np,history:nh});
    sendPushNotification(`${pe(member)} ${member} a fait une tâche !`,task);
  }
  function togglePersonal(pm,task){
    const key=`${wk}|personal|${pm}|${task}`;
    let nd={...done},np={...points},nh;
    if(nd[key]){delete nd[key];np[pm]=Math.max(0,(np[pm]||0)-1);nh=history.filter(h=>!(h.task===task&&h.member===pm&&h.weekKey===wk&&h.type==="perso"));}
    else{nd[key]=true;np[pm]=(np[pm]||0)+1;nh=addHist({member:pm,task,date:new Date().toLocaleDateString("fr-FR"),dayKey:today,weekKey:wk,type:"perso"});sendPushNotification(`${pe(pm)} ${pm} a fait une tâche !`,task);}
    setDone(nd);setPoints(np);setHistory(nh);dbSet({done:nd,points:np,history:nh});
  }
  function postInitiative(){
    let label;
    if(initTask==="Ranger une pièce")label=`Ranger une pièce : ${initRoom}`;
    else if(initTask==="Autre (décrire)")label=initCustom.trim()||"Tâche personnalisée";
    else label=initTask;
    const ni={task:label,postedBy:selectedMember,postedAt:new Date().toLocaleDateString("fr-FR"),acceptedBy:null};
    setInitiative(ni);dbSet({initiative:ni});setShowInitiativeForm(false);
    sendPushNotification("⭐ Nouvelle initiative !",`${selectedMember} a posté : ${label} (+2 pts)`);
  }
  function acceptInitiative(){const ni={...initiative,acceptedBy:selectedMember};setInitiative(ni);dbSet({initiative:ni});}
  function completeInitiative(){
    const member=initiative.acceptedBy;
    const np={...points,[member]:(points[member]||0)+2};
    const nh=addHist({member,task:`⭐ ${initiative.task}`,date:new Date().toLocaleDateString("fr-FR"),dayKey:today,weekKey:wk,type:"initiative"});
    setPoints(np);setHistory(nh);setInitiative(null);dbSet({points:np,history:nh,initiative:null});
    sendPushNotification(`🏆 ${member} a terminé l'initiative !`,`${initiative.task} (+2 pts)`);
  }
  function cancelInitiative(){setInitiative(null);dbSet({initiative:null});}
  function sendMessage(){
    if(!newMsg.trim())return;
    const nm=[...messages,{from:selectedMember,text:newMsg.trim(),date:new Date().toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"}),day:new Date().toLocaleDateString("fr-FR")}].slice(-100);
    setMessages(nm);dbSet({messages:nm});setNewMsg("");
    sendPushNotification(`💬 ${selectedMember}`,newMsg.trim());
  }
  function nextWeek(){
    const late=Object.keys(profiles).filter(m=>{
      const personal=PERSONAL_TASKS[m]||[];
      return personal.some(t=>!done[`${wk}|personal|${m}|${t}`])||(COUPLE.includes(m)&&COUPLE_POOL.some(t=>!done[`${wk}|couple|${t}`]));
    });
    setLateMembers(late);setEndWeekModal(true);
  }
  function doNextWeek(){
    const nd=Object.fromEntries(Object.entries(done).filter(([k])=>k.includes("|shared|")));
    const nu={};setUnlockedShown(nu);setDone(nd);dbSet({done:nd,unlocked:nu});
    setEndWeekModal(false);setLateMembers([]);
  }
  function dismissUnlock(kid){const nu={...unlockedShown,[kid]:true};setUnlockedShown(nu);dbSet({unlocked:nu});}
  function kidChallenge(kid){
    const personal=PERSONAL_TASKS[kid]||[];const total=personal.length;if(!total)return{done:0,total:0,pct:0,unlocked:false};
    const d=personal.filter(t=>done[`${wk}|personal|${kid}|${t}`]).length;
    return{done:d,total,pct:Math.round((d/total)*100),unlocked:d===total};
  }
  function openEditProfile(){setEditEmoji(pe(selectedMember));setEditColor(pc(selectedMember));setEditPin(profiles[selectedMember]?.pin||"0000");setEditReward(rewards[selectedMember]||"");setEditingProfile(true);}
  function saveProfile(){
    const np={...profiles,[selectedMember]:{...profiles[selectedMember],emoji:editEmoji,color:editColor,pin:editPin}};
    setProfiles(np);
    const nr=KIDS.includes(selectedMember)?{...rewards,[selectedMember]:editReward}:rewards;
    setRewards(nr);dbSet({profiles:np,rewards:nr});setEditingProfile(false);
  }

  const color=pc(selectedMember);const emoji=pe(selectedMember);
  const sharedDone=SHARED_DAILY.filter(t=>history.filter(h=>h.task===t&&h.dayKey===today&&h.type==="commune").length>0).length;
  const coupleDone=COUPLE_POOL.filter(t=>history.filter(h=>h.task===t&&h.weekKey===wk&&h.type==="couple").length>0).length;
  const isCouple=COUPLE.includes(selectedMember);const isKid=KIDS.includes(selectedMember);
  const yday=yesterdayKey();
  const filteredHist=history.filter(h=>{
    if(histFilter==="today")return h.dayKey===today;
    if(histFilter==="yesterday")return h.dayKey===yday;
    if(histFilter==="week")return h.weekKey===wk;
    return true;
  });
  const typeBadge=(type)=>{
    const map={commune:{bg:"#EDE9FE",c:"#7C3AED"},perso:{bg:"#E0F2FE",c:"#0284C7"},couple:{bg:"#DCFCE7",c:"#16A34A"},initiative:{bg:"#FEF9C3",c:"#A16207"},hebdo:{bg:"#f0f0f5",c:"#888"}};
    const x=map[type]||map.hebdo;return{fontSize:10,padding:"2px 7px",borderRadius:99,background:x.bg,color:x.c,fontWeight:600,whiteSpace:"nowrap"};
  };

  if(loading)return(
    <div style={{minHeight:"100vh",background:"#f5f5f7",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",fontFamily:"-apple-system,sans-serif"}}>
      <div style={{fontSize:48,marginBottom:16}}>🏠</div>
      <p style={{fontSize:16,color:"#888"}}>Chargement...</p>
    </div>
  );

  if(screen==="home")return(
    <div style={{minHeight:"100vh",background:"#f5f5f7",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"2rem 1rem",fontFamily:"-apple-system,sans-serif"}}>
      <div style={{width:"100%",maxWidth:400}}>
        <div style={{textAlign:"center",marginBottom:"2rem"}}>
          <div style={{fontSize:48,marginBottom:8}}>🏠</div>
          <h1 style={{fontSize:28,fontWeight:700,color:"#1a1a2e",margin:"0 0 4px"}}>FamilyChores</h1>
          <p style={{fontSize:14,color:"#888",margin:0}}>Qui es-tu aujourd'hui ?</p>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
          {Object.keys(profiles).map(m=>{
            const c=pc(m);const e=pe(m);
            return(
              <button key={m} onClick={()=>selectMember(m)} style={{background:"#fff",border:`2px solid ${c}22`,borderRadius:22,padding:"1.5rem 1rem",cursor:"pointer",textAlign:"center",boxShadow:`0 4px 16px ${c}22`,fontFamily:"inherit"}}>
                <div style={{width:60,height:60,borderRadius:30,background:`${c}22`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:30,margin:"0 auto 10px"}}>{e}</div>
                <p style={{fontWeight:700,fontSize:16,color:"#1a1a2e",margin:"0 0 4px"}}>{m}</p>
                <p style={{fontSize:13,color:c,margin:0,fontWeight:600}}>{points[m]||0} pts</p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  if(screen==="pin")return(
    <div style={{minHeight:"100vh",background:"#f5f5f7",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"2rem 1rem",fontFamily:"-apple-system,sans-serif"}}>
      <div style={{width:"100%",maxWidth:320,textAlign:"center"}}>
        <div style={{width:76,height:76,borderRadius:38,background:`${pc(selectedMember)}22`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:38,margin:"0 auto 12px"}}>{pe(selectedMember)}</div>
        <h2 style={{fontSize:22,fontWeight:700,color:"#1a1a2e",margin:"0 0 4px"}}>{selectedMember}</h2>
        <p style={{fontSize:14,color:"#888",margin:"0 0 2rem"}}>Entre ton code PIN</p>
        <div style={{display:"flex",justifyContent:"center",gap:14,marginBottom:"1.5rem"}}>
          {[0,1,2,3].map(i=><div key={i} style={{width:15,height:15,borderRadius:8,background:pin.length>i?pc(selectedMember):"#ddd",transition:"background 0.2s"}}/>)}
        </div>
        {pinError&&<p style={{color:"#ef4444",fontSize:13,marginBottom:"1rem"}}>Code incorrect, réessaie.</p>}
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,maxWidth:260,margin:"0 auto 1.5rem"}}>
          {[1,2,3,4,5,6,7,8,9,"",0,"⌫"].map((k,i)=>(
            <button key={i} onClick={()=>{
              if(k==="⌫"){setPin(p=>p.slice(0,-1));setPinError(false);}
              else if(k!==""){
                const np=pin+k;setPin(np);
                if(np.length===4){
                  const correct=(profiles[selectedMember]||DEFAULT_PROFILES[selectedMember]||{}).pin;
                  if(np===correct){setScreen("app");setPage("tasks");setPinError(false);}
                  else{setPinError(true);setPin("");}
                }
              }
            }} style={{height:60,borderRadius:18,background:k===""?"transparent":"#fff",border:k===""?"none":"1.5px solid #eee",fontSize:22,fontWeight:600,color:"#1a1a2e",cursor:k===""?"default":"pointer",boxShadow:k===""?"none":"0 2px 6px #0001",fontFamily:"inherit"}}>
              {k}
            </button>
          ))}
        </div>
        <button onClick={()=>setScreen("home")} style={{fontSize:14,color:"#aaa",background:"none",border:"none",cursor:"pointer",fontFamily:"inherit"}}>← Changer de membre</button>
      </div>
    </div>
  );

  return(
    <div style={{minHeight:"100vh",background:"#f5f5f7",display:"flex",flexDirection:"column",alignItems:"center",fontFamily:"-apple-system,sans-serif"}}>
      <div style={{width:"100%",maxWidth:480,flex:1,paddingBottom:90}}>
        <div style={{background:"#fff",borderRadius:"0 0 24px 24px",padding:"1rem 1.25rem 1.25rem",marginBottom:14,boxShadow:"0 2px 12px #0000000a"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <div style={{width:46,height:46,borderRadius:23,background:`${color}22`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24}}>{emoji}</div>
              <div>
                <p style={{fontWeight:700,fontSize:16,color:"#1a1a2e",margin:0}}>Bonjour, {selectedMember} !</p>
                <p style={{fontSize:12,color:color,margin:0,fontWeight:600}}>{points[selectedMember]||0} points</p>
              </div>
            </div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={openEditProfile} style={{width:38,height:38,borderRadius:19,background:`${color}15`,border:"none",fontSize:17,cursor:"pointer"}}>✏️</button>
              <button onClick={logout} style={{width:38,height:38,borderRadius:19,background:"#f5f5f7",border:"none",fontSize:17,cursor:"pointer"}}>🚪</button>
            </div>
          </div>
        </div>

        <div style={{padding:"0 1rem"}}>
        {isKid&&kidChallenge(selectedMember).unlocked&&!unlockedShown[selectedMember]&&(
          <div style={{background:`${color}15`,border:`2px solid ${color}`,borderRadius:20,padding:"1rem",marginBottom:14,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div>
              <p style={{fontWeight:700,fontSize:14,color,margin:"0 0 2px"}}>🏆 Challenge débloqué !</p>
              <p style={{fontSize:13,color:"#1a1a2e",margin:0}}>{rewards[selectedMember]||"Récompense !"}</p>
            </div>
            <button onClick={()=>dismissUnlock(selectedMember)} style={{background:color,color:"#fff",border:"none",borderRadius:12,padding:"7px 16px",fontWeight:700,fontSize:13,cursor:"pointer"}}>OK !</button>
          </div>
        )}

        {page==="tasks"&&(<>
          {/* Tâches hebdomadaires */}
          <div style={{background:"#fff",borderRadius:20,padding:"1rem",marginBottom:14,boxShadow:"0 1px 8px #0000000a"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
              <p style={{fontWeight:700,fontSize:14,color:"#1a1a2e",margin:0}}>Tâches hebdomadaires Michel &amp; Gabrielle</p>
              <span style={{fontSize:11,padding:"3px 9px",borderRadius:99,background:"#f0f0f5",color:"#888",fontWeight:500}}>{sharedDone}/{SHARED_DAILY.length}</span>
            </div>
            <div style={{height:5,borderRadius:3,background:"#f0f0f5",marginBottom:10,overflow:"hidden"}}>
              <div style={{height:"100%",borderRadius:3,background:color,width:`${SHARED_DAILY.length?(sharedDone/SHARED_DAILY.length)*100:0}%`,transition:"width 0.3s"}}/>
            </div>
            {SHARED_DAILY.map(task=>{
              const key=`${today}|shared|${task}`;
              const timesToday=history.filter(h=>h.task===task&&h.dayKey===today&&h.type==="commune").length;
              const isDouble=DOUBLE_POINTS_TASKS.includes(task);
              return(
                <div key={task} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderBottom:"1px solid #f5f5f7"}}>
                  <div onClick={()=>claimShared(task)} style={{width:26,height:26,borderRadius:13,border:`2px solid ${color}44`,background:`${color}22`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,cursor:"pointer"}}><Plus color={color}/></div>
                  <span onClick={()=>claimShared(task)} style={{fontSize:14,color:"#1a1a2e",flex:1,cursor:"pointer"}}>{task}</span>
                  {isDouble&&<span style={{fontSize:10,padding:"2px 7px",borderRadius:99,background:"#FEF9C3",color:"#A16207",fontWeight:600}}>×2 pts</span>}
                  {timesToday>0&&<span style={{fontSize:11,padding:"2px 8px",borderRadius:99,background:`${color}22`,color,fontWeight:600}}>×{timesToday}</span>}
                  <PhotoBtn taskKey={key}/>
                </div>
              );
            })}
          </div>

          {/* Michel vs Gabrielle */}
          {(()=>{
            const counts=kidsCommonCount();
            const mS=counts["Michel"]||0;const gS=counts["Gabrielle"]||0;const total=mS+gS||1;
            const setter=whoSetsTableToday();
            return(
              <div style={{background:"#fff",borderRadius:20,padding:"1rem",marginBottom:14,boxShadow:"0 1px 8px #0000000a"}}>
                <p style={{fontWeight:700,fontSize:15,color:"#1a1a2e",margin:"0 0 10px"}}>⚔️ Michel vs Gabrielle</p>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                  <span style={{fontSize:13,fontWeight:700,color:pc("Michel"),minWidth:54}}>{pe("Michel")} {mS}</span>
                  <div style={{flex:1,height:10,borderRadius:5,background:"#f0f0f5",overflow:"hidden",display:"flex"}}>
                    <div style={{height:"100%",background:pc("Michel"),width:`${(mS/total)*100}%`,transition:"width 0.4s"}}/>
                    <div style={{height:"100%",background:pc("Gabrielle"),width:`${(gS/total)*100}%`,transition:"width 0.4s"}}/>
                  </div>
                  <span style={{fontSize:13,fontWeight:700,color:pc("Gabrielle"),minWidth:54,textAlign:"right"}}>{gS} {pe("Gabrielle")}</span>
                </div>
                <p style={{fontSize:11,color:"#aaa",textAlign:"center",margin:"0 0 12px"}}>Tâches hebdomadaires · récompense au meilleur !</p>
                <div style={{borderTop:"1px solid #f5f5f7",paddingTop:10}}>
                  <p style={{fontSize:13,fontWeight:600,color:"#888",margin:"0 0 8px"}}>🍽️ Table aujourd'hui</p>
                  {!getTableSetter()?<p style={{fontSize:12,color:"#aaa",margin:0}}>Le 1er enfant à mettre la table ce lundi définit le roulement.</p>:(
                    <div style={{display:"flex",gap:8}}>
                      {[{kid:"Michel",role:setter==="Michel"?"Mettre la table":"Débarrasser"},{kid:"Gabrielle",role:setter==="Gabrielle"?"Mettre la table":"Débarrasser"}].map(({kid,role})=>(
                        <div key={kid} style={{flex:1,background:`${pc(kid)}12`,borderRadius:14,padding:"8px",textAlign:"center"}}>
                          <div style={{fontSize:20}}>{pe(kid)}</div>
                          <p style={{fontSize:12,fontWeight:700,color:pc(kid),margin:"3px 0 1px"}}>{kid}</p>
                          <p style={{fontSize:11,color:"#888",margin:0}}>{role}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Initiative */}
          <div style={{background:"#fff",borderRadius:20,padding:"1rem",marginBottom:14,boxShadow:"0 1px 8px #0000000a",border:"1.5px solid #FEF9C3"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
              <p style={{fontWeight:700,fontSize:15,color:"#1a1a2e",margin:0}}>⭐ Initiative <span style={{fontSize:12,color:"#A16207",fontWeight:600,marginLeft:6}}>+2 pts</span></p>
              {!initiative&&<button onClick={()=>setShowInitiativeForm(true)} style={{fontSize:12,padding:"6px 14px",borderRadius:99,background:"#FEF9C3",color:"#A16207",border:"none",fontWeight:700,cursor:"pointer"}}>+ Poster</button>}
            </div>
            {!initiative&&!showInitiativeForm&&<p style={{fontSize:13,color:"#aaa",margin:0}}>Aucune initiative en cours.</p>}
            {showInitiativeForm&&(
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                <select value={initTask} onChange={e=>setInitTask(e.target.value)} style={{fontSize:14,padding:"10px",borderRadius:12,border:"1.5px solid #eee",background:"#fafafa"}}>
                  {INITIATIVE_TASKS.map(t=><option key={t}>{t}</option>)}
                </select>
                {initTask==="Ranger une pièce"&&<select value={initRoom} onChange={e=>setInitRoom(e.target.value)} style={{fontSize:14,padding:"10px",borderRadius:12,border:"1.5px solid #eee",background:"#fafafa"}}>{ROOMS.map(r=><option key={r}>{r}</option>)}</select>}
                {initTask==="Autre (décrire)"&&<input value={initCustom} onChange={e=>setInitCustom(e.target.value)} placeholder="Décris la tâche..." style={{fontSize:14,padding:"10px",borderRadius:12,border:"1.5px solid #eee",background:"#fafafa",fontFamily:"inherit"}}/>}
                <div style={{display:"flex",gap:8}}>
                  <button onClick={()=>setShowInitiativeForm(false)} style={{flex:1,background:"#f5f5f7",border:"none",borderRadius:12,padding:"10px",fontWeight:600,fontSize:13,cursor:"pointer"}}>Annuler</button>
                  <button onClick={postInitiative} style={{flex:1,background:"#F59E0B",color:"#fff",border:"none",borderRadius:12,padding:"10px",fontWeight:700,fontSize:13,cursor:"pointer"}}>Poster !</button>
                </div>
              </div>
            )}
            {initiative&&(
              <div>
                <div style={{background:"#FEFCE8",borderRadius:14,padding:"12px",marginBottom:10}}>
                  <p style={{fontWeight:700,fontSize:14,color:"#92400E",margin:"0 0 4px"}}>📋 {initiative.task}</p>
                  <p style={{fontSize:12,color:"#aaa",margin:0}}>Posté par {initiative.postedBy} · {initiative.postedAt}</p>
                  {initiative.acceptedBy&&<p style={{fontSize:12,color:pc(initiative.acceptedBy),fontWeight:600,margin:"4px 0 0"}}>✋ Pris en charge par {initiative.acceptedBy}</p>}
                </div>
                {!initiative.acceptedBy&&<button onClick={acceptInitiative} style={{width:"100%",background:color,color:"#fff",border:"none",borderRadius:12,padding:"10px",fontWeight:700,fontSize:13,cursor:"pointer",marginBottom:8}}>Je prends en charge !</button>}
                {initiative.acceptedBy===selectedMember&&<button onClick={completeInitiative} style={{width:"100%",background:"#10B981",color:"#fff",border:"none",borderRadius:12,padding:"10px",fontWeight:700,fontSize:13,cursor:"pointer",marginBottom:8}}>Tâche terminée ! (+2 pts)</button>}
                {(isCouple||initiative.postedBy===selectedMember)&&<button onClick={cancelInitiative} style={{width:"100%",background:"#f5f5f7",color:"#aaa",border:"none",borderRadius:12,padding:"8px",fontWeight:600,fontSize:12,cursor:"pointer"}}>Annuler</button>}
              </div>
            )}
          </div>

          {/* Maman & Papou */}
          <div style={{background:"#fff",borderRadius:20,padding:"1rem",marginBottom:14,boxShadow:"0 1px 8px #0000000a"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
              <p style={{fontWeight:700,fontSize:15,color:"#1a1a2e",margin:0}}>Maman &amp; Papou</p>
              <span style={{fontSize:11,padding:"3px 9px",borderRadius:99,background:"#f0f0f5",color:"#888",fontWeight:500}}>{coupleDone}/{COUPLE_POOL.length} semaine</span>
            </div>
            <div style={{height:5,borderRadius:3,background:"#f0f0f5",marginBottom:10,overflow:"hidden"}}>
              <div style={{height:"100%",borderRadius:3,background:"#5DCAA5",width:`${COUPLE_POOL.length?(coupleDone/COUPLE_POOL.length)*100:0}%`,transition:"width 0.3s"}}/>
            </div>
            {COUPLE_POOL.map(task=>{
              const key=`${wk}|couple|${task}`;
              const timesThisWeek=history.filter(h=>h.task===task&&h.weekKey===wk&&h.type==="couple").length;
              return(
                <div key={task} onClick={()=>claimCouple(task)} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderBottom:"1px solid #f5f5f7",cursor:isCouple?"pointer":"default",opacity:!isCouple?0.5:1}}>
                  <div style={{width:26,height:26,borderRadius:13,border:`2px solid ${isCouple?color+"44":"#ddd"}`,background:isCouple?`${color}22`:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    {isCouple&&<Plus color={color}/>}
                  </div>
                  <span style={{fontSize:14,color:"#1a1a2e",flex:1}}>{task}</span>
                  {timesThisWeek>0&&<span style={{fontSize:11,padding:"2px 8px",borderRadius:99,background:"#DCFCE7",color:"#16A34A",fontWeight:600}}>×{timesThisWeek}</span>}
                  {!isCouple&&<span style={{fontSize:11,color:"#ccc"}}>Maman/Papou</span>}
                  <PhotoBtn taskKey={key}/>
                </div>
              );
            })}
          </div>

          {/* Tâches perso */}
          {Object.keys(profiles).filter(m=>(PERSONAL_TASKS[m]||[]).length>0).map(pm=>{
            const pmTasks=PERSONAL_TASKS[pm]||[];
            const pmDone=pmTasks.filter(t=>done[`${wk}|personal|${pm}|${t}`]).length;
            const pmC=pc(pm);const pmE=pe(pm);const isOwn=pm===selectedMember;
            return(
              <div key={pm} style={{background:"#fff",borderRadius:20,padding:"1rem",marginBottom:14,boxShadow:"0 1px 8px #0000000a",border:isOwn?`2px solid ${pmC}44`:"none"}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <div style={{width:30,height:30,borderRadius:15,background:`${pmC}22`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:17}}>{pmE}</div>
                    <p style={{fontWeight:700,fontSize:15,color:pmC,margin:0}}>{pm}{isOwn?" ✓":""}</p>
                  </div>
                  <span style={{fontSize:11,padding:"3px 9px",borderRadius:99,background:`${pmC}15`,color:pmC,fontWeight:700}}>{pmDone}/{pmTasks.length}</span>
                </div>
                <div style={{height:5,borderRadius:3,background:"#f0f0f5",marginBottom:10,overflow:"hidden"}}>
                  <div style={{height:"100%",borderRadius:3,background:pmC,width:`${pmTasks.length?(pmDone/pmTasks.length)*100:0}%`,transition:"width 0.3s"}}/>
                </div>
                {pmTasks.map(task=>{
                  const key=`${wk}|personal|${pm}|${task}`;const checked=!!done[key];
                  return(
                    <div key={task} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderBottom:"1px solid #f5f5f7"}}>
                      <div onClick={()=>isOwn&&togglePersonal(pm,task)} style={{width:26,height:26,borderRadius:13,border:checked?"none":`2px solid ${isOwn?pmC+"44":"#ddd"}`,background:checked?pmC:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,cursor:isOwn?"pointer":"default"}}>{checked&&<Tick/>}</div>
                      <span onClick={()=>isOwn&&togglePersonal(pm,task)} style={{fontSize:14,color:checked?"#bbb":"#1a1a2e",textDecoration:checked?"line-through":"none",flex:1,cursor:isOwn?"pointer":"default",opacity:!isOwn&&!checked?0.5:1}}>{task}</span>
                      <PhotoBtn taskKey={key}/>
                    </div>
                  );
                })}
              </div>
            );
          })}

          {/* Challenges */}
          {KIDS.map(kid=>{
            const kp=kidChallenge(kid);const kC=pc(kid);const kE=pe(kid);const isOwn=kid===selectedMember;
            return(
              <div key={kid} style={{background:kp.unlocked?`${kC}15`:"#fff",border:kp.unlocked?`2px solid ${kC}`:"1px solid #f0f0f5",borderRadius:20,padding:"1rem",marginBottom:14,boxShadow:"0 1px 8px #0000000a"}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                  <span style={{fontSize:20}}>{kp.unlocked?"🏆":"🎯"}</span>
                  <div style={{width:26,height:26,borderRadius:13,background:`${kC}22`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>{kE}</div>
                  <p style={{fontWeight:700,fontSize:14,color:kC,margin:0}}>Challenge {kid}{isOwn?" (moi)":""}</p>
                  <span style={{marginLeft:"auto",fontSize:12,color:kp.unlocked?kC:"#aaa",fontWeight:700}}>{kp.pct}%</span>
                </div>
                <div style={{height:8,borderRadius:4,background:"#f0f0f5",marginBottom:8,overflow:"hidden"}}>
                  <div style={{height:"100%",borderRadius:4,background:kC,width:`${kp.pct}%`,transition:"width 0.4s"}}/>
                </div>
                <p style={{fontSize:12,color:kp.unlocked?kC:"#aaa",margin:"0 0 2px",fontWeight:kp.unlocked?700:400}}>{kp.unlocked?"Débloqué !":"Récompense si toutes les tâches sont faites :"}</p>
                <p style={{fontSize:13,color:"#1a1a2e",margin:0}}>{rewards[kid]||"Récompense à définir"}</p>
                {kp.unlocked&&isOwn&&!unlockedShown[kid]&&<button onClick={()=>dismissUnlock(kid)} style={{marginTop:8,background:kC,color:"#fff",border:"none",borderRadius:12,padding:"6px 16px",fontWeight:700,fontSize:13,cursor:"pointer"}}>OK !</button>}
              </div>
            );
          })}

          <div style={{display:"flex",justifyContent:"flex-end",marginBottom:16}}>
            <button onClick={nextWeek} style={{background:color,color:"#fff",border:"none",borderRadius:16,padding:"12px 22px",fontWeight:700,fontSize:14,cursor:"pointer"}}>Semaine suivante →</button>
          </div>
        </>)}

        {page==="scores"&&(
          <div style={{background:"#fff",borderRadius:20,padding:"1rem",boxShadow:"0 1px 8px #0000000a"}}>
            <p style={{fontWeight:700,fontSize:16,color:"#1a1a2e",margin:"0 0 16px"}}>Classement familial 🏅</p>
            {Object.keys(profiles).sort((a,b)=>(points[b]||0)-(points[a]||0)).map((m,i)=>{
              const c=pc(m);const e=pe(m);const pts=points[m]||0;
              const max=Math.max(...Object.keys(profiles).map(x=>points[x]||0),1);
              return(
                <div key={m} style={{display:"flex",alignItems:"center",gap:12,padding:"11px 0",borderBottom:"1px solid #f5f5f7"}}>
                  <span style={{fontSize:18,fontWeight:700,width:26,color:"#ccc",textAlign:"center"}}>{i+1}</span>
                  <div style={{width:40,height:40,borderRadius:20,background:`${c}22`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>{e}</div>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                      <span style={{fontSize:14,fontWeight:700,color:m===selectedMember?c:"#1a1a2e"}}>{m}{m===selectedMember?" (moi)":""}</span>
                      <span style={{fontSize:13,fontWeight:700,color:c}}>{pts} pts</span>
                    </div>
                    <div style={{height:5,borderRadius:3,background:"#f0f0f5"}}>
                      <div style={{height:"100%",borderRadius:3,background:c,width:`${(pts/max)*100}%`,transition:"width 0.4s"}}/>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {page==="history"&&(
          <div>
            <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap"}}>
              {[["today","Aujourd'hui"],["yesterday","Hier"],["week","Semaine"],["all","Tout"]].map(([v,l])=>(
                <button key={v} onClick={()=>setHistFilter(v)} style={{fontSize:13,padding:"7px 14px",borderRadius:99,border:"none",background:histFilter===v?color:"#fff",color:histFilter===v?"#fff":"#888",fontWeight:histFilter===v?700:400,cursor:"pointer",boxShadow:"0 1px 4px #0000000a",fontFamily:"inherit"}}>{l}</button>
              ))}
            </div>
            <div style={{background:"#fff",borderRadius:20,padding:"1rem",boxShadow:"0 1px 8px #0000000a"}}>
              {filteredHist.length===0&&<p style={{fontSize:14,color:"#aaa",textAlign:"center",padding:"1rem 0"}}>Aucune tâche pour cette période.</p>}
              {filteredHist.map((h,i)=>{
                const c=pc(h.member);const e=pe(h.member);
                const photoKey=h.type==="commune"?`${h.dayKey}|shared|${h.task}`:h.type==="couple"?`${h.weekKey}|couple|${h.task}`:`${h.weekKey}|personal|${h.member}|${h.task}`;
                const photoData=photos[photoKey];
                const photoUrl=photoData?(typeof photoData==="string"?photoData:photoData.url):null;
                return(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderBottom:"1px solid #f5f5f7"}}>
                    <div style={{width:34,height:34,borderRadius:17,background:`${c}22`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{e}</div>
                    <div style={{flex:1,minWidth:0}}>
                      <p style={{fontWeight:700,fontSize:13,color:c,margin:"0 0 1px"}}>{h.member}</p>
                      <p style={{fontSize:12,color:"#888",margin:0,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{h.task}</p>
                    </div>
                    <div style={{display:"flex",gap:6,alignItems:"center",flexShrink:0}}>
                      {photoUrl&&<button onClick={()=>setPhotoViewer({url:photoUrl,path:photoData?.path||"",taskKey:photoKey})} style={{width:28,height:28,borderRadius:8,border:"none",background:"#f0f0f5",cursor:"pointer",fontSize:14}}>📸</button>}
                      <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:3}}>
                        <span style={typeBadge(h.type)}>{h.type}</span>
                        <span style={{fontSize:11,color:"#bbb"}}>{h.date}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {page==="messages"&&(
          <div style={{display:"flex",flexDirection:"column",height:"calc(100vh - 200px)"}}>
            <div style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column",gap:8,paddingBottom:8}}>
              {messages.length===0&&<p style={{fontSize:14,color:"#aaa",textAlign:"center",marginTop:"2rem"}}>Aucun message pour l'instant.</p>}
              {messages.map((m,i)=>{
                const isMe=m.from===selectedMember;const c=pc(m.from);const e=pe(m.from);
                return(
                  <div key={i} style={{display:"flex",flexDirection:isMe?"row-reverse":"row",alignItems:"flex-end",gap:8}}>
                    {!isMe&&<div style={{width:30,height:30,borderRadius:15,background:`${c}22`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>{e}</div>}
                    <div style={{maxWidth:"72%"}}>
                      {!isMe&&<p style={{fontSize:11,color:c,fontWeight:700,margin:"0 0 3px",paddingLeft:4}}>{m.from}</p>}
                      <div style={{background:isMe?color:"#fff",color:isMe?"#fff":"#1a1a2e",borderRadius:isMe?"18px 18px 4px 18px":"18px 18px 18px 4px",padding:"10px 14px",fontSize:14,boxShadow:"0 1px 4px #0000000a"}}>{m.text}</div>
                      <p style={{fontSize:10,color:"#ccc",margin:"3px 0 0",textAlign:isMe?"right":"left",paddingLeft:4}}>{m.day} {m.date}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={msgEnd}/>
            </div>
            <div style={{display:"flex",gap:8,paddingTop:8,borderTop:"1px solid #f0f0f5",background:"#f5f5f7",paddingBottom:4}}>
              <input value={newMsg} onChange={e=>setNewMsg(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendMessage()} placeholder="Écrire un message..." style={{flex:1,fontSize:14,padding:"10px 14px",borderRadius:22,border:"1.5px solid #eee",background:"#fff",fontFamily:"inherit"}}/>
              <button onClick={sendMessage} style={{width:44,height:44,borderRadius:22,background:color,color:"#fff",border:"none",fontSize:20,cursor:"pointer",flexShrink:0}}>↑</button>
            </div>
          </div>
        )}
        </div>
      </div>

      {/* Bottom nav */}
      <div style={{position:"fixed",bottom:0,left:0,right:0,display:"flex",justifyContent:"center"}}>
        <div style={{width:"100%",maxWidth:480,background:"#fff",borderTop:"1px solid #f0f0f5",display:"flex",padding:"8px 0 20px",boxShadow:"0 -4px 20px #0000000a"}}>
          {[["tasks","🏠","Tâches"],["scores","🏅","Points"],["history","📋","Historique"],["messages","💬","Messages"]].map(([p,ic,lb])=>(
            <button key={p} onClick={()=>setPage(p)} style={{flex:1,background:"none",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:2,fontFamily:"inherit"}}>
              <span style={{fontSize:22}}>{ic}</span>
              <span style={{fontSize:10,fontWeight:page===p?700:400,color:page===p?color:"#aaa"}}>{lb}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Photo viewer avec suppression */}
      {photoViewer&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.9)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",zIndex:500,padding:"1rem"}}>
          <button onClick={()=>setPhotoViewer(null)} style={{position:"absolute",top:20,right:20,width:40,height:40,borderRadius:20,background:"rgba(255,255,255,0.2)",border:"none",color:"#fff",fontSize:20,cursor:"pointer"}}>✕</button>
          <img src={photoViewer.url} style={{maxWidth:"100%",maxHeight:"75vh",borderRadius:16,objectFit:"contain"}} alt="Preuve tâche"/>
          <button onClick={()=>handlePhotoDelete(photoViewer.taskKey,photoViewer.path)} style={{marginTop:20,background:"#ef4444",color:"#fff",border:"none",borderRadius:16,padding:"12px 28px",fontWeight:700,fontSize:15,cursor:"pointer"}}>🗑️ Supprimer</button>
        </div>
      )}

      {/* Règles */}
      {firstLogin&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:400,padding:"1rem"}}>
          <div style={{background:"#fff",borderRadius:24,padding:"1.75rem",width:"100%",maxWidth:340,textAlign:"center"}}>
            <div style={{fontSize:48,marginBottom:8}}>{RULES[rulesPage].emoji}</div>
            <h3 style={{fontWeight:700,fontSize:18,color:"#1a1a2e",margin:"0 0 10px"}}>{RULES[rulesPage].title}</h3>
            <p style={{fontSize:14,color:"#888",lineHeight:1.6,margin:"0 0 24px"}}>{RULES[rulesPage].desc}</p>
            <div style={{display:"flex",justifyContent:"center",gap:6,marginBottom:20}}>
              {RULES.map((_,i)=><div key={i} style={{width:8,height:8,borderRadius:4,background:i===rulesPage?pc(selectedMember):"#ddd",transition:"background 0.2s"}}/>)}
            </div>
            <div style={{display:"flex",gap:10}}>
              {rulesPage>0&&<button onClick={()=>setRulesPage(p=>p-1)} style={{flex:1,background:"#f5f5f7",color:"#1a1a2e",border:"none",borderRadius:16,padding:"13px",fontWeight:600,fontSize:14,cursor:"pointer"}}>← Retour</button>}
              {rulesPage<RULES.length-1
                ?<button onClick={()=>setRulesPage(p=>p+1)} style={{flex:1,background:pc(selectedMember),color:"#fff",border:"none",borderRadius:16,padding:"13px",fontWeight:700,fontSize:14,cursor:"pointer"}}>Suivant →</button>
                :<button onClick={dismissRules} style={{flex:1,background:pc(selectedMember),color:"#fff",border:"none",borderRadius:16,padding:"13px",fontWeight:700,fontSize:14,cursor:"pointer"}}>C'est parti ! 🚀</button>
              }
            </div>
          </div>
        </div>
      )}

      {/* Gage */}
      {gageAlert&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:300,padding:"1rem"}} onClick={()=>setGageAlert(null)}>
          <div style={{background:"#fff",borderRadius:24,padding:"1.75rem",width:"100%",maxWidth:340,textAlign:"center"}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:48,marginBottom:8}}>😬</div>
            <h3 style={{fontWeight:700,fontSize:18,color:"#1a1a2e",margin:"0 0 8px"}}>Gage pour Michel &amp; Gabrielle !</h3>
            <p style={{fontSize:14,color:"#888",margin:"0 0 6px"}}><strong style={{color:pc(gageAlert.member)}}>{gageAlert.member}</strong> a fait :</p>
            <p style={{fontSize:14,fontWeight:700,background:"#f5f5f7",borderRadius:12,padding:"10px",margin:"0 0 16px"}}>"{gageAlert.task}"</p>
            <p style={{fontSize:13,color:"#aaa",margin:"0 0 20px"}}>La famille décide ensemble du gage !</p>
            <button onClick={()=>setGageAlert(null)} style={{width:"100%",background:"#1a1a2e",color:"#fff",border:"none",borderRadius:16,padding:"14px",fontWeight:700,fontSize:15,cursor:"pointer"}}>OK, on décide !</button>
          </div>
        </div>
      )}

      {/* Fin de semaine */}
      {endWeekModal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:300,padding:"1rem"}}>
          <div style={{background:"#fff",borderRadius:24,padding:"1.5rem",width:"100%",maxWidth:340}}>
            {(()=>{
              const counts=kidsCommonCount();
              const mS=counts["Michel"]||0;const gS=counts["Gabrielle"]||0;
              const winner=mS>gS?"Michel":gS>mS?"Gabrielle":null;
              return(
                <div style={{textAlign:"center",marginBottom:16,paddingBottom:16,borderBottom:"1px solid #f5f5f7"}}>
                  <p style={{fontSize:28,margin:"0 0 6px"}}>🏅</p>
                  <p style={{fontWeight:700,fontSize:15,color:"#1a1a2e",margin:"0 0 8px"}}>Compétition tâches hebdomadaires</p>
                  <div style={{display:"flex",justifyContent:"center",gap:20,marginBottom:8}}>
                    <span style={{fontSize:13,fontWeight:700,color:pc("Michel")}}>{pe("Michel")} Michel : {mS}</span>
                    <span style={{fontSize:13,fontWeight:700,color:pc("Gabrielle")}}>Gabrielle : {gS} {pe("Gabrielle")}</span>
                  </div>
                  {winner?<p style={{fontSize:13,color:"#888",margin:0}}>🎉 <strong style={{color:pc(winner)}}>{winner}</strong> gagne ! La famille décide de sa récompense.</p>
                  :<p style={{fontSize:13,color:"#888",margin:0}}>Égalité ! La famille décide ensemble.</p>}
                </div>
              );
            })()}
            {lateMembers.length>0&&(
              <>
                <p style={{fontWeight:700,fontSize:15,color:"#1a1a2e",margin:"0 0 10px",textAlign:"center"}}>⚠️ Tâches non terminées</p>
                <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:14}}>
                  {lateMembers.map(m=>(
                    <div key={m} style={{display:"flex",alignItems:"center",gap:10,background:"#fff5f5",borderRadius:14,padding:"10px 14px"}}>
                      <div style={{width:34,height:34,borderRadius:17,background:`${pc(m)}22`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>{pe(m)}</div>
                      <span style={{fontWeight:700,fontSize:14,color:pc(m)}}>{m}</span>
                      <span style={{marginLeft:"auto",fontSize:20}}>😅</span>
                    </div>
                  ))}
                </div>
                <p style={{fontSize:13,color:"#aaa",textAlign:"center",margin:"0 0 14px"}}>La famille décide d'un gage pour chacun !</p>
              </>
            )}
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>setEndWeekModal(false)} style={{flex:1,background:"#f5f5f7",color:"#1a1a2e",border:"none",borderRadius:16,padding:"13px",fontWeight:600,fontSize:14,cursor:"pointer"}}>Attendre</button>
              <button onClick={doNextWeek} style={{flex:1,background:"#1a1a2e",color:"#fff",border:"none",borderRadius:16,padding:"13px",fontWeight:700,fontSize:14,cursor:"pointer"}}>Suivante →</button>
            </div>
          </div>
        </div>
      )}

      {/* Profil */}
      {editingProfile&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:200}} onClick={()=>setEditingProfile(false)}>
          <div style={{width:"100%",maxWidth:480,background:"#fff",borderRadius:"24px 24px 0 0",padding:"1.5rem 1.25rem 2.5rem"}} onClick={e=>e.stopPropagation()}>
            <div style={{width:40,height:4,borderRadius:2,background:"#e0e0e0",margin:"0 auto 1.25rem"}}/>
            <p style={{fontWeight:700,fontSize:17,color:"#1a1a2e",margin:"0 0 1.25rem"}}>Mon profil</p>
            <p style={{fontSize:13,fontWeight:600,color:"#888",margin:"0 0 8px"}}>Mon emoji</p>
            <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:16}}>
              {EMOJI_OPTIONS.map(em=><button key={em} onClick={()=>setEditEmoji(em)} style={{width:44,height:44,borderRadius:12,border:editEmoji===em?`2.5px solid ${editColor}`:"1.5px solid #eee",background:editEmoji===em?`${editColor}15`:"#fafafa",fontSize:22,cursor:"pointer"}}>{em}</button>)}
            </div>
            <p style={{fontSize:13,fontWeight:600,color:"#888",margin:"0 0 8px"}}>Ma couleur</p>
            <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:16}}>
              {COLOR_OPTIONS.map(c=><button key={c} onClick={()=>setEditColor(c)} style={{width:38,height:38,borderRadius:19,background:c,border:editColor===c?"3px solid #1a1a2e":"3px solid transparent",cursor:"pointer"}}/>)}
            </div>
            <p style={{fontSize:13,fontWeight:600,color:"#888",margin:"0 0 8px"}}>Code PIN (4 chiffres)</p>
            <input value={editPin} onChange={e=>setEditPin(e.target.value.replace(/\D/g,"").slice(0,4))} maxLength={4} placeholder="0000" style={{width:"100%",fontSize:20,padding:"10px 14px",borderRadius:14,border:"1.5px solid #eee",marginBottom:16,boxSizing:"border-box",letterSpacing:8,textAlign:"center",fontFamily:"inherit"}}/>
            {KIDS.includes(selectedMember)&&(
              <>
                <p style={{fontSize:13,fontWeight:600,color:"#888",margin:"0 0 8px"}}>Récompense challenge</p>
                <input value={editReward} onChange={e=>setEditReward(e.target.value)} placeholder="Ex : Sortie cinéma, bonbons..." style={{width:"100%",fontSize:14,padding:"10px 14px",borderRadius:14,border:"1.5px solid #eee",marginBottom:16,boxSizing:"border-box",fontFamily:"inherit"}}/>
              </>
            )}
            <button onClick={saveProfile} style={{width:"100%",background:editColor,color:"#fff",border:"none",borderRadius:16,padding:"15px",fontWeight:700,fontSize:15,cursor:"pointer"}}>Enregistrer</button>
          </div>
        </div>
      )}
    </div>
  );
}
