namespace CompetencyMatrix.Application.DTOs;

public record RoleResponse(int Id, string Nome);
public record GradeResponse(int Id, string Nome, int Ordinal);
public record CategoryResponse(int Id, string Nome);
