namespace CompetencyMatrix.Application.Interfaces;

public interface IJwtService
{
    string GenerateToken(Guid userId, string email, bool isManager, bool isAdmin, bool isCoordinator);
}
