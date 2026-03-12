namespace CompetencyMatrix.Domain.Entities;

public class Role
{
    public int     Id          { get; set; }
    public string  Name        { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int     CompanyId   { get; set; }

    public Company? Company { get; set; }
}
