using System.Security.Claims;
using CompetencyMatrix.Application;
using CompetencyMatrix.Application.DTOs;
using CompetencyMatrix.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CompetencyMatrix.API.Controllers;

[ApiController]
[Route("audit")]
[Authorize(Roles = "MANAGER,ADMIN,COORDINATOR")]
public class AuditController : ControllerBase
{
    private readonly IAuditLogRepository _auditLogs;
    private readonly IUserRepository     _users;

    public AuditController(IAuditLogRepository auditLogs, IUserRepository users)
    {
        _auditLogs = auditLogs;
        _users     = users;
    }

    private static Guid? GetCurrentUserId(ClaimsPrincipal user)
    {
        var sub = user.FindFirstValue(ClaimTypes.NameIdentifier) ?? user.FindFirstValue("sub");
        return Guid.TryParse(sub, out var id) ? id : null;
    }

    [HttpGet("logs")]
    public async Task<ActionResult<PagedResult<AuditLogResponse>>> GetLogs(
        [FromQuery] int       page      = 1,
        [FromQuery] int       pageSize  = PaginationDefaults.DefaultPageSize,
        [FromQuery] string?   entityType = null,
        [FromQuery] string?   operation  = null,
        [FromQuery] DateTime? dateFrom  = null,
        [FromQuery] DateTime? dateTo    = null)
    {
        if (page <= 0 || pageSize <= 0)
            return BadRequest(new { message = "Parâmetros de paginação inválidos." });

        pageSize = Math.Min(pageSize, PaginationDefaults.MaxPageSize);

        var currentUserId = GetCurrentUserId(User);
        var role          = User.FindFirstValue(ClaimTypes.Role);

        int? companyFilter = null;

        if (!string.Equals(role, "ADMIN", StringComparison.OrdinalIgnoreCase))
        {
            if (!currentUserId.HasValue)
                return Ok(new PagedResult<AuditLogResponse>(Array.Empty<AuditLogResponse>(), 0));

            var currentUser = await _users.GetByIdAsync(currentUserId.Value);
            if (currentUser?.CompanyId is null)
                return Ok(new PagedResult<AuditLogResponse>(Array.Empty<AuditLogResponse>(), 0));

            companyFilter = currentUser.CompanyId.Value;
        }

        var (items, total) = await _auditLogs.GetPagedAsync(
            page, pageSize, companyFilter,
            string.IsNullOrWhiteSpace(entityType) ? null : entityType.Trim(),
            string.IsNullOrWhiteSpace(operation) ? null : operation.Trim(),
            dateFrom, dateTo);

        var mapped = items.Select(l => new AuditLogResponse(
            l.Id,
            l.CreatedAt,
            l.UserEmail,
            l.IpAddress,
            l.EntityType,
            l.EntityId,
            l.Operation,
            l.CompanyId,
            l.TeamId
        ));

        return Ok(new PagedResult<AuditLogResponse>(mapped, total));
    }

    [HttpGet("logs/{id:long}")]
    public async Task<ActionResult<AuditLogDetailResponse>> GetLog(long id)
    {
        var log = await _auditLogs.GetByIdAsync(id);
        if (log is null)
            return NotFound();

        var currentUserId = GetCurrentUserId(User);
        var role          = User.FindFirstValue(ClaimTypes.Role);

        if (!string.Equals(role, "ADMIN", StringComparison.OrdinalIgnoreCase) && currentUserId.HasValue)
        {
            var currentUser = await _users.GetByIdAsync(currentUserId.Value);
            if (currentUser?.CompanyId is not null &&
                log.CompanyId is not null &&
                currentUser.CompanyId.Value != log.CompanyId.Value)
            {
                return Forbid();
            }
        }

        var detail = new AuditLogDetailResponse(
            log.Id,
            log.CreatedAt,
            log.UserId,
            log.UserEmail,
            log.IpAddress,
            log.EntityType,
            log.EntityId,
            log.Operation,
            log.CompanyId,
            log.TeamId,
            log.Payload
        );

        return Ok(detail);
    }
}

