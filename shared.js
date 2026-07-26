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
  '/assets/images/stable-good-01.jpeg','/assets/images/stable-good-02.jpeg',
  '/assets/images/stable-good-03.png','/assets/images/stable-good-04.png',
  '/assets/images/stable-good-05.png','/assets/images/stable-good-06.png',
  '/assets/images/stable-good-07.png','/assets/images/stable-good-08.png',
  '/assets/images/stable-good-09.png','/assets/images/stable-good-10.png'
];

const metadataCache = new Map();
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g,ch=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'
})[ch]);

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
  ensureNftModal();
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
  try{
    const u=new URL(value);
    const m=u.hostname.match(/^([a-z0-9]+)\.ipfs\./i);
    if(m){
      const ipfsPath=`${m[1]}${u.pathname}`.replace(/^\/+/, '');
      return IPFS_GATEWAYS.map(g=>g+ipfsPath);
    }
  }catch{}
  if(/^https?:\/\//i.test(value)) return [value];
  if(base){try{return [new URL(value, base).href]}catch{}}
  return [value];
}

async function fetchJsonFrom(uri){
  let lastError;
  for(const url of ipfsCandidates(uri)){
    try{
      const res=await fetch(url,{cache:'force-cache'});
      if(!res.ok) throw new Error(`HTTP ${res.status}`);
      return {json:await res.json(),sourceUrl:url};
    }catch(e){lastError=e}
  }
  throw lastError || new Error('Metadata unavailable');
}

export async function metadata(id){
  const tokenId=Number(id);
  if(metadataCache.has(tokenId)) return metadataCache.get(tokenId);
  const job=(async()=>{
    const fallbackImage=collectionImage(tokenId);
    const uris=[];
    try{const chainUri=await readContract.tokenURI(tokenId);if(chainUri) uris.push(chainUri)}catch{}
    if(CONFIG.metadataBaseUrl) uris.push(`${CONFIG.metadataBaseUrl}${tokenId}.json`);
    for(const uri of [...new Set(uris)]){
      try{
        const {json:m,sourceUrl}=await fetchJsonFrom(uri);
        const remote=ipfsCandidates(m.image || m.image_url || m.animation_url,sourceUrl);
        return {
          id:tokenId,
          name:m.name || `Stable Good #${tokenId}`,
          description:m.description || '',
          image:remote[0] || fallbackImage,
          imageUrls:[...remote,collectionImage(tokenId),localImage(tokenId)],
          attributes:Array.isArray(m.attributes) ? m.attributes : []
        };
      }catch{}
    }
    return {id:tokenId,name:`Stable Good #${tokenId}`,description:'',image:fallbackImage,imageUrls:[fallbackImage,localImage(tokenId)],attributes:[]};
  })();
  metadataCache.set(tokenId,job);
  return job;
}

export function calculateRarity(items){
  const valid=items.filter(Boolean);
  const total=Math.max(1,valid.length);
  const counts=new Map();
  valid.forEach(item=>(item.attributes||[]).forEach(attr=>{
    const key=`${String(attr.trait_type||'Trait')}::${String(attr.value)}`;
    counts.set(key,(counts.get(key)||0)+1);
  }));
  valid.forEach(item=>{
    const attrs=item.attributes||[];
    item.rarityScore=attrs.reduce((sum,attr)=>{
      const key=`${String(attr.trait_type||'Trait')}::${String(attr.value)}`;
      return sum + total/Math.max(1,counts.get(key)||1);
    },0);
  });
  const ranked=[...valid].sort((a,b)=>(b.rarityScore||0)-(a.rarityScore||0));
  ranked.forEach((item,index)=>{
    item.rarityRank=index+1;
    const pct=(index+1)/total;
    item.rarityTier=pct<=.05?'Legendary':pct<=.20?'Epic':pct<=.50?'Rare':'Common';
  });
  return valid;
}

function ensureNftModal(){
  if(document.getElementById('nftModal')) return;
  const modal=document.createElement('div');
  modal.id='nftModal';modal.className='nft-modal';modal.setAttribute('aria-hidden','true');
  modal.innerHTML=`<div class="nft-modal-backdrop" data-close-modal></div><section class="nft-modal-panel" role="dialog" aria-modal="true"><button class="modal-close" data-close-modal aria-label="Close">×</button><div class="modal-media"><img id="modalNftImage" alt="NFT artwork"></div><div class="modal-content"><div class="modal-kicker" id="modalRarity"></div><h2 id="modalNftName"></h2><p id="modalDescription" class="modal-description"></p><div class="modal-meta"><span id="modalTokenId"></span><span id="modalRank"></span></div><h3>Attributes</h3><div class="attribute-grid" id="modalAttributes"></div></div></section>`;
  document.body.appendChild(modal);
  modal.querySelectorAll('[data-close-modal]').forEach(el=>el.onclick=closeNftModal);
  document.addEventListener('keydown',e=>{if(e.key==='Escape') closeNftModal()});
}
function closeNftModal(){
  const modal=document.getElementById('nftModal');if(!modal)return;
  modal.classList.remove('open');modal.setAttribute('aria-hidden','true');document.body.classList.remove('modal-open');
}
export function openNftModal(m){
  ensureNftModal();
  const modal=document.getElementById('nftModal');
  document.getElementById('modalNftName').textContent=m.name || `Stable Good #${m.id}`;
  document.getElementById('modalDescription').textContent=m.description || 'Stable Good NFT on Stable Mainnet.';
  document.getElementById('modalTokenId').textContent=`Token #${m.id}`;
  document.getElementById('modalRank').textContent=m.rarityRank ? `Rarity rank #${m.rarityRank}` : '';
  const tier=m.rarityTier || 'Unranked';
  const rarity=document.getElementById('modalRarity');rarity.textContent=tier;rarity.dataset.tier=tier.toLowerCase();
  const attrs=document.getElementById('modalAttributes');
  attrs.innerHTML=(m.attributes||[]).length ? m.attributes.map(a=>`<div class="attribute"><small>${escapeHtml(a.trait_type||'Trait')}</small><strong>${escapeHtml(a.value)}</strong></div>`).join('') : '<div class="no-attributes">No attributes available.</div>';
  const img=document.getElementById('modalNftImage');
  const urls=[...(m.imageUrls||[]),m.image,localImage(m.id)].filter(Boolean);let i=0;
  img.onerror=()=>{if(i<urls.length)img.src=urls[i++]};img.src=urls[i++]||localImage(m.id);
  modal.classList.add('open');modal.setAttribute('aria-hidden','false');document.body.classList.add('modal-open');
}

export function nftCard(m){
  const a=document.createElement('article');
  a.className='nft-card reveal-card';a.tabIndex=0;a.setAttribute('role','button');a.setAttribute('aria-label',`Open ${m.name || `NFT #${m.id}`}`);
  const rawName=String(m.name || `Stable Good #${m.id}`);
  const safeName=escapeHtml(rawName);
  const alreadyHasId=new RegExp(`#\\s*${m.id}(?:\\D|$)`).test(rawName);
  const idLabel=alreadyHasId ? '' : `<small>#${m.id}</small>`;
  const rarity=m.rarityTier ? `<span class="rarity-badge ${m.rarityTier.toLowerCase()}">${m.rarityTier}</span>` : '';
  a.innerHTML=`<div class="nft-image-wrap"><img loading="lazy" alt="${safeName}">${rarity}</div><div class="label"><span>${safeName}</span>${idLabel}</div>`;
  const img=a.querySelector('img');
  const candidates=[...(m.imageUrls?.length ? m.imageUrls : [m.image]),localImage(m.id)].filter(Boolean);
  const unique=[...new Set(candidates)];let index=0;
  const next=()=>{if(index<unique.length){img.src=unique[index++];return}img.removeAttribute('src');img.alt='Image unavailable';img.parentElement.classList.add('image-unavailable');img.parentElement.innerHTML='<div class="image-fallback">Stable Good<br><small>Image unavailable</small></div>'};
  img.addEventListener('error',next);next();
  const open=()=>openNftModal(m);a.onclick=open;a.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open()}};
  return a;
}
