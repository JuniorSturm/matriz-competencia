using CompetencyMatrix.Application.DTOs;
using CompetencyMatrix.Domain.Entities;

namespace CompetencyMatrix.Application.Interfaces;

public interface ICompanyRepository
{
    Task<Company?> GetByIdAsync(int id);
    Task<(IEnumerable<CompanyOptionResponse> Items, int TotalCount)> GetFilterOptionsPagedAsync(int page, int pageSize, string? name);
    Task<IEnumerable<Company>> GetAllAsync();
    Task<(IEnumerable<CompanyListItemResponse> Items, int TotalCount)> GetPagedAsync(int page, int pageSize, string? name);
    Task<int> CreateAsync(Company company);
    Task UpdateAsync(Company company);
    Task DeleteAsync(int id);
    Task<IEnumerable<User>> GetUsersByCompanyAsync(int companyId);
    Task AddUserToCompanyAsync(int companyId, Guid userId);
    Task RemoveUserFromCompanyAsync(int companyId, Guid userId);
    Task<string?> GetNameByIdAsync(int id);
}
