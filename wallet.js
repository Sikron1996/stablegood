import { createAppKit } from '@reown/appkit/react';
import { EthersAdapter } from '@reown/appkit-adapter-ethers';
import { BrowserProvider } from 'ethers';
import { CONFIG } from './config.js';

// Same Stable Mainnet definition and AppKit initialization used by the
// working Stable Punks website.
export const stableMainnet = {
  id: 988,
  caipNetworkId: 'eip155:988',
  chainNamespace: 'eip155',
  name: 'Stable Mainnet',
  nativeCurrency: {
    name: 'USDT0',
    symbol: 'USDT0',
    decimals: 18
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.stable.xyz']
    }
  },
  blockExplorers: {
    default: {
      name: 'StableScan',
      url: 'https://stablescan.xyz'
    }
  }
};

// This is the Project ID from the working Stable Punks repository.
const projectId = '4f71172824a0ea69b0270161482356fe';

const metadata = {
  name: 'Stable Good',
  description: 'Mint Stable Good on Stable Mainnet',
  url: typeof window !== 'undefined' ? window.location.origin : 'https://stable-good.vercel.app',
  icons: [
    typeof window !== 'undefined'
      ? `${window.location.origin}/assets/images/stable-good-04.png`
      : 'https://stable-good.vercel.app/assets/images/stable-good-04.png'
  ]
};

const modal = createAppKit({
  adapters: [new EthersAdapter()],
  networks: [stableMainnet],
  defaultNetwork: stableMainnet,
  projectId,
  metadata,
  themeMode: 'dark',
  themeVariables: {
    '--w3m-accent': '#4f7cff',
    '--w3m-border-radius-master': '3px'
  },
  features: {
    analytics: true,
    email: false,
    socials: []
  }
});

let eipProvider = null;
let currentAddress = null;
const listeners = new Set();

function notify() {
  const state = { address: getAddress(), connected: Boolean(getAddress()) };
  listeners.forEach((listener) => listener(state));
}

modal.subscribeProviders((state) => {
  eipProvider = state.eip155 || null;
  notify();
});

modal.subscribeAccount((state) => {
  currentAddress = state.address || null;
  notify();
});

export function onWalletChange(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getAddress() {
  return currentAddress || modal.getAddress?.() || null;
}

export function hasAppKit() {
  return true;
}

export async function openWallet() {
  await modal.open({
    view: getAddress() ? 'Account' : 'Connect',
    namespace: 'eip155'
  });
}

export async function getBrowserProvider() {
  if (!eipProvider) {
    throw new Error('Connect a wallet first.');
  }

  await ensureStableNetwork(eipProvider);
  return new BrowserProvider(eipProvider);
}

async function ensureStableNetwork(provider) {
  if (!provider?.request) {
    throw new Error('Wallet provider is not available.');
  }

  const currentChain = await provider.request({ method: 'eth_chainId' });
  if (Number.parseInt(currentChain, 16) === CONFIG.chain.chainId) return;

  try {
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: CONFIG.chain.idHex }]
    });
  } catch (error) {
    if (error?.code !== 4902) throw error;

    await provider.request({
      method: 'wallet_addEthereumChain',
      params: [{
        chainId: CONFIG.chain.idHex,
        chainName: CONFIG.chain.name,
        nativeCurrency: {
          name: 'USDT0',
          symbol: 'USDT0',
          decimals: 18
        },
        rpcUrls: [CONFIG.chain.rpcUrl],
        blockExplorerUrls: [CONFIG.chain.explorerUrl]
      }]
    });
  }
}
