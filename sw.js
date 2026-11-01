/* Lift Log service worker: precache everything, serve cache-first.
   To ship an update, change VERSION. The new worker re-downloads every file and drops the old cache. */
var VERSION='lift-log-v1';
var FILES=[
  './','index.html','styles.css','programme.js','app.js','manifest.webmanifest','seed-history.json',
  'fonts/Barlow-400.woff2','fonts/Barlow-500.woff2','fonts/Barlow-600.woff2','fonts/Barlow-700.woff2',
  'fonts/BarlowCondensed-600.woff2','fonts/BarlowCondensed-700.woff2',
  'icons/icon-192.png','icons/icon-512.png','icons/icon-maskable-512.png','icons/apple-touch-icon.png','icons/favicon-32.png'
];

self.addEventListener('install',function(e){
  e.waitUntil(caches.open(VERSION).then(function(c){
    return c.addAll(FILES.map(function(f){return new Request(f,{cache:'reload'});}));
  }).then(function(){return self.skipWaiting();}));
});

self.addEventListener('activate',function(e){
  e.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.filter(function(k){return k!==VERSION;}).map(function(k){return caches.delete(k);}));
  }).then(function(){return self.clients.claim();}));
});

self.addEventListener('fetch',function(e){
  var req=e.request;
  if(req.method!=='GET'||new URL(req.url).origin!==self.location.origin)return;
  e.respondWith(caches.open(VERSION).then(function(c){
    return c.match(req,{ignoreSearch:true}).then(function(hit){
      if(hit)return hit;
      return fetch(req).then(function(res){
        if(res.ok)c.put(req,res.clone());
        return res;
      }).catch(function(){
        return req.mode==='navigate'?c.match('index.html'):Response.error();
      });
    });
  }));
});
