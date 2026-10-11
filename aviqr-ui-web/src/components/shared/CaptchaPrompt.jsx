import {useEffect,useState} from 'react';
import {subscribeCaptcha,finishCaptcha} from '../../api/captchaBroker.js';
import TurnstileChallenge from './TurnstileChallenge.jsx';
import './StepUpPrompt.css';
export default function CaptchaPrompt(){const [request,setRequest]=useState(null);useEffect(()=>subscribeCaptcha(setRequest),[]);if(!request)return null;return <div className="step-up-overlay" style={{zIndex:11000}}><section className="step-up-dialog" role="dialog" aria-modal="true" aria-label="Security challenge"><h2>Security check</h2><p>Complete this check to continue.</p><TurnstileChallenge siteKey={request.siteKey} onToken={finishCaptcha}/><button onClick={()=>finishCaptcha(null)}>Cancel</button></section></div>;}
