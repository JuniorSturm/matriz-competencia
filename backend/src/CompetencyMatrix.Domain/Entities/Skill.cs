namespace CompetencyMatrix.Domain.Entities;

public class Skill
{
    public int     Id          { get; set; }
    public string  Name        { get; set; } = string.Empty;
    public string  Category    { get; set; } = string.Empty;
    public int     CompanyId   { get; set; }

    public List<SkillDescription>    Descriptions { get; set; } = new();
    public List<SkillExpectation>    Expectations { get; set; } = new();
}
