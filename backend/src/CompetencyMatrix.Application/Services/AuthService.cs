using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Configuration;
using CompetencyMatrix.Application.DTOs;
using CompetencyMatrix.Application.Interfaces;
using CompetencyMatrix.Domain.Entities;
using BC = BCrypt.Net.BCrypt;

namespace CompetencyMatrix.Application.Services;

public class AuthService : IAuthService
{
    private readonly IUserRepository         _users;
    private readonly IRefreshTokenRepository  _refreshTokens;
    private readonly IJwtService             _jwt;
    private readonly int _refreshExpiryMinutes;

    public AuthService(IUserRepository users, IRefreshTokenRepository refreshTokens, IJwtService jwt, IConfiguration config)
    {
        _users = users;
        _refreshTokens = refreshTokens;
        _jwt = jwt;
        if (int.TryParse(config["Jwt:RefreshExpiryMinutes"], out var minutes))
            _refreshExpiryMinutes = minutes;
        else if (int.TryParse(config["Jwt:RefreshExpiryDays"], out var days))
            _refreshExpiryMinutes = days * 24 * 60;
        else
            _refreshExpiryMinutes = 60;
    }

    public async Task<LoginResponse?> LoginAsync(LoginRequest request)
    {
        var user = await _users.GetByEmailAsync(request.Email);
        if (user is null) return null;
        if (!BC.Verify(request.Password, user.Password)) return null;

        var accessToken = _jwt.GenerateToken(user.Id, user.Email, user.IsManager, user.IsAdmin, user.IsCoordinator);
        var (refreshValue, refreshExpiresAt) = GenerateRefreshToken();
        var hash = HashRefreshToken(refreshValue);
        var refreshEntity = new RefreshToken
        {
            UserId    = user.Id,
            TokenHash = hash,
            ExpiresAt = refreshExpiresAt,
            CreatedAt = DateTime.UtcNow
        };
        await _refreshTokens.CreateAsync(refreshEntity);
        var refreshExpiresInSeconds = (int)(refreshExpiresAt - DateTime.UtcNow).TotalSeconds;
        return new LoginResponse(
            user.Id.ToString(),
            accessToken,
            user.Name,
            user.IsManager,
            user.IsAdmin,
            user.IsCoordinator,
            user.CompanyId,
            refreshValue,
            refreshExpiresInSeconds);
    }

    public async Task<RefreshResponse?> RefreshAsync(RefreshRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.RefreshToken)) return null;
        var hash = HashRefreshToken(request.RefreshToken);
        var stored = await _refreshTokens.GetByTokenHashAsync(hash);
        if (stored is null || stored.RevokedAt.HasValue || stored.ExpiresAt <= DateTime.UtcNow)
            return null;

        var user = await _users.GetByIdAsync(stored.UserId);
        if (user is null) return null;

        await _refreshTokens.RevokeByTokenHashAsync(hash);
        var accessToken = _jwt.GenerateToken(user.Id, user.Email, user.IsManager, user.IsAdmin, user.IsCoordinator);
        var (newRefreshValue, newExpiresAt) = GenerateRefreshToken();
        var newHash = HashRefreshToken(newRefreshValue);
        var newRefresh = new RefreshToken
        {
            UserId    = user.Id,
            TokenHash = newHash,
            ExpiresAt = newExpiresAt,
            CreatedAt = DateTime.UtcNow
        };
        await _refreshTokens.CreateAsync(newRefresh);
        var refreshExpiresInSeconds = (int)(newExpiresAt - DateTime.UtcNow).TotalSeconds;
        return new RefreshResponse(accessToken, newRefreshValue, refreshExpiresInSeconds);
    }

    public async Task RevokeRefreshAsync(string refreshToken)
    {
        if (string.IsNullOrWhiteSpace(refreshToken)) return;
        var hash = HashRefreshToken(refreshToken);
        await _refreshTokens.RevokeByTokenHashAsync(hash);
    }

    private (string value, DateTime expiresAt) GenerateRefreshToken()
    {
        var bytes = new byte[64];
        RandomNumberGenerator.Fill(bytes);
        var value = Convert.ToBase64String(bytes);
        var expiresAt = DateTime.UtcNow.AddMinutes(_refreshExpiryMinutes);
        return (value, expiresAt);
    }

    private static string HashRefreshToken(string value)
    {
        var bytes = Encoding.UTF8.GetBytes(value);
        var hash  = SHA256.HashData(bytes);
        return Convert.ToHexString(hash).ToLowerInvariant();
    }
}
