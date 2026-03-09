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
            "SELECT * FROM skill_assessments WHERE user_id = @userId",
            new { userId }
        );
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
}
