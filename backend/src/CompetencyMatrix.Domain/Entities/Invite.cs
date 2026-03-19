namespace CompetencyMatrix.Domain.Entities;

public class Invite
{
    public int      Id              { get; set; }
    public string   Email           { get; set; } = string.Empty;
    public int      CompanyId       { get; set; }
    public Guid     InvitedByUserId { get; set; }
    public string   TokenHash       { get; set; } = string.Empty;
    public DateTime ExpiresAt       { get; set; }
    public DateTime CreatedAt       { get; set; }
    public DateTime? UsedAt         { get; set; }

    // Campos opcionais para role/grade/times podem ser adicionados futuramente
}

