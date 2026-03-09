using CompetencyMatrix.Application.DTOs;
using CompetencyMatrix.Application.Interfaces;
using CompetencyMatrix.Domain.Entities;
using BC = BCrypt.Net.BCrypt;

namespace CompetencyMatrix.Application.Services;

public class AuthService : IAuthService
{
    private readonly IUserRepository _users;
    private readonly IJwtService     _jwt;

    public AuthService(IUserRepository users, IJwtService jwt)
    {
        _users = users;
        _jwt   = jwt;
    }

    public async Task<LoginResponse?> LoginAsync(LoginRequest request)
    {
        var user = await _users.GetByEmailAsync(request.Email);
        if (user is null) return null;
        if (!BC.Verify(request.Password, user.Password)) return null;

        var token = _jwt.GenerateToken(user.Id, user.Email, user.IsManager);
        return new LoginResponse(token, user.Name, user.IsManager);
    }
}
