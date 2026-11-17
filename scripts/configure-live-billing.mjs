import fs from 'node:fs';import dotenv from 'dotenv';import Stripe from 'stripe';import {spawnSync} from 'node:child_process';
const local=dotenv.parse(fs.readFileSync('.env'));
const credentials=dotenv.parse(fs.readFileSync('.env.credentials'));
const billing=dotenv.parse(fs.readFileSync('.env.billing-live'));
const key=credentials.STRIPE_LIVE_SECRET_KEY;
if(!key?.startsWith('sk_live_'))throw new Error('Salve a chave real em STRIPE_LIVE_SECRET_KEY no arquivo privado .env.credentials.');
const stripe=new Stripe(key,{timeout:20000});
const account=await stripe.accounts.retrieve();
if(account.id!=='acct_1Rv5j4JEa1tQhhjY'||!account.charges_enabled||!account.payouts_enabled)throw new Error('Conta Stripe divergente ou recebimentos desabilitados.');
const price=await stripe.prices.retrieve(billing.STRIPE_PRO_PRICE_ID);
if(!price.livemode||!price.active||price.unit_amount!==2500||price.currency!=='brl'||price.recurring?.interval!=='month'||price.recurring?.interval_count!==1)throw new Error('Preço real inválido.');
const hooks=await stripe.webhookEndpoints.list({limit:100});
const hook=hooks.data.find(h=>h.url===local.APP_URL+'/api/stripe-webhook');
if(!hook)throw new Error('Webhook real não está preparado.');
const portal=await stripe.billingPortal.configurations.retrieve(billing.STRIPE_PORTAL_CONFIGURATION_ID);
if(!portal.active||!portal.features.subscription_cancel.enabled||portal.features.subscription_cancel.mode!=='at_period_end')throw new Error('Portal de cancelamento não está pronto.');
if(!billing.STRIPE_WEBHOOK_SECRET)throw new Error('Segredo do webhook real ausente.');
const ai=await fetch('https://api.openai.com/v1/models',{headers:{Authorization:'Bearer '+local.OPENAI_API_KEY},signal:AbortSignal.timeout(15000)});const models=await ai.json();if(!ai.ok||!models.data?.some(m=>m.id===local.OPENAI_MODEL))throw new Error('Chave/modelo OpenAI não validado.');
const activating=process.argv.includes('--activate');
if(activating){
 const payload=JSON.stringify({id:'evt_configuration_probe',type:'configuration.probe',livemode:true,data:{object:{}}});
 const signature=stripe.webhooks.generateTestHeaderString({payload,secret:billing.STRIPE_WEBHOOK_SECRET});
 const response=await fetch(local.APP_URL+'/api/stripe-webhook',{method:'POST',headers:{'Content-Type':'application/json','stripe-signature':signature},body:payload,signal:AbortSignal.timeout(20000)});
 if(!response.ok)throw new Error('Publique primeiro as credenciais reais com vendas desligadas; a assinatura do webhook real ainda não foi aceita.');
 await stripe.webhookEndpoints.update(hook.id,{disabled:false});
}
const values=activating?{ENABLE_PAID_AI:'true'}:{STRIPE_SECRET_KEY:key,...billing,OPENAI_API_KEY:local.OPENAI_API_KEY,OPENAI_MODEL:local.OPENAI_MODEL,ENABLE_PAID_AI:'false'};
for(const [name,value]of Object.entries(values)){const args=['env','add',name,'--environment','production','--force','--yes'];if(/SECRET|API_KEY/.test(name))args.push('--sensitive');const r=spawnSync('vercel',args,{input:value,encoding:'utf8'});if(r.status!==0)throw new Error('Falha ao salvar '+name+' na Vercel.');console.log(name+': production configured');}
console.log(activating?'Live webhook enabled and purchase flag prepared; publish production to activate.':'Live billing credentials prepared with purchases disabled. Publish production, then rerun with --activate and publish again.');
console.log('No real payment was processed.');
