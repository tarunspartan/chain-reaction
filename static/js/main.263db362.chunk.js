(this["webpackJsonpchain-reaction"]=this["webpackJsonpchain-reaction"]||[]).push([[0],[,,,,,,,function(e,n,t){e.exports=t.p+"static/media/drop.aaf5f5c2.mp3"},function(e,n,t){e.exports=t(16)},,,,,function(e,n,t){},function(e,n,t){},function(e,n,t){},function(e,n,t){"use strict";t.r(n);var a=t(0),r=t.n(a),o=t(6),c=t.n(o),i=(t(13),t(14),t(4)),l=t(1),s=(t(15),t(7)),u=t.n(s),d=!0,m=0,f=function(){var e=!0,n=Object(a.useState)([]),t=Object(l.a)(n,2),o=t[0],c=t[1],s=Object(a.useState)(""),f=Object(l.a)(s,2),g=f[0],p=f[1],v=Object(a.useState)(""),w=Object(l.a)(v,2),h=w[0],b=w[1],y=Object(a.useState)("red"),E=Object(l.a)(y,2),k=E[0],j=E[1],O=Object(a.useState)(localStorage.getItem("sound")||!0),S=Object(l.a)(O,2),A=S[0],W=S[1];Object(a.useEffect)((function(){localStorage.setItem("sound",A)}),[A]),Object(a.useEffect)((function(){p(~~(window.innerWidth/50)),b(~~(window.innerHeight/50));var e=new Array(h).fill(0),n=e.map((function(n){return e[n]=new Array(g).fill([0,null])}));c(n)}),[h,g]);var N=function(e,n,t){if(m+=1,t)return x(),I(),0===e&&0===n||0===e&&n===g-1||0===n&&e===h-1||e===h-1&&n===g-1?1===o[e][n][0]?R(e,n,"corner"):C(e,n):0===e||0===n||e===h-1||n===g-1?2===o[e][n][0]?R(e,n,"side"):C(e,n):3===o[e][n][0]?R(e,n,"center"):C(e,n);setTimeout((function(){return 0===e&&0===n||0===e&&n===g-1||0===n&&e===h-1||e===h-1&&n===g-1?1===o[e][n][0]?R(e,n,"corner"):C(e,n):0===e||0===n||e===h-1||n===g-1?2===o[e][n][0]?R(e,n,"side"):C(e,n):3===o[e][n][0]?R(e,n,"center"):C(e,n)}),200)},I=function(){return A&&"true"===A?new Audio(u.a).play():null},x=function(){j("red"===k?"green":"red")},C=function(n,t){var a=Object(i.a)(o),r=Object(i.a)(a[n][t]);r[0]+=1,r[1]=k,a[n][t]=r,c(a),function(){if(m>=2){var n=null,t=null;o.map((function(e){return e.map((function(e){return null!==e[1]?"red"===e[1]?n+=1:"green"===e[1]?t+=1:null:null}))})),null!==n&&null!==t||!e||(e=!1,d=!1,document.getElementById("winBoard").style.display="block")}}()},B=function(e,n){o[e][n][0]=0,o[e][n][1]=null,c(Object(i.a)(o))},R=function(e,n,t){switch(t){case"corner":return 0===e&&0===n?(B(e,n),N(e,n+1),N(e+1,n)):0===e&&n===g-1?(B(e,n),N(e,n-1),N(e+1,n)):0===n&&e===h-1?(B(e,n),N(e-1,n),N(e,n+1)):e===h-1&&n===g-1?(B(e,n),N(e-1,n),N(e,n-1)):null;case"side":return 0===e?(B(e,n),N(e,n-1),N(e,n+1),N(e+1,n)):0===n?(B(e,n),N(e+1,n),N(e-1,n),N(e,n+1)):e===h-1?(B(e,n),N(e,n+1),N(e,n-1),N(e-1,n)):n===g-1?(B(e,n),N(e+1,n),N(e-1,n),N(e,n-1)):null;case"center":return B(e,n),N(e,n+1),N(e+1,n),N(e,n-1),N(e-1,n)}};return r.a.createElement("div",{className:"container",id:"container"},r.a.createElement("div",{className:"centerDiv"},o.map((function(e,n){return r.a.createElement("div",{key:n,style:{height:"50px"}},e.map((function(e,t){return r.a.createElement(r.a.Fragment,{key:n+t},r.a.createElement("div",{className:"block",style:{border:"1px solid ".concat(k)},onClick:o[n][t][1]!==k&&null!==o[n][t][1]||!d?null:function(){return N(n,t,k)}},r.a.createElement("div",{className:1===o[n][t][0]?"one common":2===o[n][t][0]?"two common":3===o[n][t][0]?"three common":"empty",style:{backgroundColor:o[n][t][1]}})))})))}))),r.a.createElement("div",{className:"winBoard",id:"winBoard"},r.a.createElement("div",{style:{textAlign:"center"}},r.a.createElement("div",{style:{margin:"20px",opacity:"0.9"}},r.a.createElement("span",{role:"img","aria-label":"celeb"},"\ud83e\udd73\xa0"),r.a.createElement("span",{style:{color:"".concat("red"===k?"green":"red")}},"Player ","red"===k?"green":"red"," Won"),r.a.createElement("span",{role:"img","aria-label":"celeb"},"\xa0\ud83e\udd73")),r.a.createElement("div",{className:"replay",onClick:function(){return window.location.reload()}},"R e p l a y ",r.a.createElement("span",{role:"img","aria-label":"reload"},"\ud83d\udd03")),r.a.createElement("div",{onClick:function(){return"true"===localStorage.getItem("sound")?localStorage.setItem("sound",!1):localStorage.setItem("sound",!0),void W(localStorage.getItem("sound"))}},r.a.createElement("span",{role:"img","aria-label":"sound"},A&&"true"===A?"\ud83d\udd0a":"\ud83d\udd07")))))};var g=function(){return r.a.createElement("div",{className:"App"},r.a.createElement(f,null))},p=Boolean("localhost"===window.location.hostname||"[::1]"===window.location.hostname||window.location.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/));function v(e,n){navigator.serviceWorker.register(e).then((function(e){e.onupdatefound=function(){var t=e.installing;null!=t&&(t.onstatechange=function(){"installed"===t.state&&(navigator.serviceWorker.controller?(console.log("New content is available and will be used when all tabs for this page are closed. See https://bit.ly/CRA-PWA."),n&&n.onUpdate&&n.onUpdate(e)):(console.log("Content is cached for offline use."),n&&n.onSuccess&&n.onSuccess(e)))})}})).catch((function(e){console.error("Error during service worker registration:",e)}))}c.a.render(r.a.createElement(r.a.StrictMode,null,r.a.createElement(g,null)),document.getElementById("root")),function(e){if("serviceWorker"in navigator){if(new URL("/chain-reaction",window.location.href).origin!==window.location.origin)return;window.addEventListener("load",(function(){var n="".concat("/chain-reaction","/service-worker.js");p?(!function(e,n){fetch(e,{headers:{"Service-Worker":"script"}}).then((function(t){var a=t.headers.get("content-type");404===t.status||null!=a&&-1===a.indexOf("javascript")?navigator.serviceWorker.ready.then((function(e){e.unregister().then((function(){window.location.reload()}))})):v(e,n)})).catch((function(){console.log("No internet connection found. App is running in offline mode.")}))}(n,e),navigator.serviceWorker.ready.then((function(){console.log("This web app is being served cache-first by a service worker. To learn more, visit https://bit.ly/CRA-PWA")}))):v(n,e)}))}}()}],[[8,1,2]]]);
//# sourceMappingURL=main.263db362.chunk.js.map