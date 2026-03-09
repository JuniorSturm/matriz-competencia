namespace CompetencyMatrix.Application.DTOs;

public record LoginRequest(string Email, string Password);

public record LoginResponse(string Token, string Name, bool IsManager);
