/**
 * state.js — Global App State & API Base URL
 * SmartCity AI · India Urban Intelligence
 *
 * S        — main state object (city, year, model, pred, charts...)
 * API      — backend URL (http://localhost:8765)
 */

const API = window.SMARTCITY_API_BASE || (window.location.protocol === 'http:' && window.location.port !== '5500' ? window.location.origin : 'http://localhost:8765');

/* ══════════════ STATE ══════════════ */
const S={city:'',year:new Date().getFullYear(),model:'LSTM',theme:'standard',map:null,mapMk:[],charts:{},pred:{t:0,a:0,p:0},metrics:{},apiOk:false,mapYearSelected:false,booted:false};