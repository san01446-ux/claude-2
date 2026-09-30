import readline from 'node:readline';

function getKey(){ const key=process.env.PIXAI_API_KEY?.trim(); if(!key)throw new Error('PIXAI_API_KEY 환경변수를 Claude Remote 환경에 설정하세요.'); return key; }
async function api(endpoint,body){
  const r=await fetch('https://api.pixai.art'+endpoint,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+getKey(),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),redirect:'error',signal:AbortSignal.timeout(30000)});
  if(!r.ok)throw new Error('PixAI API HTTP '+r.status+(r.status===401?' — 키 인증 실패':r.status===402?' — 크레딧 확인 필요':''));
  return r.json();
}
const tools=[
  {name:'pixai_generate_image',description:'PixAI 이미지 생성 작업을 시작합니다. PixAI 크레딧을 사용하므로 사용자에게 비용 발생을 알리고 요청한 이미지만 생성하세요. 반환된 taskId로 pixai_get_task를 호출하세요.',inputSchema:{type:'object',properties:{prompt:{type:'string',minLength:1,maxLength:10000},modelVersionId:{type:'string',pattern:'^[0-9]+$',default:'1983308862240288769'},aspectRatio:{type:'string',enum:['1:1','2:3','3:2','3:4','4:3','9:16','16:9'],default:'1:1'},mode:{type:'string',enum:['lite','standard','pro','ultra'],default:'standard'}},required:['prompt'],additionalProperties:false},annotations:{readOnlyHint:false,destructiveHint:false,idempotentHint:false,openWorldHint:true}},
  {name:'pixai_get_task',description:'PixAI 이미지 작업 상태 및 완료된 이미지 URL을 확인합니다. 작업 조회 간격은 최소 1.5초입니다. 완료된 이미지 URL을 사용자에게 제공하세요.',inputSchema:{type:'object',properties:{taskId:{type:'string',pattern:'^[A-Za-z0-9_-]+$'}},required:['taskId'],additionalProperties:false},annotations:{readOnlyHint:true,openWorldHint:true}}
];
const polls=new Map();
async function call(name,a){
  if(name==='pixai_generate_image'){
    if(typeof a.prompt!=='string'||!a.prompt.trim()||a.prompt.length>10000)throw new Error('유효한 prompt를 입력하세요.');
    const modelVersionId=a.modelVersionId||'1983308862240288769',aspectRatio=a.aspectRatio||'1:1',mode=a.mode||'standard';
    if(!/^[0-9]+$/.test(modelVersionId)||!tools[0].inputSchema.properties.aspectRatio.enum.includes(aspectRatio)||!tools[0].inputSchema.properties.mode.enum.includes(mode))throw new Error('모델, 비율 또는 모드가 유효하지 않습니다.');
    const task=await api('/v2/image/create',{prompt:a.prompt,modelVersionId,aspectRatio,mode,batchSize:1});
    return {...task,taskId:task.id};
  }
  if(name==='pixai_get_task'){
    if(typeof a.taskId!=='string'||!/^[A-Za-z0-9_-]+$/.test(a.taskId))throw new Error('유효한 taskId가 필요합니다.');
    const last=polls.get(a.taskId)||0;
    if(Date.now()-last<1500)throw new Error('작업 조회는 1.5초 이후 다시 요청하세요.');
    polls.set(a.taskId,Date.now()); if(polls.size>1000)polls.delete(polls.keys().next().value);
    return api('/v1/task/'+encodeURIComponent(a.taskId));
  }
  throw new Error('알 수 없는 도구');
}
async function handle(m){
  if(m.id===undefined)return;
  let result;
  if(m.method==='initialize')result={protocolVersion:m.params?.protocolVersion||'2024-11-05',capabilities:{tools:{}},serverInfo:{name:'pixai-local',version:'1.0.0'},instructions:'PixAI 이미지 생성은 사용자 요청에 따라 수행하며 크레딧을 사용합니다. batchSize는 1입니다. 완료된 이미지 URL을 표시하세요.'};
  else if(m.method==='ping')result={};
  else if(m.method==='tools/list')result={tools};
  else if(m.method==='tools/call'){
    try{result={content:[{type:'text',text:JSON.stringify(await call(m.params.name,m.params.arguments||{}))}]};}
    catch(e){result={isError:true,content:[{type:'text',text:e.message}]};}
  }else return send({jsonrpc:'2.0',id:m.id,error:{code:-32601,message:'Method not found'}});
  send({jsonrpc:'2.0',id:m.id,result});
}
function send(m){process.stdout.write(JSON.stringify(m)+'\n');}
readline.createInterface({input:process.stdin,crlfDelay:Infinity}).on('line',line=>{try{handle(JSON.parse(line)).catch(()=>send({jsonrpc:'2.0',id:null,error:{code:-32603,message:'Internal error'}}));}catch{send({jsonrpc:'2.0',id:null,error:{code:-32700,message:'Parse error'}});}});
