(this["webpackJsonpchain-reaction"]=this["webpackJsonpchain-reaction"]||[]).push([[0],[,,,,,,,function(e,n,t){e.exports=t.p+"static/media/drop.3327acfc.mp3"},function(e,n,t){e.exports=t(16)},,,,,function(e,n,t){},function(e,n,t){},function(e,n,t){},function(e,n,t){"use strict";t.r(n);var o=t(0),a=t.n(o),r=t(6),c=t.n(r),i=(t(13),t(14),t(4)),l=t(1),s=(t(15),t(7)),u=!0,d=0,m=new Audio(t.n(s).a);m.playbackRate=1.5;var f=function(){var e=!0,n=Object(o.useState)([]),t=Object(l.a)(n,2),r=t[0],c=t[1],s=Object(o.useState)(""),f=Object(l.a)(s,2),p=f[0],g=f[1],v=Object(o.useState)(""),b=Object(l.a)(v,2),h=b[0],w=b[1],E=Object(o.useState)("red"),y=Object(l.a)(E,2),k=y[0],j=y[1],O=Object(o.useState)(localStorage.getItem("sound")||"on"),S=Object(l.a)(O,2),I=S[0],A=S[1];Object(o.useEffect)((function(){var e;window.addEventListener("beforeinstallprompt",(function(n){n.preventDefault(),e=n})),document.getElementById("buttonInstall").addEventListener("click",(function(n){e.prompt(),e.userChoice.then((function(e){"accepted"===e.outcome?console.log("User accepted the install prompt"):console.log("User dismissed the install prompt")}))}))}),[]),Object(o.useEffect)((function(){localStorage.setItem("sound",I)}),[I]),Object(o.useEffect)((function(){g(~~(window.innerWidth/50)),w(~~(window.innerHeight/50));var e=new Array(h).fill(0),n=e.map((function(n){return e[n]=new Array(p).fill([0,null])}));c(n)}),[h,p]);var W=function(e,n,t){if(d+=1,t)return C(),N(),0===e&&0===n||0===e&&n===p-1||0===n&&e===h-1||e===h-1&&n===p-1?1===r[e][n][0]?R(e,n,"corner"):x(e,n):0===e||0===n||e===h-1||n===p-1?2===r[e][n][0]?R(e,n,"side"):x(e,n):3===r[e][n][0]?R(e,n,"center"):x(e,n);setTimeout((function(){return 0===e&&0===n||0===e&&n===p-1||0===n&&e===h-1||e===h-1&&n===p-1?1===r[e][n][0]?R(e,n,"corner"):x(e,n):0===e||0===n||e===h-1||n===p-1?2===r[e][n][0]?R(e,n,"side"):x(e,n):3===r[e][n][0]?R(e,n,"center"):x(e,n)}),200)},N=function(){return I&&"on"===I?m.play():null},C=function(){j("red"===k?"green":"red")},x=function(n,t){var o=Object(i.a)(r),a=Object(i.a)(o[n][t]);a[0]+=1,a[1]=k,o[n][t]=a,c(o),function(){if(d>=2){var n=null,t=null;r.map((function(e){return e.map((function(e){return null!==e[1]?"red"===e[1]?n+=1:"green"===e[1]?t+=1:null:null}))})),null!==n&&null!==t||!e||(e=!1,u=!1,document.getElementById("winBoard").style.display="block")}}()},B=function(e,n){r[e][n][0]=0,r[e][n][1]=null,c(Object(i.a)(r))},R=function(e,n,t){switch(t){case"corner":return 0===e&&0===n?(B(e,n),W(e,n+1),W(e+1,n)):0===e&&n===p-1?(B(e,n),W(e,n-1),W(e+1,n)):0===n&&e===h-1?(B(e,n),W(e-1,n),W(e,n+1)):e===h-1&&n===p-1?(B(e,n),W(e-1,n),W(e,n-1)):null;case"side":return 0===e?(B(e,n),W(e,n-1),W(e,n+1),W(e+1,n)):0===n?(B(e,n),W(e+1,n),W(e-1,n),W(e,n+1)):e===h-1?(B(e,n),W(e,n+1),W(e,n-1),W(e-1,n)):n===p-1?(B(e,n),W(e+1,n),W(e-1,n),W(e,n-1)):null;case"center":return B(e,n),W(e,n+1),W(e+1,n),W(e,n-1),W(e-1,n)}};return a.a.createElement("div",{className:"container",id:"container"},a.a.createElement("div",{className:"centerDiv"},r.map((function(e,n){return a.a.createElement("div",{key:n,style:{height:"50px"}},e.map((function(e,t){return a.a.createElement(a.a.Fragment,{key:n+t},a.a.createElement("div",{className:"block",style:{border:"1px solid ".concat(k)},onClick:r[n][t][1]!==k&&null!==r[n][t][1]||!u?null:function(){return W(n,t,k)}},a.a.createElement("div",{className:1===r[n][t][0]?"one common":2===r[n][t][0]?"two common":3===r[n][t][0]?"three common":"empty",style:{backgroundColor:r[n][t][1]}})))})))}))),a.a.createElement("div",{className:"winBoard",id:"winBoard"},a.a.createElement("div",{style:{textAlign:"center"}},a.a.createElement("div",{style:{margin:"20px",opacity:"0.9"}},a.a.createElement("span",{role:"img","aria-label":"celeb"},"\ud83e\udd73\xa0"),a.a.createElement("span",{style:{color:"".concat("red"===k?"green":"red")}},"Player ","red"===k?"green":"red"," Won"),a.a.createElement("span",{role:"img","aria-label":"celeb"},"\xa0\ud83e\udd73")),a.a.createElement("div",{className:"replay",onClick:function(){return window.location.reload()}},"R e p l a y ",a.a.createElement("span",{role:"img","aria-label":"reload"},"\ud83d\udd03")),a.a.createElement("div",{onClick:function(){return"on"===localStorage.getItem("sound")?localStorage.setItem("sound","off"):localStorage.setItem("sound","on"),void A(localStorage.getItem("sound"))}},a.a.createElement("span",{role:"img","aria-label":"sound"},I&&"on"===I?"\ud83d\udd0a":"\ud83d\udd07")),a.a.createElement("button",{id:"buttonInstall"},"Install"))))};var p=function(){return a.a.createElement("div",{className:"App"},a.a.createElement(f,null))},g=Boolean("localhost"===window.location.hostname||"[::1]"===window.location.hostname||window.location.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/));function v(e,n){navigator.serviceWorker.register(e).then((function(e){e.onupdatefound=function(){var t=e.installing;null!=t&&(t.onstatechange=function(){"installed"===t.state&&(navigator.serviceWorker.controller?(console.log("New content is available and will be used when all tabs for this page are closed. See https://bit.ly/CRA-PWA."),n&&n.onUpdate&&n.onUpdate(e)):(console.log("Content is cached for offline use."),n&&n.onSuccess&&n.onSuccess(e)))})}})).catch((function(e){console.error("Error during service worker registration:",e)}))}c.a.render(a.a.createElement(a.a.StrictMode,null,a.a.createElement(p,null)),document.getElementById("root")),function(e){if("serviceWorker"in navigator){if(new URL("/chain-reaction",window.location.href).origin!==window.location.origin)return;window.addEventListener("load",(function(){var n="".concat("/chain-reaction","/service-worker.js");g?(!function(e,n){fetch(e,{headers:{"Service-Worker":"script"}}).then((function(t){var o=t.headers.get("content-type");404===t.status||null!=o&&-1===o.indexOf("javascript")?navigator.serviceWorker.ready.then((function(e){e.unregister().then((function(){window.location.reload()}))})):v(e,n)})).catch((function(){console.log("No internet connection found. App is running in offline mode.")}))}(n,e),navigator.serviceWorker.ready.then((function(){console.log("This web app is being served cache-first by a service worker. To learn more, visit https://bit.ly/CRA-PWA")}))):v(n,e)}))}}()}],[[8,1,2]]]);
//# sourceMappingURL=main.416ee129.chunk.js.map