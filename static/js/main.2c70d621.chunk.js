(this["webpackJsonpchain-reaction"]=this["webpackJsonpchain-reaction"]||[]).push([[0],[,,,,,function(e,n,t){e.exports=t.p+"static/media/drop.3327acfc.mp3"},,,function(e,n,t){e.exports=t(16)},,,,,function(e,n,t){},function(e,n,t){},function(e,n,t){},function(e,n,t){"use strict";t.r(n);var a=t(0),r=t.n(a),o=t(7),i=t.n(o),c=(t(13),t(14),t(4)),l=t(1),s=(t(15),t(5)),u=t.n(s),d=!0,m=0,f=function(){var e=!0,n=Object(a.useState)([]),t=Object(l.a)(n,2),o=t[0],i=t[1],s=Object(a.useState)(""),f=Object(l.a)(s,2),g=f[0],p=f[1],v=Object(a.useState)(""),h=Object(l.a)(v,2),E=h[0],y=h[1],w=Object(a.useState)("red"),b=Object(l.a)(w,2),k=b[0],S=b[1],j=Object(a.useState)(localStorage.getItem("sound")||"on"),x=Object(l.a)(j,2),A=x[0],O=x[1];Object(a.useEffect)((function(){localStorage.setItem("sound",A)}),[A]),Object(a.useEffect)((function(){p(~~(window.innerWidth/50)),y(~~((window.innerHeight-40)/50));var e=new Array(E).fill(0),n=e.map((function(n){return e[n]=new Array(g).fill([0,null])}));i(n)}),[E,g]);var C=function(e,n,t){if(m+=1,t)return N(),I(),0===e&&0===n||0===e&&n===g-1||0===n&&e===E-1||e===E-1&&n===g-1?1===o[e][n][0]?T(e,n,"corner"):R(e,n):0===e||0===n||e===E-1||n===g-1?2===o[e][n][0]?T(e,n,"side"):R(e,n):3===o[e][n][0]?T(e,n,"center"):R(e,n);d=!1,setTimeout((function(){return 0===e&&0===n||0===e&&n===g-1||0===n&&e===E-1||e===E-1&&n===g-1?1===o[e][n][0]?T(e,n,"corner"):R(e,n):0===e||0===n||e===E-1||n===g-1?2===o[e][n][0]?T(e,n,"side"):R(e,n):3===o[e][n][0]?T(e,n,"center"):R(e,n)}),200)},I=function(){return A&&"on"===A?new Audio(u.a).play():null},N=function(){S("red"===k?"green":"red")},B=function(){navigator.share&&navigator.share({title:"Chain Reaction",text:"Check out this new Fun 2-Player Game called Chain Reaction \ud83d\ude2e",url:"https://tarunspartan.github.io/chain-reaction"}).then((function(){return console.log("Successful share")})).catch((function(e){return console.log("Error sharing",e)}))},R=function(n,t){var a=Object(c.a)(o),r=Object(c.a)(a[n][t]);r[0]+=1,r[1]=k,a[n][t]=r,i(a),function(){if(m>=2&&e){d=!1;var n=null,t=null;o.map((function(e){return e.map((function(e){return null!==e[1]?"red"===e[1]?n+=1:"green"===e[1]?t+=1:null:null}))})),null===n||null===t?(e=!1,d=!1,document.getElementById("winBoard").style.display="block"):d=!0}}()},W=function(e,n){d=!1,o[e][n][0]=0,o[e][n][1]=null,i(Object(c.a)(o))},T=function(e,n,t){switch(d=!1,t){case"corner":return 0===e&&0===n?(W(e,n),C(e,n+1),C(e+1,n)):0===e&&n===g-1?(W(e,n),C(e,n-1),C(e+1,n)):0===n&&e===E-1?(W(e,n),C(e-1,n),C(e,n+1)):e===E-1&&n===g-1?(W(e,n),C(e-1,n),C(e,n-1)):null;case"side":return 0===e?(W(e,n),C(e,n-1),C(e,n+1),C(e+1,n)):0===n?(W(e,n),C(e+1,n),C(e-1,n),C(e,n+1)):e===E-1?(W(e,n),C(e,n+1),C(e,n-1),C(e-1,n)):n===g-1?(W(e,n),C(e+1,n),C(e-1,n),C(e,n-1)):null;case"center":return W(e,n),C(e,n+1),C(e+1,n),C(e,n-1),C(e-1,n)}};return r.a.createElement("div",{className:"container",id:"container"},r.a.createElement("div",{className:"centerDiv"},o.map((function(e,n){return r.a.createElement("div",{key:n,style:{height:"50px"}},e.map((function(e,t){return r.a.createElement(r.a.Fragment,{key:n+t},r.a.createElement("div",{className:"block",style:{border:"1px solid ".concat(k)},onClick:o[n][t][1]!==k&&null!==o[n][t][1]||!d?null:function(){return C(n,t,k)}},r.a.createElement("div",{className:1===o[n][t][0]?"one common":2===o[n][t][0]?"two common":3===o[n][t][0]?"three common":"empty",style:{backgroundColor:o[n][t][1]}})))})))})),r.a.createElement("div",{style:{marginTop:"10px"}},r.a.createElement("div",{style:{display:"flex",alignItems:"center"}},r.a.createElement("div",{id:"footer"},"C H A I N ",r.a.createElement("span",{id:"dot"},"\u2022")," R E A C T I ",r.a.createElement("span",{id:"face"},r.a.createElement("span",{id:"one"}),r.a.createElement("span",{id:"two"}),r.a.createElement("span",{id:"three"}))," N"),r.a.createElement("div",{id:"settingsIcon",onClick:function(){return"block"===document.getElementById("settings").style.display?document.getElementById("settings").style.display="none":document.getElementById("settings").style.display="block"}},"\u2699")))),r.a.createElement("div",{className:"winBoard",id:"winBoard"},r.a.createElement("div",{style:{textAlign:"center"}},r.a.createElement("div",{style:{margin:"20px",opacity:"0.9"}},r.a.createElement("span",{role:"img","aria-label":"celeb"},"\ud83d\ude0e\xa0"),r.a.createElement("span",{style:{color:"".concat("red"===k?"green":"red")}},"Player ","red"===k?"green":"red"," Won"),r.a.createElement("span",{role:"img","aria-label":"celeb"},"\xa0\ud83d\ude0e")),r.a.createElement("div",{className:"replay",onClick:function(){return window.location.reload()}},"R e p l a y\xa0",r.a.createElement("span",{role:"img","aria-label":"reload"},"\ud83d\udd04")))),r.a.createElement("div",{className:"settings",id:"settings"},r.a.createElement("div",{style:{textAlign:"center"}},r.a.createElement("div",{style:{margin:"5px",opacity:"0.8"}},r.a.createElement("span",{style:{color:"black",textShadow:"1px 1px 0px grey"}},"Settings")),r.a.createElement("div",null,r.a.createElement("span",{onClick:function(){return"off"===A&&new Audio(u.a).play(),"on"===localStorage.getItem("sound")?localStorage.setItem("sound","off"):localStorage.setItem("sound","on"),void O(localStorage.getItem("sound"))},role:"img","aria-label":"sound"},A&&"on"===A?"\ud83d\udd0a":"\ud83d\udd07")),r.a.createElement("div",{className:"restart",onClick:function(){return window.location.reload()}},"R e s t a r t"),r.a.createElement("div",{id:"devLine"},"Designed & Built with ",r.a.createElement("span",{role:"img","aria-label":"love"},"\ud83d\udc99")," by TARUN"),navigator.share&&r.a.createElement("span",{className:"share",onClick:function(){return B()}},"SHARE"))))};var g=function(){return r.a.createElement("div",{className:"App"},r.a.createElement(f,null))},p=Boolean("localhost"===window.location.hostname||"[::1]"===window.location.hostname||window.location.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/));function v(e,n){navigator.serviceWorker.register(e).then((function(e){e.onupdatefound=function(){var t=e.installing;null!=t&&(t.onstatechange=function(){"installed"===t.state&&(navigator.serviceWorker.controller?(console.log("New content is available and will be used when all tabs for this page are closed. See https://bit.ly/CRA-PWA."),n&&n.onUpdate&&n.onUpdate(e)):(console.log("Content is cached for offline use."),n&&n.onSuccess&&n.onSuccess(e)))})}})).catch((function(e){console.error("Error during service worker registration:",e)}))}i.a.render(r.a.createElement(r.a.StrictMode,null,r.a.createElement(g,null)),document.getElementById("root")),function(e){if("serviceWorker"in navigator){if(new URL("/chain-reaction",window.location.href).origin!==window.location.origin)return;window.addEventListener("load",(function(){var n="".concat("/chain-reaction","/service-worker.js");p?(!function(e,n){fetch(e,{headers:{"Service-Worker":"script"}}).then((function(t){var a=t.headers.get("content-type");404===t.status||null!=a&&-1===a.indexOf("javascript")?navigator.serviceWorker.ready.then((function(e){e.unregister().then((function(){window.location.reload()}))})):v(e,n)})).catch((function(){console.log("No internet connection found. App is running in offline mode.")}))}(n,e),navigator.serviceWorker.ready.then((function(){console.log("This web app is being served cache-first by a service worker. To learn more, visit https://bit.ly/CRA-PWA")}))):v(n,e)}))}}()}],[[8,1,2]]]);
//# sourceMappingURL=main.2c70d621.chunk.js.map