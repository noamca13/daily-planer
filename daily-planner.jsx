
// ════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════════════════════════════════════════════

const ALL_HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = ["00","05","10","15","20","25","30","35","40","45","50","55"];
const DURATIONS = [...Array.from({length:12},(_,i)=>(i+1)*5), 90,120,150,180,210,240,270,300,360,420,480,540,600,660,720];
const COLORS = ["#4ade80","#60a5fa","#f97316","#facc15","#c084fc","#f472b6","#34d399","#fb923c"];
const HEB_DAYS = ["ראשון","שני","שלישי","רביעי","חמישי","שישי","שבת"];
const HEB_MONTHS = ["ינואר","פברואר","מרץ","אפריל","מאי","יוני","יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"];

const DIFF = [
  { v:1, label:"קל",   icon:"🌱", pts:5,  border:"rgba(148,163,184,0.22)", glow:null,                    accent:"#94a3b8" },
  { v:2, label:"בינוני",icon:"⚡", pts:15, border:"rgba(96,165,250,0.4)",   glow:"rgba(96,165,250,0.14)", accent:"#60a5fa" },
  { v:3, label:"קשה",  icon:"🔥", pts:30, border:"rgba(249,115,22,0.55)",  glow:"rgba(249,115,22,0.22)", accent:"#f97316" },
];

// Refined level progression - smooth narrative arc
const LEVELS = [
  { min:0,    name:"בהתחלה",     icon:"🌱", color:"#94a3b8" },
  { min:75,   name:"מתחיל לזוז",  icon:"💧", color:"#7dd3fc" },
  { min:200,  name:"בתנופה",      icon:"⚡", color:"#60a5fa" },
  { min:450,  name:"חזק",         icon:"🔥", color:"#f97316" },
  { min:800,  name:"בלתי עציר",   icon:"💎", color:"#a78bfa" },
  { min:1400, name:"מאסטר",       icon:"👑", color:"#fbbf24" },
  { min:2500, name:"אגדה",        icon:"🌟", color:"#4ade80" },
];

const DEFAULT_HABITS = [
  { id:"h1", name:"שתייה 8 כוסות", icon:"💧" },
  { id:"h2", name:"ספורט", icon:"🏃" },
  { id:"h3", name:"קריאה", icon:"📚" },
];

const FOCUS_PRESETS = [15, 25, 45, 60];
const SCROLL_TO_HOUR = 8;
const FREEZE_EVERY = 7;
const MAX_FREEZES = 3;

const MYSTERY_REWARDS = [
  { type:"xp",     amount:15,  label:"+15 XP בונוס", icon:"⭐" },
  { type:"xp",     amount:30,  label:"+30 XP בונוס", icon:"💫" },
  { type:"xp",     amount:50,  label:"+50 XP בונוס!", icon:"✨" },
  { type:"freeze", amount:1,   label:"Streak Freeze חינם!", icon:"❄️" },
  { type:"xp",     amount:100, label:"+100 XP — נדיר!", icon:"💎" },
];

// ════════════════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════════════════

function localDateKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
const todayKey = () => localDateKey();
function addDays(s,n){ const [y,m,d]=s.split("-").map(Number); return localDateKey(new Date(y,m-1,d+n)); }
function addMonths(s,n){ const [y,m,d]=s.split("-").map(Number); return localDateKey(new Date(y,m-1+n,d)); }
function daysBetween(a,b){ const da=new Date(a+"T12:00:00"), db=new Date(b+"T12:00:00"); return Math.round((db-da)/86400000); }
function fmtTime(h,m){ return `${String(h).padStart(2,"0")}:${String(m||0).padStart(2,"0")}`; }
function fmtDur(mins){ if(mins<60) return `${mins} דק'`; const h=Math.floor(mins/60),m=mins%60; return m?`${h}:${String(m).padStart(2,"0")}`:`${h} שע'`; }
function fmtDateHeb(s){ const [y,m,d]=s.split("-").map(Number),dt=new Date(y,m-1,d); return `יום ${HEB_DAYS[dt.getDay()]}, ${dt.getDate()} ב${HEB_MONTHS[dt.getMonth()]}`; }
function getWeekStart(s){ const [y,m,d]=s.split("-").map(Number),dt=new Date(y,m-1,d); dt.setDate(dt.getDate()-dt.getDay()); return localDateKey(dt); }
function getMonthDays(s){ const [y,m]=s.split("-").map(Number),first=new Date(y,m-1,1),last=new Date(y,m,0); const days=[]; for(let i=1;i<=last.getDate();i++) days.push(localDateKey(new Date(y,m-1,i))); return {days,firstDow:first.getDay()}; }
function getLevel(xp){ let l=LEVELS[0]; for(const lvl of LEVELS) if(xp>=lvl.min) l=lvl; const i=LEVELS.indexOf(l),next=LEVELS[i+1]; return {...l,next,pct:next?Math.round(((xp-l.min)/(next.min-l.min))*100):100}; }

function buildMemory(allTasks){
  const mem={};
  Object.values(allTasks).flat().forEach(t=>{
    const k=t.title?.trim().toLowerCase(); if(!k) return;
    if(!mem[k]) mem[k]={title:t.title,color:t.color,durationMins:t.durationMins||60,difficulty:t.difficulty||1,count:0};
    mem[k].count++;
    mem[k].color=t.color;
    mem[k].durationMins=t.durationMins||60;
    mem[k].difficulty=t.difficulty||1;
  });
  return mem;
}

function applyTemplates(allTasks,templates,dateStr){
  const [y,m,d]=dateStr.split("-").map(Number),dt=new Date(y,m-1,d),dow=dt.getDay(),dom=dt.getDate();
  const apps=templates.filter(t=>t.recurrence==="daily"||(t.recurrence==="weekly"&&t.dow===dow)||(t.recurrence==="monthly"&&t.dom===dom));
  if(!apps.length) return allTasks[dateStr]||[];
  const existing=allTasks[dateStr]||[];
  const eIds=new Set(existing.map(t=>t.templateId).filter(Boolean));
  const toAdd=apps.filter(t=>!eIds.has(t.id)).map(t=>({
    id:Date.now()+Math.random(),title:t.title,hour:t.hour,minute:t.minute||0,durationMins:t.durationMins||60,
    color:t.color,reminder:t.reminder,note:t.note||"",ifCue:t.ifCue||"",thenCue:t.thenCue||"",done:false,templateId:t.id,difficulty:t.difficulty||1,isFocus:t.isFocus||false
  }));
  return [...existing,...toAdd];
}

function scheduleNotif(task){
  if(!("Notification" in window)||Notification.permission!=="granted") return;
  const t=new Date(); t.setHours(task.hour,task.minute||0,0,0);
  const diff=t-new Date();
  if(diff>0&&diff<12*3600000){
    setTimeout(()=>{
      const where=task.thenCue?` (${task.thenCue})`:"";
      new Notification("⏰ "+task.title,{body:`${fmtDur(task.durationMins||60)}${where}`});
    },diff);
  }
}

function useLocalStorage(key,init){
  const [val,setVal]=useState(()=>{
    try{ const s=localStorage.getItem(key); return s?JSON.parse(s):(typeof init==="function"?init():init); }
    catch{ return typeof init==="function"?init():init; }
  });
  useEffect(()=>{ try{localStorage.setItem(key,JSON.stringify(val));}catch{} },[key,val]);
  return [val,setVal];
}

// ════════════════════════════════════════════════════════════════════════════
// DESIGN TOKENS
// ════════════════════════════════════════════════════════════════════════════

const C = {
  bg:      "#0a0b0e",
  bgDeep:  "#06070a",
  card:    "rgba(255,255,255,0.04)",
  cardHov: "rgba(255,255,255,0.07)",
  glass:   "rgba(255,255,255,0.05)",
  border:  "rgba(255,255,255,0.08)",
  borderM: "rgba(255,255,255,0.14)",
  text:    "#f5f5f7",
  sub:     "#a1a1aa",
  muted:   "#52525b",
  dim:     "#3f3f46",
  accent:  "#4ade80",
  accentD: "rgba(74,222,128,0.12)",
  accentB: "rgba(74,222,128,0.28)",
  amber:   "#fbbf24",
  amberB:  "rgba(251,191,36,0.25)",
  ice:     "#7dd3fc",
  iceB:    "rgba(125,211,252,0.25)",
  hot:     "#f97316",
};

const styles = {
  select: {width:"100%",background:"rgba(255,255,255,0.05)",border:`1px solid ${C.border}`,borderRadius:10,padding:"9px 8px",color:C.text,fontSize:13,fontFamily:"Heebo,sans-serif",outline:"none"},
  label:  {fontSize:10,color:C.muted,display:"block",marginBottom:4,letterSpacing:0.4,textTransform:"uppercase",fontWeight:600},
  input:  {width:"100%",background:"rgba(255,255,255,0.05)",border:`1px solid ${C.border}`,borderRadius:12,padding:"11px 14px",color:C.text,fontSize:14,fontFamily:"Heebo,sans-serif",boxSizing:"border-box",outline:"none"},
};

// ════════════════════════════════════════════════════════════════════════════
// PARTICLE BURST
// ════════════════════════════════════════════════════════════════════════════

function Burst({ x, y, onDone, intense=false }) {
  const count=intense?16:10;
  const PARTS = Array.from({length:count},(_,i)=>({
    angle:(i/count)*360,dist:60+Math.random()*(intense?60:30),
    color:["#4ade80","#fbbf24","#f97316","#60a5fa","#f472b6","#a78bfa"][i%6],
    size:4+Math.random()*5,
  }));
  useEffect(()=>{ const t=setTimeout(onDone,800); return()=>clearTimeout(t); },[]);
  return(
    <div style={{position:"fixed",left:x,top:y,zIndex:999,pointerEvents:"none"}}>
      {PARTS.map((p,i)=>(
        <div key={i} style={{position:"absolute",width:p.size,height:p.size,borderRadius:"50%",background:p.color,
          animation:`burst${i} 0.75s cubic-bezier(.2,.6,.4,1) forwards`,transform:"translate(-50%,-50%)",boxShadow:`0 0 8px ${p.color}`}}/>
      ))}
      <style>{PARTS.map((p,i)=>`@keyframes burst${i}{0%{transform:translate(-50%,-50%) scale(1);opacity:1}100%{transform:translate(calc(-50% + ${Math.cos(p.angle*Math.PI/180)*p.dist}px),calc(-50% + ${Math.sin(p.angle*Math.PI/180)*p.dist}px)) scale(0);opacity:0}}`).join("")}</style>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// MYSTERY BOX MODAL
// ════════════════════════════════════════════════════════════════════════════

function MysteryBoxModal({ reward, onClose }) {
  const [opened, setOpened] = useState(false);
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.92)",zIndex:90,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(20px)",animation:"fadeIn 0.3s"}}>
      <div style={{background:"linear-gradient(180deg,#181a25,#0a0b10)",border:`1px solid ${C.borderM}`,borderRadius:24,padding:"32px 28px",textAlign:"center",minWidth:280,maxWidth:340,boxShadow:`0 0 60px rgba(251,191,36,0.32),0 0 120px rgba(251,191,36,0.15)`}}>
        {!opened?(
          <>
            <div style={{fontSize:11,color:C.amber,letterSpacing:2,textTransform:"uppercase",marginBottom:10,fontWeight:700}}>תיבת הפתעה</div>
            <button onClick={()=>setOpened(true)} style={{background:"none",border:"none",cursor:"pointer",fontSize:88,padding:20,filter:"drop-shadow(0 0 20px rgba(251,191,36,0.6))",animation:"pulseBox 1.2s ease-in-out infinite"}}>🎁</button>
            <div style={{fontSize:14,color:C.sub,marginTop:8,marginBottom:16}}>הרווחת על משימה קשה!</div>
            <button onClick={()=>setOpened(true)} style={{background:`linear-gradient(135deg,${C.amber},#f97316)`,border:"none",borderRadius:12,padding:"12px 32px",color:"#000",fontWeight:800,fontSize:14,cursor:"pointer",fontFamily:"Heebo,sans-serif",boxShadow:`0 4px 20px rgba(251,191,36,0.4)`}}>פתח 🎁</button>
          </>
        ):(
          <>
            <div style={{fontSize:11,color:C.amber,letterSpacing:2,textTransform:"uppercase",marginBottom:8,fontWeight:700}}>זכית!</div>
            <div style={{fontSize:80,marginBottom:12,animation:"bounceIn 0.6s cubic-bezier(.34,1.56,.64,1)"}}>{reward.icon}</div>
            <div style={{fontSize:18,fontWeight:800,color:C.text,marginBottom:6}}>{reward.label}</div>
            <button onClick={onClose} style={{marginTop:20,background:`linear-gradient(135deg,${C.accent},#22c55e)`,border:"none",borderRadius:12,padding:"11px 28px",color:"#000",fontWeight:700,fontSize:14,cursor:"pointer",fontFamily:"Heebo,sans-serif"}}>מעולה ✓</button>
          </>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// LEVEL UP MODAL
// ════════════════════════════════════════════════════════════════════════════

function LevelUpModal({ level, onClose }) {
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.93)",zIndex:95,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(24px)",animation:"fadeIn 0.4s"}}>
      <div style={{background:`linear-gradient(180deg,${level.color}22,#0a0b10)`,border:`1px solid ${level.color}50`,borderRadius:24,padding:"36px 32px",textAlign:"center",minWidth:300,boxShadow:`0 0 80px ${level.color}40`}}>
        <div style={{fontSize:11,color:level.color,letterSpacing:3,textTransform:"uppercase",marginBottom:8,fontWeight:800}}>עלית רמה!</div>
        <div style={{fontSize:96,marginBottom:8,animation:"bounceIn 0.6s cubic-bezier(.34,1.56,.64,1)",filter:`drop-shadow(0 0 30px ${level.color})`}}>{level.icon}</div>
        <div style={{fontSize:24,fontWeight:900,color:level.color,marginBottom:8,letterSpacing:-0.5}}>{level.name}</div>
        <div style={{fontSize:13,color:C.sub,marginBottom:24,lineHeight:1.6}}>אתה ממשיך, אתה עולה.<br/>זה בדיוק מה שצריך להיראות.</div>
        <button onClick={onClose} style={{background:`linear-gradient(135deg,${level.color},${level.color}cc)`,border:"none",borderRadius:14,padding:"13px 36px",color:"#000",fontWeight:800,fontSize:15,cursor:"pointer",fontFamily:"Heebo,sans-serif"}}>קדימה</button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// FOCUS MODE
// ════════════════════════════════════════════════════════════════════════════

function FocusMode({ task, onClose, onComplete }) {
  const [mins, setMins] = useState(25);
  const [secsLeft, setSecsLeft] = useState(null);
  const [running, setRunning] = useState(false);
  const ref = useRef(null);

  function start(){ setSecsLeft(mins*60); setRunning(true); }
  function stop(){ setRunning(false); clearInterval(ref.current); setSecsLeft(null); }

  useEffect(()=>{
    if(running&&secsLeft!==null){
      ref.current=setInterval(()=>setSecsLeft(s=>{
        if(s<=1){
          clearInterval(ref.current); setRunning(false);
          if(Notification.permission==="granted") new Notification("✅ פוקוס הושלם!",{body:`סיימת: "${task?.title||""}"`});
          onComplete?.(mins);
          return 0;
        }
        return s-1;
      }),1000);
    }
    return()=>clearInterval(ref.current);
  },[running]);

  const display=secsLeft!=null?`${String(Math.floor(secsLeft/60)).padStart(2,"0")}:${String(secsLeft%60).padStart(2,"0")}`:`${String(mins).padStart(2,"0")}:00`;
  const pct=secsLeft!=null?(1-(secsLeft/(mins*60)))*100:0;
  const r=70, circ=2*Math.PI*r;

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.96)",zIndex:80,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(28px)"}} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={{background:"linear-gradient(180deg,#0e0f15,#06070a)",border:`1px solid ${C.borderM}`,borderRadius:28,padding:"40px 32px",textAlign:"center",minWidth:320,maxWidth:380,boxShadow:`0 0 80px rgba(74,222,128,0.18)`}}>
        <div style={{fontSize:11,color:C.accent,letterSpacing:2,textTransform:"uppercase",marginBottom:6,fontWeight:700}}>🎯 פוקוס</div>
        <div style={{fontWeight:700,fontSize:16,color:C.text,marginBottom:24,maxWidth:260,margin:"0 auto 28px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{task?.title||"זמן עמוק"}</div>

        <div style={{position:"relative",width:170,height:170,margin:"0 auto 28px"}}>
          <svg width={170} height={170} style={{transform:"rotate(-90deg)"}}>
            <circle cx={85} cy={85} r={r} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={10}/>
            <circle cx={85} cy={85} r={r} fill="none" stroke={C.accent} strokeWidth={10}
              strokeDasharray={circ} strokeDashoffset={circ*(1-pct/100)} strokeLinecap="round"
              style={{transition:"stroke-dashoffset 1s linear",filter:`drop-shadow(0 0 8px ${C.accent})`}}/>
          </svg>
          <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <div style={{fontSize:36,fontWeight:900,color:C.text,fontVariantNumeric:"tabular-nums",letterSpacing:-1}}>{display}</div>
          </div>
        </div>

        {!running&&secsLeft==null&&(
          <div style={{display:"flex",gap:8,justifyContent:"center",flexWrap:"wrap",marginBottom:24}}>
            {FOCUS_PRESETS.map(p=>(
              <button key={p} onClick={()=>setMins(p)} style={{padding:"7px 14px",borderRadius:10,border:`1px solid ${mins===p?C.accent:C.border}`,background:mins===p?C.accentD:"transparent",color:mins===p?C.accent:C.sub,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"Heebo,sans-serif",transition:"all 0.15s"}}>
                {p}׳
              </button>
            ))}
          </div>
        )}

        <div style={{display:"flex",gap:10,justifyContent:"center"}}>
          {!running&&secsLeft==null&&<button onClick={start} style={{background:`linear-gradient(135deg,${C.accent},#22c55e)`,border:"none",borderRadius:14,padding:"13px 36px",color:"#000",fontWeight:800,fontSize:15,cursor:"pointer",fontFamily:"Heebo,sans-serif",boxShadow:`0 4px 24px rgba(74,222,128,0.35)`}}>התחל פוקוס</button>}
          {running&&<button onClick={stop} style={{background:"rgba(244,114,182,0.15)",border:"1px solid rgba(244,114,182,0.3)",borderRadius:14,padding:"13px 32px",color:"#f472b6",fontWeight:700,fontSize:15,cursor:"pointer",fontFamily:"Heebo,sans-serif"}}>עצור</button>}
          {!running&&secsLeft===0&&<button onClick={()=>{setSecsLeft(null);setMins(25);}} style={{background:C.accentD,border:`1px solid ${C.accentB}`,borderRadius:14,padding:"13px 28px",color:C.accent,fontWeight:700,fontSize:15,cursor:"pointer",fontFamily:"Heebo,sans-serif"}}>שוב 🔄</button>}
          <button onClick={onClose} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:"13px 22px",color:C.sub,fontSize:14,cursor:"pointer",fontFamily:"Heebo,sans-serif"}}>סגור</button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// TASK CARD
// ════════════════════════════════════════════════════════════════════════════

function TaskCard({ task, isPast, isNow, completing, onToggle, onDelete, onFocus, onCarryOver }) {
  const [exp, setExp] = useState(false);
  const d = DIFF.find(x=>x.v===(task.difficulty||1)) || DIFF[0];
  const isHard=(task.difficulty||1)===3, isMed=(task.difficulty||1)===2;

  return(
    <div onClick={()=>setExp(!exp)} style={{
      background:task.done?"rgba(74,222,128,0.06)":isHard?`linear-gradient(135deg,${task.color}1a,${task.color}08)`:isMed?`linear-gradient(135deg,${task.color}14,${task.color}06)`:`${task.color}0d`,
      border:`1px solid ${task.done?"rgba(74,222,128,0.22)":isHard?d.border:isMed?d.border:`${task.color}26`}`,
      borderRight:`${isHard?4:3}px solid ${task.done?C.accent:isHard?d.accent:isMed?d.accent:task.color}`,
      borderRadius:12,padding:isHard?"11px 13px":"10px 12px",cursor:"pointer",
      opacity:isPast&&!task.done?0.42:1,
      transition:"opacity 0.2s, box-shadow 0.2s, transform 0.15s",
      boxShadow:!task.done&&isHard?`0 3px 18px ${d.glow}, 0 0 0 1px rgba(249,115,22,0.08) inset`:!task.done&&isMed?`0 2px 10px ${d.glow}`:isNow?`0 0 0 1px ${C.accent}40`:"none",
      position:"relative",
      animation:completing?"taskPop 0.55s cubic-bezier(.34,1.56,.64,1)":"none",
    }}>
      {task.isFocus&&!task.done&&(
        <div style={{position:"absolute",top:-1,right:-1,background:`linear-gradient(135deg,${C.amber},${C.hot})`,color:"#000",fontSize:9,fontWeight:800,padding:"2px 8px",borderRadius:"0 11px 0 8px",letterSpacing:0.3}}>★ פוקוס</div>
      )}
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <button onClick={(e)=>{e.stopPropagation();onToggle(e);}} style={{
          width:isHard?25:23,height:isHard?25:23,borderRadius:"50%",flexShrink:0,
          background:task.done?C.accent:"transparent",
          border:`2px solid ${task.done?C.accent:task.color}`,
          cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.25s",
          boxShadow:task.done?`0 0 12px ${C.accent}70`:"none",
        }}>
          {task.done&&<span style={{color:"#000",fontSize:13,fontWeight:900,lineHeight:1}}>✓</span>}
        </button>

        <div style={{flex:1,minWidth:0}}>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <span style={{fontWeight:isHard?700:600,fontSize:isHard?15:14,textDecoration:task.done?"line-through":"none",color:task.done?C.muted:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1}}>
              {task.title}
            </span>
            {!task.done&&(isHard||isMed)&&<span style={{fontSize:isHard?14:13,flexShrink:0,filter:isHard?"drop-shadow(0 0 4px #f97316)":"none"}}>{d.icon}</span>}
            {!task.done&&<span style={{fontSize:9,color:d.accent,fontWeight:800,flexShrink:0,letterSpacing:0.3}}>+{d.pts}</span>}
          </div>
          <div style={{fontSize:11,color:C.muted,marginTop:2,display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
            <span>{fmtTime(task.hour,task.minute)} · {fmtDur(task.durationMins||60)}</span>
            {task.thenCue&&<span style={{color:C.ice,fontSize:10}}>📍 {task.thenCue}</span>}
            {task.note&&!exp&&<span>· 📝</span>}
            {task.carriedFrom&&<span style={{color:C.amber,fontSize:10}}>↺ דחוי</span>}
          </div>
        </div>

        <button onClick={e=>{e.stopPropagation();onFocus();}} title="פוקוס" style={{background:"none",border:"none",color:C.muted,fontSize:14,cursor:"pointer",padding:"3px 5px",transition:"color 0.15s"}}
          onMouseEnter={e=>e.currentTarget.style.color=C.accent}
          onMouseLeave={e=>e.currentTarget.style.color=C.muted}
        >⏱</button>
        <button onClick={e=>{e.stopPropagation();onDelete();}} style={{background:"none",border:"none",color:C.muted,fontSize:18,cursor:"pointer",padding:"2px 4px",transition:"color 0.15s",lineHeight:1}}
          onMouseEnter={e=>e.currentTarget.style.color="#f472b6"}
          onMouseLeave={e=>e.currentTarget.style.color=C.muted}
        >×</button>
      </div>

      {exp&&(
        <div style={{marginTop:9,paddingTop:9,paddingRight:32,borderTop:`1px solid ${C.border}`,fontSize:12,color:C.sub,lineHeight:1.6}}>
          {(task.ifCue||task.thenCue)&&(
            <div style={{background:"rgba(125,211,252,0.06)",border:"1px solid rgba(125,211,252,0.15)",borderRadius:8,padding:"7px 10px",marginBottom:task.note?7:0,fontSize:11.5}}>
              {task.ifCue&&<div><span style={{color:C.ice,fontWeight:700}}>אם:</span> <span style={{color:C.text}}>{task.ifCue}</span></div>}
              {task.thenCue&&<div style={{marginTop:task.ifCue?3:0}}><span style={{color:C.ice,fontWeight:700}}>אז:</span> <span style={{color:C.text}}>{task.thenCue}</span></div>}
            </div>
          )}
          {task.note&&<div>{task.note}</div>}
          {!task.done&&isPast&&onCarryOver&&(
            <button onClick={e=>{e.stopPropagation();onCarryOver();}} style={{marginTop:8,background:"rgba(251,191,36,0.1)",border:"1px solid rgba(251,191,36,0.25)",borderRadius:8,padding:"5px 12px",color:C.amber,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"Heebo,sans-serif"}}>↺ העבר למחר</button>
          )}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// TASK FORM
// ════════════════════════════════════════════════════════════════════════════

function TaskForm({ initial, memory, onSave, onClose, isTemplate=false }) {
  const [t, setT] = useState(initial);
  const [sugg, setSugg] = useState([]);
  const [showIfThen, setShowIfThen] = useState(!!(initial.ifCue||initial.thenCue));

  function handleTitle(v) {
    setT(n=>({...n,title:v}));
    if(!v){setSugg([]);return;}
    const q=v.toLowerCase();
    setSugg(Object.values(memory).filter(m=>m.title.toLowerCase().includes(q)).sort((a,b)=>b.count-a.count).slice(0,4));
  }

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.84)",zIndex:50,display:"flex",alignItems:"flex-end",justifyContent:"center",backdropFilter:"blur(12px)"}} onClick={e=>{if(e.target===e.currentTarget){onClose();setSugg([]);}}}>
      <div style={{background:"linear-gradient(180deg,#0d0e13,#08090c)",border:`1px solid ${C.borderM}`,borderRadius:"24px 24px 0 0",width:"100%",maxWidth:480,boxShadow:"0 -24px 80px rgba(0,0,0,0.8)",animation:"slideUp 0.3s cubic-bezier(.2,.8,.4,1)"}}>
        <div style={{width:38,height:4,background:"rgba(255,255,255,0.12)",borderRadius:2,margin:"12px auto 0"}}/>
        <div style={{padding:"18px 20px 30px",maxHeight:"86vh",overflowY:"auto"}}>
          <div style={{fontWeight:800,fontSize:18,marginBottom:18,color:C.text}}>
            {isTemplate?"📌 תבנית חוזרת":"✏️ משימה חדשה"}
          </div>

          {/* Title */}
          <div style={{marginBottom:sugg.length?0:14}}>
            <input autoFocus value={t.title} onChange={e=>handleTitle(e.target.value)} onKeyDown={e=>e.key==="Enter"&&onSave(t)} placeholder={isTemplate?"שם התבנית":"מה צריך לעשות?"}
              style={{...styles.input,borderRadius:sugg.length?"13px 13px 0 0":13,fontSize:15,padding:"13px 15px"}}
              onFocus={e=>e.target.style.borderColor=C.accentB}
              onBlur={e=>{e.target.style.borderColor=C.border;setTimeout(()=>setSugg([]),150);}}
            />
          </div>
          {sugg.length>0&&(
            <div style={{background:"#0a0a0e",border:`1px solid ${C.border}`,borderTop:"none",borderRadius:"0 0 13px 13px",marginBottom:14,overflow:"hidden"}}>
              {sugg.map((s,i)=>(
                <button key={i} onMouseDown={()=>{setT(n=>({...n,title:s.title,color:s.color,durationMins:s.durationMins,difficulty:s.difficulty||1}));setSugg([]);}}
                  style={{width:"100%",background:"none",border:"none",borderBottom:i<sugg.length-1?`1px solid ${C.border}`:"none",padding:"10px 14px",color:C.text,display:"flex",alignItems:"center",gap:10,cursor:"pointer",fontFamily:"Heebo,sans-serif",textAlign:"right"}}
                  onMouseEnter={e=>e.currentTarget.style.background=C.card}
                  onMouseLeave={e=>e.currentTarget.style.background="none"}>
                  <div style={{width:9,height:9,borderRadius:"50%",background:s.color,flexShrink:0}}/>
                  <span style={{flex:1,fontSize:14}}>{s.title}</span>
                  <span style={{fontSize:11,color:C.muted}}>{fmtDur(s.durationMins)} · ×{s.count}</span>
                </button>
              ))}
            </div>
          )}

          {/* If-Then Card (collapsed by default) */}
          <div style={{marginBottom:14}}>
            {!showIfThen?(
              <button onClick={()=>setShowIfThen(true)} style={{width:"100%",background:"rgba(125,211,252,0.06)",border:"1px solid rgba(125,211,252,0.18)",borderRadius:12,padding:"10px 14px",color:C.ice,fontSize:12,cursor:"pointer",fontFamily:"Heebo,sans-serif",fontWeight:600,textAlign:"right",display:"flex",alignItems:"center",gap:8,transition:"background 0.15s"}}
                onMouseEnter={e=>e.currentTarget.style.background="rgba(125,211,252,0.1)"}
                onMouseLeave={e=>e.currentTarget.style.background="rgba(125,211,252,0.06)"}
              >
                <span>📍</span><span>+ הוסף תכנון "אם-אז"</span>
                <span style={{flex:1,textAlign:"left",fontSize:10,opacity:0.7,fontWeight:400}}>מכפיל סיכוי לביצוע</span>
              </button>
            ):(
              <div style={{background:"rgba(125,211,252,0.06)",border:"1px solid rgba(125,211,252,0.22)",borderRadius:13,padding:"12px 14px"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:9}}>
                  <span style={{fontSize:11,color:C.ice,fontWeight:700,letterSpacing:0.4}}>📍 תכנון "אם-אז"</span>
                  <button onClick={()=>{setShowIfThen(false);setT(n=>({...n,ifCue:"",thenCue:""}));}} style={{background:"none",border:"none",color:C.muted,fontSize:14,cursor:"pointer"}}>×</button>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                  <span style={{fontSize:11,color:C.ice,fontWeight:700,minWidth:24}}>אם:</span>
                  <input value={t.ifCue||""} onChange={e=>setT(n=>({...n,ifCue:e.target.value}))} placeholder='לדוגמה: "סיימתי לאכול בוקר"'
                    style={{...styles.input,fontSize:12.5,padding:"8px 11px",background:"rgba(255,255,255,0.04)"}}
                  />
                </div>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontSize:11,color:C.ice,fontWeight:700,minWidth:24}}>אז:</span>
                  <input value={t.thenCue||""} onChange={e=>setT(n=>({...n,thenCue:e.target.value}))} placeholder='לדוגמה: "אני יושב בשולחן ולומד"'
                    style={{...styles.input,fontSize:12.5,padding:"8px 11px",background:"rgba(255,255,255,0.04)"}}
                  />
                </div>
                <div style={{fontSize:10,color:C.muted,marginTop:8,lineHeight:1.5}}>
                  מחקר Gollwitzer: תכנון "אם-אז" מכפיל את הסיכוי שתבצע את המשימה
                </div>
              </div>
            )}
          </div>

          {/* Recurrence */}
          {isTemplate&&(
            <div style={{marginBottom:14}}>
              <label style={styles.label}>חזרה</label>
              <div style={{display:"flex",gap:8}}>
                {[{v:"daily",l:"כל יום"},{v:"weekly",l:"שבועי"},{v:"monthly",l:"חודשי"}].map(r=>(
                  <button key={r.v} onClick={()=>setT(n=>({...n,recurrence:r.v}))}
                    style={{flex:1,padding:"10px 4px",borderRadius:10,border:`1px solid ${t.recurrence===r.v?C.accent:C.border}`,background:t.recurrence===r.v?C.accentD:C.card,color:t.recurrence===r.v?C.accent:C.sub,fontSize:13,cursor:"pointer",fontFamily:"Heebo,sans-serif",fontWeight:t.recurrence===r.v?700:400}}>
                    {r.l}
                  </button>
                ))}
              </div>
              {t.recurrence==="weekly"&&(
                <div style={{marginTop:10}}>
                  <label style={styles.label}>יום בשבוע</label>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                    {HEB_DAYS.map((d,i)=>(
                      <button key={i} onClick={()=>setT(n=>({...n,dow:i}))}
                        style={{padding:"5px 10px",borderRadius:8,border:`1px solid ${t.dow===i?C.accent:C.border}`,background:t.dow===i?C.accentD:C.card,color:t.dow===i?C.accent:C.sub,fontSize:12,cursor:"pointer",fontFamily:"Heebo,sans-serif"}}>
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {t.recurrence==="monthly"&&(
                <div style={{marginTop:10}}>
                  <label style={styles.label}>יום בחודש</label>
                  <select value={t.dom||1} onChange={e=>setT(n=>({...n,dom:+e.target.value}))} style={styles.select}>
                    {Array.from({length:31},(_,i)=>i+1).map(d=><option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Time */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:14}}>
            <div>
              <label style={styles.label}>שעה</label>
              <select value={t.hour} onChange={e=>setT(n=>({...n,hour:+e.target.value}))} style={styles.select}>
                {ALL_HOURS.map(h=><option key={h} value={h}>{String(h).padStart(2,"0")}</option>)}
              </select>
            </div>
            <div>
              <label style={styles.label}>דקות</label>
              <select value={t.minute||0} onChange={e=>setT(n=>({...n,minute:+e.target.value}))} style={styles.select}>
                {MINUTES.map(m=><option key={m} value={+m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label style={styles.label}>משך</label>
              <select value={t.durationMins||60} onChange={e=>setT(n=>({...n,durationMins:+e.target.value}))} style={styles.select}>
                {DURATIONS.map(d=><option key={d} value={d}>{fmtDur(d)}</option>)}
              </select>
            </div>
          </div>

          {/* Note */}
          <textarea value={t.note||""} onChange={e=>setT(n=>({...n,note:e.target.value}))} placeholder="הערה (אופציונלי)" rows={2}
            style={{...styles.input,fontSize:13,padding:"10px 14px",resize:"none",marginBottom:14}}
          />

          {/* Color */}
          <div style={{marginBottom:14}}>
            <label style={styles.label}>צבע</label>
            <div style={{display:"flex",gap:8,marginTop:6}}>
              {COLORS.map(c=>(
                <button key={c} onClick={()=>setT(n=>({...n,color:c}))} style={{width:26,height:26,borderRadius:"50%",background:c,border:t.color===c?"3px solid white":"3px solid transparent",cursor:"pointer",transition:"transform 0.15s",transform:t.color===c?"scale(1.3)":"scale(1)"}}/>
              ))}
            </div>
          </div>

          {/* Difficulty */}
          <div style={{marginBottom:14}}>
            <label style={styles.label}>רמת קושי</label>
            <div style={{display:"flex",gap:8,marginTop:6}}>
              {DIFF.map(d=>(
                <button key={d.v} onClick={()=>setT(n=>({...n,difficulty:d.v}))}
                  style={{flex:1,padding:"11px 4px",borderRadius:12,border:`1px solid ${(t.difficulty||1)===d.v?d.accent:C.border}`,background:(t.difficulty||1)===d.v?`${d.accent}14`:C.card,color:(t.difficulty||1)===d.v?d.accent:C.sub,fontSize:12,cursor:"pointer",fontFamily:"Heebo,sans-serif",fontWeight:(t.difficulty||1)===d.v?700:400,display:"flex",flexDirection:"column",alignItems:"center",gap:4,transition:"all 0.2s",boxShadow:(t.difficulty||1)===d.v&&d.glow?`0 0 14px ${d.glow}`:"none"}}>
                  <span style={{fontSize:18}}>{d.icon}</span>
                  <span>{d.label}</span>
                  <span style={{fontSize:10,opacity:0.75,fontWeight:400}}>+{d.pts} XP</span>
                </button>
              ))}
            </div>
          </div>

          {/* Focus task toggle */}
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12,background:t.isFocus?"rgba(251,191,36,0.08)":C.card,borderRadius:12,padding:"10px 14px",border:`1px solid ${t.isFocus?"rgba(251,191,36,0.3)":C.border}`,transition:"all 0.2s"}}>
            <div>
              <span style={{fontSize:13,color:t.isFocus?C.amber:C.sub,fontWeight:t.isFocus?700:400}}>★ משימת הפוקוס היומית</span>
              <div style={{fontSize:10,color:C.muted,marginTop:2}}>הדבר הכי חשוב לעשות היום</div>
            </div>
            <button onClick={()=>setT(n=>({...n,isFocus:!n.isFocus}))} style={{width:46,height:24,borderRadius:12,background:t.isFocus?C.amber:"rgba(255,255,255,0.1)",border:"none",cursor:"pointer",position:"relative",flexShrink:0,transition:"background 0.2s"}}>
              <div style={{position:"absolute",top:3,right:t.isFocus?3:25,width:18,height:18,borderRadius:"50%",background:"white",transition:"right 0.2s",boxShadow:"0 1px 4px rgba(0,0,0,0.4)"}}/>
            </button>
          </div>

          {/* Reminder */}
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20,background:C.card,borderRadius:12,padding:"10px 14px",border:`1px solid ${C.border}`}}>
            <span style={{fontSize:13,color:C.sub}}>🔔 תזכורת בזמן המשימה</span>
            <button onClick={()=>setT(n=>({...n,reminder:!n.reminder}))} style={{width:46,height:24,borderRadius:12,background:t.reminder!==false?C.accent:"rgba(255,255,255,0.1)",border:"none",cursor:"pointer",position:"relative",flexShrink:0,transition:"background 0.2s"}}>
              <div style={{position:"absolute",top:3,right:t.reminder!==false?3:25,width:18,height:18,borderRadius:"50%",background:"white",transition:"right 0.2s",boxShadow:"0 1px 4px rgba(0,0,0,0.4)"}}/>
            </button>
          </div>

          <div style={{display:"flex",gap:10}}>
            <button onClick={()=>onSave(t)} style={{flex:1,background:`linear-gradient(135deg,${C.accent},#22c55e)`,border:"none",borderRadius:13,padding:"14px",color:"#000",fontWeight:800,fontSize:15,cursor:"pointer",fontFamily:"Heebo,sans-serif",boxShadow:`0 4px 20px rgba(74,222,128,0.32)`}}>
              {isTemplate?"שמור ✓":"הוסף ✓"}
            </button>
            <button onClick={onClose} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:13,padding:"14px 20px",color:C.sub,fontSize:14,cursor:"pointer",fontFamily:"Heebo,sans-serif"}}>ביטול</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// HABITS PANEL
// ════════════════════════════════════════════════════════════════════════════

function HabitsPanel({ habits, habitLog, dateKey, onToggle, onAdd, onDelete }) {
  const [adding,setAdding]=useState(false);
  const [name,setName]=useState("");
  const [icon,setIcon]=useState("⭐");
  const log=habitLog[dateKey]||{};
  const ICONS=["⭐","💧","🏃","📚","🧘","🍎","💊","🎯","🛏️","✍️","🚶","🧹","☕","🥗","🎵"];
  const done=Object.values(log).filter(Boolean).length;

  return(
    <div style={{padding:"0 16px 16px"}}>
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:14}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:done>0?12:14}}>
          <div>
            <span style={{fontWeight:700,fontSize:14,color:C.text}}>🌱 הרגלים יומיים</span>
            {done>0&&<span style={{fontSize:11,color:C.accent,marginRight:8,fontWeight:600}}>{done}/{habits.length} ✓</span>}
          </div>
          <button onClick={()=>setAdding(!adding)} style={{background:"transparent",border:`1px solid ${C.border}`,borderRadius:8,padding:"5px 11px",color:C.sub,fontSize:11,cursor:"pointer",fontFamily:"Heebo,sans-serif"}}>{adding?"ביטול":"+ הרגל"}</button>
        </div>
        {adding&&(
          <div style={{marginBottom:12,padding:12,background:"rgba(255,255,255,0.03)",borderRadius:11,border:`1px solid ${C.border}`}}>
            <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:9}}>
              {ICONS.map(ic=>(
                <button key={ic} onClick={()=>setIcon(ic)} style={{fontSize:18,padding:"3px 7px",borderRadius:8,border:`1px solid ${icon===ic?C.accent:C.border}`,background:icon===ic?C.accentD:"transparent",cursor:"pointer"}}>
                  {ic}
                </button>
              ))}
            </div>
            <div style={{display:"flex",gap:8}}>
              <input value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&name.trim()&&(onAdd({id:"h"+Date.now(),name:name.trim(),icon}),setName(""),setAdding(false))} placeholder="שם ההרגל"
                style={{flex:1,background:"rgba(255,255,255,0.05)",border:`1px solid ${C.border}`,borderRadius:9,padding:"8px 11px",color:C.text,fontSize:13,fontFamily:"Heebo,sans-serif",outline:"none"}}
              />
              <button onClick={()=>{if(!name.trim())return;onAdd({id:"h"+Date.now(),name:name.trim(),icon});setName("");setAdding(false);}} style={{background:C.accentD,border:`1px solid ${C.accentB}`,borderRadius:9,padding:"8px 14px",color:C.accent,fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"Heebo,sans-serif"}}>שמור</button>
            </div>
          </div>
        )}
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {habits.map(h=>{
            const d=!!log[h.id];
            return(
              <div key={h.id} style={{display:"flex",alignItems:"center",gap:11,padding:"9px 11px",borderRadius:11,background:d?"rgba(74,222,128,0.07)":"rgba(255,255,255,0.02)",border:`1px solid ${d?"rgba(74,222,128,0.22)":C.border}`,transition:"all 0.2s"}}>
                <span style={{fontSize:19}}>{h.icon}</span>
                <span style={{flex:1,fontSize:14,color:d?C.muted:C.text,textDecoration:d?"line-through":"none"}}>{h.name}</span>
                <button onClick={()=>onDelete(h.id)} style={{background:"none",border:"none",color:C.muted,fontSize:14,cursor:"pointer",padding:"1px 4px",transition:"color 0.15s"}} onMouseEnter={e=>e.currentTarget.style.color="#f472b6"} onMouseLeave={e=>e.currentTarget.style.color=C.muted}>×</button>
                <button onClick={()=>onToggle(dateKey,h.id)} style={{width:27,height:27,borderRadius:"50%",border:`2px solid ${d?C.accent:C.muted}`,background:d?C.accent:"transparent",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.2s",flexShrink:0,boxShadow:d?`0 0 10px ${C.accent}50`:"none"}}>
                  {d&&<span style={{color:"#000",fontSize:12,fontWeight:900}}>✓</span>}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// STREAK CHAIN
// ════════════════════════════════════════════════════════════════════════════

function StreakChain({ allTasks, habitLog, today }) {
  const days=Array.from({length:21},(_,i)=>addDays(today,i-20));
  return(
    <div style={{padding:"14px 16px 0"}}>
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:"12px 14px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <span style={{fontSize:11,color:C.sub,fontWeight:700,letterSpacing:0.5}}>🔗 21 ימים אחרונים</span>
          <span style={{fontSize:10,color:C.muted}}>אל תשבור את השרשרת</span>
        </div>
        <div style={{display:"flex",gap:3,alignItems:"flex-end",height:36}}>
          {days.map(d=>{
            const tasks=allTasks[d]||[];
            const habits=habitLog[d]||{};
            const allDone=tasks.length>0&&tasks.every(t=>t.done);
            const partial=tasks.length>0&&tasks.some(t=>t.done)&&!allDone;
            const hasHabits=Object.values(habits).some(Boolean);
            const isT=d===today;
            const active=allDone||hasHabits;
            const h=active?32:partial?20:8;
            const bg=isT?(active?C.accent:"rgba(74,222,128,0.18)"):active?"rgba(74,222,128,0.55)":partial?"rgba(251,191,36,0.4)":"rgba(255,255,255,0.05)";
            return(
              <div key={d} title={fmtDateHeb(d)} style={{flex:1,height:h,borderRadius:3,background:bg,transition:"height 0.6s cubic-bezier(.34,1.56,.64,1)",boxShadow:isT&&active?`0 0 10px ${C.accent}90`:active?`0 0 5px rgba(74,222,128,0.35)`:"none"}}/>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// WEEKLY / MONTHLY VIEWS
// ════════════════════════════════════════════════════════════════════════════

function WeeklyView({ allTasks, weekStart, onDayClick }) {
  const days=Array.from({length:7},(_,i)=>addDays(weekStart,i)),today=todayKey();
  return(
    <div style={{padding:"0 16px"}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:6}}>
        {days.map(d=>{
          const tasks=allTasks[d]||[],done=tasks.filter(t=>t.done).length,isT=d===today;
          return(
            <div key={d} onClick={()=>onDayClick(d)} style={{background:isT?C.accentD:C.card,border:`1px solid ${isT?C.accentB:C.border}`,borderRadius:12,padding:"10px 6px",cursor:"pointer",textAlign:"center",transition:"all 0.2s"}}>
              <div style={{fontSize:10,color:C.muted,marginBottom:3}}>{HEB_DAYS[new Date(d+"T12:00:00").getDay()]}</div>
              <div style={{fontWeight:isT?900:600,fontSize:16,color:isT?C.accent:C.text}}>{new Date(d+"T12:00:00").getDate()}</div>
              {tasks.length>0&&<><div style={{marginTop:5,height:3,background:"rgba(255,255,255,0.05)",borderRadius:2,overflow:"hidden"}}><div style={{height:"100%",width:`${Math.round(done/tasks.length*100)}%`,background:C.accent,borderRadius:2}}/></div><div style={{fontSize:9,color:C.muted,marginTop:3}}>{done}/{tasks.length}</div></>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MonthlyView({ allTasks, monthDate, onDayClick }) {
  const {days,firstDow}=getMonthDays(monthDate),today=todayKey(),blanks=Array.from({length:firstDow});
  return(
    <div style={{padding:"0 16px"}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:6}}>
        {HEB_DAYS.map(d=><div key={d} style={{textAlign:"center",fontSize:10,color:C.muted,padding:"4px 0"}}>{d.slice(0,1)}</div>)}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4}}>
        {blanks.map((_,i)=><div key={`b${i}`}/>)}
        {days.map(d=>{
          const tasks=allTasks[d]||[],done=tasks.filter(t=>t.done).length,isT=d===today;
          return(
            <div key={d} onClick={()=>onDayClick(d)} style={{background:isT?C.accentD:C.card,border:`1px solid ${isT?C.accentB:C.border}`,borderRadius:8,padding:"6px 4px",cursor:"pointer",textAlign:"center",minHeight:44}}>
              <div style={{fontWeight:isT?800:400,fontSize:13,color:isT?C.accent:C.text}}>{new Date(d+"T12:00:00").getDate()}</div>
              {tasks.length>0&&<div style={{display:"flex",justifyContent:"center",gap:2,marginTop:3,flexWrap:"wrap"}}>{tasks.slice(0,3).map(t=><div key={t.id} style={{width:5,height:5,borderRadius:"50%",background:t.done?"rgba(74,222,128,0.4)":t.color,flexShrink:0}}/>)}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// ONBOARDING WELCOME
// ════════════════════════════════════════════════════════════════════════════

function Onboarding({ onDone }) {
  const [step,setStep]=useState(0);
  const STEPS=[
    {icon:"🎯",title:"ברוך הבא ל-Momentum",body:"זאת לא עוד אפליקציית משימות. זה כלי שיעזור לך לבנות הרגלים אמיתיים ולעמוד במה שחשוב לך."},
    {icon:"📍",title:"תכנון 'אם-אז'",body:"מחקר Gollwitzer מראה שמי שמתכנן 'אם X אז Y' מבצע פי 2-3 יותר. זה הכוח הכי מוכח בפסיכולוגיה ההתנהגותית."},
    {icon:"🔥",title:"אל תשבור את השרשרת",body:"כל יום שאתה עומד במשימות, מתחזק קו אש. אם תשבור — מתחילים מאפס. יש לך 3 'streak freezes' שמצילים אותך מימים קשים."},
    {icon:"⭐",title:"קושי = ניצחון אמיתי",body:"משימות קלות = 5 XP. קשות = 30 XP + סיכוי לתיבת הפתעה. הניצחון האמיתי הוא לעשות את הקשה."},
  ];
  const s=STEPS[step];
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(6,7,10,0.97)",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(20px)",padding:20}}>
      <div style={{maxWidth:380,width:"100%",background:"linear-gradient(180deg,#101218,#08090c)",border:`1px solid ${C.borderM}`,borderRadius:24,padding:"36px 28px 28px",textAlign:"center",boxShadow:"0 24px 80px rgba(0,0,0,0.7)"}}>
        <div style={{fontSize:64,marginBottom:14,animation:"bounceIn 0.5s cubic-bezier(.34,1.56,.64,1)"}} key={step}>{s.icon}</div>
        <div style={{fontSize:21,fontWeight:900,color:C.text,marginBottom:10,letterSpacing:-0.4}}>{s.title}</div>
        <div style={{fontSize:14,color:C.sub,lineHeight:1.65,marginBottom:24}}>{s.body}</div>
        <div style={{display:"flex",gap:5,justifyContent:"center",marginBottom:20}}>
          {STEPS.map((_,i)=><div key={i} style={{width:i===step?20:6,height:6,borderRadius:3,background:i===step?C.accent:C.border,transition:"all 0.3s"}}/>)}
        </div>
        <button onClick={()=>step<STEPS.length-1?setStep(step+1):onDone()} style={{width:"100%",background:`linear-gradient(135deg,${C.accent},#22c55e)`,border:"none",borderRadius:14,padding:"14px",color:"#000",fontWeight:800,fontSize:15,cursor:"pointer",fontFamily:"Heebo,sans-serif",boxShadow:`0 4px 20px rgba(74,222,128,0.35)`}}>
          {step<STEPS.length-1?"הבא →":"בוא נתחיל"}
        </button>
        {step<STEPS.length-1&&<button onClick={onDone} style={{marginTop:10,background:"transparent",border:"none",color:C.muted,fontSize:12,cursor:"pointer",fontFamily:"Heebo,sans-serif"}}>דלג</button>}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// END OF DAY REVIEW
// ════════════════════════════════════════════════════════════════════════════

function EndOfDayReview({ stats, onClose, onCarryAll }) {
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(6,7,10,0.96)",zIndex:85,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(20px)",padding:20}}>
      <div style={{maxWidth:380,width:"100%",background:"linear-gradient(180deg,#101218,#08090c)",border:`1px solid ${C.borderM}`,borderRadius:24,padding:"30px 26px 24px",boxShadow:"0 24px 80px rgba(0,0,0,0.7)"}}>
        <div style={{textAlign:"center",marginBottom:20}}>
          <div style={{fontSize:48,marginBottom:8}}>🌙</div>
          <div style={{fontSize:20,fontWeight:900,color:C.text,letterSpacing:-0.3}}>סיכום היום</div>
          <div style={{fontSize:12,color:C.muted,marginTop:4}}>הזמן לסכם ולתכנן קדימה</div>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:18}}>
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:11,padding:"11px"}}>
            <div style={{fontSize:11,color:C.muted}}>השלמת</div>
            <div style={{fontSize:20,fontWeight:800,color:C.accent,marginTop:3}}>{stats.done}/{stats.total}</div>
            <div style={{fontSize:10,color:C.muted,marginTop:2}}>משימות</div>
          </div>
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:11,padding:"11px"}}>
            <div style={{fontSize:11,color:C.muted}}>צברת</div>
            <div style={{fontSize:20,fontWeight:800,color:C.amber,marginTop:3}}>+{stats.xp}</div>
            <div style={{fontSize:10,color:C.muted,marginTop:2}}>XP היום</div>
          </div>
        </div>

        {stats.hardDone>0&&(
          <div style={{background:`linear-gradient(135deg,rgba(249,115,22,0.1),rgba(249,115,22,0.04))`,border:"1px solid rgba(249,115,22,0.25)",borderRadius:12,padding:"11px 14px",marginBottom:12}}>
            <div style={{fontSize:13,color:C.hot,fontWeight:700}}>🔥 השלמת {stats.hardDone} משימות קשות</div>
            <div style={{fontSize:11,color:C.sub,marginTop:3}}>זה מה שעושה את ההבדל בטווח הארוך</div>
          </div>
        )}

        {stats.undone>0&&(
          <div style={{background:"rgba(251,191,36,0.06)",border:"1px solid rgba(251,191,36,0.2)",borderRadius:12,padding:"11px 14px",marginBottom:18}}>
            <div style={{fontSize:13,color:C.amber,fontWeight:700,marginBottom:6}}>↺ {stats.undone} משימות לא הושלמו</div>
            <button onClick={onCarryAll} style={{width:"100%",background:"rgba(251,191,36,0.12)",border:"1px solid rgba(251,191,36,0.3)",borderRadius:9,padding:"7px",color:C.amber,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"Heebo,sans-serif"}}>העבר את כולן למחר</button>
          </div>
        )}

        <button onClick={onClose} style={{width:"100%",background:`linear-gradient(135deg,${C.accent},#22c55e)`,border:"none",borderRadius:13,padding:"13px",color:"#000",fontWeight:800,fontSize:15,cursor:"pointer",fontFamily:"Heebo,sans-serif"}}>
          לילה טוב 🌙
        </button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// APPLE TOUCH ICON (PWA home screen icon)
// ════════════════════════════════════════════════════════════════════════════

function AppleTouchIcon() {
  useEffect(() => {
    try {
      const c = document.createElement("canvas");
      c.width = 180; c.height = 180;
      const ctx = c.getContext("2d");

      // Background — pure black
      ctx.fillStyle = "#050506";
      ctx.beginPath();
      ctx.roundRect(0, 0, 180, 180, 36);
      ctx.fill();

      // ⚡ centered
      ctx.font = "110px serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("⚡", 90, 90);

      const link = document.createElement("link");
      link.rel = "apple-touch-icon";
      link.href = c.toDataURL("image/png");
      document.head.appendChild(link);
    } catch(e) {}
  }, []);
  return null;
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN APP
// ════════════════════════════════════════════════════════════════════════════

export default function App() {
  // Storage
  const [allTasks, setAllTasks]    = useLocalStorage("mp_tasks", {});
  const [templates, setTemplates]  = useLocalStorage("mp_templates", []);
  const [habits, setHabits]        = useLocalStorage("mp_habits", DEFAULT_HABITS);
  const [habitLog, setHabitLog]    = useLocalStorage("mp_habitLog", {});
  const [xp, setXp]                = useLocalStorage("mp_xp", 0);
  const [streak, setStreak]        = useLocalStorage("mp_streak", { count:0, lastDate:"" });
  const [freezes, setFreezes]      = useLocalStorage("mp_freezes", 3);
  const [lastFreezeAt, setLastFreezeAt] = useLocalStorage("mp_lastFreezeAt", 0);
  const [onboarded, setOnboarded]  = useLocalStorage("mp_onboarded", false);
  const [lastReviewDate, setLastReviewDate] = useLocalStorage("mp_lastReview", "");
  const [lastLevel, setLastLevel]  = useLocalStorage("mp_lastLevel", 0);

  const tKey = todayKey();

  // UI state
  const [mainTab, setMainTab]          = useState("today");
  const [selectedDate, setSelectedDate]= useState(tKey);
  const [view, setView]                = useState("day");
  const [dayTab, setDayTab]            = useState("tasks");
  const [weekStart, setWeekStart]      = useState(getWeekStart(tKey));
  const [monthDate, setMonthDate]      = useState(tKey);
  const [showForm, setShowForm]       = useState(false);
  const [showTplForm, setShowTplForm] = useState(false);
  const [focusTask, setFocusTask]     = useState(null);
  const [mysteryReward, setMysteryReward] = useState(null);
  const [levelUpData, setLevelUpData] = useState(null);
  const [showReview, setShowReview]   = useState(false);
  const [burst, setBurst]             = useState(null);
  const [toast, setToast]             = useState(null);
  const [aiBrief, setAiBrief]         = useState("");
  const [aiLoad, setAiLoad]           = useState(false);
  const [completingId, setCompletingId] = useState(null);
  const [now, setNow]                 = useState(new Date());
  const timelineRef = useRef(null);
  const scrollRef   = useRef(null);

  // Derived
  const isToday    = selectedDate===tKey;
  const rawTasks   = allTasks[selectedDate]||[];
  const memory     = buildMemory(allTasks);
  const doneTasks  = rawTasks.filter(t=>t.done);
  const undoneTasks= rawTasks.filter(t=>!t.done);
  const todayScore = doneTasks.reduce((s,t)=>{ const d=DIFF.find(x=>x.v===(t.difficulty||1))||DIFF[0]; return s+d.pts; },0);
  const lvl        = getLevel(xp);
  const nowMins    = now.getHours()*60+now.getMinutes();
  const focusTaskOfDay = isToday ? rawTasks.find(t=>t.isFocus&&!t.done) : null;
  const tasksByHour={};
  rawTasks.forEach(t=>{ if(!tasksByHour[t.hour])tasksByHour[t.hour]=[]; tasksByHour[t.hour].push(t); });

  // Effects
  useEffect(()=>{ const i=setInterval(()=>setNow(new Date()),15000); return()=>clearInterval(i); },[]);
  useEffect(()=>{ if("Notification" in window&&Notification.permission==="default") Notification.requestPermission(); },[]);

  // Apply templates
  useEffect(()=>{
    if(!templates.length) return;
    const merged=applyTemplates(allTasks,templates,selectedDate);
    if(merged.length!==(allTasks[selectedDate]||[]).length) setAllTasks(p=>({...p,[selectedDate]:merged}));
  },[selectedDate,templates]);

  // Auto streak-freeze: check ONCE when lastDate changes, not on every tKey re-render
  useEffect(()=>{
    if(!streak.lastDate||streak.lastDate===tKey) return;
    const gap=daysBetween(streak.lastDate,tKey);
    if(gap<=1) return; // continuous or same day
    if(gap-1<=freezes && streak.count>0){
      const used=gap-1;
      setFreezes(f=>Math.max(0,f-used));
      setStreak(s=>({...s,lastDate:tKey}));
      showToast(`❄️ ${used} Streak Freeze הציל את ה-streak שלך!`,4000);
    } else if(streak.count>0){
      const lostCount=streak.count;
      setStreak({count:0,lastDate:""});
      showToast(`💔 ה-streak נשבר אחרי ${lostCount} ימים. מתחילים מחדש!`,4500);
    }
  },[streak.lastDate]); // Run when lastDate changes, not on every minute

  // Earn freeze every 7 days
  useEffect(()=>{
    if(streak.count>0 && streak.count%FREEZE_EVERY===0 && streak.count>lastFreezeAt && freezes<MAX_FREEZES){
      setFreezes(f=>Math.min(MAX_FREEZES,f+1));
      setLastFreezeAt(streak.count);
      showToast(`❄️ הרווחת Streak Freeze!`,3500);
    }
  },[streak.count]);

  // Level up detection
  useEffect(()=>{
    if(lvl.min>lastLevel){
      setLastLevel(lvl.min);
      if(lastLevel>0||xp>=LEVELS[1].min) setLevelUpData(lvl);
    }
  },[xp]);

  // Scroll to 8 AM
  useEffect(()=>{
    if(mainTab==="today"&&view==="day"&&dayTab==="tasks"){
      const tid=setTimeout(()=>{
        const container=scrollRef.current;
        const el=timelineRef.current?.querySelector(`[data-hour="${SCROLL_TO_HOUR}"]`);
        if(container&&el){
          container.scrollTop = Math.max(0, el.offsetTop - 200);
        }
      },200);
      return()=>clearTimeout(tid);
    }
  },[mainTab,view,dayTab,selectedDate]);

  // End of day review trigger (after 21:00)
  useEffect(()=>{
    if(now.getHours()>=21 && lastReviewDate!==tKey && rawTasks.length>0 && isToday){
      const tid=setTimeout(()=>setShowReview(true),1500);
      return()=>clearTimeout(tid);
    }
  },[now,tKey,lastReviewDate,rawTasks.length,isToday]);

  // Functions
  function setDayTasks(fn){
    setAllTasks(p=>{ const c=p[selectedDate]||[],u=typeof fn==="function"?fn(c):fn; return {...p,[selectedDate]:u}; });
  }
  function setTasksFor(dateKey,fn){
    setAllTasks(p=>{ const c=p[dateKey]||[],u=typeof fn==="function"?fn(c):fn; return {...p,[dateKey]:u}; });
  }

  function addTask(t){
    if(!t.title.trim()) return;
    const task={...t,id:Date.now(),done:false};
    setDayTasks(p=>[...p,task].sort((a,b)=>a.hour*60+(a.minute||0)-(b.hour*60+(b.minute||0))));
    if(task.reminder) scheduleNotif(task);
    setShowForm(false);
    showToast("✅ משימה נוספה!");
  }

  function addTemplate(t){
    if(!t.title.trim()) return;
    setTemplates(p=>[...p,{...t,id:Date.now()}]);
    setShowTplForm(false);
    showToast("📌 תבנית נשמרה!");
  }

  function deleteTask(id){ setDayTasks(t=>t.filter(x=>x.id!==id)); }
  function deleteTemplate(id){ setTemplates(p=>p.filter(t=>t.id!==id)); }

  function carryOverTask(taskId){
    const task=rawTasks.find(t=>t.id===taskId);
    if(!task) return;
    const tomorrow=addDays(selectedDate,1);
    setDayTasks(t=>t.filter(x=>x.id!==taskId));
    setTasksFor(tomorrow,t=>[...t,{...task,id:Date.now(),carriedFrom:selectedDate,done:false}].sort((a,b)=>a.hour*60+(a.minute||0)-(b.hour*60+(b.minute||0))));
    showToast("↺ הועברה למחר",2500);
  }

  function carryAllUndone(){
    if(undoneTasks.length===0) return;
    const tomorrow=addDays(selectedDate,1);
    const carried=undoneTasks.map(t=>({...t,id:Date.now()+Math.random(),carriedFrom:selectedDate,done:false}));
    setDayTasks(t=>t.filter(x=>x.done));
    setTasksFor(tomorrow,t=>[...t,...carried].sort((a,b)=>a.hour*60+(a.minute||0)-(b.hour*60+(b.minute||0))));
    showToast(`↺ ${undoneTasks.length} משימות הועברו למחר`,3000);
  }

  function toggleDone(id, event){
    setCompletingId(id); setTimeout(()=>setCompletingId(null),600);
    setDayTasks(tasks=>tasks.map(task=>{
      if(task.id!==id) return task;
      const nowDone=!task.done;
      if(nowDone){
        const d=DIFF.find(x=>x.v===(task.difficulty||1))||DIFF[0];
        setXp(p=>p+d.pts);
        if(selectedDate===tKey) updateStreak(); // Only count toward streak for today
        if(event){
          const r=event.currentTarget.getBoundingClientRect();
          setBurst({x:r.left+r.width/2, y:r.top+r.height/2, intense:(task.difficulty||1)===3});
        }
        if((task.difficulty||1)===3 && Math.random()<0.4){
          setTimeout(()=>{
            const reward=MYSTERY_REWARDS[Math.floor(Math.random()*MYSTERY_REWARDS.length)];
            if(reward.type==="xp") setXp(p=>p+reward.amount);
            if(reward.type==="freeze") setFreezes(f=>Math.min(MAX_FREEZES,f+reward.amount));
            setMysteryReward(reward);
          },900);
        } else if((task.difficulty||1)===3) showToast(`🔥 +${d.pts} XP — משימה קשה!`,3500);
        else if((task.difficulty||1)===2) showToast(`⚡ +${d.pts} XP`,2500);
        else showToast(`+${d.pts} XP`,2000);
      }
      return {...task,done:nowDone};
    }));
  }

  function toggleHabit(dateKey, habitId){
    setHabitLog(p=>{
      const day=p[dateKey]||{};
      const upd={...day,[habitId]:!day[habitId]};
      if(!day[habitId] && dateKey===tKey){ // Only count toward streak if marking today
        setXp(x=>x+5);
        updateStreak();
        showToast("+5 XP",1500);
      }
      return {...p,[dateKey]:upd};
    });
  }

  function updateStreak(){
    setStreak(s=>{
      if(s.lastDate===tKey) return s;
      const y=new Date(); y.setDate(y.getDate()-1);
      const yKey=localDateKey(y);
      return {count:s.lastDate===yKey?s.count+1:1, lastDate:tKey};
    });
  }

  function showToast(msg, dur=2500){ setToast(msg); setTimeout(()=>setToast(null),dur); }

  async function fetchAIBrief(){
    setAiLoad(true); setAiBrief("");
    const hardDone=doneTasks.filter(t=>(t.difficulty||1)===3).length;
    const hardTotal=rawTasks.filter(t=>(t.difficulty||1)===3).length;
    const habitsDone=Object.values(habitLog[tKey]||{}).filter(Boolean).length;
    const focusName = focusTaskOfDay?.title;
    try{
      const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:220,messages:[{role:"user",content:`אתה מאמן אישי שמכיר את המשתמש. הוא מתקשה להתמיד, מבזבז זמן ורוצה לבנות הרגלים יציבים. נתונים: ${doneTasks.length}/${rawTasks.length} משימות הושלמו, ${hardDone}/${hardTotal} משימות קשות, ${habitsDone}/${habits.length} הרגלים, streak ${streak.count} ימים, רמה: ${lvl.name}, ${xp} XP.${focusName?` משימת הפוקוס היומית שלו: "${focusName}".`:""} כתוב הודעה אישית קצרה בעברית (3-4 משפטים) שתעזור לו להתחיל את היום במוטיבציה. אם יש משימת פוקוס - הזכר אותה בעדינות. אם יש משימות קשות שלא בוצעו - תזכור לו שזה מה שיעשה את ההבדל. אם הוא בסטריק טוב - תהלל. אל תהיה גנרי. אמוג'ים מתונים.`}]})});
      const data=await res.json();
      setAiBrief(data.content?.[0]?.text||"כל יום הוא הזדמנות חדשה. תתחיל קטן ותתמיד. 💪");
    }catch{ setAiBrief("כל יום הוא הזדמנות חדשה. תתחיל קטן ותתמיד. 💪"); }
    setAiLoad(false);
  }

  function navBack(){ if(view==="day") setSelectedDate(addDays(selectedDate,-1)); else if(view==="week") setWeekStart(addDays(weekStart,-7)); else setMonthDate(addMonths(monthDate,-1)); }
  function navFwd() { if(view==="day") setSelectedDate(addDays(selectedDate,1));  else if(view==="week") setWeekStart(addDays(weekStart,7));  else setMonthDate(addMonths(monthDate,1));  }
  function navTitle(){
    if(view==="day") return isToday?"היום":fmtDateHeb(selectedDate);
    if(view==="week"){ const ws=new Date(weekStart+"T12:00:00"),we=new Date(addDays(weekStart,6)+"T12:00:00"); return `${ws.getDate()} – ${we.getDate()} ב${HEB_MONTHS[we.getMonth()]}`; }
    const [y,m]=monthDate.split("-").map(Number); return `${HEB_MONTHS[m-1]} ${y}`;
  }

  const defTask={title:"",hour:8,minute:0,durationMins:60,color:C.accent,reminder:true,note:"",ifCue:"",thenCue:"",difficulty:1,isFocus:false};
  const defTpl ={title:"",hour:8,minute:0,durationMins:60,color:C.accent,reminder:true,note:"",ifCue:"",thenCue:"",difficulty:1,recurrence:"daily",dow:0,dom:1,isFocus:false};

  const reviewStats = {
    done:doneTasks.length,
    total:rawTasks.length,
    xp:todayScore,
    hardDone:doneTasks.filter(t=>(t.difficulty||1)===3).length,
    undone:undoneTasks.length,
  };

  return(
    <div style={{height:"100dvh",display:"flex",flexDirection:"column",background:C.bg,fontFamily:"'Heebo',sans-serif",color:C.text,direction:"rtl",position:"relative",overflow:"hidden"}}>
      <link href="https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;700;800;900&display=swap" rel="stylesheet"/>
      <AppleTouchIcon/>

      {/* Atmospheric background */}
      <div style={{position:"absolute",inset:0,zIndex:0,pointerEvents:"none",overflow:"hidden"}}>
        <div style={{position:"absolute",top:"-15%",right:"-10%",width:520,height:520,borderRadius:"50%",background:`radial-gradient(circle,${lvl.color}10 0%,transparent 65%)`,filter:"blur(80px)",transition:"background 2s"}}/>
        <div style={{position:"absolute",bottom:"5%",left:"-15%",width:450,height:450,borderRadius:"50%",background:"radial-gradient(circle,rgba(74,222,128,0.07) 0%,transparent 65%)",filter:"blur(70px)"}}/>
        <div style={{position:"absolute",inset:0,backgroundImage:"linear-gradient(rgba(255,255,255,0.012) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.012) 1px,transparent 1px)",backgroundSize:"44px 44px"}}/>
      </div>

      {/* Scrollable content */}
      <div ref={scrollRef} style={{flex:1,overflowY:"auto",overflowX:"hidden",position:"relative",zIndex:1,maxWidth:480,width:"100%",margin:"0 auto"}}>

        {/* ════════ TODAY TAB ════════ */}
        {mainTab==="today"&&(
          <>
            {/* Sticky Date Nav */}
            <div style={{position:"sticky",top:0,zIndex:11,padding:"12px 16px 8px",backdropFilter:"blur(20px)",background:"linear-gradient(180deg,rgba(10,11,14,0.97) 80%,transparent)"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <button onClick={navBack} style={{background:C.card,border:`1px solid ${C.border}`,color:C.sub,fontSize:18,width:34,height:34,borderRadius:10,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"monospace"}}>→</button>
                <div style={{textAlign:"center"}}>
                  <div style={{fontWeight:900,fontSize:18,letterSpacing:-0.5}}>{navTitle()}{isToday&&" ✦"}</div>
                  {!isToday&&<div style={{fontSize:10,color:C.muted,marginTop:1}}>{fmtDateHeb(selectedDate)}</div>}
                </div>
                <button onClick={navFwd} style={{background:C.card,border:`1px solid ${C.border}`,color:C.sub,fontSize:18,width:34,height:34,borderRadius:10,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"monospace"}}>←</button>
              </div>
            </div>

            {/* Sticky Hero Strip with glassmorphism */}
            <div style={{position:"sticky",top:54,zIndex:10,margin:"0 16px 8px",background:"linear-gradient(135deg,rgba(20,22,28,0.92),rgba(13,14,19,0.92))",border:`1px solid ${C.borderM}`,borderRadius:14,padding:"10px 14px",display:"flex",alignItems:"center",justifyContent:"space-between",boxShadow:"0 8px 28px rgba(0,0,0,0.6)",backdropFilter:"blur(28px) saturate(1.5)",overflow:"hidden"}}>
              <div style={{position:"absolute",top:-30,right:-30,width:130,height:130,borderRadius:"50%",background:`radial-gradient(circle,${lvl.color}20 0%,transparent 70%)`,pointerEvents:"none"}}/>
              <div style={{flex:1,position:"relative"}}>
                <div style={{fontSize:9,color:C.muted,letterSpacing:0.7,textTransform:"uppercase",marginBottom:1,fontWeight:600}}>ניקוד היום</div>
                <div style={{fontSize:28,fontWeight:900,color:C.text,lineHeight:1,letterSpacing:-1.2,fontVariantNumeric:"tabular-nums"}}>{todayScore}</div>
                {rawTasks.length>0&&(
                  <div style={{marginTop:5,maxWidth:130}}>
                    <div style={{height:2,background:"rgba(255,255,255,0.06)",borderRadius:1,overflow:"hidden"}}>
                      <div style={{height:"100%",width:`${Math.round(doneTasks.length/rawTasks.length*100)}%`,background:`linear-gradient(90deg,${C.accent},#22c55e)`,borderRadius:1,transition:"width 0.6s ease"}}/>
                    </div>
                    <div style={{fontSize:10,color:C.muted,marginTop:3}}>{doneTasks.length}/{rawTasks.length} משימות</div>
                  </div>
                )}
              </div>

              <div style={{display:"flex",gap:8,alignItems:"center",flexShrink:0,position:"relative"}}>
                <div style={{textAlign:"center",background:streak.count>0?"rgba(251,191,36,0.1)":C.card,border:`1px solid ${streak.count>0?C.amberB:C.border}`,borderRadius:9,padding:"4px 9px",minWidth:38}}>
                  <div style={{fontSize:13,lineHeight:1,filter:streak.count>2?"drop-shadow(0 0 5px #fbbf24)":"none"}}>{streak.count>0?"🔥":"○"}</div>
                  <div style={{fontSize:11,fontWeight:800,color:streak.count>0?C.amber:C.muted,marginTop:1}}>{streak.count}</div>
                </div>
                {freezes>0&&(
                  <div style={{textAlign:"center",background:"rgba(125,211,252,0.1)",border:`1px solid ${C.iceB}`,borderRadius:9,padding:"4px 9px",minWidth:38}} title="Streak Freeze">
                    <div style={{fontSize:13,lineHeight:1}}>❄️</div>
                    <div style={{fontSize:11,fontWeight:800,color:C.ice,marginTop:1}}>{freezes}</div>
                  </div>
                )}
                <button onClick={()=>setShowForm(true)} style={{width:38,height:38,borderRadius:"50%",background:`linear-gradient(135deg,${C.accent},#22c55e)`,border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,color:"#000",fontWeight:700,boxShadow:`0 0 16px rgba(74,222,128,0.45)`,flexShrink:0,transition:"transform 0.15s"}}
                  onMouseEnter={e=>e.currentTarget.style.transform="scale(1.1)"}
                  onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}
                >＋</button>
              </div>
            </div>

            {/* Focus task of the day banner */}
            {isToday&&focusTaskOfDay&&(
              <div style={{margin:"0 16px 10px",padding:"12px 14px",background:`linear-gradient(135deg,rgba(251,191,36,0.13),rgba(249,115,22,0.07))`,border:"1px solid rgba(251,191,36,0.32)",borderRadius:13,boxShadow:"0 4px 20px rgba(251,191,36,0.08)"}}>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <div style={{fontSize:20,filter:"drop-shadow(0 0 8px #fbbf24)"}}>★</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:10,color:C.amber,fontWeight:700,letterSpacing:0.5,textTransform:"uppercase",marginBottom:1}}>הפוקוס של היום</div>
                    <div style={{fontSize:14,fontWeight:700,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{focusTaskOfDay.title}</div>
                  </div>
                  <button onClick={()=>setFocusTask(focusTaskOfDay)} style={{background:"rgba(251,191,36,0.15)",border:"1px solid rgba(251,191,36,0.3)",borderRadius:9,padding:"6px 12px",color:C.amber,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"Heebo,sans-serif",flexShrink:0}}>
                    התחל
                  </button>
                </div>
              </div>
            )}

            {/* AI Daily Brief */}
            {isToday&&(
              <div style={{padding:"0 16px 10px"}}>
                {aiBrief?(
                  <div style={{background:"linear-gradient(135deg,rgba(74,222,128,0.1),rgba(74,222,128,0.04))",border:`1px solid rgba(74,222,128,0.22)`,borderRadius:13,padding:"12px 14px",position:"relative"}}>
                    <div style={{fontSize:11,color:C.accent,fontWeight:700,marginBottom:6,letterSpacing:0.5}}>✨ ההודעה שלך לבוקר</div>
                    <div style={{fontSize:13,lineHeight:1.65,color:"#bbf7d0"}}>{aiBrief}</div>
                    <button onClick={()=>setAiBrief("")} style={{position:"absolute",top:8,left:8,background:"none",border:"none",color:C.muted,fontSize:14,cursor:"pointer"}}>×</button>
                  </div>
                ):(
                  <button onClick={fetchAIBrief} disabled={aiLoad} style={{width:"100%",background:C.card,border:`1px solid ${C.border}`,borderRadius:13,padding:"10px 14px",color:C.sub,fontSize:12.5,cursor:"pointer",fontFamily:"Heebo,sans-serif",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                    <span>{aiLoad?"⏳":"✨"}</span><span>{aiLoad?"מחשב...":"קבל את ההודעה שלך לבוקר"}</span>
                  </button>
                )}
              </div>
            )}

            {/* View / sub-tab switcher (sticky) */}
            <div style={{position:"sticky",top:128,zIndex:9,padding:"0 16px 10px",background:"linear-gradient(180deg,rgba(10,11,14,0.95) 70%,transparent)",backdropFilter:"blur(16px)"}}>
              <div style={{display:"flex",gap:6}}>
                {[{v:"day",l:"יום"},{v:"week",l:"שבוע"},{v:"month",l:"חודש"}].map(({v,l})=>(
                  <button key={v} onClick={()=>setView(v)} style={{padding:"5px 13px",borderRadius:9,border:`1px solid ${view===v?C.accentB:C.border}`,background:view===v?C.accentD:"transparent",color:view===v?C.accent:C.muted,fontSize:12,cursor:"pointer",fontFamily:"Heebo,sans-serif",fontWeight:view===v?700:400,transition:"all 0.15s"}}>
                    {l}
                  </button>
                ))}
                {view==="day"&&(
                  <>
                    <div style={{flex:1}}/>
                    {[{v:"tasks",l:"📋"},{v:"habits",l:"🌱"}].map(({v,l})=>(
                      <button key={v} onClick={()=>setDayTab(v)} style={{padding:"5px 11px",borderRadius:9,border:`1px solid ${dayTab===v?C.accentB:C.border}`,background:dayTab===v?C.accentD:"transparent",color:dayTab===v?C.accent:C.muted,fontSize:13,cursor:"pointer",fontFamily:"Heebo,sans-serif",transition:"all 0.15s"}}>
                        {l}
                      </button>
                    ))}
                  </>
                )}
              </div>
            </div>

            {/* Empty state for new users */}
            {view==="day"&&dayTab==="tasks"&&rawTasks.length===0&&isToday&&(
              <div style={{margin:"20px 16px",padding:"24px 20px",background:C.card,border:`1px dashed ${C.border}`,borderRadius:16,textAlign:"center"}}>
                <div style={{fontSize:42,marginBottom:10}}>🎯</div>
                <div style={{fontSize:15,fontWeight:700,color:C.text,marginBottom:6}}>בוא נתחיל את היום</div>
                <div style={{fontSize:12,color:C.sub,lineHeight:1.6,marginBottom:16,maxWidth:280,margin:"0 auto 16px"}}>הוסף משימה אחת קטנה. ההתמדה מתחילה מצעד אחד פשוט.</div>
                <button onClick={()=>setShowForm(true)} style={{background:`linear-gradient(135deg,${C.accent},#22c55e)`,border:"none",borderRadius:12,padding:"10px 22px",color:"#000",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"Heebo,sans-serif"}}>
                  ＋ משימה ראשונה
                </button>
              </div>
            )}

            {/* Day View */}
            {view==="day"&&dayTab==="tasks"&&rawTasks.length>0&&(
              <div ref={timelineRef} style={{padding:"0 16px 100px"}}>
                {ALL_HOURS.map(hour=>{
                  const hourTasks=tasksByHour[hour]||[];
                  const isCurrent=isToday&&hour===now.getHours();
                  const isPast=isToday&&(hour+1)*60<=nowMins;
                  return(
                    <div key={hour} data-hour={hour} style={{display:"flex",gap:10,minHeight:48}}>
                      <div style={{width:48,flexShrink:0,paddingTop:9,textAlign:"left"}}>
                        <span style={{fontSize:13,fontWeight:isCurrent?800:500,color:isCurrent?C.accent:isPast?C.dim:"#6b7280",letterSpacing:0.3,fontVariantNumeric:"tabular-nums"}}>
                          {String(hour).padStart(2,"0")}:00
                        </span>
                      </div>
                      <div style={{flex:1,borderTop:`1px solid ${isCurrent?"rgba(74,222,128,0.3)":"rgba(255,255,255,0.05)"}`,paddingTop:7,paddingBottom:4,position:"relative"}}>
                        {isCurrent&&(
                          <div style={{position:"absolute",top:-1,left:0,right:0,height:1,background:`linear-gradient(90deg,${C.accent},transparent)`,zIndex:3}}>
                            <div style={{position:"absolute",right:-1,top:-4,width:9,height:9,borderRadius:"50%",background:C.accent,boxShadow:`0 0 10px ${C.accent},0 0 20px rgba(74,222,128,0.45)`,animation:"pulse 2s infinite"}}/>
                            <div style={{position:"absolute",right:8,top:-15,fontSize:9,color:C.accent,fontWeight:800,letterSpacing:1,textTransform:"uppercase"}}>עכשיו</div>
                          </div>
                        )}
                        <div style={{display:"flex",flexDirection:"column",gap:5}}>
                          {hourTasks.map(task=>(
                            <TaskCard key={task.id} task={task} isPast={isPast} isNow={isCurrent}
                              completing={completingId===task.id}
                              onToggle={(e)=>toggleDone(task.id,e)}
                              onDelete={()=>deleteTask(task.id)}
                              onFocus={()=>setFocusTask(task)}
                              onCarryOver={isToday?()=>carryOverTask(task.id):null}
                            />
                          ))}
                        </div>
                        {hourTasks.length===0&&(
                          <button onClick={()=>setShowForm(true)} style={{opacity:0,background:"none",border:`1px dashed ${C.border}`,borderRadius:7,color:C.muted,fontSize:11,padding:"3px 10px",cursor:"pointer",transition:"opacity 0.2s"}}
                            onMouseEnter={e=>e.currentTarget.style.opacity="1"}
                            onMouseLeave={e=>e.currentTarget.style.opacity="0"}
                          >+ הוסף</button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {view==="day"&&dayTab==="habits"&&(
              <HabitsPanel habits={habits} habitLog={habitLog} dateKey={selectedDate}
                onToggle={toggleHabit}
                onAdd={h=>setHabits(p=>[...p,h])}
                onDelete={id=>setHabits(p=>p.filter(h=>h.id!==id))}
              />
            )}

            {view==="week"&&<WeeklyView allTasks={allTasks} weekStart={weekStart} onDayClick={d=>{setSelectedDate(d);setView("day");}}/>}
            {view==="month"&&<MonthlyView allTasks={allTasks} monthDate={monthDate} onDayClick={d=>{setSelectedDate(d);setView("day");}}/>}
          </>
        )}

        {/* ════════ STATS TAB ════════ */}
        {mainTab==="stats"&&(
          <div style={{padding:"16px 0 32px"}}>
            <div style={{margin:"0 16px 14px",background:"linear-gradient(135deg,rgba(255,255,255,0.07),rgba(255,255,255,0.02))",border:`1px solid ${C.borderM}`,borderRadius:22,padding:"22px 22px 20px",position:"relative",overflow:"hidden",boxShadow:"0 12px 36px rgba(0,0,0,0.5)"}}>
              <div style={{position:"absolute",top:-50,right:-50,width:220,height:220,borderRadius:"50%",background:`radial-gradient(circle,${lvl.color}24 0%,transparent 70%)`,pointerEvents:"none"}}/>
              <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",position:"relative",marginBottom:14}}>
                <div>
                  <div style={{fontSize:11,color:C.muted,letterSpacing:1,textTransform:"uppercase",fontWeight:600,marginBottom:4}}>הניקוד היומי</div>
                  <div style={{fontSize:56,fontWeight:900,color:C.text,lineHeight:1,letterSpacing:-2.5,fontVariantNumeric:"tabular-nums"}}>{todayScore}</div>
                  <div style={{marginTop:8,fontSize:12,color:C.sub}}>
                    {doneTasks.length}/{rawTasks.length} משימות · {doneTasks.filter(t=>(t.difficulty||1)===3).length} קשות
                  </div>
                </div>
                <div style={{textAlign:"center"}}>
                  <div style={{fontSize:36,lineHeight:1,filter:`drop-shadow(0 0 12px ${lvl.color}80)`}}>{lvl.icon}</div>
                  <div style={{fontSize:12,fontWeight:800,color:lvl.color,marginTop:4}}>{lvl.name}</div>
                  <div style={{fontSize:10,color:C.muted,marginTop:2}}>{xp} XP</div>
                </div>
              </div>
              {lvl.next&&(
                <div>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:C.muted,marginBottom:5}}>
                    <span>{lvl.icon} {lvl.name}</span>
                    <span>{lvl.pct}% → {lvl.next.icon} {lvl.next.name}</span>
                  </div>
                  <div style={{height:5,background:"rgba(255,255,255,0.06)",borderRadius:3,overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${lvl.pct}%`,background:`linear-gradient(90deg,${lvl.color},${lvl.next.color})`,borderRadius:3,transition:"width 1s ease",boxShadow:`0 0 8px ${lvl.color}80`}}/>
                  </div>
                </div>
              )}
            </div>

            <StreakChain allTasks={allTasks} habitLog={habitLog} today={tKey}/>

            <div style={{padding:"14px 16px 0",display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              {[
                {l:"Streak",v:`${streak.count} ימים`,i:"🔥",c:C.amber},
                {l:"Freezes",v:`${freezes}/${MAX_FREEZES}`,i:"❄️",c:C.ice},
                {l:"ימים פעילים",v:Object.keys(allTasks).filter(k=>(allTasks[k]||[]).length>0).length,i:"📅",c:C.sub},
                {l:"קשות הושלמו",v:Object.values(allTasks).flat().filter(t=>t.done&&(t.difficulty||1)===3).length,i:"💪",c:C.hot},
              ].map(s=>(
                <div key={s.l} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:"12px 14px"}}>
                  <div style={{fontSize:18,marginBottom:4}}>{s.i}</div>
                  <div style={{fontWeight:800,fontSize:18,color:s.c}}>{s.v}</div>
                  <div style={{fontSize:10,color:C.muted,marginTop:2}}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ════════ MANAGE TAB ════════ */}
        {mainTab==="manage"&&(
          <div style={{padding:"18px 0 32px"}}>
            <HabitsPanel habits={habits} habitLog={habitLog} dateKey={selectedDate}
              onToggle={toggleHabit}
              onAdd={h=>setHabits(p=>[...p,h])}
              onDelete={id=>setHabits(p=>p.filter(h=>h.id!==id))}
            />
            <div style={{padding:"0 16px"}}>
              <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:14}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                  <div style={{fontWeight:700,fontSize:14,color:C.text}}>📌 תבניות חוזרות</div>
                  <button onClick={()=>setShowTplForm(true)} style={{background:"transparent",border:`1px solid ${C.border}`,borderRadius:8,padding:"5px 11px",color:C.sub,fontSize:11,cursor:"pointer",fontFamily:"Heebo,sans-serif"}}>+ הוסף</button>
                </div>
                {templates.length===0&&<div style={{color:C.muted,fontSize:12,padding:"4px 0"}}>אין תבניות עדיין</div>}
                {templates.map(tpl=>(
                  <div key={tpl.id} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 0",borderBottom:`1px solid ${C.border}`}}>
                    <div style={{width:9,height:9,borderRadius:"50%",background:tpl.color,flexShrink:0}}/>
                    <div style={{flex:1}}>
                      <div style={{fontSize:13,fontWeight:600,color:C.text}}>{tpl.title}</div>
                      <div style={{fontSize:11,color:C.muted}}>{fmtTime(tpl.hour,tpl.minute||0)} · {fmtDur(tpl.durationMins)} · {tpl.recurrence==="daily"?"כל יום":tpl.recurrence==="weekly"?HEB_DAYS[tpl.dow||0]:`${tpl.dom} לחודש`}</div>
                    </div>
                    <button onClick={()=>deleteTemplate(tpl.id)} style={{background:"none",border:"none",color:C.muted,fontSize:15,cursor:"pointer"}}>×</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Tab Bar */}
      <div style={{position:"relative",zIndex:10,background:"rgba(10,11,14,0.97)",borderTop:`1px solid ${C.border}`,backdropFilter:"blur(20px)",flexShrink:0}}>
        <div style={{display:"flex",maxWidth:480,margin:"0 auto"}}>
          {[
            {v:"today",  icon:"📋", label:"היום"},
            {v:"stats",  icon:"📊", label:"סטטס"},
            {v:"manage", icon:"⚙️", label:"ניהול"},
          ].map(({v,icon,label})=>(
            <button key={v} onClick={()=>setMainTab(v)} style={{flex:1,padding:"11px 0 13px",background:"transparent",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:3,fontFamily:"Heebo,sans-serif",transition:"opacity 0.15s",opacity:mainTab===v?1:0.42}}>
              <span style={{fontSize:21,lineHeight:1}}>{icon}</span>
              <span style={{fontSize:10,fontWeight:mainTab===v?700:400,color:mainTab===v?C.accent:C.muted,letterSpacing:0.3}}>{label}</span>
              {mainTab===v&&<div style={{width:20,height:2,background:C.accent,borderRadius:1,marginTop:2,boxShadow:`0 0 8px ${C.accent}`}}/>}
            </button>
          ))}
        </div>
      </div>

      {/* Modals */}
      {!onboarded&&<Onboarding onDone={()=>setOnboarded(true)}/>}
      {showForm&&<TaskForm initial={defTask} memory={memory} onSave={addTask} onClose={()=>setShowForm(false)}/>}
      {showTplForm&&<TaskForm initial={defTpl} memory={memory} onSave={addTemplate} onClose={()=>setShowTplForm(false)} isTemplate/>}
      {focusTask&&<FocusMode task={focusTask} onClose={()=>setFocusTask(null)} onComplete={(m)=>{setXp(p=>p+Math.round(m/5)); showToast(`✓ +${Math.round(m/5)} XP על פוקוס`,2500);}}/>}
      {mysteryReward&&<MysteryBoxModal reward={mysteryReward} onClose={()=>setMysteryReward(null)}/>}
      {levelUpData&&<LevelUpModal level={levelUpData} onClose={()=>setLevelUpData(null)}/>}
      {showReview&&<EndOfDayReview stats={reviewStats} onClose={()=>{setShowReview(false);setLastReviewDate(tKey);}} onCarryAll={()=>{carryAllUndone();setShowReview(false);setLastReviewDate(tKey);}}/>}
      {burst&&<Burst x={burst.x} y={burst.y} intense={burst.intense} onDone={()=>setBurst(null)}/>}

      {toast&&(
        <div style={{position:"fixed",bottom:90,left:"50%",transform:"translateX(-50%)",background:"rgba(13,14,19,0.97)",border:`1px solid ${C.borderM}`,borderRadius:14,padding:"11px 24px",fontSize:14,fontWeight:500,zIndex:200,boxShadow:"0 8px 32px rgba(0,0,0,0.7)",whiteSpace:"nowrap",maxWidth:"88vw",textAlign:"center",animation:"toastIn 0.35s cubic-bezier(.34,1.56,.64,1)"}}>
          {toast}
        </div>
      )}

      <style>{`
        @keyframes pulse{0%,100%{box-shadow:0 0 10px ${C.accent}}50%{box-shadow:0 0 18px ${C.accent},0 0 32px rgba(74,222,128,0.4)}}
        @keyframes toastIn{from{opacity:0;transform:translateX(-50%) translateY(14px) scale(0.94)}to{opacity:1;transform:translateX(-50%) translateY(0) scale(1)}}
        @keyframes taskPop{0%{transform:scale(1)}45%{transform:scale(1.03)}100%{transform:scale(1)}}
        @keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes pulseBox{0%,100%{transform:scale(1);filter:drop-shadow(0 0 20px rgba(251,191,36,0.6))}50%{transform:scale(1.06);filter:drop-shadow(0 0 30px rgba(251,191,36,0.85))}}
        @keyframes bounceIn{0%{transform:scale(0)}50%{transform:scale(1.2)}100%{transform:scale(1)}}
        select option{background:#0d0e13;color:${C.text};}
        *{-webkit-tap-highlight-color:transparent;box-sizing:border-box;}
        ::-webkit-scrollbar{width:3px}
        ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.08);border-radius:2px}
        ::-webkit-scrollbar-track{background:transparent}
      `}</style>
    </div>
  );
}
