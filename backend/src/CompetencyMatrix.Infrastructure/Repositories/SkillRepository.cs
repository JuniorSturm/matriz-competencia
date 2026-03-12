using CompetencyMatrix.Application.Interfaces;
using CompetencyMatrix.Domain.Entities;
using Dapper;

namespace CompetencyMatrix.Infrastructure.Repositories;

public class SkillRepository : ISkillRepository
{
    private readonly Data.DapperContext _ctx;

    public SkillRepository(Data.DapperContext ctx) => _ctx = ctx;

    public async Task<Skill?> GetByIdAsync(int id)
    {
        using var conn = _ctx.CreateConnection();
        return await conn.QueryFirstOrDefaultAsync<Skill>(
            "SELECT id, name, category, company_id AS CompanyId FROM skills WHERE id = @id", new { id });
    }

    public async Task<IEnumerable<Skill>> GetAllAsync()
    {
        using var conn = _ctx.CreateConnection();
        return await conn.QueryAsync<Skill>(
            "SELECT id, name, category, company_id AS CompanyId FROM skills ORDER BY category, name");
    }

    public async Task<IEnumerable<Skill>> GetAllByCompanyAsync(int companyId)
    {
        using var conn = _ctx.CreateConnection();
        return await conn.QueryAsync<Skill>(
            "SELECT id, name, category, company_id AS CompanyId FROM skills WHERE company_id = @companyId ORDER BY category, name",
            new { companyId });
    }

    public async Task<IEnumerable<Skill>> GetByRoleAsync(int roleId)
    {
        using var conn = _ctx.CreateConnection();
        const string sql = @"
            SELECT DISTINCT s.id, s.name, s.category, s.company_id AS CompanyId
            FROM skills s
            JOIN skill_expectations se ON se.skill_id = s.id AND se.role_id = @roleId
            ORDER BY s.category, s.name";

        return await conn.QueryAsync<Skill>(sql, new { roleId });
    }

    public async Task<int> CreateAsync(Skill skill)
    {
        using var conn = _ctx.CreateConnection();
        const string sql = @"
            INSERT INTO skills (name, category, company_id)
            VALUES (@Name, @Category, @CompanyId)
            RETURNING id";

        return await conn.ExecuteScalarAsync<int>(sql, skill);
    }

    public async Task UpdateAsync(Skill skill)
    {
        using var conn = _ctx.CreateConnection();
        const string sql = @"
            UPDATE skills SET name = @Name, category = @Category
            WHERE id = @Id";

        await conn.ExecuteAsync(sql, skill);
    }

    public async Task DeleteAsync(int id)
    {
        using var conn = _ctx.CreateConnection();
        await conn.ExecuteAsync("DELETE FROM skills WHERE id = @id", new { id });
    }

    public async Task<int> CountExpectationsByRoleAsync(int roleId)
    {
        using var conn = _ctx.CreateConnection();
        return await conn.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM skill_expectations WHERE role_id = @roleId", new { roleId });
    }

    public async Task<int> CountDescriptionsByRoleAsync(int roleId)
    {
        using var conn = _ctx.CreateConnection();
        return await conn.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM skill_descriptions WHERE role_id = @roleId", new { roleId });
    }

    public async Task<IEnumerable<SkillDescription>> GetDescriptionsAsync(int skillId)
    {
        using var conn = _ctx.CreateConnection();
        return await conn.QueryAsync<SkillDescription>(
            "SELECT * FROM skill_descriptions WHERE skill_id = @skillId ORDER BY role_id, level",
            new { skillId }
        );
    }

    public async Task UpsertDescriptionAsync(SkillDescription desc)
    {
        using var conn = _ctx.CreateConnection();
        const string sql = @"
            INSERT INTO skill_descriptions (skill_id, role_id, level, description)
            VALUES (@SkillId, @RoleId, @Level, @Description)
            ON CONFLICT (skill_id, role_id, level) DO UPDATE SET description = EXCLUDED.description";

        await conn.ExecuteAsync(sql, desc);
    }

    public async Task<IEnumerable<SkillExpectation>> GetExpectationsAsync(int roleId, int gradeId)
    {
        using var conn = _ctx.CreateConnection();
        const string sql = @"
            SELECT se.*, s.id, s.name, r.id, r.name, g.id, g.name
            FROM skill_expectations se
            JOIN skills  s ON s.id = se.skill_id
            JOIN roles   r ON r.id = se.role_id
            JOIN grades  g ON g.id = se.grade_id
            WHERE se.role_id = @roleId AND se.grade_id = @gradeId";

        return await conn.QueryAsync<SkillExpectation, Skill, Role, Grade, SkillExpectation>(
            sql,
            (exp, skill, role, grade) =>
            {
                exp.Skill = skill; exp.Role = role; exp.Grade = grade;
                return exp;
            },
            new { roleId, gradeId },
            splitOn: "id,id,id"
        );
    }

    public async Task<IEnumerable<SkillExpectation>> GetExpectationsBySkillAsync(int skillId)
    {
        using var conn = _ctx.CreateConnection();
        const string sql = @"
            SELECT se.id, se.skill_id, se.role_id, se.grade_id, se.expected_level, se.is_required
            FROM skill_expectations se
            WHERE se.skill_id = @skillId";

        return await conn.QueryAsync<SkillExpectation>(sql, new { skillId });
    }

    public async Task UpsertExpectationAsync(SkillExpectation expectation)
    {
        using var conn = _ctx.CreateConnection();
        const string sql = @"
            INSERT INTO skill_expectations (skill_id, role_id, grade_id, expected_level, is_required)
            VALUES (@SkillId, @RoleId, @GradeId, @ExpectedLevel, @IsRequired)
            ON CONFLICT (skill_id, role_id, grade_id) DO UPDATE
                SET expected_level = EXCLUDED.expected_level,
                    is_required    = EXCLUDED.is_required";

        await conn.ExecuteAsync(sql, expectation);
    }

    public async Task DeleteExpectationAsync(int skillId, int roleId, int gradeId)
    {
        using var conn = _ctx.CreateConnection();
        const string sql = "DELETE FROM skill_expectations WHERE skill_id = @skillId AND role_id = @roleId AND grade_id = @gradeId";
        await conn.ExecuteAsync(sql, new { skillId, roleId, gradeId });
    }

    public async Task<Dictionary<int, string>> GetSkillRoleNamesAsync(IEnumerable<int> skillIds, int roleId)
    {
        using var conn = _ctx.CreateConnection();
        const string sql = @"
            SELECT DISTINCT se.skill_id AS SkillId, r.name AS RoleName
            FROM skill_expectations se
            JOIN roles r ON r.id = se.role_id
            WHERE se.skill_id = ANY(@ids) AND se.role_id = @roleId";

        var rows = await conn.QueryAsync<(int SkillId, string RoleName)>(sql, new { ids = skillIds.ToArray(), roleId });
        return rows.ToDictionary(r => r.SkillId, r => r.RoleName);
    }
}
