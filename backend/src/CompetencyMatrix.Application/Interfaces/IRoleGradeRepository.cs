using CompetencyMatrix.Domain.Entities;

namespace CompetencyMatrix.Application.Interfaces;

public interface IRoleGradeRepository
{
    Task<IEnumerable<Role>>          GetAllRolesAsync();
    Task<IEnumerable<Grade>>         GetAllGradesAsync();
    Task<IEnumerable<SkillCategory>> GetAllCategoriesAsync();
}
