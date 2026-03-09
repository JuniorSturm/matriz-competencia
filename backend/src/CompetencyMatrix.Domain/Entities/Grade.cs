namespace CompetencyMatrix.Domain.Entities;

public class Grade
{
    public int    Id      { get; set; }
    public string Name    { get; set; } = string.Empty;
    public int    Ordinal { get; set; }
}
