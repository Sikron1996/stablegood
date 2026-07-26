import { createAppKit } from '@reown/appkit';
import { EthersAdapter } from '@reown/appkit-adapter-ethers';
import { BrowserProvider } from 'ethers';
import { CONFIG } from './config.js';

const stable = {
  chainId: CONFIG.chain.chainId,
  name: CONFIG.chain.name,
  currency: CONFIG.chain.currency,
  explorerUrl: CONFIG.chain.explorerUrl,
  rpcUrl: CONFIG.chain.rpcUrl
};

let modal = null;
let eipProvider = null;
let currentAddress = null;
const configured = CONFIG.reownProjectId && !CONFIG.reownProjectId.includes('PASTE_');

if (configured) {
  modal = createAppKit({
    adapters: [new EthersAdapter()],
    networks: [stable],
    defaultNetwork: stable,
    projectId: CONFIG.reownProjectId,
    metadata: {
      name: 'Stable Good',
      description: 'Mint Stable Good on Stable Mainnet',
      url: window.location.origin,
      icons: [`${window.location.origin}/assets/images/stable-good-04.png`]
    },
    themeMode: 'dark',
    themeVariables: {
      '--w3m-accent': '#4f7cff',
      '--w3m-border-radius-master': '3px'
    },
    features: { analytics: true, swaps: false, onramp: false }
  });
  modal.subscribeProviders((state) => {
    eipProvider = state.eip155 || null;
    notify();
  });
  modal.subscribeAccount((state) => {
    currentAddress = state.address || null;
    notify();
  });
}

const listeners = new Set();
function notify(){ listeners.forEach(fn => fn({address:getAddress(), connected:!!getAddress()})); }
export function onWalletChange(fn){ listeners.add(fn); return ()=>listeners.delete(fn); }
export function getAddress(){ return currentAddress || modal?.getAddress?.() || null; }
export function hasAppKit(){ return configured; }
export async function openWallet(){
  if(modal){ await modal.open({view:getAddress()?'Account':'Connect',namespace:'eip155'}); return; }
  if(!window.ethereum) throw new Error('Reown Project ID is not configured and no browser wallet was found.');
  await ensureInjectedChain();
  const p = new BrowserProvider(window.ethereum);
  await p.send('eth_requestAccounts',[]);
  currentAddress = await (await p.getSigner()).getAddress();
  eipProvider = window.ethereum;
  notify();
}
export async function getBrowserProvider(){
  if(eipProvider) return new BrowserProvider(eipProvider);
  if(window.ethereum){ await ensureInjectedChain(); return new BrowserProvider(window.ethereum); }
  throw new Error('Connect a wallet first.');
}
async function ensureInjectedChain(){
  const current=await window.ethereum.request({method:'eth_chainId'});
  if(current.toLowerCase()===CONFIG.chain.idHex) return;
  try{ await window.ethereum.request({method:'wallet_switchEthereumChain',params:[{chainId:CONFIG.chain.idHex}]}); }
  catch(e){
    if(e.code!==4902) throw e;
    await window.ethereum.request({method:'wallet_addEthereumChain',params:[{
      chainId:CONFIG.chain.idHex,chainName:CONFIG.chain.name,rpcUrls:[CONFIG.chain.rpcUrl],
      blockExplorerUrls:[CONFIG.chain.explorerUrl],nativeCurrency:{name:'USDT0',symbol:'USDT0',decimals:18}
    }]});
  }
}
