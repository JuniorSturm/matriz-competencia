using CompetencyMatrix.Domain.Entities;

namespace CompetencyMatrix.Application.Interfaces;

public interface IEmailLogRepository
{
    Task<long> CreateAsync(EmailLog log);
    Task       UpdateAsync(EmailLog log);
    Task<(IEnumerable<EmailLog> Items, int TotalCount)> GetPagedAsync(int page, int pageSize, string? status, string? templateKey, string? to);
    Task<EmailLog?> GetByIdAsync(long id);
}

