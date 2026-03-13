using System.Security.Claims;
using System.Text.Json;
using CompetencyMatrix.Application.Interfaces;
using CompetencyMatrix.Domain.Entities;
using Microsoft.AspNetCore.Http;

namespace CompetencyMatrix.API.Services;

public class ApiAuditService : IAuditService
{
    private readonly IAuditLogRepository   _repository;
    private readonly IHttpContextAccessor  _httpContextAccessor;

    public ApiAuditService(IAuditLogRepository repository, IHttpContextAccessor httpContextAccessor)
    {
        _repository         = repository;
        _httpContextAccessor = httpContextAccessor;
    }

    public async Task LogAsync(
        string  entityType,
        string  entityId,
        string  operation,
        object? before,
        object? after,
        int?    companyId = null,
        int?    teamId    = null)
    {
        var httpContext = _httpContextAccessor.HttpContext;
        var principal   = httpContext?.User;

        Guid?  userId    = null;
        string? userEmail = null;

        if (principal is not null)
        {
            var sub = principal.FindFirstValue(ClaimTypes.NameIdentifier) ?? principal.FindFirstValue("sub");
            if (Guid.TryParse(sub, out var parsedId))
                userId = parsedId;

            userEmail = principal.FindFirstValue(ClaimTypes.Email)
                        ?? principal.FindFirstValue("email");
        }

        // IP: priorizar X-Forwarded-For se existir (proxy), senão RemoteIpAddress.
        string? ip = null;
        if (httpContext is not null)
        {
            var forwarded = httpContext.Request.Headers["X-Forwarded-For"].FirstOrDefault();
            ip = !string.IsNullOrWhiteSpace(forwarded)
                ? forwarded.Split(',')[0].Trim()
                : httpContext.Connection.RemoteIpAddress?.ToString();
        }

        string? payload = null;
        if (before is not null || after is not null)
        {
            payload = JsonSerializer.Serialize(new { before, after });
        }

        var log = new AuditLog
        {
            CreatedAt  = DateTime.UtcNow,
            UserId     = userId,
            UserEmail  = userEmail,
            IpAddress  = ip,
            EntityType = entityType,
            EntityId   = entityId,
            Operation  = operation,
            CompanyId  = companyId,
            TeamId     = teamId,
            Payload    = payload,
        };

        await _repository.CreateAsync(log);
    }
}

