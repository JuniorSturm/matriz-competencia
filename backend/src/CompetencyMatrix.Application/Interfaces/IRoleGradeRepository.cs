using CompetencyMatrix.Domain.Entities;

namespace CompetencyMatrix.Application.Interfaces;

public interface IRoleGradeRepository
{
    Task<IEnumerable<Role>>          GetAllRolesAsync();
    Task<IEnumerable<Role>>          GetRolesByCompanyAsync(int companyId);
    Task<Role?>                      GetRoleByIdAsync(int id);
    Task<int>                        CreateRoleAsync(Role role);
    Task                             UpdateRoleAsync(Role role);
    Task                             DeleteRoleAsync(int id);
    Task<IEnumerable<Grade>>         GetAllGradesAsync();
    Task<IEnumerable<SkillCategory>> GetAllCategoriesAsync();
}
