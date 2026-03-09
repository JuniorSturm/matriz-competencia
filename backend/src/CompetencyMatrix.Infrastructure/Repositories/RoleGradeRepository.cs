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
        return await conn.QueryAsync<Role>("SELECT id, name FROM roles ORDER BY name");
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
