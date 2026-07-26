import { JsonRpcProvider, Contract } from 'ethers';
import { CONFIG } from './config.js';
import { ABI } from './abi.js';
import { openWallet, getAddress, onWalletChange } from './wallet.js';
export const rpc = new JsonRpcProvider(CONFIG.chain.rpcUrl);
export const readContract = new Contract(CONFIG.contractAddress, ABI, rpc);
export const short = a => a ? `${a.slice(0,6)}…${a.slice(-4)}` : 'Connect Wallet';
export function initNav(){
  document.querySelectorAll('[data-wallet]').forEach(btn=>{
    btn.textContent=short(getAddress()); btn.onclick=async()=>{try{await openWallet()}catch(e){alert(e.message)}};
  });
  onWalletChange(({address})=>document.querySelectorAll('[data-wallet]').forEach(b=>b.textContent=short(address)));
}
export function ipfs(uri){ return uri?.startsWith('ipfs://') ? `https://ipfs.io/ipfs/${uri.slice(7)}` : uri; }
export async function metadata(id){
  let uri;
  try{ uri=await readContract.tokenURI(id); }catch{ uri=`${CONFIG.metadataBaseUrl}${id}.json`; }
  const res=await fetch(ipfs(uri)); if(!res.ok) throw new Error('Metadata unavailable');
  const m=await res.json(); return {id,name:m.name||`Stable Good #${id}`,image:ipfs(m.image),attributes:m.attributes||[]};
}
export function nftCard(m){
  const a=document.createElement('article'); a.className='nft-card reveal-card';
  a.innerHTML=`<div class="nft-image-wrap"><img loading="lazy" src="${m.image}" alt="${m.name}"></div><div class="label"><span>${m.name}</span><small>#${m.id}</small></div>`;
  return a;
}
