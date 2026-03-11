using CompetencyMatrix.Application.DTOs;
using CompetencyMatrix.Domain.Entities;

namespace CompetencyMatrix.Application.Interfaces;

public interface IAssessmentRepository
{
    Task<IEnumerable<SkillAssessment>> GetByUserAsync(Guid userId);
    Task<IEnumerable<AssessmentMatrixRow>> GetUserMatrixAsync(Guid userId, int roleId, int gradeId);
    Task<IEnumerable<AssessmentMatrixRow>> GetUserTeamMatrixAsync(Guid userId, int roleId, int gradeId, IEnumerable<int> skillIds);
    Task                              UpsertAsync(SkillAssessment assessment);
    Task                              DeleteAsync(Guid userId, int skillId);
}
