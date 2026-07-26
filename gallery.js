import { initNav, readContract, metadata, nftCard } from './shared.js';
let loaded=0,total=0;
const PAGE=24;

async function load(){
  const btn=document.getElementById('loadMore');
  const grid=document.getElementById('galleryGrid');
  const st=document.getElementById('galleryStatus');
  btn.disabled=true;

  if(!total){
    total=Number(await readContract.totalMinted());
    document.querySelector('[data-total]').textContent=total.toLocaleString();
  }

  const end=Math.min(total,loaded+PAGE);
  st.textContent='Loading collection…';
  const ids=Array.from({length:end-loaded},(_,i)=>loaded+i+1);
  const items=await Promise.all(ids.map(id=>metadata(id)));
  items.forEach(item=>grid.appendChild(nftCard(item)));

  loaded=end;
  st.textContent=`${loaded} of ${total} loaded`;
  btn.style.display=loaded<total?'inline-flex':'none';
  btn.disabled=false;
}

document.addEventListener('DOMContentLoaded',()=>{
  initNav();
  document.getElementById('loadMore').onclick=load;
  load().catch(e=>document.getElementById('galleryStatus').textContent=e.message);
});
