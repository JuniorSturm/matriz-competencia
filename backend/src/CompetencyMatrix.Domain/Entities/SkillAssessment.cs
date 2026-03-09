namespace CompetencyMatrix.Domain.Entities;

public class SkillAssessment
{
    public int      Id           { get; set; }
    public Guid     UserId       { get; set; }
    public int      SkillId      { get; set; }
    public string   CurrentLevel { get; set; } = string.Empty; // DESCONHECE | BRONZE | PRATA | OURO
    public DateTime LastUpdated  { get; set; }

    public User?  User  { get; set; }
    public Skill? Skill { get; set; }
}
