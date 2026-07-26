import { Contract, formatEther } from 'ethers';
import { CONFIG } from './config.js'; import { ABI } from './abi.js';
import { initNav, readContract } from './shared.js'; import { getAddress, getBrowserProvider, onWalletChange, openWallet } from './wallet.js';
let qty=1, walletMinted=0;
const $=id=>document.getElementById(id);
function status(t,bad=false){$('status').textContent=t;$('status').classList.toggle('bad',bad)}
async function quote(){
 const a=getAddress(); let cost;
 try{cost=a?await readContract.mintCost(a,qty):BigInt(qty)*20000000000000000n}catch{cost=0n}
 $('qtyValue').textContent=qty; $('totalPrice').textContent=`${formatEther(cost)} USDT0`;
 $('priceNote').textContent=a?`${Math.max(0,10-walletMinted)} discounted mint(s) remaining for this wallet`:'Connect wallet for exact on-chain quote';
}
async function refresh(){
 try{
  const [supply,enabled]=await Promise.all([readContract.totalMinted(),readContract.mintEnabled()]);
  document.querySelectorAll('[data-supply]').forEach(e=>e.textContent=Number(supply).toLocaleString());
  $('progressBar').style.width=`${Math.min(100,Number(supply)/CONFIG.maxSupply*100)}%`;
  $('mintBtn').disabled=!enabled; if(!enabled) status('Mint is currently paused.',true);
  const a=getAddress(); if(a){walletMinted=Number(await readContract.mintedByWallet(a));$('walletMinted').textContent=walletMinted;}
  await quote();
 }catch(e){status('Unable to read contract. Check RPC or contract address.',true)}
}
async function mint(){
 try{
  if(!getAddress()){await openWallet();return refresh()}
  const p=await getBrowserProvider(), signer=await p.getSigner(), c=new Contract(CONFIG.contractAddress,ABI,signer);
  const cost=await c.mintCost(await signer.getAddress(),qty); status('Confirm the transaction in your wallet…');
  const tx=await c.mint(qty,{value:cost}); status(`Transaction sent: ${tx.hash.slice(0,12)}…`); await tx.wait();
  status(`Success — ${qty} NFT${qty>1?'s':''} minted.`); await refresh();
 }catch(e){status(e.shortMessage||e.reason||e.message||'Mint failed.',true)}
}
document.addEventListener('DOMContentLoaded',()=>{
 initNav(); $('minus').onclick=()=>{qty=Math.max(1,qty-1);quote()}; $('plus').onclick=()=>{qty=Math.min(50,qty+1);quote()}; $('mintBtn').onclick=mint;
 onWalletChange(refresh); refresh();
 const io=new IntersectionObserver(es=>es.forEach(e=>e.isIntersecting&&e.target.classList.add('visible')),{threshold:.12});document.querySelectorAll('.reveal-card,.info-card').forEach(e=>io.observe(e));
});
