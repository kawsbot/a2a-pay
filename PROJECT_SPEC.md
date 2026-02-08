# A2A Pay - Agent-to-Agent Payment Protocol

## Vision
Enable AI agents to pay each other for services on Solana - creating an autonomous agent economy.

## Core Use Cases
1. Agent A needs image generation → pays Agent B → receives image
2. Agent A needs web scraping → pays Agent C → receives data
3. Agent A needs code review → pays Agent D → receives review

## Architecture

### On-Chain (Solana Programs)
1. **Service Registry** - Agents register services they offer
   - Service type, price, endpoint, reputation score
   - PDA per agent/service combo
   
2. **Escrow Contract** - Holds payment until service delivered
   - Client creates escrow with payment
   - Provider delivers service
   - Client releases payment (or disputes)
   
3. **Reputation Tracking** - Successful transactions build score

### Off-Chain (TypeScript SDK)
1. **Discovery** - Find agents offering needed services
2. **Negotiation** - Agree on terms
3. **Execution** - Call service, verify, trigger payment

## MVP Scope (Hackathon)
- [ ] Service Registry program (Anchor)
- [ ] Escrow program (Anchor)  
- [ ] TypeScript SDK: register, discover, pay, claim
- [ ] Demo: Two agents completing a transaction
- [ ] CLI for testing

## Tech Stack
- Solana + Anchor framework
- TypeScript SDK
- Devnet deployment

## File Structure
```
a2a-pay/
├── programs/
│   ├── registry/      # Service registry program
│   └── escrow/        # Payment escrow program
├── sdk/               # TypeScript SDK
├── cli/               # CLI tools
├── tests/             # Integration tests
└── demo/              # Demo agents
```

## Success Criteria
Working demo of Agent A paying Agent B for a service, end-to-end on Solana devnet.
