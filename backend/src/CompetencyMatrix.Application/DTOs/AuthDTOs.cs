namespace CompetencyMatrix.Application.DTOs;

public record LoginRequest(string Email, string Password);

public record LoginResponse(string Id, string Token, string Name, bool IsManager, bool IsAdmin, bool IsCoordinator, int? CompanyId);
