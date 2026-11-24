/* Parent-facing descriptions of recorded practice, without inferring speech accuracy. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.AboardSummary=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const categories=['independent','help','separated','not_yet'];
  function outcome(a){return a.splitOff&&a.support!=='not_yet'?'separated':a.support;}
  function breakdown(attempts){const counts={independent:0,help:0,separated:0,not_yet:0};attempts.forEach(a=>{const key=outcome(a);if(categories.includes(key))counts[key]++;});const total=Object.values(counts).reduce((a,b)=>a+b,0);return {counts,total,independentPercent:total?Math.round(counts.independent*100/total):null};}
  function fingerprint(s){return JSON.stringify([s.level||'word',s.setId||'',(s.rounds||[]).slice().sort(),[...new Set((s.attempts||[]).filter(a=>a.round===1||a.round===2).map(a=>a.word))].sort()]);}
  function summarise(sessions,now=new Date()){
    const real=sessions.filter(s=>!['week-a','week-b'].includes(s.id)&&((s.attempts||[]).length||(s.listening||[]).length||(s.soundChoices||[]).length)).slice().sort((a,b)=>new Date(a.at)-new Date(b.at));
    const latest=real.at(-1);if(!latest)return {empty:true};
    const speech=breakdown((latest.attempts||[]).filter(a=>a.round===1||a.round===2));
    const repairs=breakdown((latest.attempts||[]).filter(a=>a.round===3));
    const listening=latest.listening||[],sounds=latest.soundChoices||[];
    const cutoff=new Date(now);cutoff.setDate(cutoff.getDate()-6);cutoff.setHours(0,0,0,0);
    const recent=real.filter(s=>new Date(s.at)>=cutoff&&new Date(s.at)<=now);
    let headline='Practice recorded.';
    if(speech.total){
      if(speech.counts.independent===speech.total)headline='Every recorded word turn was done without help in this game.';
      else if(speech.counts.independent>speech.total/2)headline='Most recorded word turns were done without help in this game.';
      else if(speech.counts.not_yet>speech.total/2)headline='Most recorded word turns were marked “not yet” in this game.';
      else headline='Help was useful for many word turns in this game.';
    }else if(repairs.total)headline='You practised '+repairs.total+' communication repair '+(repairs.total===1?'strategy.':'strategies.');
    const prior=real.slice(0,-1).reverse().find(s=>s.status==='completed'&&fingerprint(s)===fingerprint(latest));
    let comparison='A comparison will appear after another completed game with the same words, rounds and level.';
    if(prior&&latest.status==='completed'&&speech.total>=4){const prev=breakdown((prior.attempts||[]).filter(a=>a.round===1||a.round===2));if(prev.total>=4){const delta=speech.independentPercent-prev.independentPercent;comparison='Without help: '+speech.independentPercent+'% this game ('+speech.counts.independent+'/'+speech.total+'), compared with '+prev.independentPercent+'% ('+prev.counts.independent+'/'+prev.total+') in the previous matching game. '+(delta>0?'More turns were done without help.':delta<0?'More help was used this time.':'The proportion was the same.');}}
    const strategies=['key','show','way'].map(id=>({id,...breakdown((latest.attempts||[]).filter(a=>a.round===3&&a.strategy===id))})).filter(r=>r.total);
    return {empty:false,latest,speech,repairs,headline,comparison,strategies,listening:{total:listening.length,correct:listening.filter(a=>a.correct).length},sounds:{total:sounds.length,correct:sounds.filter(a=>a.correct).length},recentGames:recent.filter(s=>s.status==='completed').length,recentTurns:recent.reduce((n,s)=>n+(s.attempts||[]).length,0),recentDays:new Set(recent.map(s=>new Date(s.at).toLocaleDateString('en-AU'))).size};
  }
  function bySound(sessions,catalogue){
    const lookup=new Map(catalogue.sets.flatMap(s=>s.words).map(w=>[w.id,w.onset]));
    const groups=new Map();
    sessions.filter(s=>!['week-a','week-b'].includes(s.id)).slice().sort((a,b)=>new Date(a.at)-new Date(b.at)).forEach(session=>{
      (session.attempts||[]).filter(a=>[1,2].includes(a.round)).forEach(a=>{
        const sound=a.onset||lookup.get(a.word),level=a.level||session.level||'word';
        if(!sound)return;
        const key=level+':'+sound;if(!groups.has(key))groups.set(key,{sound,level,attempts:[],sessions:new Map(),words:new Map()});
        const g=groups.get(key);g.attempts.push(a);
        const sid=session.id||session.at;if(!g.sessions.has(sid))g.sessions.set(sid,{at:session.at,attempts:[]});g.sessions.get(sid).attempts.push(a);
        if(!g.words.has(a.word))g.words.set(a.word,[]);g.words.get(a.word).push(a);
      });
    });
    return [...groups.values()].map(g=>{
      const history=[...g.sessions.values()].map(s=>({...s,...breakdown(s.attempts),words:[...new Set(s.attempts.map(a=>a.word))].sort()}));
      const latest=history.at(-1),previous=history.slice(0,-1).reverse().find(s=>JSON.stringify(s.words)===JSON.stringify(latest.words));
      return {sound:g.sound,level:g.level,...breakdown(g.attempts),latest,previous,history,words:[...g.words].map(([word,tries])=>({word,...breakdown(tries),last:outcome(tries.at(-1))})).sort((a,b)=>a.word.localeCompare(b.word))};
    }).sort((a,b)=>['word','phrase','sentence'].indexOf(a.level)-['word','phrase','sentence'].indexOf(b.level)||a.sound.localeCompare(b.sound));
  }
  function cleanCollection(collection,catalogue){const result={};for(const kind of ['animals','trains']){const known=new Set(catalogue[kind].map(x=>x.id));result[kind]=[...new Set((collection?.[kind]||[]).filter(id=>known.has(id)))];}return result;}
  return {summarise,bySound,breakdown,cleanCollection};
});
