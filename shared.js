import { JsonRpcProvider, Contract } from 'ethers';
import { CONFIG } from './config.js';
import { ABI } from './abi.js';
import { openWallet, getAddress, onWalletChange } from './wallet.js';

export const rpc = new JsonRpcProvider(CONFIG.chain.rpcUrl);
export const readContract = new Contract(CONFIG.contractAddress, ABI, rpc);
export const short = a => a ? `${a.slice(0,6)}…${a.slice(-4)}` : 'Connect Wallet';

const IPFS_GATEWAYS = [
  'https://gateway.pinata.cloud/ipfs/',
  'https://ipfs.io/ipfs/',
  'https://dweb.link/ipfs/',
  'https://w3s.link/ipfs/'
];

const LOCAL_IMAGES = [
  '/assets/images/stable-good-01.jpeg',
  '/assets/images/stable-good-02.jpeg',
  '/assets/images/stable-good-03.png',
  '/assets/images/stable-good-04.png',
  '/assets/images/stable-good-05.png',
  '/assets/images/stable-good-06.png',
  '/assets/images/stable-good-07.png',
  '/assets/images/stable-good-08.png',
  '/assets/images/stable-good-09.png',
  '/assets/images/stable-good-10.png'
];

function localImage(tokenId){
  const id=Math.max(1, Number(tokenId) || 1);
  return LOCAL_IMAGES[(id-1) % LOCAL_IMAGES.length];
}

function collectionImage(tokenId){
  const id=Math.max(1, Number(tokenId) || 1);
  return CONFIG.imageBaseUrl ? `${CONFIG.imageBaseUrl}${id}.png` : localImage(id);
}

export function initNav(){
  document.querySelectorAll('[data-wallet]').forEach(btn=>{
    btn.textContent=short(getAddress());
    btn.onclick=async()=>{try{await openWallet()}catch(e){alert(e.message)}};
  });
  onWalletChange(({address})=>document.querySelectorAll('[data-wallet]').forEach(b=>b.textContent=short(address)));
}

function extractIpfsPath(uri=''){
  const value=String(uri).trim();
  if(value.startsWith('ipfs://ipfs/')) return value.slice(12);
  if(value.startsWith('ipfs://')) return value.slice(7);
  const match=value.match(/\/ipfs\/([^?#]+)/i);
  return match ? match[1] : null;
}

export function ipfsCandidates(uri, base=''){
  if(!uri) return [];
  const value=String(uri).trim();
  if(value.startsWith('data:') || value.startsWith('blob:')) return [value];

  const path=extractIpfsPath(value);
  if(path) return IPFS_GATEWAYS.map(g=>g+path);

  // Convert CID subdomain gateways such as
  // https://<cid>.ipfs.inbrowser.link/1.json into reliable path gateways.
  try{
    const u=new URL(value);
    const m=u.hostname.match(/^([a-z0-9]+)\.ipfs\./i);
    if(m){
      const ipfsPath=`${m[1]}${u.pathname}`.replace(/^\/+/, '');
      return IPFS_GATEWAYS.map(g=>g+ipfsPath);
    }
  }catch{}

  if(/^https?:\/\//i.test(value)) return [value];

  if(base){
    try{return [new URL(value, base).href]}catch{}
  }
  return [value];
}

async function fetchJsonFrom(uri){
  let lastError;
  for(const url of ipfsCandidates(uri)){
    try{
      const res=await fetch(url,{cache:'no-store'});
      if(!res.ok) throw new Error(`HTTP ${res.status}`);
      const text=await res.text();
      return {json:JSON.parse(text),sourceUrl:url};
    }catch(e){lastError=e}
  }
  throw lastError || new Error('Metadata unavailable');
}

export async function metadata(id){
  const fallbackImage=collectionImage(id);
  const uris=[];

  try{
    const chainUri=await readContract.tokenURI(id);
    if(chainUri) uris.push(chainUri);
  }catch{}

  if(CONFIG.metadataBaseUrl){
    uris.push(`${CONFIG.metadataBaseUrl}${id}.json`);
  }

  for(const uri of [...new Set(uris)]){
    try{
      const {json:m,sourceUrl}=await fetchJsonFrom(uri);
      const remote=ipfsCandidates(m.image || m.image_url || m.animation_url,sourceUrl);
      return {
        id,
        name:m.name || `Stable Good #${id}`,
        image:remote[0] || fallbackImage,
        imageUrls:[...remote,collectionImage(id),localImage(id)],
        attributes:m.attributes || []
      };
    }catch{}
  }

  // Metadata is unavailable on IPFS, but the website still displays the
  // collection artwork deterministically for every minted token.
  return {
    id,
    name:`Stable Good #${id}`,
    image:fallbackImage,
    imageUrls:[fallbackImage,localImage(id)],
    attributes:[]
  };
}

export function nftCard(m){
  const a=document.createElement('article');
  a.className='nft-card reveal-card';
  const rawName=String(m.name || `Stable Good #${m.id}`);
  const safeName=rawName.replace(/[&<>"']/g,ch=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'
  })[ch]);
  const alreadyHasId=new RegExp(`#\\s*${m.id}(?:\\D|$)`).test(rawName);
  const idLabel=alreadyHasId ? '' : `<small>#${m.id}</small>`;
  a.innerHTML=`<div class="nft-image-wrap"><img loading="lazy" alt="${safeName}"></div><div class="label"><span>${safeName}</span>${idLabel}</div>`;

  const img=a.querySelector('img');
  const candidates=[...(m.imageUrls?.length ? m.imageUrls : [m.image]),localImage(m.id)].filter(Boolean);
  const unique=[...new Set(candidates)];
  let index=0;
  const next=()=>{
    if(index<unique.length){img.src=unique[index++];return}
    img.removeAttribute('src');
    img.alt='Image unavailable';
    img.parentElement.classList.add('image-unavailable');
    img.parentElement.innerHTML='<div class="image-fallback">Stable Good<br><small>Image unavailable</small></div>';
  };
  img.addEventListener('error',next);
  next();
  return a;
}
