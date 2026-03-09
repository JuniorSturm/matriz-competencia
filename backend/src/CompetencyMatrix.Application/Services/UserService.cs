using CompetencyMatrix.Application.DTOs;
using CompetencyMatrix.Application.Interfaces;
using CompetencyMatrix.Domain.Entities;
using BC = BCrypt.Net.BCrypt;

namespace CompetencyMatrix.Application.Services;

public class UserService : IUserService
{
    private readonly IUserRepository _repo;

    public UserService(IUserRepository repo) => _repo = repo;

    public async Task<UserResponse?> GetByIdAsync(Guid id)
    {
        var u = await _repo.GetByIdAsync(id);
        return u is null ? null : Map(u);
    }

    public async Task<IEnumerable<UserResponse>> GetAllAsync()
    {
        var list = await _repo.GetAllAsync();
        return list.Select(Map);
    }

    public async Task<Guid> CreateAsync(CreateUserRequest request)
    {
        var user = new User
        {
            Id        = Guid.NewGuid(),
            Name      = request.Name,
            Email     = request.Email,
            Password  = BC.HashPassword(request.Password),
            RoleId    = request.RoleId,
            GradeId   = request.GradeId,
            IsManager = request.IsManager,
            CreatedAt = DateTime.UtcNow
        };
        return await _repo.CreateAsync(user);
    }

    public async Task UpdateAsync(Guid id, UpdateUserRequest request)
    {
        var user = await _repo.GetByIdAsync(id)
            ?? throw new KeyNotFoundException($"Usuário {id} não encontrado.");

        user.Name      = request.Name;
        user.RoleId    = request.RoleId;
        user.GradeId   = request.GradeId;
        user.IsManager = request.IsManager;

        await _repo.UpdateAsync(user);
    }

    public async Task ResetPasswordAsync(Guid id, string newPassword)
    {
        var user = await _repo.GetByIdAsync(id)
            ?? throw new KeyNotFoundException($"Usuário {id} não encontrado.");

        var hashed = BC.HashPassword(newPassword);
        await _repo.UpdatePasswordAsync(id, hashed);
    }

    public Task DeleteAsync(Guid id) => _repo.DeleteAsync(id);

    private static UserResponse Map(User u) => new(
        u.Id,
        u.Name,
        u.Email,
        u.RoleId,
        u.Role?.Name,
        u.GradeId,
        u.Grade?.Name,
        u.IsManager,
        u.CreatedAt
    );
}
