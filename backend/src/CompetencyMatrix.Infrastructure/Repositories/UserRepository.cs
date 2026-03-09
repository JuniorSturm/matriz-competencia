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
            SELECT u.*, r.id, r.name, g.id, g.name
            FROM users u
            LEFT JOIN roles  r ON r.id = u.role_id
            LEFT JOIN grades g ON g.id = u.grade_id
            WHERE u.id = @id";

        var result = await conn.QueryAsync<User, Role, Grade, User>(
            sql,
            (user, role, grade) => { user.Role = role; user.Grade = grade; return user; },
            new { id },
            splitOn: "id,id"
        );
        return result.FirstOrDefault();
    }

    public async Task<User?> GetByEmailAsync(string email)
    {
        using var conn = _ctx.CreateConnection();
        const string sql = @"
            SELECT u.*, r.id, r.name, g.id, g.name
            FROM users u
            LEFT JOIN roles  r ON r.id = u.role_id
            LEFT JOIN grades g ON g.id = u.grade_id
            WHERE u.email = @email";

        var result = await conn.QueryAsync<User, Role, Grade, User>(
            sql,
            (user, role, grade) => { user.Role = role; user.Grade = grade; return user; },
            new { email },
            splitOn: "id,id"
        );
        return result.FirstOrDefault();
    }

    public async Task<IEnumerable<User>> GetAllAsync()
    {
        using var conn = _ctx.CreateConnection();
        const string sql = @"
            SELECT u.*, r.id, r.name, g.id, g.name
            FROM users u
            LEFT JOIN roles  r ON r.id = u.role_id
            LEFT JOIN grades g ON g.id = u.grade_id
            ORDER BY u.name";

        return await conn.QueryAsync<User, Role, Grade, User>(
            sql,
            (user, role, grade) => { user.Role = role; user.Grade = grade; return user; },
            splitOn: "id,id"
        );
    }

    public async Task<Guid> CreateAsync(User user)
    {
        using var conn = _ctx.CreateConnection();
        const string sql = @"
            INSERT INTO users (id, name, email, password, role_id, grade_id, is_manager, created_at)
            VALUES (@Id, @Name, @Email, @Password, @RoleId, @GradeId, @IsManager, @CreatedAt)
            RETURNING id";

        return await conn.ExecuteScalarAsync<Guid>(sql, user);
    }

    public async Task UpdateAsync(User user)
    {
        using var conn = _ctx.CreateConnection();
        const string sql = @"
            UPDATE users
            SET name = @Name, role_id = @RoleId, grade_id = @GradeId, is_manager = @IsManager
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
}
