/* banner.js — سلايدر البانر الإعلاني: تبديل تلقائي + نقاط + سحب أفقي */
(function(){
  var root=document.getElementById('promo-banner');if(!root)return;
  var slides=[].slice.call(root.querySelectorAll('.pb-slide')),dots=[].slice.call(root.querySelectorAll('.pb-dot'));
  if(slides.length<2)return;
  var cur=0,t=null,reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  function show(i){
    cur=(i+slides.length)%slides.length;
    slides.forEach(function(s,k){var on=k===cur;s.classList.toggle('is-on',on);s.setAttribute('aria-hidden',on?'false':'true');
      [].forEach.call(s.querySelectorAll('a'),function(a){a.tabIndex=on?0:-1;});
      if(on){var im=s.querySelector('img');if(im)im.loading='eager';}});
    dots.forEach(function(d,k){d.classList.toggle('is-on',k===cur);});
  }
  function play(){stop();if(reduce)return;t=setInterval(function(){if(!document.hidden)show(cur+1);},5500);}
  function stop(){if(t){clearInterval(t);t=null;}}
  dots.forEach(function(d,k){d.addEventListener('click',function(){show(k);play();});});
  root.addEventListener('mouseenter',stop);root.addEventListener('mouseleave',play);
  root.addEventListener('focusin',stop);root.addEventListener('focusout',play);
  var x0=null;
  root.addEventListener('touchstart',function(e){x0=e.touches[0].clientX;},{passive:true});
  root.addEventListener('touchend',function(e){
    if(x0===null)return;var dx=e.changedTouches[0].clientX-x0;x0=null;
    if(Math.abs(dx)>45){show(cur+(dx<0?1:-1));play();}
  },{passive:true});
  show(0);play();
})();
