(function(root,factory){
  const api=factory();
  if(typeof module==='object' && module.exports) module.exports=api;
  root.VipCore=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  function normalize(s){
    return (s||'').toString().normalize('NFD').replace(/[\u0300-\u036f]/g,'')
      .toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  }
  function levenshtein(a,b){
    if(a===b)return 0; if(!a)return b.length; if(!b)return a.length;
    const prev=Array.from({length:b.length+1},(_,i)=>i), cur=new Array(b.length+1);
    for(let i=1;i<=a.length;i++){
      cur[0]=i;
      for(let j=1;j<=b.length;j++) cur[j]=Math.min(cur[j-1]+1,prev[j]+1,prev[j-1]+(a[i-1]===b[j-1]?0:1));
      for(let j=0;j<=b.length;j++) prev[j]=cur[j];
    }
    return prev[b.length];
  }
  function score(service,query){
    const q=normalize(query); if(!q) return 1;
    const name=normalize(service.name), code=normalize(service.code), cat=normalize(service.category), desc=normalize(service.description);
    let s=0;
    if(code===q)s+=12000; else if(code.startsWith(q))s+=5500; else if(code.includes(q))s+=3500;
    const qTokens=q.split(' ').filter(Boolean), nameTokens=name.split(' ');
    if(name===q)s+=10000;
    if(qTokens.length>1){
      if(name.startsWith(q))s+=4800; else if(name.includes(q))s+=3000;
    }
    if(cat.includes(q))s+=700;
    if(desc.includes(q))s+=180;
    for(const qt of qTokens){
      let best=0, bestIndex=999;
      const stem=qt.slice(0,Math.min(5,qt.length));
      for(let i=0;i<nameTokens.length;i++){
        const t=nameTokens[i]; let pts=0;
        if(t===qt) pts=1500;
        else if(qt.length>=4 && t.length>=4 && t.startsWith(stem)) pts=1300;
        else if(t.startsWith(qt)||qt.startsWith(t)) pts=950;
        else if(qt.length>=4 && Math.abs(t.length-qt.length)<=2 && levenshtein(t,qt)<=2) pts=500;
        if(pts>best){best=pts;bestIndex=i;}
      }
      if(best){ s+=best + Math.round(1000/(bestIndex+1)); }
      if(cat.includes(qt)) s+=100;
      if(desc.includes(qt)) s+=25;
    }
    return s;
  }
  function search(services,query,limit=40){
    return services.map(service=>({service,score:score(service,query)})).filter(x=>x.score>0)
      .sort((a,b)=>b.score-a.score || a.service.name.localeCompare(b.service.name,'pl'))
      .slice(0,limit).map(x=>x.service);
  }
  function totals(cart,vat){
    const net=cart.reduce((sum,i)=>sum+(Number(i.price)||0)*(Number(i.qty)||0),0);
    const vatAmount=net*(Number(vat)||0)/100;
    return {net,vatAmount,gross:net+vatAmount};
  }
  return {normalize,levenshtein,score,search,totals};
});