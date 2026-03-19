using CompetencyMatrix.Application.Interfaces;
using CompetencyMatrix.Domain.Entities;
using Dapper;

namespace CompetencyMatrix.Infrastructure.Repositories;

public class PasswordResetTokenRepository : IPasswordResetTokenRepository
{
    private readonly Data.DapperContext _ctx;

    public PasswordResetTokenRepository(Data.DapperContext ctx) => _ctx = ctx;

    public async Task<long> CreateAsync(PasswordResetToken token)
    {
        using var conn = _ctx.CreateConnection();
        const string sql = @"
            INSERT INTO password_reset_tokens (user_id, token_hash, type, expires_at, used_at, created_at)
            VALUES (@UserId, @TokenHash, @Type, @ExpiresAt, @UsedAt, @CreatedAt)
            RETURNING id";
        return await conn.ExecuteScalarAsync<long>(sql, token);
    }

    public async Task<PasswordResetToken?> GetByHashAsync(string tokenHash)
    {
        using var conn = _ctx.CreateConnection();
        const string sql = @"
            SELECT id, user_id AS UserId, token_hash AS TokenHash, type AS Type, expires_at AS ExpiresAt, used_at AS UsedAt, created_at AS CreatedAt
            FROM password_reset_tokens
            WHERE token_hash = @tokenHash
            ORDER BY created_at DESC
            LIMIT 1";
        return await conn.QueryFirstOrDefaultAsync<PasswordResetToken>(sql, new { tokenHash });
    }

    public async Task UpdateAsync(PasswordResetToken token)
    {
        using var conn = _ctx.CreateConnection();
        const string sql = @"
            UPDATE password_reset_tokens
            SET used_at = @UsedAt,
                expires_at = @ExpiresAt
            WHERE id = @Id";
        await conn.ExecuteAsync(sql, token);
    }
}

