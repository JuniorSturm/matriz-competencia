using CompetencyMatrix.Domain.Entities;

namespace CompetencyMatrix.Application.Interfaces;

public interface ICompanyRepository
{
    Task<Company?> GetByIdAsync(int id);
    Task<IEnumerable<Company>> GetAllAsync();
    Task<int> CreateAsync(Company company);
    Task UpdateAsync(Company company);
    Task DeleteAsync(int id);
    Task<IEnumerable<User>> GetUsersByCompanyAsync(int companyId);
    Task AddUserToCompanyAsync(int companyId, Guid userId);
    Task RemoveUserFromCompanyAsync(int companyId, Guid userId);
}
