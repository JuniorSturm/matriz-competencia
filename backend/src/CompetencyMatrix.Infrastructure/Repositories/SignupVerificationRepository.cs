using CompetencyMatrix.Application.Interfaces;
using CompetencyMatrix.Domain.Entities;
using Dapper;

namespace CompetencyMatrix.Infrastructure.Repositories;

public class SignupVerificationRepository : ISignupVerificationRepository
{
    private readonly Data.DapperContext _ctx;

    public SignupVerificationRepository(Data.DapperContext ctx)
    {
        _ctx = ctx;
    }

    public async Task<long> CreateAsync(SignupVerification verification)
    {
        using var conn = _ctx.CreateConnection();
        const string sql = @"
            INSERT INTO signup_verifications (user_id, company_id, email, code_hash, expires_at, attempts, verified_at, created_at)
            VALUES (@UserId, @CompanyId, @Email, @CodeHash, @ExpiresAt, @Attempts, @VerifiedAt, @CreatedAt)
            RETURNING id";
        return await conn.ExecuteScalarAsync<long>(sql, verification);
    }

    public async Task<SignupVerification?> GetActiveByEmailAsync(string email)
    {
        using var conn = _ctx.CreateConnection();
        const string sql = @"
            SELECT id, user_id AS UserId, company_id AS CompanyId, email, code_hash AS CodeHash, expires_at AS ExpiresAt,
                   attempts AS Attempts, verified_at AS VerifiedAt, created_at AS CreatedAt
            FROM signup_verifications
            WHERE email = @email AND verified_at IS NULL AND expires_at > NOW()
            ORDER BY created_at DESC
            LIMIT 1";
        return await conn.QueryFirstOrDefaultAsync<SignupVerification>(sql, new { email });
    }

    public async Task<SignupVerification?> GetByEmailAndHashAsync(string email, string codeHash)
    {
        using var conn = _ctx.CreateConnection();
        const string sql = @"
            SELECT id, user_id AS UserId, company_id AS CompanyId, email, code_hash AS CodeHash, expires_at AS ExpiresAt,
                   attempts AS Attempts, verified_at AS VerifiedAt, created_at AS CreatedAt
            FROM signup_verifications
            WHERE email = @email AND code_hash = @codeHash
            ORDER BY created_at DESC
            LIMIT 1";
        return await conn.QueryFirstOrDefaultAsync<SignupVerification>(sql, new { email, codeHash });
    }

    public async Task UpdateAsync(SignupVerification verification)
    {
        using var conn = _ctx.CreateConnection();
        const string sql = @"
            UPDATE signup_verifications
            SET code_hash = @CodeHash,
                expires_at = @ExpiresAt,
                attempts = @Attempts,
                verified_at = @VerifiedAt
            WHERE id = @Id";
        await conn.ExecuteAsync(sql, verification);
    }
}

