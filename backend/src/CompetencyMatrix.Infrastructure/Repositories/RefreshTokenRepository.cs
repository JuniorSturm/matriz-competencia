using System.Data;
using CompetencyMatrix.Application.Interfaces;
using CompetencyMatrix.Domain.Entities;
using Dapper;

namespace CompetencyMatrix.Infrastructure.Repositories;

public class RefreshTokenRepository : IRefreshTokenRepository
{
    private readonly Data.DapperContext _ctx;

    public RefreshTokenRepository(Data.DapperContext ctx) => _ctx = ctx;

    public async Task<RefreshToken?> GetByTokenHashAsync(string tokenHash)
    {
        using var conn = _ctx.CreateConnection();
        const string sql = @"
            SELECT id, user_id, token_hash, expires_at, revoked_at, created_at
            FROM refresh_tokens
            WHERE token_hash = @tokenHash";
        return await conn.QuerySingleOrDefaultAsync<RefreshToken>(sql, new { tokenHash });
    }

    public async Task<long> CreateAsync(RefreshToken token)
    {
        using var conn = _ctx.CreateConnection();
        const string sql = @"
            INSERT INTO refresh_tokens (user_id, token_hash, expires_at, created_at)
            VALUES (@UserId, @TokenHash, @ExpiresAt, @CreatedAt)
            RETURNING id";
        return await conn.ExecuteScalarAsync<long>(sql, token);
    }

    public async Task RevokeAsync(long id)
    {
        using var conn = _ctx.CreateConnection();
        const string sql = @"UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = @id";
        await conn.ExecuteAsync(sql, new { id });
    }

    public async Task RevokeByTokenHashAsync(string tokenHash)
    {
        using var conn = _ctx.CreateConnection();
        const string sql = @"UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = @tokenHash AND revoked_at IS NULL";
        await conn.ExecuteAsync(sql, new { tokenHash });
    }

    public async Task DeleteExpiredAsync(DateTime before)
    {
        using var conn = _ctx.CreateConnection();
        const string sql = @"DELETE FROM refresh_tokens WHERE expires_at < @before";
        await conn.ExecuteAsync(sql, new { before });
    }
}
