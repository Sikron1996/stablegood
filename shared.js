import { JsonRpcProvider, Contract } from 'ethers';
import { CONFIG } from './config.js';
import { ABI } from './abi.js';
import { openWallet, getAddress, onWalletChange } from './wallet.js';

export const rpc = new JsonRpcProvider(CONFIG.chain.rpcUrl);
export const readContract = new Contract(CONFIG.contractAddress, ABI, rpc);
export const short = a => a ? `${a.slice(0,6)}…${a.slice(-4)}` : 'Connect Wallet';

const IPFS_GATEWAYS = [
  'https://gateway.pinata.cloud/ipfs/',
  'https://cloudflare-ipfs.com/ipfs/',
  'https://ipfs.io/ipfs/',
  'https://dweb.link/ipfs/'
];

export function initNav(){
  document.querySelectorAll('[data-wallet]').forEach(btn=>{
    btn.textContent=short(getAddress());
    btn.onclick=async()=>{try{await openWallet()}catch(e){alert(e.message)}};
  });
  onWalletChange(({address})=>document.querySelectorAll('[data-wallet]').forEach(b=>b.textContent=short(address)));
}

function extractIpfsPath(uri=''){
  if(uri.startsWith('ipfs://ipfs/')) return uri.slice(12);
  if(uri.startsWith('ipfs://')) return uri.slice(7);
  const match=uri.match(/\/ipfs\/([^?#]+)/i);
  return match ? match[1] : null;
}

export function ipfsCandidates(uri, base=''){
  if(!uri) return [];
  const value=String(uri).trim();
  if(value.startsWith('data:') || value.startsWith('blob:')) return [value];

  const path=extractIpfsPath(value);
  if(path) return IPFS_GATEWAYS.map(g=>g+path);

  if(/^https?:\/\//i.test(value)) return [value];

  if(base){
    try{return [new URL(value, base).href]}catch{}
  }
  return [value];
}

export function ipfs(uri, base=''){
  return ipfsCandidates(uri, base)[0] || '';
}

async function fetchJson(uri){
  const urls=ipfsCandidates(uri);
  let lastError;
  for(const url of urls){
    try{
      const res=await fetch(url, {cache:'no-store'});
      if(!res.ok) throw new Error(`HTTP ${res.status}`);
      return {json:await res.json(), sourceUrl:url};
    }catch(e){lastError=e}
  }
  throw lastError || new Error('Metadata unavailable');
}

export async function metadata(id){
  let uri;
  try{uri=await readContract.tokenURI(id)}catch{uri=`${CONFIG.metadataBaseUrl}${id}.json`}
  const {json:m, sourceUrl}=await fetchJson(uri);
  const imageUrls=ipfsCandidates(m.image || m.image_url || m.animation_url, sourceUrl);
  return {
    id,
    name:m.name || `Stable Good #${id}`,
    image:imageUrls[0] || '',
    imageUrls,
    attributes:m.attributes || []
  };
}

export function nftCard(m){
  const a=document.createElement('article');
  a.className='nft-card reveal-card';
  const safeName=String(m.name || `Stable Good #${m.id}`).replace(/[&<>"']/g, ch=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'
  })[ch]);
  a.innerHTML=`<div class="nft-image-wrap"><img loading="lazy" alt="${safeName}"></div><div class="label"><span>${safeName}</span><small>#${m.id}</small></div>`;

  const img=a.querySelector('img');
  const candidates=(m.imageUrls?.length ? m.imageUrls : [m.image]).filter(Boolean);
  let index=0;
  const next=()=>{
    if(index<candidates.length){img.src=candidates[index++];return}
    img.removeAttribute('src');
    img.alt='Image unavailable';
    img.parentElement.classList.add('image-unavailable');
    img.parentElement.innerHTML='<div class="image-fallback">Stable Good<br><small>Image unavailable</small></div>';
  };
  img.addEventListener('error', next);
  next();
  return a;
}
