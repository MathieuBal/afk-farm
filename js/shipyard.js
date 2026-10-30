/* Lightweight progressive dock illustration, no remote assets or 3D runtime. */
(function(){
 const A=window.AFK;
 A.shipyard={render(project,completed,building,index){
  const ship=['<path d="M180 24 218 92 213 166 147 166 142 92Z"/>','<path d="M160 166h40l12 35h-64Z"/><path d="m164 202 16 25 16-25"/>','<path d="m143 85-65 73 70-17m69-56 65 73-70-17"/>','<path d="m180 50 17 42-17 16-17-16Z"/>','<path d="M125 105 102 190h43m90-85 23 85h-43"/>'];
  const station=['<circle cx="180" cy="122" r="39"/>','<path d="M141 110H76v24h65m78-24h65v24h-65"/>','<ellipse cx="180" cy="122" rx="111" ry="68"/>','<path d="M168 83V36h24v47m-24 78v47h24v-47"/>','<circle cx="180" cy="122" r="13"/><path d="m95 70-16-16m186 16 16-16M95 174l-16 16m186-16 16 16"/>'];
  const shapes=index===0||index===2?ship:station;
  const segments=project.parts.map((p,i)=>'<g class="dock-part '+(i<completed?'installed':i===completed&&building?'assembling':'planned')+'"><title>'+p.name+'</title>'+shapes[i%shapes.length]+'</g>').join('');
  return '<figure class="dock"><svg viewBox="0 0 360 240" role="img" aria-label="'+project.name+' : '+completed+' pièces installées sur '+project.parts.length+'"><path class="dock-guides" d="M25 25v190h310V25M25 122h310M180 15v210"/>'+segments+'</svg><figcaption>'+completed+' / '+project.parts.length+' modules installés · '+(building?'Assemblage en cours':'Prêt à équiper')+'</figcaption></figure>';
 }};
})();
