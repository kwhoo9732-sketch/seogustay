'use strict';
(() => {
  const $ = s => document.querySelector(s);
  const thread=$('#guide-thread'),form=$('#guide-form'),input=$('#guide-input'),send=$('#guide-send');
  const labels={nature:'공원·호수 가까이',culture:'문화공간 가까이',market:'양동시장 가까이',elementary:'초등학교 가까이',middle:'중학교 가까이',space:'전용 84㎡ 이상',recent:'2020년 이후 준공'};
  let ready=false,busy=false,history=[],revision=0;
  const el=(tag,className,value)=>{const node=document.createElement(tag);node.className=className||'';if(value!==undefined)node.textContent=value;return node;};
  const money=n=>`${Number((n/10000).toFixed(3))}억 원 이하`;
  async function checkStatus(){
    try{const response=await fetch('/api/guide/status',{cache:'no-store'});const data=await response.json();ready=response.ok&&data.ready===true;}catch{ready=false;}
    $('#guide-status').textContent=ready?'Solar AI 사용 준비됨':'기본 검색 가능 · AI 연결 준비 중';$('#guide-status').dataset.ready=String(ready);
    $('#guide-mode').textContent=ready?'입력 문장은 AI 답변을 위해 Upstage로 전송됩니다.':'기본 검색은 이 브라우저에서 문장의 조건을 찾습니다.';
  }
  function localSearch(message){
    const data=window.SeoguStay?.data();if(!data)throw Error('집과 동네 자료를 불러오는 중이에요. 잠시 후 다시 시도해 주세요.');
    const rules=[['nature',/산책|공원|호수|저수지/],['culture',/문화|전시|공연|미술/],['market',/양동시장|전통시장/],['elementary',/초등/],['middle',/중학교|중학생/],['space',/넓은|넓게|84\s*(?:㎡|제곱)|대형/],['recent',/신축|새\s*아파트|2020/]];
    const phrases=message.split(/[,，.。\n]|(?:그리고|하지만|그런데)/);
    const needs=rules.filter(([,regex])=>phrases.some(p=>regex.test(p)&&!/상관\s*없|필요\s*없|중요하지\s*않|원하지\s*않|안\s*중요/.test(p))).map(([id])=>id).slice(0,3);
    const names=[...new Set(data.apartments.map(a=>a.neighborhood))];const neighborhood=names.find(n=>message.includes(n))||'all';
    const maxMatch=message.match(/(\d+(?:\.\d+)?)\s*억(?:\s*(\d+)\s*천)?\s*(?:원\s*)?(?:이하|이내|까지|미만)/);
    const maxPriceMan=maxMatch&&!/전세|월세/.test(message)?Math.round(Number(maxMatch[1])*10000+Number(maxMatch[2]||0)*1000):null;
    const intent={needs,neighborhood,maxPriceMan,query:''};
    const known=needs.length||neighborhood!=='all'||maxPriceMan;
    const results=known?data.apartments.filter(a=>{
      const p=a.transactions?.[0]?.priceMan;return (neighborhood==='all'||a.neighborhood===neighborhood)&&(!maxPriceMan||(typeof p==='number'&&p>0&&p<=maxPriceMan));
    }).map(a=>{const all=window.SeoguMatching.evaluate(a,{places:data.places,schools:data.schools});const evidence=needs.map(id=>all.find(r=>r.id===id));return {id:a.id,name:a.name,neighborhood:a.neighborhood,evidence:needs.length?evidence:all.filter(r=>['nature','elementary'].includes(r.id)),matched:evidence.filter(r=>r.met&&r.available).length,unknown:evidence.filter(r=>!r.available).length,total:needs.length};}).filter(a=>!needs.length||a.matched||a.unknown).sort((a,b)=>b.matched-a.matched||a.name.localeCompare(b.name,'ko')):[];
    return {reply:known?'문장에서 찾은 조건으로 수록 자료를 비교했어요. 적용한 조건과 맞는 이유를 확인해 주세요.':'공원·초등학교·중학교·문화공간·양동시장·넓은 집·신축 중 원하는 조건이나 동네를 적어 주세요.',intent,homes:results.slice(0,3),total:results.length,fullMatches:needs.length?results.filter(r=>r.matched===needs.length).length:null,limitations:['현재는 기본 조건검색입니다. Solar AI는 연결 후 이용할 수 있어요.',...(needs.includes('recent')?['신축은 2020년 이후 준공으로 비교합니다.']:[]),...(needs.includes('space')?['넓은 집은 수록 대표 거래의 전용 84㎡ 이상 기준입니다.']:[])],provider:'basic'};
  }
  function renderAnswer(data){
    const wrap=el('div','guide-message guide-answer');wrap.append(el('small','answer-mode',data.provider==='Solar'?'SOLAR AI · 생활 조건 해석':'기본 조건검색 · AI 생성 답변 아님'));
    wrap.append(el('p','',data.reply));
    const intent=data.intent,tags=el('div','guide-tags');
    for(const id of intent.needs||[])tags.append(el('span','',labels[id]));
    if(intent.neighborhood!=='all')tags.append(el('span','',intent.neighborhood));if(intent.maxPriceMan)tags.append(el('span','',`수록 매매 사례 ${money(intent.maxPriceMan)}`));if(intent.query)tags.append(el('span','',intent.query));
    if(tags.children.length)wrap.append(tags);
    if(data.total){
      wrap.append(el('p','answer-limits',data.fullMatches===null?`${data.total}개 단지 중 이름순으로 먼저 3곳을 살펴보세요.`:`모든 조건 확인·충족 ${data.fullMatches}곳 · 일부 충족·미확인 포함 ${data.total}곳. 충족 개수순, 동률은 이름순입니다.`));
      for(const home of data.homes){
        const button=el('button','guide-match');button.type='button';button.dataset.apartment=home.id;
        const heading=el('strong','',home.name);heading.append(el('span','',home.total?`${home.matched}/${home.total} 확인·충족`:`${home.neighborhood} ↗`));button.append(heading);
        const items=(home.evidence||[]).map(r=>`${!r.available?'?':r.met?'✓':'–'} ${r.label}: ${r.detail}${r.available&&!r.met?' (기준 밖)':''}`);
        for(const item of items)button.append(el('small','',item));wrap.append(button);
      }
      const more=el('button','guide-see-all',`이 조건으로 ${data.total}곳 더 살펴보기 →`);more.type='button';more.addEventListener('click',()=>window.SeoguStay?.apply(intent));wrap.append(more);
    }else if(tags.children.length){wrap.append(el('p','answer-limits','현재 수록 자료에서 해당 조건으로 표시할 단지를 찾지 못했어요. 조건을 줄이거나 동네를 바꿔보세요.'));}
    if(intent.maxPriceMan)wrap.append(el('p','answer-limits','예산은 확인한 과거 매매 사례에만 적용돼요. 가격 미수록 단지는 제외되며 현재 매물 가격과 다릅니다.'));
    for(const line of data.limitations||[])wrap.append(el('p','answer-limits',line));
    thread.append(wrap);thread.scrollTop=thread.scrollHeight;
  }
  const submitGuide=async event=>{
    event.preventDefault();if(busy)return;
    const message=input.value.trim();if(!message)return;
    if(!window.SeoguStay?.data()){input.setCustomValidity('집과 동네 자료를 불러오는 중이에요. 잠시 후 다시 시도해 주세요.');input.reportValidity();return;}
    busy=true;send.disabled=true;input.disabled=true;const current=revision;
    thread.append(el('div','guide-message user',message));const loading=el('div','guide-loading',ready?'Solar가 원하는 생활 조건을 정리하고 있어요.':'생활 조건을 찾아 수록 자료와 비교하고 있어요.');loading.setAttribute('role','status');thread.append(loading);thread.scrollTop=thread.scrollHeight;
    try{
      let data;
      if(ready){const response=await fetch('/api/guide',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message,history:history.slice(-4)}),signal:AbortSignal.timeout(40000)});data=await response.json();if(!response.ok)throw Error(data.error||'답변을 받지 못했어요. 잠시 후 다시 시도해 주세요.');}
      else data=localSearch(message);
      if(current!==revision)return;
      loading.remove();renderAnswer(data);history.push({role:'user',content:message},{role:'assistant',content:JSON.stringify({intro:data.reply,...data.intent})});history=history.slice(-4);input.value='';
    }catch(error){if(current!==revision)return;loading.remove();const answer=el('div','guide-message guide-answer error',error.name==='TimeoutError'?'답변이 지연되고 있어요. 잠시 후 다시 시도해 주세요.':error.message);thread.append(answer);thread.scrollTop=thread.scrollHeight;}
    finally{busy=false;send.disabled=false;input.disabled=false;input.focus({preventScroll:true});}
  };
  form.addEventListener('submit',submitGuide);
  send.addEventListener('click',submitGuide);
  input.addEventListener('input',()=>input.setCustomValidity(''));
  document.querySelectorAll('[data-guide-example]').forEach(button=>button.addEventListener('click',()=>{if(busy)return;input.value=button.dataset.guideExample;input.setCustomValidity('');input.focus({preventScroll:true});}));
  $('#guide-clear').addEventListener('click',()=>{if(busy)return;revision++;history=[];thread.replaceChildren();input.value='';input.focus({preventScroll:true});});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!busy)checkStatus();});
  checkStatus();
})();
