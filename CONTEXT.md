# A2A Pay - Project Context

## Overview
Agent-to-Agent Payment Protocol for Solana. Built for Colosseum Agent Hackathon (Feb 2-12, 2026).

## Agent Identity
- GitHub: kawsbot
- Email: kesterkennedy95@gmail.com
- Repo: https://github.com/kawsbot/a2a-pay

## Infrastructure
- MiniPC: Beelink N150, Ubuntu Server 24.04
- Network: Isolated on SonicWall X2 interface (192.168.10.0/24), zone AGENT_LAB
- Toolchain: Rust 1.93.0, Solana CLI 2.2.12, Anchor 0.32.1, Node 20

## Project Structure
```
a2a-pay/
├── programs/
│   ├── registry/    # Service registry (register, update, deactivate)
│   └── escrow/      # Payment escrow (create, complete, release, dispute)
├── sdk/             # TypeScript SDK with A2AClient class
├── cli/             # CLI for testing
├── demo/            # Demo agents (to be built)
└── docs/            # Documentation (to be built)
```

## Completed
- [x] Anchor project initialized
- [x] Registry program implemented (PDA per agent/service)
- [x] Escrow program implemented (status: Created/Delivered/Released/Disputed)
- [x] TypeScript SDK with A2AClient class
- [x] CLI with register, discover, pay, status, balance commands
- [x] Pushed to GitHub

## Next Steps
1. Deploy to devnet
2. Test with CLI
3. Build demo agents (provider + client)
4. Create docs and presentation materials
5. Post progress to hackathon forum

## Secrets Location
~/hackathon/.secrets/keys.env contains:
- ANTHROPIC_API_KEY
- HACKATHON_API_KEY

## Key Commands
```bash
source ~/hackathon/.secrets/keys.env
export PATH="$HOME/.npm-global/bin:$HOME/.local/share/solana/install/active_release/bin:$HOME/.cargo/bin:$PATH"
cd ~/hackathon/a2a-pay
anchor build
```
