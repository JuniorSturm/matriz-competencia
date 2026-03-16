using CompetencyMatrix.Domain.Entities;

namespace CompetencyMatrix.Application.Interfaces;

public interface ICategoryRepository
{
    Task<Category?>       GetByIdAsync(int id);
    Task<IEnumerable<Category>> GetByCompanyIdAsync(int companyId);
    Task<int>             CountByCompanyIdAsync(int companyId);
    Task<int>             CountSkillsByCategoryIdAsync(int categoryId);
    Task<int>             CreateAsync(Category category);
    Task                  UpdateAsync(Category category);
    Task                  DeleteAsync(int id);
}
