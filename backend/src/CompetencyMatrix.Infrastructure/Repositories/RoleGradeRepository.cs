using CompetencyMatrix.Application.Interfaces;
using CompetencyMatrix.Domain.Entities;
using Dapper;

namespace CompetencyMatrix.Infrastructure.Repositories;

public class RoleGradeRepository : IRoleGradeRepository
{
    private readonly Data.DapperContext _ctx;

    public RoleGradeRepository(Data.DapperContext ctx) => _ctx = ctx;

    public async Task<IEnumerable<Role>> GetAllRolesAsync()
    {
        using var conn = _ctx.CreateConnection();
        return await conn.QueryAsync<Role>(
            "SELECT id, name, description, company_id AS CompanyId FROM roles ORDER BY name");
    }

    public async Task<IEnumerable<Role>> GetRolesByCompanyAsync(int companyId)
    {
        using var conn = _ctx.CreateConnection();
        return await conn.QueryAsync<Role>(
            "SELECT id, name, description, company_id AS CompanyId FROM roles WHERE company_id = @companyId ORDER BY name",
            new { companyId });
    }

    public async Task<Role?> GetRoleByIdAsync(int id)
    {
        using var conn = _ctx.CreateConnection();
        return await conn.QueryFirstOrDefaultAsync<Role>(
            "SELECT id, name, description, company_id AS CompanyId FROM roles WHERE id = @id",
            new { id });
    }

    public async Task<int> CreateRoleAsync(Role role)
    {
        using var conn = _ctx.CreateConnection();
        return await conn.ExecuteScalarAsync<int>(
            "INSERT INTO roles (name, description, company_id) VALUES (@Name, @Description, @CompanyId) RETURNING id",
            new { role.Name, role.Description, role.CompanyId });
    }

    public async Task UpdateRoleAsync(Role role)
    {
        using var conn = _ctx.CreateConnection();
        await conn.ExecuteAsync(
            "UPDATE roles SET name = @Name, description = @Description WHERE id = @Id",
            new { role.Id, role.Name, role.Description });
    }

    public async Task DeleteRoleAsync(int id)
    {
        using var conn = _ctx.CreateConnection();
        await conn.ExecuteAsync("DELETE FROM roles WHERE id = @id", new { id });
    }

    public async Task<IEnumerable<Grade>> GetAllGradesAsync()
    {
        using var conn = _ctx.CreateConnection();
        return await conn.QueryAsync<Grade>("SELECT id, name, ordinal FROM grades ORDER BY ordinal");
    }

    public async Task<IEnumerable<SkillCategory>> GetAllCategoriesAsync()
    {
        using var conn = _ctx.CreateConnection();
        return await conn.QueryAsync<SkillCategory>("SELECT id, name FROM skill_categories ORDER BY name");
    }
}
