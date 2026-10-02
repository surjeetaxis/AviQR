let listener=null;let active=null;const queue=[];
const next=()=>{if(!active&&queue.length){active=queue.shift();listener?.(active);}};
export function requestCaptcha(request){if(!listener)return Promise.reject(new Error('Security challenge screen unavailable. Please reload.'));return new Promise((resolve,reject)=>{queue.push({...request,resolve,reject});next();});}
export function subscribeCaptcha(fn){listener=fn;if(active)fn(active);return()=>{listener=null;if(active){active.reject(new Error('Security challenge canceled'));active=null;}queue.splice(0).forEach(item=>item.reject(new Error('Security challenge canceled')));};}
export function finishCaptcha(token){if(!active)return;const item=active;active=null;listener?.(null);token?item.resolve(token):item.reject(new Error('Security challenge canceled'));next();}
