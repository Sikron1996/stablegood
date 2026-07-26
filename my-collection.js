import { Contract } from 'ethers';
import { CONFIG } from './config.js';
import { ABI } from './abi.js';
import { initNav, rpc, metadata, nftCard, calculateRarity } from './shared.js';
import { getAddress, openWallet, onWalletChange } from './wallet.js';

const grid=document.getElementById('myGrid');
const state=document.getElementById('myState');
const rarityFilter=document.getElementById('myRarityFilter');
const searchInput=document.getElementById('mySearch');
let runId=0, ownedItems=[];

function renderMine(){
  const rarity=rarityFilter.value,q=searchInput.value.trim().toLowerCase();
  const filtered=ownedItems.filter(item=>(rarity==='all'||item.rarityTier===rarity)&&(!q||String(item.id).includes(q)||item.name.toLowerCase().includes(q)||(item.attributes||[]).some(a=>`${a.trait_type} ${a.value}`.toLowerCase().includes(q))));
  grid.innerHTML='';filtered.forEach(item=>grid.appendChild(nftCard(item)));
  state.textContent=`${ownedItems.length} NFT${ownedItems.length===1?'':'s'} owned · ${filtered.length} shown`;
}

async function loadMine(){
  const thisRun=++runId;grid.innerHTML='';ownedItems=[];
  const address=getAddress();
  if(!address){state.textContent='Connect your wallet to load NFTs you currently own.';document.getElementById('connectMine').style.display='inline-flex';return}
  document.getElementById('connectMine').style.display='none';
  const c=new Contract(CONFIG.contractAddress, ABI, rpc);
  let balance=0,total=0;
  try{[balance,total]=await Promise.all([c.balanceOf(address).then(Number),c.totalMinted().then(Number)])}catch{state.textContent='Could not read the collection from Stable Mainnet. Please try again.';return}
  if(thisRun!==runId)return;
  if(balance===0){state.textContent='No Stable Good NFTs found in this wallet.';return}
  state.textContent=`Finding your ${balance} NFT${balance===1?'':'s'}…`;
  const ownedIds=[],wallet=address.toLowerCase(),concurrency=20;
  for(let start=1;start<=total&&ownedIds.length<balance;start+=concurrency){
    if(thisRun!==runId)return;
    const end=Math.min(total,start+concurrency-1);
    const ids=Array.from({length:end-start+1},(_,i)=>start+i);
    const owners=await Promise.all(ids.map(async tokenId=>{try{return {tokenId,owner:(await c.ownerOf(tokenId)).toLowerCase()}}catch{return null}}));
    owners.forEach(item=>{if(item?.owner===wallet)ownedIds.push(item.tokenId)});
    state.textContent=`Finding your NFTs… scanned ${end} of ${total}`;
  }
  if(thisRun!==runId)return;
  state.textContent='Loading collection rarity data…';
  const all=[];
  for(let start=1;start<=total;start+=12){
    const ids=Array.from({length:Math.min(12,total-start+1)},(_,i)=>start+i);
    all.push(...await Promise.all(ids.map(id=>metadata(id))));
    if(thisRun!==runId)return;
  }
  calculateRarity(all);
  const byId=new Map(all.map(item=>[item.id,item]));
  ownedItems=ownedIds.map(id=>byId.get(id)).filter(Boolean);
  renderMine();
}

document.addEventListener('DOMContentLoaded',()=>{
  initNav();document.getElementById('connectMine').onclick=openWallet;
  rarityFilter.onchange=renderMine;searchInput.oninput=renderMine;
  onWalletChange(loadMine);loadMine();
});
