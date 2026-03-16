namespace CompetencyMatrix.Application.DTOs;

public record LoginRequest(string Email, string Password);

public record LoginResponse(
    string Id,
    string Token,
    string Name,
    bool IsManager,
    bool IsAdmin,
    bool IsCoordinator,
    int? CompanyId,
    string? RefreshToken = null,
    int? RefreshExpiresIn = null);

public record RefreshRequest(string RefreshToken);

public record RefreshResponse(string AccessToken, string? RefreshToken = null, int? RefreshExpiresIn = null);
