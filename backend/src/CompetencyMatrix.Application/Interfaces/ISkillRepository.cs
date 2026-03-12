using CompetencyMatrix.Domain.Entities;

namespace CompetencyMatrix.Application.Interfaces;

public interface ISkillRepository
{
    Task<Skill?>                 GetByIdAsync(int id);
    Task<IEnumerable<Skill>>     GetAllAsync();
    Task<IEnumerable<Skill>>     GetAllByCompanyAsync(int companyId);
    Task<IEnumerable<Skill>>     GetByRoleAsync(int roleId);
    Task<(IEnumerable<Skill> Items, int TotalCount)> GetPagedAsync(int page, int pageSize, int? companyId);
    Task<int>                    CreateAsync(Skill skill);
    Task                         UpdateAsync(Skill skill);
    Task                         DeleteAsync(int id);

    Task<IEnumerable<SkillDescription>>  GetDescriptionsAsync(int skillId);
    Task                                 UpsertDescriptionAsync(SkillDescription desc);

    Task<IEnumerable<SkillExpectation>>  GetExpectationsAsync(int roleId, int gradeId);
    Task<IEnumerable<SkillExpectation>>  GetExpectationsBySkillAsync(int skillId);
    Task                                 UpsertExpectationAsync(SkillExpectation expectation);
    Task                                 DeleteExpectationAsync(int skillId, int roleId, int gradeId);
    Task<Dictionary<int, string>>        GetSkillRoleNamesAsync(IEnumerable<int> skillIds, int roleId);
    Task<int>                         CountExpectationsByRoleAsync(int roleId);
    Task<int>                         CountDescriptionsByRoleAsync(int roleId);
}
