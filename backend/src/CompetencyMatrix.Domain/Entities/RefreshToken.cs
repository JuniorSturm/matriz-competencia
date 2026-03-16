namespace CompetencyMatrix.Domain.Entities;

public class RefreshToken
{
    public long     Id        { get; set; }
    public Guid     UserId    { get; set; }
    public string   TokenHash { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
    public DateTime? RevokedAt { get; set; }
    public DateTime CreatedAt { get; set; }

    public User? User { get; set; }
}
