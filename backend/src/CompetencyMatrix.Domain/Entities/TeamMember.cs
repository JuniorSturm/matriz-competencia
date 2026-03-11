namespace CompetencyMatrix.Domain.Entities;

public class TeamMember
{
    public int    TeamId   { get; set; }
    public Guid   UserId   { get; set; }
    public bool   IsLeader { get; set; }

    public Team? Team { get; set; }
    public User? User { get; set; }
}
