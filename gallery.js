import { initNav, readContract, metadata, nftCard } from './shared.js';
let loaded=0,total=0; const PAGE=24;
async function load(){
 const btn=document.getElementById('loadMore'), grid=document.getElementById('galleryGrid'), st=document.getElementById('galleryStatus'); btn.disabled=true;
 if(!total){total=Number(await readContract.totalMinted());document.querySelector('[data-total]').textContent=total.toLocaleString()}
 const end=Math.min(total,loaded+PAGE); st.textContent='Loading from IPFS…';
 const ids=Array.from({length:end-loaded},(_,i)=>loaded+i+1); const ms=await Promise.all(ids.map(async id=>{try{return await metadata(id)}catch{return null}}));
 ms.filter(Boolean).forEach(m=>grid.appendChild(nftCard(m))); loaded=end; st.textContent=`${loaded} of ${total} loaded`; btn.style.display=loaded<total?'inline-flex':'none';btn.disabled=false;
}
document.addEventListener('DOMContentLoaded',()=>{initNav();document.getElementById('loadMore').onclick=load;load().catch(e=>document.getElementById('galleryStatus').textContent=e.message)});
