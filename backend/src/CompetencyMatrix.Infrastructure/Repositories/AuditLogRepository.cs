using System.Data;
using CompetencyMatrix.Application.Interfaces;
using CompetencyMatrix.Domain.Entities;
using Dapper;

namespace CompetencyMatrix.Infrastructure.Repositories;

public class AuditLogRepository : IAuditLogRepository
{
    private readonly Data.DapperContext _ctx;

    public AuditLogRepository(Data.DapperContext ctx) => _ctx = ctx;

    public async Task<long> CreateAsync(AuditLog log)
    {
        using var conn = _ctx.CreateConnection();

        const string sql = @"
            INSERT INTO audit_logs (
                created_at,
                user_id,
                user_email,
                ip_address,
                entity_type,
                entity_id,
                operation,
                company_id,
                team_id,
                payload
            )
            VALUES (
                @CreatedAt,
                @UserId,
                @UserEmail,
                @IpAddress,
                @EntityType,
                @EntityId,
                @Operation,
                @CompanyId,
                @TeamId,
                CAST(@Payload AS jsonb)
            )
            RETURNING id;";

        return await conn.ExecuteScalarAsync<long>(sql, log);
    }

    public async Task<AuditLog?> GetByIdAsync(long id)
    {
        using var conn = _ctx.CreateConnection();

        const string sql = @"
            SELECT
                id,
                created_at          AS CreatedAt,
                user_id             AS UserId,
                user_email          AS UserEmail,
                ip_address          AS IpAddress,
                entity_type         AS EntityType,
                entity_id           AS EntityId,
                operation           AS Operation,
                company_id          AS CompanyId,
                team_id             AS TeamId,
                payload::text       AS Payload
            FROM audit_logs
            WHERE id = @id;";

        return await conn.QueryFirstOrDefaultAsync<AuditLog>(sql, new { id });
    }

    public async Task<(IEnumerable<AuditLog> Items, int TotalCount)> GetPagedAsync(
        int page,
        int pageSize,
        int? companyId,
        string? entityType = null,
        string? operation = null,
        DateTime? dateFrom = null,
        DateTime? dateTo = null)
    {
        using var conn = _ctx.CreateConnection();

        var offset = page <= 1 ? 0 : (page - 1) * pageSize;

        // dateTo: fim do dia em UTC para incluir o dia inteiro
        DateTime? dateToEnd = null;
        if (dateTo.HasValue)
            dateToEnd = dateTo.Value.Date.AddDays(1);

        const string sql = @"
            SELECT
                id,
                created_at          AS CreatedAt,
                user_id             AS UserId,
                user_email          AS UserEmail,
                ip_address          AS IpAddress,
                entity_type         AS EntityType,
                entity_id           AS EntityId,
                operation           AS Operation,
                company_id          AS CompanyId,
                team_id             AS TeamId,
                payload::text       AS Payload
            FROM audit_logs
            WHERE (@companyId IS NULL OR company_id = @companyId)
              AND (@entityType IS NULL OR entity_type = @entityType)
              AND (@operation IS NULL OR operation = @operation)
              AND (@dateFrom IS NULL OR created_at >= @dateFrom)
              AND (@dateToEnd IS NULL OR created_at < @dateToEnd)
            ORDER BY created_at DESC
            LIMIT @pageSize OFFSET @offset;

            SELECT COUNT(*)
            FROM audit_logs
            WHERE (@companyId IS NULL OR company_id = @companyId)
              AND (@entityType IS NULL OR entity_type = @entityType)
              AND (@operation IS NULL OR operation = @operation)
              AND (@dateFrom IS NULL OR created_at >= @dateFrom)
              AND (@dateToEnd IS NULL OR created_at < @dateToEnd);";

        var param = new DynamicParameters();
        param.Add("companyId", companyId, DbType.Int32);
        param.Add("entityType", entityType, DbType.String);
        param.Add("operation", operation, DbType.String);
        param.Add("dateFrom", dateFrom?.ToUniversalTime(), DbType.DateTime);
        param.Add("dateToEnd", dateToEnd?.ToUniversalTime(), DbType.DateTime);
        param.Add("pageSize", pageSize, DbType.Int32);
        param.Add("offset", offset, DbType.Int32);

        using var multi = await conn.QueryMultipleAsync(sql, param);
        var items = await multi.ReadAsync<AuditLog>();
        var total = await multi.ReadFirstAsync<int>();

        return (items, total);
    }
}

