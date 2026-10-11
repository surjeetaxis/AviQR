let listener=null;let active=null;const queue=[];
const next=()=>{if(!active&&queue.length){active=queue.shift();listener?.(active);}};
export function requestStepUp(request){if(!listener)return Promise.reject(new Error('Verification screen unavailable. Please reload.'));return new Promise((resolve,reject)=>{queue.push({...request,resolve,reject});next();});}
export function subscribeStepUp(fn){listener=fn;if(active)fn(active);return()=>{listener=null;if(active){active.reject(new Error('Verification canceled'));active=null;}queue.splice(0).forEach(item=>item.reject(new Error('Verification canceled')));};}
export function finishStepUp(token){if(!active)return;const item=active;active=null;listener?.(null);token?item.resolve(token):item.reject(new Error('Verification canceled'));next();}
