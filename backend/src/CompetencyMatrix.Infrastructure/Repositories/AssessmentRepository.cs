using CompetencyMatrix.Application.DTOs;
using CompetencyMatrix.Application.Interfaces;
using CompetencyMatrix.Domain.Entities;
using Dapper;

namespace CompetencyMatrix.Infrastructure.Repositories;

public class AssessmentRepository : IAssessmentRepository
{
    private readonly Data.DapperContext _ctx;

    public AssessmentRepository(Data.DapperContext ctx) => _ctx = ctx;

    public async Task<IEnumerable<SkillAssessment>> GetByUserAsync(Guid userId)
    {
        using var conn = _ctx.CreateConnection();
        return await conn.QueryAsync<SkillAssessment>(
            "SELECT id, user_id, skill_id, current_level, last_updated FROM skill_assessments WHERE user_id = @userId",
            new { userId }
        );
    }

    public async Task<IEnumerable<AssessmentMatrixRow>> GetUserMatrixAsync(Guid userId, int roleId, int gradeId)
    {
        using var conn = _ctx.CreateConnection();
        const string sql = @"
            SELECT
                s.id          AS SkillId,
                s.name        AS SkillName,
                se.expected_level AS ExpectedLevel,
                COALESCE(sa.current_level, 'DESCONHECE') AS CurrentLevel,
                r.name        AS RoleName
            FROM skill_expectations se
            JOIN skills s ON s.id = se.skill_id
            LEFT JOIN skill_assessments sa ON sa.skill_id = se.skill_id AND sa.user_id = @userId
            LEFT JOIN roles r ON r.id = se.role_id
            WHERE se.role_id = @roleId AND se.grade_id = @gradeId
            ORDER BY s.category, s.name";

        return await conn.QueryAsync<AssessmentMatrixRow>(sql, new { userId, roleId, gradeId });
    }

    public async Task<IEnumerable<AssessmentMatrixRow>> GetUserTeamMatrixAsync(Guid userId, int roleId, int gradeId, IEnumerable<int> skillIds)
    {
        var ids = skillIds.ToArray();
        if (ids.Length == 0) return Enumerable.Empty<AssessmentMatrixRow>();

        using var conn = _ctx.CreateConnection();
        const string sql = @"
            SELECT
                s.id          AS SkillId,
                s.name        AS SkillName,
                se.expected_level AS ExpectedLevel,
                COALESCE(sa.current_level, 'DESCONHECE') AS CurrentLevel,
                r.name        AS RoleName
            FROM skill_expectations se
            JOIN skills s ON s.id = se.skill_id
            LEFT JOIN skill_assessments sa ON sa.skill_id = se.skill_id AND sa.user_id = @userId
            LEFT JOIN roles r ON r.id = se.role_id
            WHERE se.role_id = @roleId AND se.grade_id = @gradeId
              AND se.skill_id = ANY(@ids)
            ORDER BY s.category, s.name";

        return await conn.QueryAsync<AssessmentMatrixRow>(sql, new { userId, roleId, gradeId, ids });
    }

    public async Task UpsertAsync(SkillAssessment assessment)
    {
        using var conn = _ctx.CreateConnection();
        const string sql = @"
            INSERT INTO skill_assessments (user_id, skill_id, current_level, last_updated)
            VALUES (@UserId, @SkillId, @CurrentLevel, @LastUpdated)
            ON CONFLICT (user_id, skill_id) DO UPDATE
                SET current_level = EXCLUDED.current_level,
                    last_updated  = EXCLUDED.last_updated";

        await conn.ExecuteAsync(sql, assessment);
    }

    public async Task DeleteAsync(Guid userId, int skillId)
    {
        using var conn = _ctx.CreateConnection();
        await conn.ExecuteAsync(
            "DELETE FROM skill_assessments WHERE user_id = @userId AND skill_id = @skillId",
            new { userId, skillId }
        );
    }

    public async Task<int> CountBySkillAsync(int skillId)
    {
        using var conn = _ctx.CreateConnection();
        return await conn.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM skill_assessments WHERE skill_id = @skillId", new { skillId });
    }
}
