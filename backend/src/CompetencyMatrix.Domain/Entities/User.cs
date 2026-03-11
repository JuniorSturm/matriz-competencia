namespace CompetencyMatrix.Domain.Entities;

public class User
{
    public Guid      Id         { get; set; }
    public string    Name       { get; set; } = string.Empty;
    public string    Email      { get; set; } = string.Empty;
    public string    Password   { get; set; } = string.Empty;
    public int?      RoleId     { get; set; }
    public int?      GradeId    { get; set; }
    public bool      IsManager    { get; set; }
    public bool      IsAdmin     { get; set; }
    public bool      IsCoordinator { get; set; }
    public int?      CompanyId   { get; set; }
    public DateTime  CreatedAt  { get; set; }

    public Role?    Role    { get; set; }
    public Grade?   Grade   { get; set; }
    public Company? Company { get; set; }
}
