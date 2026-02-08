use anchor_lang::prelude::*;

declare_id!("CywQ7eaRAFcn2VAxKc2SxGMER2rVu48jfzLyc7oUz9iy");

#[program]
pub mod registry {
    use super::*;

    pub fn register_service(
        ctx: Context<RegisterService>,
        service_type: String,
        price: u64,
        endpoint: String,
    ) -> Result<()> {
        require!(service_type.len() <= 32, RegistryError::ServiceTypeTooLong);
        require!(endpoint.len() <= 128, RegistryError::EndpointTooLong);
        require!(price > 0, RegistryError::InvalidPrice);

        let service = &mut ctx.accounts.service_account;
        service.owner = ctx.accounts.owner.key();
        service.service_type = service_type;
        service.price = price;
        service.endpoint = endpoint;
        service.is_active = true;
        service.created_at = Clock::get()?.unix_timestamp;
        service.reputation = 0;

        msg!("Service registered by {}", service.owner);
        Ok(())
    }

    pub fn update_service(
        ctx: Context<UpdateService>,
        price: Option<u64>,
        endpoint: Option<String>,
    ) -> Result<()> {
        let service = &mut ctx.accounts.service_account;

        if let Some(p) = price {
            require!(p > 0, RegistryError::InvalidPrice);
            service.price = p;
        }
        if let Some(ep) = endpoint {
            require!(ep.len() <= 128, RegistryError::EndpointTooLong);
            service.endpoint = ep;
        }

        msg!("Service updated by {}", service.owner);
        Ok(())
    }

    pub fn deactivate_service(ctx: Context<UpdateService>) -> Result<()> {
        let service = &mut ctx.accounts.service_account;
        service.is_active = false;
        msg!("Service deactivated by {}", service.owner);
        Ok(())
    }
}

// -- Accounts structs --

#[derive(Accounts)]
#[instruction(service_type: String)]
pub struct RegisterService<'info> {
    #[account(
        init,
        payer = owner,
        space = ServiceAccount::space(&service_type),
        seeds = [b"service", owner.key().as_ref(), service_type.as_bytes()],
        bump,
    )]
    pub service_account: Account<'info, ServiceAccount>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateService<'info> {
    #[account(
        mut,
        has_one = owner,
        seeds = [b"service", owner.key().as_ref(), service_account.service_type.as_bytes()],
        bump,
    )]
    pub service_account: Account<'info, ServiceAccount>,
    pub owner: Signer<'info>,
}

// -- State --

#[account]
pub struct ServiceAccount {
    pub owner: Pubkey,
    pub service_type: String,
    pub price: u64,
    pub endpoint: String,
    pub is_active: bool,
    pub created_at: i64,
    pub reputation: u64,
}

impl ServiceAccount {
    pub fn space(service_type: &str) -> usize {
        8  // discriminator
        + 32 // owner
        + 4 + service_type.len() // service_type (string prefix + data)
        + 8  // price
        + 4 + 128 // endpoint (max)
        + 1  // is_active
        + 8  // created_at
        + 8  // reputation
    }
}

// -- Errors --

#[error_code]
pub enum RegistryError {
    #[msg("Service type must be 32 characters or less")]
    ServiceTypeTooLong,
    #[msg("Endpoint must be 128 characters or less")]
    EndpointTooLong,
    #[msg("Price must be greater than zero")]
    InvalidPrice,
}
