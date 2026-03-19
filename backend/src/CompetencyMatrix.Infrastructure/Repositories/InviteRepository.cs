using System.Data;
using CompetencyMatrix.Application.Interfaces;
using CompetencyMatrix.Domain.Entities;
using Dapper;

namespace CompetencyMatrix.Infrastructure.Repositories;

public class InviteRepository : IInviteRepository
{
    private readonly Data.DapperContext _ctx;

    public InviteRepository(Data.DapperContext ctx) => _ctx = ctx;

    public async Task<Invite?> GetByTokenHashAsync(string tokenHash)
    {
        using var conn = _ctx.CreateConnection();
        const string sql = @"
            SELECT id, email, company_id AS CompanyId, invited_by_user_id AS InvitedByUserId,
                   token_hash AS TokenHash, expires_at AS ExpiresAt, created_at AS CreatedAt, used_at AS UsedAt
            FROM invites
            WHERE token_hash = @tokenHash";
        return await conn.QueryFirstOrDefaultAsync<Invite>(sql, new { tokenHash });
    }

    public async Task<Invite?> GetActiveByEmailAsync(string email, int companyId)
    {
        using var conn = _ctx.CreateConnection();
        const string sql = @"
            SELECT id, email, company_id AS CompanyId, invited_by_user_id AS InvitedByUserId,
                   token_hash AS TokenHash, expires_at AS ExpiresAt, created_at AS CreatedAt, used_at AS UsedAt
            FROM invites
            WHERE email = @email
              AND company_id = @companyId
              AND used_at IS NULL
              AND expires_at > NOW()";
        return await conn.QueryFirstOrDefaultAsync<Invite>(sql, new { email, companyId });
    }

    public async Task<int> CreateAsync(Invite invite)
    {
        using var conn = _ctx.CreateConnection();
        const string sql = @"
            INSERT INTO invites (email, company_id, invited_by_user_id, token_hash, expires_at, created_at)
            VALUES (@Email, @CompanyId, @InvitedByUserId, @TokenHash, @ExpiresAt, @CreatedAt)
            RETURNING id";
        return await conn.ExecuteScalarAsync<int>(sql, invite);
    }

    public async Task UpdateAsync(Invite invite)
    {
        using var conn = _ctx.CreateConnection();
        const string sql = @"
            UPDATE invites
            SET token_hash = @TokenHash,
                expires_at = @ExpiresAt,
                used_at    = @UsedAt
            WHERE id = @Id";
        await conn.ExecuteAsync(sql, invite);
    }
}

