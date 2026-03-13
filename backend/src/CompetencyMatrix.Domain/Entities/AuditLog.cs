namespace CompetencyMatrix.Domain.Entities;

public class AuditLog
{
    public long      Id          { get; set; }
    public DateTime  CreatedAt   { get; set; }

    public Guid?     UserId      { get; set; }
    public string?   UserEmail   { get; set; }
    public string?   IpAddress   { get; set; }

    public string    EntityType  { get; set; } = string.Empty;
    public string    EntityId    { get; set; } = string.Empty;
    public string    Operation   { get; set; } = string.Empty;

    public int?      CompanyId   { get; set; }
    public int?      TeamId      { get; set; }

    /// <summary>
    /// JSON serializado com os detalhes da alteração (before/after).
    /// </summary>
    public string?   Payload     { get; set; }
}

