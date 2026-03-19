namespace CompetencyMatrix.Application.DTOs;

public class InviteRequest
{
    public string Email     { get; set; } = string.Empty;
    public int    CompanyId { get; set; }
}

public class InviteAcceptRequest
{
    public string Token    { get; set; } = string.Empty;
    public string Name     { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}

