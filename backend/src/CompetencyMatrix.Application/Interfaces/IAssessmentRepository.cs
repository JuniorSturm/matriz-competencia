using CompetencyMatrix.Domain.Entities;

namespace CompetencyMatrix.Application.Interfaces;

public interface IAssessmentRepository
{
    Task<IEnumerable<SkillAssessment>> GetByUserAsync(Guid userId);
    Task                              UpsertAsync(SkillAssessment assessment);
    Task                              DeleteAsync(Guid userId, int skillId);
}
