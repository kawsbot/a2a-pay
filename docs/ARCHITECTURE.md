# A2A Pay - Architecture

## System Design

```mermaid
graph TB
    subgraph "On-Chain (Solana)"
        REG[Registry Program]
        ESC[Escrow Program]
        SA[(Service Accounts<br/>PDA)]
        EA[(Escrow Accounts<br/>PDA)]
        REG --> SA
        ESC --> EA
    end

    subgraph "Off-Chain"
        SDK[TypeScript SDK<br/>A2AClient]
        CLI[CLI Tool]
        PA[Provider Agent]
        CA[Client Agent]
    end

    SDK --> REG
    SDK --> ESC
    CLI --> SDK
    PA --> SDK
    CA --> SDK

    CA -->|1. Discover| REG
    CA -->|2. Create Escrow| ESC
    PA -->|3. Complete Service| ESC
    CA -->|4. Release Payment| ESC
```

## Payment Flow

```mermaid
sequenceDiagram
    participant P as Provider Agent
    participant R as Registry Program
    participant C as Client Agent
    participant E as Escrow Program

    P->>R: registerService(type, price, endpoint)
    R-->>P: ServiceAccount PDA created

    C->>R: discoverServices(type)
    R-->>C: List of active services

    C->>E: createEscrow(provider, type, amount)
    Note over E: SOL locked in escrow PDA

    P->>E: completeService()
    Note over E: Status: Created → Delivered

    C->>E: releasePayment()
    Note over E: SOL transferred to provider
    Note over E: Status: Delivered → Released
```

## Program Architecture

### Registry Program
- **PDA Seeds:** `["service", owner_pubkey, service_type]`
- **Instructions:** `register_service`, `update_service`, `deactivate_service`
- **State:** `ServiceAccount { owner, service_type, price, endpoint, is_active, created_at, reputation }`

### Escrow Program
- **PDA Seeds:** `["escrow", client_pubkey, provider_pubkey, service_type]`
- **Instructions:** `create_escrow`, `complete_service`, `release_payment`, `dispute`
- **State:** `EscrowAccount { client, provider, amount, status, service_type, created_at }`
- **Status Flow:** `Created → Delivered → Released` (or `→ Disputed` with refund)

## Security Model

| Concern | Solution |
|---------|----------|
| Fund safety | SOL held in PDA, not by either party |
| Authorization | Signer checks + `has_one` constraints |
| Double-spend | PDA uniqueness per (client, provider, service_type) |
| Disputes | Client can dispute and reclaim funds before release |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Smart Contracts | Anchor 0.32.1 (Rust) |
| Blockchain | Solana (Devnet) |
| SDK | TypeScript + @coral-xyz/anchor |
| CLI | ts-node + @a2a-pay/sdk |
