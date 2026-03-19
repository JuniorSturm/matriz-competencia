using CompetencyMatrix.Application.Interfaces;
using CompetencyMatrix.Domain.Entities;
using Dapper;

namespace CompetencyMatrix.Infrastructure.Repositories;

public class EmailLogRepository : IEmailLogRepository
{
    private readonly Data.DapperContext _ctx;

    public EmailLogRepository(Data.DapperContext ctx)
    {
        _ctx = ctx;
    }

    public async Task<long> CreateAsync(EmailLog log)
    {
        using var conn = _ctx.CreateConnection();
        const string sql = @"
            INSERT INTO email_logs (""to"", subject, template_key, payload, sent_at, status, error, created_at)
            VALUES (@To, @Subject, @TemplateKey, CAST(@Payload AS jsonb), @SentAt, @Status, @Error, @CreatedAt)
            RETURNING id";
        return await conn.ExecuteScalarAsync<long>(sql, log);
    }

    public async Task UpdateAsync(EmailLog log)
    {
        using var conn = _ctx.CreateConnection();
        const string sql = @"
            UPDATE email_logs
            SET sent_at = @SentAt,
                status  = @Status,
                error   = @Error
            WHERE id = @Id";
        await conn.ExecuteAsync(sql, log);
    }

    public async Task<(IEnumerable<EmailLog> Items, int TotalCount)> GetPagedAsync(int page, int pageSize, string? status, string? templateKey, string? to)
    {
        using var conn = _ctx.CreateConnection();
        var where = new List<string>();
        var p = new DynamicParameters();
        if (!string.IsNullOrWhiteSpace(status)) { where.Add("status = @status"); p.Add("status", status); }
        if (!string.IsNullOrWhiteSpace(templateKey)) { where.Add("template_key = @templateKey"); p.Add("templateKey", templateKey); }
        if (!string.IsNullOrWhiteSpace(to)) { where.Add(@"""to"" ILIKE @to"); p.Add("to", $"%{to}%"); }
        var whereSql = where.Count > 0 ? "WHERE " + string.Join(" AND ", where) : string.Empty;
        p.Add("limit", pageSize);
        p.Add("offset", (page - 1) * pageSize);
        var total = await conn.ExecuteScalarAsync<int>($"SELECT COUNT(*) FROM email_logs {whereSql}", p);
        var items = await conn.QueryAsync<EmailLog>($@"
            SELECT id, ""to"" AS To, subject AS Subject, template_key AS TemplateKey, payload AS Payload, sent_at AS SentAt,
                   status AS Status, error AS Error, created_at AS CreatedAt
            FROM email_logs
            {whereSql}
            ORDER BY created_at DESC
            LIMIT @limit OFFSET @offset", p);
        return (items, total);
    }

    public async Task<EmailLog?> GetByIdAsync(long id)
    {
        using var conn = _ctx.CreateConnection();
        const string sql = @"
            SELECT id, ""to"" AS To, subject AS Subject, template_key AS TemplateKey, payload AS Payload, sent_at AS SentAt,
                   status AS Status, error AS Error, created_at AS CreatedAt
            FROM email_logs WHERE id = @id";
        return await conn.QueryFirstOrDefaultAsync<EmailLog>(sql, new { id });
    }
}

