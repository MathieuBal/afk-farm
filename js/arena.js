(function(root){
  const width=364,height=347;
  function fit(viewWidth,top,bottom,immersive=false){
    if(immersive){
      const w=Math.max(1,viewWidth-16),h=Math.max(1,bottom-top);
      const scale=Math.sqrt(w*h/(width*height));
      return {x:8,y:top,scale,width:w/scale,height:h/scale};
    }
    const scale=Math.max(.01,Math.min(Math.max(1,viewWidth-24)/width,Math.max(1,bottom-top)/height));
    return {x:(viewWidth-width*scale)/2,y:top+(bottom-top-height*scale)/2,scale,width,height};
  }
  function point(rect,x,y){return {x:(x-rect.x)/rect.scale,y:(y-rect.y)/rect.scale};}
  root.HarvestArena={fit,point};if(typeof module!=='undefined')module.exports=root.HarvestArena;
})(typeof globalThis!=='undefined'?globalThis:window);
