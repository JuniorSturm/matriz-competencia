using CompetencyMatrix.Application.Interfaces;
using CompetencyMatrix.Domain.Entities;
using Dapper;

namespace CompetencyMatrix.Infrastructure.Repositories;

public class CompanyRepository : ICompanyRepository
{
    private readonly Data.DapperContext _ctx;

    public CompanyRepository(Data.DapperContext ctx) => _ctx = ctx;

    public async Task<Company?> GetByIdAsync(int id)
    {
        using var conn = _ctx.CreateConnection();

        const string sql = @"
            SELECT * FROM companies WHERE id = @id";
        var company = await conn.QueryFirstOrDefaultAsync<Company>(sql, new { id });

        if (company is not null)
        {
            const string usersSql = @"
                SELECT u.id, u.name, u.email, u.is_manager
                FROM users u
                WHERE u.company_id = @id
                ORDER BY u.name";
            var users = await conn.QueryAsync<User>(usersSql, new { id });
            company.Users = users.ToList();
        }

        return company;
    }

    public async Task<IEnumerable<Company>> GetAllAsync()
    {
        using var conn = _ctx.CreateConnection();

        const string sql = "SELECT * FROM companies ORDER BY name";
        var companies = (await conn.QueryAsync<Company>(sql)).ToList();

        if (companies.Count > 0)
        {
            const string usersSql = @"
                SELECT u.id, u.name, u.email, u.is_manager, u.company_id
                FROM users u
                WHERE u.company_id IS NOT NULL
                ORDER BY u.name";
            var allUsers = (await conn.QueryAsync<User>(usersSql)).ToList();

            foreach (var company in companies)
            {
                company.Users = allUsers.Where(u => u.CompanyId == company.Id).ToList();
            }
        }

        return companies;
    }

    public async Task<int> CreateAsync(Company company)
    {
        using var conn = _ctx.CreateConnection();
        const string sql = @"
            INSERT INTO companies (name, document, email, phone, is_active, created_at)
            VALUES (@Name, @Document, @Email, @Phone, @IsActive, @CreatedAt)
            RETURNING id";

        return await conn.ExecuteScalarAsync<int>(sql, company);
    }

    public async Task UpdateAsync(Company company)
    {
        using var conn = _ctx.CreateConnection();
        const string sql = @"
            UPDATE companies
            SET name = @Name, document = @Document, email = @Email, phone = @Phone, is_active = @IsActive
            WHERE id = @Id";

        await conn.ExecuteAsync(sql, company);
    }

    public async Task DeleteAsync(int id)
    {
        using var conn = _ctx.CreateConnection();
        // Remove company association from users first
        await conn.ExecuteAsync("UPDATE users SET company_id = NULL WHERE company_id = @id", new { id });
        await conn.ExecuteAsync("DELETE FROM companies WHERE id = @id", new { id });
    }

    public async Task<IEnumerable<User>> GetUsersByCompanyAsync(int companyId)
    {
        using var conn = _ctx.CreateConnection();
        const string sql = @"
            SELECT u.id, u.name, u.email, u.is_manager
            FROM users u
            WHERE u.company_id = @companyId
            ORDER BY u.name";

        return await conn.QueryAsync<User>(sql, new { companyId });
    }

    public async Task AddUserToCompanyAsync(int companyId, Guid userId)
    {
        using var conn = _ctx.CreateConnection();
        const string sql = "UPDATE users SET company_id = @companyId WHERE id = @userId AND company_id IS NULL";
        await conn.ExecuteAsync(sql, new { companyId, userId });
    }

    public async Task RemoveUserFromCompanyAsync(int companyId, Guid userId)
    {
        using var conn = _ctx.CreateConnection();
        const string sql = "UPDATE users SET company_id = NULL WHERE id = @userId AND company_id = @companyId";
        await conn.ExecuteAsync(sql, new { companyId, userId });
    }
}
