using CompetencyMatrix.Application.DTOs;
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
            SELECT id, name, document, email, phone, is_active, created_at
            FROM companies
            WHERE id = @id";
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

    public async Task<string?> GetNameByIdAsync(int id)
    {
        using var conn = _ctx.CreateConnection();
        const string sql = "SELECT name FROM companies WHERE id = @id";
        return await conn.ExecuteScalarAsync<string?>(sql, new { id });
    }

    public async Task<(IEnumerable<CompanyOptionResponse> Items, int TotalCount)> GetFilterOptionsPagedAsync(int page, int pageSize, string? name)
    {
        if (page <= 0) page = 1;
        if (pageSize <= 0) pageSize = 50;
        pageSize = Math.Min(pageSize, 100);
        var skip = (page - 1) * pageSize;
        var namePattern = string.IsNullOrWhiteSpace(name) ? null : $"%{name.Trim()}%";

        using var conn = _ctx.CreateConnection();
        int total;
        if (namePattern is null)
            total = await conn.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM companies");
        else
            total = await conn.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM companies WHERE name ILIKE @namePattern", new { namePattern });

        string dataSql;
        object dataParams;
        if (namePattern is null)
        {
            dataSql = "SELECT id, name, is_active AS IsActive FROM companies ORDER BY name OFFSET @Skip LIMIT @Take";
            dataParams = new { Skip = skip, Take = pageSize };
        }
        else
        {
            dataSql = "SELECT id, name, is_active AS IsActive FROM companies WHERE name ILIKE @namePattern ORDER BY name OFFSET @Skip LIMIT @Take";
            dataParams = new { namePattern, Skip = skip, Take = pageSize };
        }
        var items = (await conn.QueryAsync<CompanyOptionResponse>(dataSql, dataParams)).ToList();
        return (items, total);
    }

    public async Task<IEnumerable<Company>> GetAllAsync()
    {
        using var conn = _ctx.CreateConnection();

        const string sql = @"
            SELECT id, name, document, email, phone, is_active, created_at
            FROM companies
            ORDER BY name";
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

    public async Task<(IEnumerable<CompanyListItemResponse> Items, int TotalCount)> GetPagedAsync(int page, int pageSize, string? name)
    {
        if (page <= 0) page = 1;
        if (pageSize <= 0) pageSize = 50;
        pageSize = Math.Min(pageSize, 100);
        var skip = (page - 1) * pageSize;
        var namePattern = string.IsNullOrWhiteSpace(name) ? null : $"%{name.Trim()}%";

        using var conn = _ctx.CreateConnection();

        int total;
        if (namePattern is null)
        {
            total = await conn.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM companies");
        }
        else
        {
            total = await conn.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM companies WHERE name ILIKE @namePattern", new { namePattern });
        }
        string dataSql;
        object dataParams;
        if (namePattern is null)
        {
            dataSql = @"
                SELECT c.id, c.name, c.document, c.email, c.phone, c.is_active AS is_active, c.created_at AS created_at,
                       (SELECT COUNT(*) FROM users u WHERE u.company_id = c.id AND u.is_manager = false) AS collaborator_count,
                       (SELECT COUNT(*) FROM users u WHERE u.company_id = c.id AND u.is_manager = true) AS manager_count
                FROM companies c
                ORDER BY c.name
                OFFSET @Skip LIMIT @Take";
            dataParams = new { Skip = skip, Take = pageSize };
        }
        else
        {
            dataSql = @"
                SELECT c.id, c.name, c.document, c.email, c.phone, c.is_active AS is_active, c.created_at AS created_at,
                       (SELECT COUNT(*) FROM users u WHERE u.company_id = c.id AND u.is_manager = false) AS collaborator_count,
                       (SELECT COUNT(*) FROM users u WHERE u.company_id = c.id AND u.is_manager = true) AS manager_count
                FROM companies c
                WHERE c.name ILIKE @namePattern
                ORDER BY c.name
                OFFSET @Skip LIMIT @Take";
            dataParams = new { namePattern, Skip = skip, Take = pageSize };
        }

        var rows = await conn.QueryAsync<CompanyListRow>(dataSql, dataParams);
        var items = rows.Select(r => new CompanyListItemResponse(
            r.id, r.name, r.document, r.email, r.phone, r.is_active, r.created_at,
            r.collaborator_count, r.manager_count)).ToList();
        return (items, total);
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
        // CreateConnection() retorna IDbConnection; OpenAsync não está disponível.
        conn.Open();
        using var tx = conn.BeginTransaction();

        // Audit logs têm FK para companies; remover antes do DELETE em companies.
        await conn.ExecuteAsync(
            "DELETE FROM audit_logs WHERE company_id = @id",
            new { id },
            tx);

        // Remove company association from users first
        await conn.ExecuteAsync(
            "UPDATE users SET company_id = NULL WHERE company_id = @id",
            new { id },
            tx);

        await conn.ExecuteAsync(
            "DELETE FROM companies WHERE id = @id",
            new { id },
            tx);

        tx.Commit();
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

internal sealed class CompanyListRow
{
    public int      id                { get; set; }
    public string   name              { get; set; } = string.Empty;
    public string?  document          { get; set; }
    public string?  email             { get; set; }
    public string?  phone             { get; set; }
    public bool     is_active         { get; set; }
    public DateTime created_at        { get; set; }
    public int      collaborator_count { get; set; }
    public int      manager_count     { get; set; }
}
