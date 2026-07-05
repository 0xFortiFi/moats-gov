import { createAppKit } from '@reown/appkit/react'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { mainnet, arbitrum, base, avalanche, type AppKitNetwork } from '@reown/appkit/networks'

const projectId = 'b0b7a10495f7fda2a491ab6b4118c214'
const networks: [AppKitNetwork, ...AppKitNetwork[]] = [avalanche, mainnet, arbitrum, base]
const metadata = {
  name: 'Moats App Governance',
  description: 'Decentralized governance powered by Moat Points',
  url: typeof window !== 'undefined' ? window.location.origin : '',
  icons: []
}
export const wagmiAdapter = new WagmiAdapter({ networks, projectId })
export const appKit = createAppKit({
  adapters: [wagmiAdapter],
  networks,
  projectId,
  metadata,
  features: { analytics: false },
  themeMode: 'dark'
})
