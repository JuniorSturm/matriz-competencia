namespace CompetencyMatrix.Domain.Entities;

public class Company
{
    public int      Id        { get; set; }
    public string   Name      { get; set; } = string.Empty;
    public string?  Document  { get; set; }
    public string?  Email     { get; set; }
    public string?  Phone     { get; set; }
    public bool     IsActive  { get; set; } = true;
    public DateTime CreatedAt { get; set; }

    public List<User> Users { get; set; } = new();
    public List<Team> Teams { get; set; } = new();
}
