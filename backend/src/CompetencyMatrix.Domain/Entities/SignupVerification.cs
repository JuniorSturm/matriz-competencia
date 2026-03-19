namespace CompetencyMatrix.Domain.Entities;

public class SignupVerification
{
    public long     Id          { get; set; }
    public Guid     UserId      { get; set; }
    public int      CompanyId   { get; set; }
    public string   Email       { get; set; } = string.Empty;
    public string   CodeHash    { get; set; } = string.Empty;
    public DateTime ExpiresAt   { get; set; }
    public int      Attempts    { get; set; }
    public DateTime? VerifiedAt { get; set; }
    public DateTime CreatedAt   { get; set; }
}

