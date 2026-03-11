namespace CompetencyMatrix.Domain.Entities;

public class Team
{
    public int       Id          { get; set; }
    public int       CompanyId   { get; set; }
    public string    Name        { get; set; } = string.Empty;
    public string?   Description { get; set; }
    public DateTime CreatedAt   { get; set; }

    public Company?        Company { get; set; }
    public List<TeamMember> Members { get; set; } = new();
}
