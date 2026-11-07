(function(){
  var rm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var top = document.querySelector('.top');
  function onScroll(){ top.classList.toggle('scrolled', scrollY > 8); }
  addEventListener('scroll', onScroll, {passive:true}); onScroll();
  var els = document.querySelectorAll('[data-reveal]');
  function count(el){
    var n = +el.getAttribute('data-count'), s = el.querySelector('span'); if (!s) return;
    if (rm) { s.textContent = n; return; }
    var t0 = null, dur = 1200;
    function step(ts){ if(!t0) t0 = ts; var p = Math.min(1,(ts-t0)/dur), e = 1-Math.pow(1-p,3); s.textContent = Math.round(n*e); if(p<1) requestAnimationFrame(step); }
    s.textContent = '0'; requestAnimationFrame(step);
  }
  if (rm || !('IntersectionObserver' in window)) { els.forEach(function(e){ e.classList.add('in'); }); }
  else {
    var io = new IntersectionObserver(function(es){ es.forEach(function(en){ if(en.isIntersecting){ en.target.classList.add('in'); en.target.querySelectorAll('[data-count]').forEach(count); io.unobserve(en.target); } }); }, {threshold:.12, rootMargin:'0px 0px -6% 0px'});
    els.forEach(function(e){ io.observe(e); });
  }
  var rail = document.getElementById('cmpRail');
  if (rail) {
    var dots = document.querySelectorAll('.cmp-dots b');
    var center = function(){ var c = rail.children[1]; rail.scrollLeft = c.offsetLeft - (rail.clientWidth - c.clientWidth)/2; };
    var mark = function(){ var mid = rail.scrollLeft + rail.clientWidth/2, best = 0, bd = 1e9; [].forEach.call(rail.children, function(c,i){ var d = Math.abs(c.offsetLeft + c.clientWidth/2 - mid); if (d < bd) { bd = d; best = i; } }); [].forEach.call(dots, function(d,i){ d.classList.toggle('on', i === best); }); };
    center(); addEventListener('load', center); addEventListener('resize', center);
    rail.addEventListener('scroll', function(){ requestAnimationFrame(mark); }, {passive:true});
  }
  if (rm) return;
  var shots = [].slice.call(document.querySelectorAll('.shot .phone')), ticking = false;
  function par(){ var vh = innerHeight; shots.forEach(function(p){ var r = p.parentElement.getBoundingClientRect(); var c = (r.top + r.height/2 - vh/2) / vh; p.style.setProperty('--py', (c * -48).toFixed(1) + 'px'); }); ticking = false; }
  addEventListener('scroll', function(){ if(!ticking){ requestAnimationFrame(par); ticking = true; } }, {passive:true}); par();
  var hero = document.querySelector('.hero'), stage = document.querySelector('.stage');
  if (matchMedia('(pointer:fine)').matches) {
    hero.addEventListener('pointermove', function(e){ var r = hero.getBoundingClientRect(); stage.style.setProperty('--mx', ((e.clientX-r.left)/r.width-.5).toFixed(3)); stage.style.setProperty('--my', ((e.clientY-r.top)/r.height-.5).toFixed(3)); });
    hero.addEventListener('pointerleave', function(){ stage.style.setProperty('--mx', 0); stage.style.setProperty('--my', 0); });
  }
})();
