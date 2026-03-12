namespace CompetencyMatrix.Application.DTOs;

public record RoleResponse(int Id, string Nome);
public record RoleDetailResponse(int Id, string Nome, string? Descricao, int CompanyId, string? CompanyName);
public record CreateRoleRequest(string Nome, string? Descricao, int? CompanyId);
public record UpdateRoleRequest(string Nome, string? Descricao);
public record GradeResponse(int Id, string Nome, int Ordinal);
public record CategoryResponse(int Id, string Nome);
