import { Contract, id, zeroPadValue } from 'ethers'; import { CONFIG } from './config.js'; import { ABI } from './abi.js';
import { initNav, rpc, metadata, nftCard } from './shared.js'; import { getAddress, openWallet, onWalletChange } from './wallet.js';
const grid=document.getElementById('myGrid'), state=document.getElementById('myState');
async function loadMine(){
 grid.innerHTML=''; let a=getAddress(); if(!a){state.innerHTML='Connect your wallet to load NFTs you currently own.';document.getElementById('connectMine').style.display='inline-flex';return}
 document.getElementById('connectMine').style.display='none'; state.textContent='Scanning ownership history…';
 const c=new Contract(CONFIG.contractAddress,ABI,rpc); const topic=id('Transfer(address,address,uint256)');
 let logs=[]; try{logs=await rpc.getLogs({address:CONFIG.contractAddress,fromBlock:0,toBlock:'latest',topics:[topic,null,zeroPadValue(a,32)]})}catch(e){state.textContent='The RPC could not scan the full history. Try again shortly.';return}
 const ids=[...new Set(logs.map(l=>Number(BigInt(l.topics[3]))))]; const owned=[];
 for(const tokenId of ids){try{if((await c.ownerOf(tokenId)).toLowerCase()===a.toLowerCase()) owned.push(tokenId)}catch{}}
 state.textContent=owned.length?`${owned.length} NFT${owned.length>1?'s':''} owned`:'No Stable Good NFTs found in this wallet.';
 const ms=await Promise.all(owned.map(async tokenId=>{try{return await metadata(tokenId)}catch{return null}}));ms.filter(Boolean).forEach(m=>grid.appendChild(nftCard(m)));
}
document.addEventListener('DOMContentLoaded',()=>{initNav();document.getElementById('connectMine').onclick=openWallet;onWalletChange(loadMine);loadMine()});
