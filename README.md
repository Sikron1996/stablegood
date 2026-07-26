# Stable Good — IPFS final fix

This build uses the confirmed live IPFS locations:

- Metadata CID: `bafybeiamrl7y7jczjvkbauv4aui2mlgwrzwl25us5a4egxnu5fnsf63rmm`
- Image CID: `QmUXNYi5onWMixkEWnfdaoFB68DnfsMHJ25Fbrqc7HjYsf`

It avoids the `ipfs.inbrowser.link` metadata endpoint in browser fetches and uses Pinata path-gateway URLs, with several public gateway fallbacks. Gallery and My Collection also construct the confirmed image URL directly as `<image CID>/<tokenId>.png`.
