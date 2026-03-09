namespace CompetencyMatrix.Domain.Entities;

public class SkillDescription
{
    public int    Id          { get; set; }
    public int    SkillId     { get; set; }
    public int    RoleId      { get; set; }
    public string Level       { get; set; } = string.Empty; // BRONZE | PRATA | OURO
    public string Description { get; set; } = string.Empty;

    public Skill? Skill { get; set; }
}
