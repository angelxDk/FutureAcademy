import 'dotenv/config';
import Stripe from 'stripe';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {adminServices} from '../server/admin.js';
import {refreshBilling,hasPro} from '../server/billing.js';
if (!process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_')) throw new Error('This verification requires a Stripe test key.');
const stripe=new Stripe(process.env.STRIPE_SECRET_KEY,{timeout:20000,maxNetworkRetries:1});
const price=await stripe.prices.retrieve(process.env.STRIPE_PRO_PRICE_ID);assert.equal(price.livemode,false);
const uid='qa-billing-'+randomUUID(), {db}=adminServices();let clock, customer, subscription;
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function clockReady(){for(let i=0;i<45;i++){const current=await stripe.testHelpers.testClocks.retrieve(clock.id);if(current.status==='ready')return;await pause(1000);}throw Error('Test clock did not settle');}
async function webhookState(expected){for(let i=0;i<35;i++){const data=(await db.doc('billingCustomers/'+uid).get()).data();if(data?.plan===expected)return data;await pause(1000);}throw Error('Webhook did not apply expected entitlement '+expected);}
try{
 const frozen=Math.floor(Date.now()/1000);clock=await stripe.testHelpers.testClocks.create({frozen_time:frozen,name:'Future Academy sandbox verification'});
 customer=await stripe.customers.create({name:'Disposable sandbox verification',test_clock:clock.id,metadata:{uid}});
 await db.doc('billingCustomers/'+uid).set({customerId:customer.id});
 const pm=await stripe.paymentMethods.attach('pm_card_visa',{customer:customer.id});
 await stripe.customers.update(customer.id,{invoice_settings:{default_payment_method:pm.id}});
 subscription=await stripe.subscriptions.create({customer:customer.id,items:[{price:price.id}],default_payment_method:pm.id,metadata:{uid},payment_behavior:'error_if_incomplete'});
 assert.equal(subscription.status,'active');
 const first=await webhookState('pro');assert.equal(hasPro(first),true);console.log('PASS signed Stripe webhook granted Pro after test payment.');
 const initialEnd=subscription.items.data[0].current_period_end;
 await stripe.testHelpers.testClocks.advance(clock.id,{frozen_time:initialEnd+86400});await clockReady();
 subscription=await stripe.subscriptions.retrieve(subscription.id);assert.equal(subscription.status,'active');
 const renewed=await refreshBilling(uid,customer.id,stripe);assert.ok(renewed.validUntil>first.validUntil);console.log('PASS recurring renewal extends entitlement.');
 const scheduled=await stripe.subscriptions.update(subscription.id,{cancel_at_period_end:true});assert.equal(scheduled.cancel_at_period_end,true);
 assert.equal((await refreshBilling(uid,customer.id,stripe)).cancelAtPeriodEnd,true);console.log('PASS cancellation at period end preserves current access.');
 await stripe.subscriptions.update(subscription.id,{cancel_at_period_end:false});
 const declined=await stripe.paymentMethods.attach('pm_card_chargeCustomerFail',{customer:customer.id});
 await stripe.customers.update(customer.id,{invoice_settings:{default_payment_method:declined.id}});
 await stripe.subscriptions.update(subscription.id,{default_payment_method:declined.id});
 const nextEnd=subscription.items.data[0].current_period_end;
 await stripe.testHelpers.testClocks.advance(clock.id,{frozen_time:nextEnd+86400});await clockReady();
 subscription=await stripe.subscriptions.retrieve(subscription.id);assert.ok(['past_due','unpaid','canceled'].includes(subscription.status),subscription.status);
 await webhookState('free');console.log('PASS failed renewal revokes Pro through webhook.');
 await stripe.subscriptions.cancel(subscription.id);
 const event={id:'evt_qa_'+randomUUID(),type:'customer.subscription.updated',data:{object:{customer:customer.id}}};const payload=JSON.stringify(event);
 const headers={'Content-Type':'application/json','stripe-signature':stripe.webhooks.generateTestHeaderString({payload,secret:process.env.STRIPE_WEBHOOK_SECRET})};
 const url=process.env.APP_URL+'/api/stripe-webhook';
 assert.equal((await fetch(url,{method:'POST',headers,body:payload+' '})).status,400);console.log('PASS altered webhook signature rejected.');
 for(let i=0;i<2;i++)assert.equal((await fetch(url,{method:'POST',headers,body:payload})).status,200);
 assert.equal(hasPro((await db.doc('billingCustomers/'+uid).get()).data()),false);console.log('PASS duplicate/out-of-order replay does not restore cancelled Pro.');
 await db.doc('stripeEvents/'+event.id).delete();
}finally{
 if(subscription)try{await stripe.subscriptions.cancel(subscription.id);}catch{}
 if(clock)try{await stripe.testHelpers.testClocks.del(clock.id);}catch{}
 if(customer)try{await stripe.customers.del(customer.id);}catch{}
 await db.doc('billingCustomers/'+uid).delete();
}
