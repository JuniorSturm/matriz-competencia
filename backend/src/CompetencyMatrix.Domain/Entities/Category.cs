namespace CompetencyMatrix.Domain.Entities;

public class Category
{
    public int    Id        { get; set; }
    public int    CompanyId { get; set; }
    public string Name      { get; set; } = string.Empty;
}
