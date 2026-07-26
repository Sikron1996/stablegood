import { Contract } from 'ethers';
import { CONFIG } from './config.js';
import { ABI } from './abi.js';
import { initNav, rpc, metadata, nftCard } from './shared.js';
import { getAddress, openWallet, onWalletChange } from './wallet.js';

const grid=document.getElementById('myGrid');
const state=document.getElementById('myState');
let runId=0;

async function loadMine(){
  const thisRun=++runId;
  grid.innerHTML='';
  const address=getAddress();

  if(!address){
    state.textContent='Connect your wallet to load NFTs you currently own.';
    document.getElementById('connectMine').style.display='inline-flex';
    return;
  }

  document.getElementById('connectMine').style.display='none';
  const c=new Contract(CONFIG.contractAddress, ABI, rpc);

  let balance=0;
  let total=0;
  try{
    [balance,total]=await Promise.all([
      c.balanceOf(address).then(Number),
      c.totalMinted().then(Number)
    ]);
  }catch(e){
    state.textContent='Could not read the collection from Stable Mainnet. Please try again.';
    return;
  }

  if(thisRun!==runId) return;
  if(balance===0){
    state.textContent='No Stable Good NFTs found in this wallet.';
    return;
  }

  state.textContent=`Finding your ${balance} NFT${balance===1?'':'s'}…`;
  const owned=[];
  const wallet=address.toLowerCase();
  const concurrency=20;

  for(let start=1; start<=total && owned.length<balance; start+=concurrency){
    if(thisRun!==runId) return;
    const end=Math.min(total,start+concurrency-1);
    const ids=Array.from({length:end-start+1},(_,i)=>start+i);
    const owners=await Promise.all(ids.map(async tokenId=>{
      try{return {tokenId,owner:(await c.ownerOf(tokenId)).toLowerCase()}}
      catch{return null}
    }));
    owners.forEach(item=>{if(item?.owner===wallet) owned.push(item.tokenId)});
    state.textContent=`Finding your NFTs… scanned ${end} of ${total}`;
  }

  if(thisRun!==runId) return;
  state.textContent=`${owned.length} NFT${owned.length===1?'':'s'} owned`;

  for(const tokenId of owned){
    try{
      const m=await metadata(tokenId);
      if(thisRun!==runId) return;
      grid.appendChild(nftCard(m));
    }catch{
      grid.appendChild(nftCard({id:tokenId,name:`Stable Good #${tokenId}`}));
    }
  }
}

document.addEventListener('DOMContentLoaded',()=>{
  initNav();
  document.getElementById('connectMine').onclick=openWallet;
  onWalletChange(loadMine);
  loadMine();
});
