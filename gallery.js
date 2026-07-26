import { initNav, readContract, metadata, nftCard, calculateRarity } from './shared.js';

const PAGE=24;
let total=0, visibleCount=PAGE, allItems=[];
const grid=document.getElementById('galleryGrid');
const status=document.getElementById('galleryStatus');
const loadMore=document.getElementById('loadMore');
const rarityFilter=document.getElementById('rarityFilter');
const searchInput=document.getElementById('gallerySearch');

function filteredItems(){
  const rarity=rarityFilter.value;
  const q=searchInput.value.trim().toLowerCase();
  return allItems.filter(item=>{
    const rarityOk=rarity==='all'||item.rarityTier===rarity;
    const searchOk=!q||String(item.id).includes(q)||String(item.name).toLowerCase().includes(q)||(item.attributes||[]).some(a=>`${a.trait_type} ${a.value}`.toLowerCase().includes(q));
    return rarityOk&&searchOk;
  });
}
function render(){
  const filtered=filteredItems();
  grid.innerHTML='';
  filtered.slice(0,visibleCount).forEach(item=>grid.appendChild(nftCard(item)));
  loadMore.style.display=visibleCount<filtered.length?'inline-flex':'none';
  status.textContent=`Showing ${Math.min(visibleCount,filtered.length)} of ${filtered.length} · rarity calculated across ${allItems.length} minted NFTs`;
}
async function loadAll(){
  loadMore.disabled=true;
  total=Number(await readContract.totalMinted());
  document.querySelector('[data-total]').textContent=total.toLocaleString();
  status.textContent='Loading metadata and calculating rarity…';
  const concurrency=12;
  for(let start=1;start<=total;start+=concurrency){
    const ids=Array.from({length:Math.min(concurrency,total-start+1)},(_,i)=>start+i);
    const batch=await Promise.all(ids.map(id=>metadata(id)));
    allItems.push(...batch);
    status.textContent=`Loading metadata… ${allItems.length} of ${total}`;
  }
  calculateRarity(allItems);
  loadMore.disabled=false;
  render();
}

document.addEventListener('DOMContentLoaded',()=>{
  initNav();
  loadMore.onclick=()=>{visibleCount+=PAGE;render()};
  rarityFilter.onchange=()=>{visibleCount=PAGE;render()};
  searchInput.oninput=()=>{visibleCount=PAGE;render()};
  loadAll().catch(e=>status.textContent=e.message);
});
