namespace CompetencyMatrix.Domain.Entities;

public class SkillExpectation
{
    public int    Id            { get; set; }
    public int    SkillId       { get; set; }
    public int    RoleId        { get; set; }
    public int    GradeId       { get; set; }
    public string ExpectedLevel { get; set; } = string.Empty; // DESCONHECE | BRONZE | PRATA | OURO
    public bool   IsRequired    { get; set; }

    public Skill? Skill { get; set; }
    public Role?  Role  { get; set; }
    public Grade? Grade { get; set; }
}
