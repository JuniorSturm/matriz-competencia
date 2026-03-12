using CompetencyMatrix.Domain.Entities;

namespace CompetencyMatrix.Application.Interfaces;

public interface IUserRepository
{
    Task<User?>             GetByIdAsync(Guid id);
    Task<User?>             GetByEmailAsync(string email);
    Task<IEnumerable<User>> GetAllAsync();
    Task<IEnumerable<User>> GetAllByCompanyAsync(int companyId);
    Task<int>               CountAllAsync();
    Task<int>               CountManagersAsync();
    Task<Guid>              CreateAsync(User user);
    Task                    UpdateAsync(User user);
    Task                    UpdatePasswordAsync(Guid id, string hashedPassword);
    Task                    DeleteAsync(Guid id);
    Task<int>             CountByRoleAsync(int roleId);
}
