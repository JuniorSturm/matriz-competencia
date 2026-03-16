namespace CompetencyMatrix.Domain.Entities;

public class Skill
{
    public int     Id           { get; set; }
    public string  Name         { get; set; } = string.Empty;
    public int     CategoryId   { get; set; }
    public int     CompanyId    { get; set; }
    /// <summary>Populated by repository from JOIN with categories when reading; not persisted.</summary>
    public string? CategoryName  { get; set; }

    public List<SkillDescription>    Descriptions { get; set; } = new();
    public List<SkillExpectation>    Expectations { get; set; } = new();
}
