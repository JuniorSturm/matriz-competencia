using System.Data;
using CompetencyMatrix.Application.Interfaces;
using CompetencyMatrix.Domain.Entities;
using Dapper;

namespace CompetencyMatrix.Infrastructure.Repositories;

public class UserRepository : IUserRepository
{
    private readonly Data.DapperContext _ctx;

    public UserRepository(Data.DapperContext ctx) => _ctx = ctx;

    public async Task<User?> GetByIdAsync(Guid id)
    {
        using var conn = _ctx.CreateConnection();
        const string sql = @"
            SELECT u.*, r.id, r.name, g.id, g.name, c.id, c.name
            FROM users u
            LEFT JOIN roles     r ON r.id = u.role_id
            LEFT JOIN grades    g ON g.id = u.grade_id
            LEFT JOIN companies c ON c.id = u.company_id
            WHERE u.id = @id";

        var result = await conn.QueryAsync<User, Role, Grade, Company, User>(
            sql,
            (user, role, grade, company) => { user.Role = role; user.Grade = grade; user.Company = company; return user; },
            new { id },
            splitOn: "id,id,id"
        );
        return result.FirstOrDefault();
    }

    public async Task<User?> GetByEmailAsync(string email)
    {
        using var conn = _ctx.CreateConnection();
        const string sql = @"
            SELECT u.*, r.id, r.name, g.id, g.name, c.id, c.name
            FROM users u
            LEFT JOIN roles     r ON r.id = u.role_id
            LEFT JOIN grades    g ON g.id = u.grade_id
            LEFT JOIN companies c ON c.id = u.company_id
            WHERE u.email = @email";

        var result = await conn.QueryAsync<User, Role, Grade, Company, User>(
            sql,
            (user, role, grade, company) => { user.Role = role; user.Grade = grade; user.Company = company; return user; },
            new { email },
            splitOn: "id,id,id"
        );
        return result.FirstOrDefault();
    }

    public async Task<IEnumerable<User>> GetAllAsync()
    {
        using var conn = _ctx.CreateConnection();
        const string sql = @"
            SELECT u.*, r.id, r.name, g.id, g.name, c.id, c.name
            FROM users u
            LEFT JOIN roles     r ON r.id = u.role_id
            LEFT JOIN grades    g ON g.id = u.grade_id
            LEFT JOIN companies c ON c.id = u.company_id
            ORDER BY u.name";

        return await conn.QueryAsync<User, Role, Grade, Company, User>(
            sql,
            (user, role, grade, company) => { user.Role = role; user.Grade = grade; user.Company = company; return user; },
            splitOn: "id,id,id"
        );
    }

    public async Task<IEnumerable<User>> GetAllByCompanyAsync(int companyId)
    {
        using var conn = _ctx.CreateConnection();
        const string sql = @"
            SELECT u.*, r.id, r.name, g.id, g.name, c.id, c.name
            FROM users u
            LEFT JOIN roles     r ON r.id = u.role_id
            LEFT JOIN grades    g ON g.id = u.grade_id
            LEFT JOIN companies c ON c.id = u.company_id
            WHERE u.company_id = @companyId
            ORDER BY u.name";

        return await conn.QueryAsync<User, Role, Grade, Company, User>(
            sql,
            (user, role, grade, company) => { user.Role = role; user.Grade = grade; user.Company = company; return user; },
            new { companyId },
            splitOn: "id,id,id"
        );
    }

    public async Task<int> CountAllAsync()
    {
        using var conn = _ctx.CreateConnection();
        return await conn.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM users");
    }

    public async Task<int> CountManagersAsync()
    {
        using var conn = _ctx.CreateConnection();
        return await conn.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM users WHERE is_manager = TRUE");
    }

    public async Task<Guid> CreateAsync(User user)
    {
        using var conn = _ctx.CreateConnection();
        const string sql = @"
            INSERT INTO users (id, name, email, password, role_id, grade_id, is_manager, is_admin, is_coordinator, company_id, created_at)
            VALUES (@Id, @Name, @Email, @Password, @RoleId, @GradeId, @IsManager, @IsAdmin, @IsCoordinator, @CompanyId, @CreatedAt)
            RETURNING id";

        return await conn.ExecuteScalarAsync<Guid>(sql, user);
    }

    public async Task UpdateAsync(User user)
    {
        using var conn = _ctx.CreateConnection();
        const string sql = @"
            UPDATE users
            SET name = @Name, role_id = @RoleId, grade_id = @GradeId, is_manager = @IsManager, is_coordinator = @IsCoordinator, company_id = @CompanyId
            WHERE id = @Id";

        await conn.ExecuteAsync(sql, user);
    }

    public async Task UpdatePasswordAsync(Guid id, string hashedPassword)
    {
        using var conn = _ctx.CreateConnection();
        const string sql = "UPDATE users SET password = @hashedPassword WHERE id = @id";
        await conn.ExecuteAsync(sql, new { id, hashedPassword });
    }

    public async Task DeleteAsync(Guid id)
    {
        using var conn = _ctx.CreateConnection();
        await conn.ExecuteAsync("DELETE FROM users WHERE id = @id", new { id });
    }

    public async Task<int> CountByRoleAsync(int roleId)
    {
        using var conn = _ctx.CreateConnection();
        return await conn.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM users WHERE role_id = @roleId", new { roleId });
    }
}
