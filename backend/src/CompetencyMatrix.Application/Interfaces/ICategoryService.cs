using CompetencyMatrix.Application.DTOs;

namespace CompetencyMatrix.Application.Interfaces;

public interface ICategoryService
{
    Task<IEnumerable<CategoryResponse>> GetByCompanyIdAsync(int companyId);
    Task<CategoryResponse?>             GetByIdAsync(int id);
    Task<int>                           CreateAsync(CreateCategoryRequest request, Guid? currentUserId = null);
    Task                                UpdateAsync(int id, UpdateCategoryRequest request, Guid? currentUserId = null);
    Task                                DeleteAsync(int id, Guid? currentUserId = null);
}
