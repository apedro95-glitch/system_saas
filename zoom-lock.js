
(function(){
  function prevent(e){ if(e.cancelable) e.preventDefault(); }
  document.addEventListener('gesturestart', prevent, {passive:false});
  document.addEventListener('gesturechange', prevent, {passive:false});
  document.addEventListener('gestureend', prevent, {passive:false});
  let lastTouchEnd = 0;
  document.addEventListener('touchend', function(e){
    const now = Date.now();
    if(now - lastTouchEnd <= 300) prevent(e);
    lastTouchEnd = now;
  }, {passive:false});
  document.addEventListener('touchmove', function(e){
    if(e.touches && e.touches.length > 1) prevent(e);
  }, {passive:false});
  window.addEventListener('wheel', function(e){
    if(e.ctrlKey) prevent(e);
  }, {passive:false});
})();
