using CompetencyMatrix.Domain.Entities;

namespace CompetencyMatrix.Application.Interfaces;

public interface IAuditLogRepository
{
    Task<long> CreateAsync(AuditLog log);

    Task<AuditLog?> GetByIdAsync(long id);

    Task<(IEnumerable<AuditLog> Items, int TotalCount)> GetPagedAsync(
        int page,
        int pageSize,
        int? companyId,
        string? entityType = null,
        string? operation = null,
        DateTime? dateFrom = null,
        DateTime? dateTo = null);
}

