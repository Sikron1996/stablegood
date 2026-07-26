# Stable Good — complete website

## Included
- Reown AppKit / WalletConnect support
- Injected wallet fallback
- Exact on-chain mint quote via `mintCost`
- Animated dark-blue design
- IPFS gallery
- My Collection ownership scanner
- Marketplace Coming Soon
- Clean URLs without `.html`

## Required once
Open `config.js` and replace `PASTE_REOWN_PROJECT_ID_HERE` with your Reown AppKit Project ID. The Project ID is required for WalletConnect and the full wallet list. Without it, browser wallets such as MetaMask still work.

## Run
```bash
npm install
npm run dev
```

## Deploy to Vercel
Upload the folder to GitHub, then import it into Vercel. Build command: `npm run build`; output folder: `dist`.


## Reown fix
Both `@reown/appkit` and `@reown/appkit-adapter-ethers` are pinned to `1.8.20` to prevent the empty Connect Wallet modal caused by package-version mismatch.

## Wallet connection fix
The wallet module now uses the same Reown/AppKit network definition, initialization pattern, and WalletConnect Project ID as the working Stable Punks repository. The Stable Good contract remains `0xe5870CAadd0C0d0F841f45E8c5a173acF938E2D1`.
