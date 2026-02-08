use anchor_lang::prelude::*;
use anchor_lang::system_program;

declare_id!("CPqN9DNQqXPcfgXaWyTTXoGMxUF2zWGaBkdMAfnf52gR");

#[program]
pub mod escrow {
    use super::*;

    pub fn create_escrow(
        ctx: Context<CreateEscrow>,
        service_type: String,
        amount: u64,
    ) -> Result<()> {
        require!(service_type.len() <= 32, EscrowError::ServiceTypeTooLong);
        require!(amount > 0, EscrowError::InvalidAmount);

        // Transfer lamports from client to escrow PDA
        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.client.to_account_info(),
                    to: ctx.accounts.escrow_account.to_account_info(),
                },
            ),
            amount,
        )?;

        let escrow = &mut ctx.accounts.escrow_account;
        escrow.client = ctx.accounts.client.key();
        escrow.provider = ctx.accounts.provider.key();
        escrow.amount = amount;
        escrow.status = EscrowStatus::Created;
        escrow.service_type = service_type;
        escrow.created_at = Clock::get()?.unix_timestamp;

        msg!(
            "Escrow created: {} -> {} for {} lamports",
            escrow.client,
            escrow.provider,
            amount
        );
        Ok(())
    }

    pub fn complete_service(ctx: Context<ProviderAction>) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow_account;
        require!(
            escrow.status == EscrowStatus::Created,
            EscrowError::InvalidStatus
        );

        escrow.status = EscrowStatus::Delivered;
        msg!("Service marked delivered by provider {}", escrow.provider);
        Ok(())
    }

    pub fn release_payment(ctx: Context<ClientAction>) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow_account;
        require!(
            escrow.status == EscrowStatus::Delivered,
            EscrowError::InvalidStatus
        );

        let amount = escrow.amount;
        escrow.status = EscrowStatus::Released;

        // Transfer from escrow PDA to provider
        **escrow.to_account_info().try_borrow_mut_lamports()? -= amount;
        **ctx
            .accounts
            .provider
            .to_account_info()
            .try_borrow_mut_lamports()? += amount;

        msg!("Payment of {} lamports released to {}", amount, escrow.provider);
        Ok(())
    }

    pub fn dispute(ctx: Context<ClientAction>) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow_account;
        require!(
            escrow.status == EscrowStatus::Created
                || escrow.status == EscrowStatus::Delivered,
            EscrowError::InvalidStatus
        );

        let amount = escrow.amount;
        escrow.status = EscrowStatus::Disputed;

        // Refund client
        **escrow.to_account_info().try_borrow_mut_lamports()? -= amount;
        **ctx
            .accounts
            .client
            .to_account_info()
            .try_borrow_mut_lamports()? += amount;

        msg!("Escrow disputed, {} lamports refunded to {}", amount, escrow.client);
        Ok(())
    }
}

// -- Accounts structs --

#[derive(Accounts)]
#[instruction(service_type: String)]
pub struct CreateEscrow<'info> {
    #[account(
        init,
        payer = client,
        space = EscrowAccount::space(&service_type),
        seeds = [
            b"escrow",
            client.key().as_ref(),
            provider.key().as_ref(),
            service_type.as_bytes(),
        ],
        bump,
    )]
    pub escrow_account: Account<'info, EscrowAccount>,
    #[account(mut)]
    pub client: Signer<'info>,
    /// CHECK: Provider is just a destination pubkey, validated by PDA seeds
    pub provider: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ProviderAction<'info> {
    #[account(
        mut,
        has_one = provider,
        seeds = [
            b"escrow",
            escrow_account.client.as_ref(),
            provider.key().as_ref(),
            escrow_account.service_type.as_bytes(),
        ],
        bump,
    )]
    pub escrow_account: Account<'info, EscrowAccount>,
    pub provider: Signer<'info>,
}

#[derive(Accounts)]
pub struct ClientAction<'info> {
    #[account(
        mut,
        has_one = client,
        seeds = [
            b"escrow",
            client.key().as_ref(),
            escrow_account.provider.as_ref(),
            escrow_account.service_type.as_bytes(),
        ],
        bump,
    )]
    pub escrow_account: Account<'info, EscrowAccount>,
    #[account(mut)]
    pub client: Signer<'info>,
    /// CHECK: Provider receives payment, validated by has_one on escrow
    #[account(mut, address = escrow_account.provider)]
    pub provider: AccountInfo<'info>,
}

// -- State --

#[account]
pub struct EscrowAccount {
    pub client: Pubkey,
    pub provider: Pubkey,
    pub amount: u64,
    pub status: EscrowStatus,
    pub service_type: String,
    pub created_at: i64,
}

impl EscrowAccount {
    pub fn space(service_type: &str) -> usize {
        8   // discriminator
        + 32  // client
        + 32  // provider
        + 8   // amount
        + 1   // status (enum)
        + 4 + service_type.len() // service_type
        + 8   // created_at
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum EscrowStatus {
    Created,
    Delivered,
    Released,
    Disputed,
}

// -- Errors --

#[error_code]
pub enum EscrowError {
    #[msg("Service type must be 32 characters or less")]
    ServiceTypeTooLong,
    #[msg("Amount must be greater than zero")]
    InvalidAmount,
    #[msg("Invalid escrow status for this operation")]
    InvalidStatus,
}
