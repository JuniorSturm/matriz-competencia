namespace CompetencyMatrix.Application.DTOs;

public record PagedResult<T>(IEnumerable<T> Items, int TotalCount);

