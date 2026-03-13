namespace CompetencyMatrix.Application.DTOs;

public record AuditLogResponse(
    long      Id,
    DateTime  CreatedAt,
    string?   UserEmail,
    string?   IpAddress,
    string    EntityType,
    string    EntityId,
    string    Operation,
    int?      CompanyId,
    int?      TeamId);

public record AuditLogDetailResponse(
    long      Id,
    DateTime  CreatedAt,
    Guid?     UserId,
    string?   UserEmail,
    string?   IpAddress,
    string    EntityType,
    string    EntityId,
    string    Operation,
    int?      CompanyId,
    int?      TeamId,
    string?   Payload);

